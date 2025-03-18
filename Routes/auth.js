const express = require("express");
const doctor = require('../modules/doctor')
const admin = require('../modules/admin')
const Lab_assistant = require('../modules/lab_assistant')
const { body, validationResult } = require('express-validator')
const router = express.Router();
const jwt = require('jsonwebtoken');
const fetchpatient = require("../middleware/authenticateUser");
const patientdata = require("../modules/patientdata");
const patient = require("../modules/patient");
const lab_assistant = require("../modules/lab_assistant");

const doc_secret_signature = "doctor key"
const pati_secret_signature = "patient key"


//doctor accont creation on /api/auth/createadmin
router.post('/createadmin', [
    body('name').isLength({ min: 6 }),
    body('passward').isLength({ min: 8 }).exists(),
    body('email').isEmail(),
    body('Number').isLength({ min: 10 }, { max: 10 })
], async (req, res) => {
    const result = validationResult(req);
    if (!result.isEmpty()) {
        return res.status(420).send("wronge cradential")
    }
    try {
        let newadmin = await admin.findOne({ email: req.body.email })
        if (newadmin) {
            return res.status(400).send("user already exist")
        }
        newadmin = await admin.create({
            name: req.body.name,
            email: req.body.email,
            passward: req.body.passward,
            Number: req.body.Number
        })
        let saveadmin = await newadmin.save();
        // res.json(savedoc);
        let data = {
            admin: {
                id: newadmin.id
            }
        }
        let token = jwt.sign(data, doc_secret_signature)
        res.json({ token })
    } catch (error) {
        console.error(error.message)
        res.status(420).send("internal server error in creation of admin")
    }
})

//add patient data on /api/auth/addpatient
router.post('/addpatient',[
    body('name').isLength({min: 6}),
    body('Age').isLength({min: 1},{max: 100}),
    body('email').isEmail(),
    body('Number').isLength({min:10},{max:10}),
    body('passward').isLength({ min: 8 }).exists(),
    body('sex').exists()
],async(req,res)=>{
    const result=validationResult(req)
    if(!result.isEmpty()){
        return res.status(420).send("wronge cradential")
    }
    try {
        let newpatient=await patient.findOne({email: req.body.email})
        if(newpatient){
            return res.status(400).send("patient already exist")
        }
        newpatient=await patient.create({
            name: req.body.name,
            email: req.body.email,
            Number: req.body.Number,
            Age: req.body.Age,
            sex: req.body.sex,
            passward: req.body.passward,
        })
        const savepati=await newpatient.save()
        let data = {
            patient: {
                id: newpatient.id
            }
        }
        let token = jwt.sign(data, doc_secret_signature)
        res.json({ token })
        // res.json(savepati);
    } catch (error) {
        console.error(error.message)
        res.status(400).send("internal server error in fatching patients")
    }
})

//doctor accont creation on /api/auth/createdoc
router.post('/createdoc', [
    body('name').isLength({ min: 6 }),
    body('passward').isLength({ min: 8 }).exists(),
    body('email').isEmail(),
    body('Number').isLength({ min: 10 }, { max: 10 })
], async (req, res) => {
    const result = validationResult(req);
    if (!result.isEmpty()) {
        return res.status(420).send("wronge cradential")
    }
    try {
        let newdoc = await doctor.findOne({ email: req.body.email })
        if (newdoc) {
            return res.status(400).send("user already exist")
        }
        newdoc = await doctor.create({
            name: req.body.name,
            email: req.body.email,
            passward: req.body.passward,
            Number: req.body.Number
        })
        let savedoc = await newdoc.save();
        // res.json(savedoc);
        let data = {
            doctor: {
                id: newdoc.id
            }
        }
        let token = jwt.sign(data, doc_secret_signature)
        res.json({ token })
    } catch (error) {
        console.error(error.message)
        res.status(420).send("internal server error in creation of doctor")
    }
})

