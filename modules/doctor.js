const mongoose = require("mongoose");
const {Schema}=mongoose
const DoctorShema= new Schema({
    name:{
        type: String,
        required: true
    },
    email:{
        type: String,
        required: true,
        unique: true
    },
    passward:{
        type: String,
        // required: true
        default: null
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

module.exports=mongoose.model('doctor',DoctorShema);