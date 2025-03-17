const mongoose = require("mongoose");
const { Schema } = mongoose
const Lab_assistantSchema = new Schema({
    Email: { 
        type: Number, 
        unique: true, 
        required: true 
    },
    password:{
        type: String,
        require: true
    },
    name: { 
        type: String, 
        required: true 
    },
    lab_id: { 
        type: Number, 
        required: true 
    }
});

module.exports = mongoose.model('Lab_assistant', Lab_assistantSchema);