const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../config/auth');
const Candidate = require('../models/candidate');
const Election = require("../models/Election")
const Vote = require("../models/Vote")

// Results Page
// Results Page
router.get('/', ensureAuthenticated, async (req, res) => {
    try {
        const currentDate = new Date();
        const closedElections = await Election.find({ endDate: { $lt: currentDate } }).populate('candidates');

        const electionResults = await Promise.all(closedElections.map(async (election) => {
            const votes = await Vote.find({ electionId: election._id }).populate('candidateId');
            const results = election.candidates.map(candidate => {
                const voteCount = votes.filter(vote => vote.candidateId._id.toString() === candidate._id.toString()).length;
                return { candidate, voteCount };
            });
            return { election, results };
        }));

        res.render('result', {
            title: 'Election Results',
            electionResults
        });
    } catch (err) {
        console.error(err);
        res.redirect('/');
    }
});



module.exports = router;
