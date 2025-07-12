const mongoose = require("mongoose");
const { Schema } = mongoose
const Lab_assistantSchema = new Schema({
    email: { 
        type: String, 
        unique: true, 
        required: true 
    },
    passward:{
        type: String,
        require: true
    },
    name: { 
        type: String, 
        required: true 
    },
    lab_name: { 
        type: String, 
        required: true 
    },
    Number: { 
        type: Number, 
        required: true 
    },
    isActivated: { 
        type: Boolean, 
        default: false 
    }
});

module.exports = mongoose.model('lab_assistant', Lab_assistantSchema);