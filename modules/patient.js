const mongoose = require('mongoose');
const { Schema } = mongoose;

// Patient identity and auth only.
// All test data and ML predictions live in patientdata.js linked by patient ObjectId.
// The embedded skinCancer / liverCirrhosis / cvd fields from the old version have
// been removed - they duplicated patientdata.js with inconsistent field names.

const PatientSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    Age: {
        type: Number,
        required: true
    },
    sex: {
        type: String,
        enum: ['F', 'M', 'O'],
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    passward: {
        type: String,
        // required: true
        default: null
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

module.exports = mongoose.model('patient', PatientSchema);