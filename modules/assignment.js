const mongoose = require("mongoose");
const { Schema } = mongoose
const assignmentSchema = new Schema({
    admin_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "admin",
        required: true
    },
    doctor_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "doctor",
        required: true
    },
    patient_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "patient",
        required: true
    }
});

module.exports = mongoose.model('assignment', assignmentSchema);