// creating lab assistant throught /api/auth/createlabassis
router.post('/createlabassis', [
    body('name').isLength({ min: 6 }),
    body('passward').isLength({ min: 8 }).exists(),
    body('email').isEmail(),
    body('lab_name').isLength({ min: 3 }),
    body('Number').isLength({ min: 10 }, { max: 10 })
], async (req, res) => {
    const result = validationResult(req);
    if (!result.isEmpty()) {
        return res.status(420).send("wronge cradential")
    }
    try {
        let newassistend = await lab_assistant.findOne({ email: req.body.email })
        if (newassistend) {
            return res.status(400).send("user already exist")
        }
        newassistend = await lab_assistant.create({
            name: req.body.name,
            email: req.body.email,
            passward: req.body.passward,
            Number: req.body.Number,
            lab_name: req.body.lab_name
        })
        let saveassis = await newassistend.save();
        // res.json(savedoc);
        let data = {
            lab_assistant: {
                id: newassistend.id
            }
        }
        let token = jwt.sign(data, doc_secret_signature)
        res.json({ token })
    } catch (error) {
        console.error(error.message)
        res.status(420).send("internal server error in creation of Lab assistant")
    }
})


//login doctor throught /api/auth/doclogin
router.post('/doclogin', [
    body('passward').exists(),
    body('email').isEmail(),
    body('role').exists()
], async (req, res) => {
    const result = validationResult(req);
    if (!result.isEmpty()) {
        return res.status(420).send("wronge cradential")
    }
    try {
        // console.log("hello")
        let user
        switch (req.body.role.toLowerCase()) {
            case "patient":
              user = await patient.findOne({ email: req.body.email });
              break;
            case "doctor":
                user = await doctor.findOne({ email: req.body.email });
                break;
            case "admin":
                user = await admin.findOne({ email: req.body.email });
                break;
            // case "receptionist":
            //   user = await Receptionist.findOne({ email: req.body.email });
            //   break;
            case "labassistant":
                user = await Lab_assistant.findOne({ email: req.body.email });
                break;
            default:
                return res.status(400).json({ error: "Invalid role" });
        }
        // let doc= await doctor.findOne({email: req.body.email})
        if (!user) {
            return res.status(420).send("worng email");
        }
        if (user.passward !== req.body.passward) {
            return res.status(420).send("wornd passward");
        }
        // res.json(savedoc);

        const token = jwt.sign(
            { id: user._id, role: req.body.role.toLowerCase() },
            doc_secret_signature,
            // { expiresIn: "1h" }
        );
        // let data = {
        //     doctor: {
        //         id: doc.id
        //     }
        // }
        // let token = jwt.sign(data, doc_secret_signature)
        // console.log("hello")
        res.json(token)
    } catch (error) {
        console.error(error.message)
        return res.status(420).send("internal server error in doctor loing")
    }
})


// //fetch doctor throught /api/auth/getinfo
// router.post('/getinfo', fetchpatient, async (req, res) => {
//     try {
//         let user=req.doctor.id;
//         switch (req.body.role) {
//             case "patient":
//                 user = await patient.findById(user).select("-password");
//                 break;
//             case "doctor":
//                 user = await doctor.findById(user).select("-password");
//                 break;
//             case "admin":
//                 user = await admin.findById(user).select("-password");
//                 break;
//             case "receptionist":
//                 user = await Receptionist.findById(user).select("-password");
//                 break;
//             case "labassistant":
//                 user = await Lab_assistant.findById(user).select("-password");
//                 break;
//             default:
//                 return res.status(400).json({ error: "Invalid role" });
//         }

//         if (!user) return res.status(404).json({ error: "User not found" });
//         res.status(200).json(user);
//         // let status = false
//         // const doctorId = req.doctor.id
//         // getdoc = await doctor.findById(doctorId).select("-passward")
//         // status = true
//         // res.json(getdoc)
//     } catch (error) {
//         // console.error(error.message)
//         res.status(400).send("interna getting doctor")
//     }
// })

// //login patient throught /api/auth/patilogin
// router.post('/patilogin',[
//     body('passward').exists(),
//     body('email').isEmail()
// ],async(req,res)=>{
//     const result=validationResult(req);
//     if(!result.isEmpty()){
//         return res.status(420).send("wronge cradential")
//     }
//     try {
//         let patient= await patientdata.findOne({email: req.body.email})
//         if(!patient){
//            return res.status(420).send("worng email");
//         }
//         if(patient.passward!==req.body.passward){
//            return res.status(420).send("wornd passward");
//         }
//         // res.json(savedoc);
//         let data = {
//             patientdata: {
//                 id: patient.id
//             }
//         }
//         let token = jwt.sign(data, pati_secret_signature)
//         res.json(token)
//     } catch (error) {
//         console.error(error.message)
//         return res.status(420).send("internal server error in doctor loing")
//     }
// })

module.exports = router;