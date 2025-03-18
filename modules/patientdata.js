const mongoose=require('mongoose')
const {Schema}= mongoose
const PatientSchema=new Schema({
    labassis:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'lab_assistant',
        require: true
    },
    patient:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'patient',
        require: true
    },
    ascites:{
        type: String
    },
    hepatome:{
        type: String
    },
    spiders:{
        type: String
    },
    edema:{
        type: String
    },
    bilirubin:{
        type: Number
    },
    cholesterol:{
        type: Number
    },
    albumin:{
        type: Number
    },
    copper:{
        type: Number
    },
    alk_phos:{
        type: Number
    },
    SGOT:{
        type: Number
    },
    tryglicerides:{
        type: Number
    },
    platelets:{
        type: Number
    },
    prothrombin:{
        type: Number
    },
})

module.exports=mongoose.model('patientdata',PatientSchema);