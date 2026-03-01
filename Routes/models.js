const express    = require('express');
const router     = express.Router();
const axios      = require('axios');
const FormData   = require('form-data');
const fs         = require('fs');
const path       = require('path');

const patientdata      = require('../modules/patientdata');
const authenticateUser = require('../middleware/authenticateUser');
const checkRole        = require('../middleware/checkRole');

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8001';

// Folder where GradCAM overlay PNGs are saved
const GRADCAM_DIR = path.join(__dirname, '../uploads/gradcam');
if (!fs.existsSync(GRADCAM_DIR)) {
    fs.mkdirSync(GRADCAM_DIR, { recursive: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/model/skinPredict
//
// Called by the doctor frontend when the Predict button is clicked on one image.
//
// Body (JSON):
//   {
//     "patientDataId": "<MongoDB _id of the patientdata document>",
//     "imageIndex": 0
//   }
//
// Flow:
//   1. Load patientdata document from MongoDB
//   2. Read the image file from disk using the stored path
//   3. POST the image to FastAPI /predict
//   4. Decode the base64 GradCAM overlay and save it as a PNG file
//   5. Write the prediction result into skinData.predictions[imageIndex]
//   6. Return the result to the doctor frontend
// ─────────────────────────────────────────────────────────────────────────────
router.post(
    '/skinPredict',
    authenticateUser,
    checkRole(['doctor']),
    async (req, res) => {
        try {
            const { patientDataId, imageIndex = 0 } = req.body;

            if (!patientDataId) {
                return res.status(400).json({ error: 'patientDataId is required' });
            }

            // Load the patientdata record
            const record = await patientdata.findById(patientDataId);
            if (!record) {
                return res.status(404).json({ error: 'Patient data record not found' });
            }

            const images = record.skinData?.images;
            if (!images || images.length === 0) {
                return res.status(400).json({ error: 'No skin images found for this record' });
            }

            if (imageIndex < 0 || imageIndex >= images.length) {
                return res.status(400).json({
                    error: `imageIndex ${imageIndex} out of range (record has ${images.length} image(s))`
                });
            }

            const imagePath         = images[imageIndex];
            const absoluteImagePath = path.resolve(imagePath);

            if (!fs.existsSync(absoluteImagePath)) {
                return res.status(404).json({
                    error: `Image file not found on disk: ${imagePath}`
                });
            }

            // Send image to FastAPI
            const formData = new FormData();
            formData.append(
                'file',
                fs.createReadStream(absoluteImagePath),
                path.basename(absoluteImagePath)
            );

            let fastapiResponse;
            try {
                fastapiResponse = await axios.post(
                    `${FASTAPI_URL}/predict`,
                    formData,
                    { headers: formData.getHeaders(), timeout: 60000 }
                );
            } catch (axiosErr) {
                const detail = axiosErr.response?.data || axiosErr.message;
                console.error('[model.js] FastAPI error:', detail);
                return res.status(502).json({ error: 'Prediction service unavailable', detail });
            }

            const prediction = fastapiResponse.data;

            // Save GradCAM overlay PNG to disk - store URL in MongoDB, not base64
            let gradcamPath = null;
            let gradcamUrl  = null;

            if (prediction.gradcam_image) {
                const gradcamFilename = `gradcam_${patientDataId}_img${imageIndex}_${Date.now()}.png`;
                gradcamPath = path.join(GRADCAM_DIR, gradcamFilename);
                fs.writeFileSync(
                    gradcamPath,
                    Buffer.from(prediction.gradcam_image, 'base64')
                );
                gradcamUrl = `/uploads/gradcam/${gradcamFilename}`.replace(/\\/g, '/');
            }

            // Build prediction sub-document
            const predictionDoc = {
                image_path:              imagePath.replace(/\\/g, '/'),
                binary_prediction:       prediction.binary_prediction,
                binary_confidence:       prediction.binary_confidence,
                multi_class_prediction:  prediction.multi_class_prediction,
                multi_class_description: prediction.multi_class_description,
                multi_class_confidence:  prediction.multi_class_confidence,
                all_class_probabilities: prediction.all_class_probabilities,
                gradcam_image_path:      gradcamPath,
                gradcam_image_url:       gradcamUrl,
                predictedAt:             new Date()
            };

            // Upsert into skinData.predictions[imageIndex]
            const predictions = record.skinData.predictions || [];
            while (predictions.length <= imageIndex) predictions.push(null);
            predictions[imageIndex] = predictionDoc;

            await patientdata.findByIdAndUpdate(
                patientDataId,
                { $set: { 'skinData.predictions': predictions } },
                { new: true }
            );

            return res.status(200).json({
                message:      'Prediction complete',
                patientDataId,
                imageIndex,
                prediction:   predictionDoc
            });

        } catch (error) {
            console.error('[model.js] Unexpected error:', error.message);
            return res.status(500).json({ error: 'Internal server error', detail: error.message });
        }
    }
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/model/skinPredictAll
//
// Body (JSON): { "patientDataId": "<id>" }
//
// Runs prediction on ALL images in the record sequentially.
// ─────────────────────────────────────────────────────────────────────────────
router.post(
    '/skinPredictAll',
    authenticateUser,
    checkRole(['doctor']),
    async (req, res) => {
        try {
            const { patientDataId } = req.body;

            if (!patientDataId) {
                return res.status(400).json({ error: 'patientDataId is required' });
            }

            const record = await patientdata.findById(patientDataId);
            if (!record) {
                return res.status(404).json({ error: 'Patient data record not found' });
            }

            const images = record.skinData?.images;
            if (!images || images.length === 0) {
                return res.status(400).json({ error: 'No skin images found for this record' });
            }

            const results = [];

            for (let i = 0; i < images.length; i++) {
                const imagePath         = images[i];
                const absoluteImagePath = path.resolve(imagePath);

                if (!fs.existsSync(absoluteImagePath)) {
                    results.push({ imageIndex: i, error: `File not found: ${imagePath}` });
                    continue;
                }

                try {
                    const formData = new FormData();
                    formData.append(
                        'file',
                        fs.createReadStream(absoluteImagePath),
                        path.basename(absoluteImagePath)
                    );

                    const fastapiResponse = await axios.post(
                        `${FASTAPI_URL}/predict`,
                        formData,
                        { headers: formData.getHeaders(), timeout: 60000 }
                    );

                    const prediction = fastapiResponse.data;

                    let gradcamPath = null;
                    let gradcamUrl  = null;

                    if (prediction.gradcam_image) {
                        const gradcamFilename = `gradcam_${patientDataId}_img${i}_${Date.now()}.png`;
                        gradcamPath = path.join(GRADCAM_DIR, gradcamFilename);
                        fs.writeFileSync(gradcamPath, Buffer.from(prediction.gradcam_image, 'base64'));
                        gradcamUrl = `/uploads/gradcam/${gradcamFilename}`.replace(/\\/g, '/');
                    }

                    results.push({
                        imageIndex:              i,
                        image_path:              imagePath.replace(/\\/g, '/'),
                        binary_prediction:       prediction.binary_prediction,
                        binary_confidence:       prediction.binary_confidence,
                        multi_class_prediction:  prediction.multi_class_prediction,
                        multi_class_description: prediction.multi_class_description,
                        multi_class_confidence:  prediction.multi_class_confidence,
                        all_class_probabilities: prediction.all_class_probabilities,
                        gradcam_image_path:      gradcamPath,
                        gradcam_image_url:       gradcamUrl,
                        predictedAt:             new Date()
                    });
                } catch (err) {
                    results.push({ imageIndex: i, error: err.response?.data || err.message });
                }
            }

            // Save all results at once
            await patientdata.findByIdAndUpdate(
                patientDataId,
                { $set: { 'skinData.predictions': results } },
                { new: true }
            );

            return res.status(200).json({
                message:     'All predictions complete',
                patientDataId,
                total:       images.length,
                predictions: results
            });

        } catch (error) {
            console.error('[model.js] skinPredictAll error:', error.message);
            return res.status(500).json({ error: 'Internal server error', detail: error.message });
        }
    }
);

module.exports = router;