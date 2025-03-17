const mongoose = require("mongoose");
const { Schema } = mongoose
const AdminSchema = new Schema({
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
    Number: { 
        type: Number, 
        required: true 
    }
});

module.exports = mongoose.model('admin', AdminSchema);