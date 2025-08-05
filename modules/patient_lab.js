const mongoose= require("mongoose");
const { Schema } = mongoose;

const patient_lab = new Schema({
    patient_id: { 
        type: Schema.Types.ObjectId, 
        ref: 'patient', 
        required: true 
    },
    lab_assistant: { 
        type: Schema.Types.ObjectId, 
        ref: 'lab_assistant', required: true 
    },
    doctor_id: {
        type: Schema.Types.ObjectId,
        ref: 'doctor',
        required: true
    }
});

module.exports = mongoose.model("patient_lab", patient_lab);
