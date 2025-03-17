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
        required: true
    },
    Number:{
        type: Number,
        required: true
    }
});

module.exports=mongoose.model('doctor',DoctorShema);