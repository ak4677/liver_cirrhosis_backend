const mongoose = require('mongoose');
const { Schema } = mongoose;

// Prediction sub-document - one per image, filled by model.js after /predict
// Empty array at upload time - never pre-filled with dummy values
const predictionSchema = new Schema({
    image_path:              { type: String },
    binary_prediction:       { type: String, enum: ['Benign', 'Malignant'] },
    binary_confidence:       { type: Number, min: 0, max: 1 },
    multi_class_prediction:  { type: String },
    multi_class_description: { type: String },
    multi_class_confidence:  { type: Number, min: 0, max: 1 },
    all_class_probabilities: { type: Schema.Types.Mixed },
    gradcam_image_path:      { type: String },
    gradcam_image_url:       { type: String },
    predictedAt:             { type: Date, default: Date.now }
}, { _id: false });


const patientDataSchema = new Schema({
    lab_assistant: {
        type: Schema.Types.ObjectId,
        ref: 'lab_assistant',
        required: true
    },
    patient: {
        type: Schema.Types.ObjectId,
        ref: 'patient',
        required: true
    },

    // Skin cancer - images saved at upload, predictions filled by model.js
    skinData: {
        images:      [{ type: String }],
        predictions: [predictionSchema]
    },

    // Liver cirrhosis input fields
    liverData: {
        ascites:      String,
        hepatome:     String,
        spiders:      String,
        edema:        String,
        bilirubin:    String,
        cholesterol:  String,
        albumin:      String,
        copper:       String,
        alk_phos:     String,
        SGOT:         String,
        tryglicerides: String,
        platelets:    String,
        prothrombin:  String
    },

    // Cardiovascular disease input fields
    cvdData: {
        age:           String,
        bloodPressure: String,
        cholesterol:   String,
        heartRate:     String,
        bloodSugar:    String
    }

}, { timestamps: true });

module.exports = mongoose.model('patientdata', patientDataSchema);