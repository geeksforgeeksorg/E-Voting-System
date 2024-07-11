const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../config/auth');
const Vote = require('../models/Vote');
const Election = require('../models/Election');
const Candidate = require('../models/candidate');

// GET route for voting page
router.get('/', ensureAuthenticated, async (req, res) => {
    try {
        const elections = await Election.find({ endDate: { $gte: new Date() } }); // Fetch only active elections
        res.render('vote', { title: 'Vote', elections });
    } catch (err) {
        console.error(err);
        res.redirect('/dashboard');
    }
});

// Get candidates for a specific election
router.get('/candidates/:electionId', ensureAuthenticated, async (req, res) => {
    try {
        const candidates = await Candidate.find({ electionIds: { $nin: [req.params.id] } });
        res.json(candidates);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch candidates' });
    }
});


// POST route for casting a vote
router.post('/', ensureAuthenticated, async (req, res) => {
    if (req.user.isAdmin) {
        req.flash('error_msg', 'Admins cannot vote.');
        return res.redirect('/dashboard');
    }

    const { candidateId, electionId } = req.body;

    if (!candidateId || !electionId) {
        req.flash('error_msg', 'Please select a candidate and an election.');
        return res.redirect('/vote');
    }

    try {
        // Check if the user has already voted in this election
        const existingVote = await Vote.findOne({ userId: req.user.id, electionId: electionId });
        if (existingVote) {
            req.flash('error_msg', 'You have already voted in this election.');
            return res.redirect('/vote');
        }

        // Create a new vote
        const vote = new Vote({
            userId: req.user.id,
            candidateId: candidateId,
            electionId: electionId
        });

        await vote.save();

        // Increment the vote count for the candidate
        await Candidate.findByIdAndUpdate(candidateId, { $inc: { votes: 1 } });

        req.flash('success_msg', 'Your vote has been cast.');
        res.redirect('/vote');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'An error occurred while casting your vote.');
        res.redirect('/vote');
    }
});

module.exports = router;
