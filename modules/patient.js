const mongoose = require("mongoose");
const { Schema } = mongoose
const PatientSchema = new Schema({
    name:{
        type: String,
        required: true
    },
    Age:{
        type: Number,
        required: true
    },
    sex:{
        type: String,
        enum: ["F","M","O"],
        required: true
    },
    email:{
        type: String,
        required: true
    },
    passward:{
        type: String,
        require:true
    },
    Number:{
        type: Number,
        required: true
    },
    isActivated: { 
        type: Boolean, 
        default: false 
    }
});

module.exports = mongoose.model('patient', PatientSchema);