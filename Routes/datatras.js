const express=require('express')
const router=express.Router()
const patientdata=require('../modules/patientdata')
const assignment=require('../modules/assignment')
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
            case "receptionist":
                // user = await Receptionist.findById(req.user.id).select("-passward");
                break;
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
router.post('/addpatient',authenticateUser,[
    body('name').isLength({min: 6}),
    body('Age').isLength({min: 1},{max: 100}),
    body('email').isEmail(),
    body('Number').isLength({min:10},{max:10})
],async(req,res)=>{
    const result=validationResult(req)
    if(!result.isEmpty()){
        return res.status(420).send("wrong cradential")
    }
    try {
        let newpatient=await patientdata.findOne({email: req.body.email})
        if(newpatient){
            return res.status(400).send("patient already exist")
        }
        newpatient=await patientdata.create({
            name: req.body.name,
            email: req.body.email,
            Number: req.body.Number,
            Age: req.body.Age,
            sex: req.body.sex,
            assindoc: req.doctor.id
        })
        const savepati=await newpatient.save()
        res.json(savepati);
    } catch (error) {
        console.error(error.message)
        res.status(400).send("internal server error in fatching patients")
    }
})


//fetching patient data on /api/datatras/patientdata
router.get('/patientdata',authenticateUser,async(req,res)=>{
    try {
        // const allpatient=await patientdata.find({assindoc: req.doctor.id}).populate('assindoc', 'name');
        const assignments = await assignment.find({ doctor_id: req.doctor.id })
      .populate("patient", "name");
        res.json(assignments);
    } catch (error) {
        console.error(error.message)
        res.status(400).send("internal server error in fatching patients")
    }
})

// Admin Assignment Routes on api/datatras/assignments
router.get("/assignments", authenticateUser,checkRole(['admin']), async (req, res) => {
    try {
      const assignments = await assignment.find({ admin_id: req.user.id })
        .populate("doctor_id", "name Number")
        .populate("patient_id", "name Age");
      res.status(200).json(assignments);
    } catch (err) {
      res.status(500).json({ error: "Server error" });
    }
  });
  
  // Admin Assignment Routes on api/datatras/assignments
  router.post("/assignments", authenticateUser,checkRole(['admin']), async (req, res) => {
    try {
      const { doctor_id, patient_id } = req.body;
      const newAssignment = await assignment.create({
        admin_id: req.user.id,
        doctor_id,
        patient_id
      });
      res.status(201).json(newAssignment);
    } catch (err) {
      res.status(500).json({ error: "Server error" });
    }
  });

module.exports=router;