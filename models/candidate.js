const mongoose = require('mongoose');

const CandidateSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    age: {
        type: Number,
        required: true
    },
    party: {
        type: String,
        required: true
    },
    biography: {
        type: String,
        required: true
    },
    electionIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Election'
    }]
});

module.exports = mongoose.model('Candidate', CandidateSchema);
