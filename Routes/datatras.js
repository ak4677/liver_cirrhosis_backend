const express = require('express')
const router = express.Router()
const patientdata = require('../modules/patientdata')
const assignment = require('../modules/assignment')
const { body, validationResult } = require('express-validator')
const authenticateUser = require('../middleware/authenticateUser')
const checkRole = require('../middleware/checkRole')
const doctor = require('../modules/doctor')
const patient = require('../modules/patient')
const admin = require('../modules/admin')
const lab_assistant = require('../modules/lab_assistant')


//fetch doctor throught /api/datatras/getinfo
router.post('/getinfo', authenticateUser, async (req, res) => {
    try {
        let user
        // console.log(req.user.role)
        switch (req.user.role) {
            case "patient":
                user = await patient.findById(req.user.id).select("-passward");
                // console.log(user)
                break;
            case "doctor":
                user = await doctor.findById(req.user.id).select("-passward");
                break;
            case "admin":
                user = await admin.findById(req.user.id).select("-passward");
                break;
            // case "receptionist":
            //     user = await Receptionist.findById(req.user.id).select("-passward");
            //     break;
            case "labassistant":
                user = await lab_assistant.findById(req.user.id).select("-passward");
                break;
            default:
                return res.status(400).json({ error: "Invalid role" });
        }

        if (!user) return res.status(404).json({ error: "User not found" });
        // console.log(req.user.id)
        res.status(200).json(user);
        // let status = false
        // const doctorId = req.doctor.id
        // getdoc = await doctor.findById(doctorId).select("-passward")
        // status = true
        // res.json(getdoc)
    } catch (error) {
        // console.error(error.message)
        res.status(400).send("interna getting doctor")
    }
})

//add patient data on /api/datatras/addpatient
router.post('/addpatient', authenticateUser, [
    body('name').isLength({ min: 6 }),
    body('Age').isLength({ min: 1 }, { max: 100 }),
    body('email').isEmail(),
    body('Number').isLength({ min: 10 }, { max: 10 })
], async (req, res) => {
    const result = validationResult(req)
    if (!result.isEmpty()) {
        return res.status(420).send("wrong cradential")
    }
    try {
        let newpatient = await patientdata.findOne({ email: req.body.email })
        if (newpatient) {
            return res.status(400).send("patient already exist")
        }
        newpatient = await patientdata.create({
            name: req.body.name,
            email: req.body.email,
            Number: req.body.Number,
            Age: req.body.Age,
            sex: req.body.sex,
            assindoc: req.doctor.id
        })
        const savepati = await newpatient.save()
        res.json(savepati);
    } catch (error) {
        console.error(error.message)
        res.status(400).send("internal server error in fatching patients")
    }
})


// GET /api/datatras/doctor/patients
// Get all patients assigned to the doctor with their medical data
router.get('/doctor/patients', authenticateUser, checkRole(['doctor']), async (req, res) => {
    try {
        // 1. Get the logged-in doctor's ID
        const doctorId = req.user.id;

        // 2. Find all assignments for this doctor
        const assignments = await assignment.find({ doctor_id: doctorId })
            .populate({
                path: 'patient_id',
                select: 'name Age sex email Number',
                model: 'patient'
            });

        // 3. Extract patient IDs from assignments
        const patientIds = assignments.map(a => a.patient_id._id);

        // 4. Get all medical data for these patients
        const medicalData = await patientdata.find({
            patient: { $in: patientIds }
        }).populate('lab_assistant', 'name lab_id');

        // 5. Combine data into response format
        const response = assignments.map(assignment => {
            const patient = assignment.patient_id.toObject();
            const data = medicalData.filter(md =>
                md.patient.equals(patient._id)
            );

            return {
                ...patient,
                medical_history: data.map(d => ({
                    ...d.toObject(),
                    lab_assistant: d.lab_assistant
                }))
            };
        });

        res.status(200).json(response);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});


//admin get all the doctors on /api/datatras/admin/doctors
router.get("/admin/doctors", authenticateUser, checkRole(['admin']), async (req, res) => {
    try {
        const doctors = await doctor.find().select("-passward");
        if (!doctors) {
            res.status(404).json({ message: "doctor not found" })
        }
        res.status(200).json(doctors);
    } catch (error) {
        res.status(500).json({ error: "error in fetching doctors" })
    }
});


//admin get all the patients on /api/datatras/admin/patients
router.get("/admin/patients", authenticateUser, checkRole(['admin']), async (req, res) => {
    try {
        const patients = await patient.find().select("-passward");
        if (!patients) {
            res.status(404).json({ message: "patient not found" })
        }
        res.status(200).json(patients);
    } catch (error) {
        res.status(500).json({ error: "error in fetching patients" })
    }
})
//admin get all the patients on /api/datatras/admin/Assistant
router.get("/admin/Assistant", authenticateUser, checkRole(['admin']), async (req, res) => {
    try {
        const assistant = await lab_assistant.find().select("-passward");
        res.status(200).json(assistant);
    } catch (error) {
        res.status(500).json({ error: "error in fetching assistant" })
    }
})
// Admin Assignment Routes on api/datatras/assignments
router.get("/assignments", authenticateUser, checkRole(['admin']), async (req, res) => {
    try {
        let assignments = await assignment.find({ admin_id: req.user.id })
            .populate("doctor_id", "name Number")
            .populate("patient_id", "name Age");
        assignments = assignments.filter(a => a.doctor_id && a.patient_id);
        if (assignments.length === 0) {
            return res.status(200).json({ message: "No assignments found", data: [] });
        }
        res.status(200).json(assignments);
    } catch (err) {
        res.status(500).json({ error: "Server error in fetching assignment" });
    }
});

// Admin Assignment Routes on api/datatras/assignments
router.post("/assignments", authenticateUser, checkRole(['admin']), async (req, res) => {
    try {
        const { doctor_id, patient_id } = req.body;
        const newAssignment = await assignment.create({
            admin_id: req.user.id,
            doctor_id,
            patient_id
        });
        res.status(201).json(newAssignment);
    } catch (err) {
        res.status(500).json({ error: "Server error in creating assignment" });
    }
});

//admin delete assignment using api/datatras/deleteassignment/{id}
router.delete('/deleteassignment/:id', authenticateUser, checkRole(['admin']), async (req, res) => {
    try {
        let findassignment = await assignment.findById(req.params.id)
        if (!findassignment) { return res.status(404).send("assignment not found!") }
        if (findassignment.admin_id && findassignment.admin_id.toString() !== req.user.id) { return res.status(420).send("unauthorized person detected") }

        findassignment = await assignment.findByIdAndDelete(req.params.id)
        res.json({ "delete": "successuflly", assignment: findassignment })
    } catch (error) {
        console.error(error.message)
        res.status(400).send("some error occure in deleting assignment")
    }
})

router.delete('/delete/:id', authenticateUser, checkRole(['admin']), async (req, res) => {
    const roleModelMap = {
        'lab_assistant': lab_assistant,
        'doctor': doctor,
        'patient': patient
    };
    try {
        const role = req.body.role.toLowerCase();
        const Model = roleModelMap[role];
        let finduser = await Model.findById(req.params.id)
        if (!finduser) { return res.status(404).send("user not found!") }
        // if (finduser.admin_id && findassignment.admin_id.toString() !== req.user.id) { return res.status(420).send("unauthorized person detected") }

        finduser = await Model.findByIdAndDelete(req.params.id)
        res.json({ "delete": "successuflly", Model: finduser })
    } catch (error) {
        console.error(error.message)
        res.status(400).send("some error occure in deleting assignment")
    }
})
module.exports = router;