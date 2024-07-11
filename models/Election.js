const mongoose = require('mongoose');

const ElectionSchema = new mongoose.Schema({
    name: {
        type: String,
       
    },
    description: {
        type: String,
       
    },
    startDate: {
        type: Date,
       
    },
    endDate: {
        type: Date,
       
    },
    location: {
        type: String,
       
    },
    type: {
        type: String,
       
    },
    eligibility: {
        type: String,
       
    },
    candidates: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Candidate'
    }]
});

module.exports = mongoose.model('Election', ElectionSchema);
