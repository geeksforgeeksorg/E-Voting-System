const express = require('express');
const router = express.Router();
const { ensureAdmin } = require('../config/auth');
const Candidate = require("../models/candidate")
const Election = require('../models/Election');
const Vote = require("../models/Vote")

// Election Creation Form
// Election Creation Form
router.get('/create', ensureAdmin, async (req, res) => {
    try {
        const candidates = await Candidate.find();
        res.render('admin/create-election', { title: 'Create Election', errors: [], candidates });
    } catch (err) {
        console.error(err);
        res.redirect('/admin/dashboard');
    }
});

// Create Election
router.post('/create', ensureAdmin, async (req, res) => {
    const { name, description, startDate, endDate, location, type, eligibility, candidates } = req.body;
    let errors = [];

    if (!name || !description || !startDate || !endDate || !location || !type || !eligibility) {
        errors.push({ msg: 'Please enter all fields' });
    }

    if (errors.length > 0) {
        const allCandidates = await Candidate.find();
        res.render('admin/create-election', {
            errors,
            name,
            description,
            startDate,
            endDate,
            location,
            type,
            eligibility,
            candidates: allCandidates,
            title: 'Create Election'
        });
    } else {
        const newElection = new Election({ name, description, startDate, endDate, location, type, eligibility, candidates });
        await newElection.save();
        req.flash('success_msg', 'Election created');
        res.redirect('/election/elections');
    }
});


// List Elections
router.get('/elections', ensureAdmin, async (req, res) => {
    try {
        const filter = req.query.filter || 'all';
        let elections;

        if (filter === 'running') {
            elections = await Election.find({ endDate: { $gte: new Date() } }).populate('candidates');
        } else if (filter === 'ended') {
            elections = await Election.find({ endDate: { $lt: new Date() } }).populate('candidates');
        } else {
            elections = await Election.find().populate('candidates');
        }

        res.render('admin/elections', {
            title: 'Manage Elections',
            elections: elections,
            filter: filter
        });
    } catch (err) {
        console.error(err);
        res.redirect('/admin/dashboard');
    }
});

// View Election Details
router.get('/:id', ensureAdmin, async (req, res) => {
    try {
        const election = await Election.findById(req.params.id).populate('candidates');
        const votes = await Vote.find({ electionId: req.params.id }).populate('candidateId').populate('userId');

        const voteCounts = await Vote.aggregate([
            { $match: { electionId: election._id } },
            { $group: { _id: "$candidateId", totalVotes: { $sum: 1 } } }
        ]);

        const candidatesWithVotes = await Promise.all(election.candidates.map(async candidate => {
            const candidateVoteCount = voteCounts.find(vote => vote._id.toString() === candidate._id.toString());
            const votes = candidateVoteCount ? candidateVoteCount.totalVotes : 0;
            return {
                ...candidate._doc,
                totalVotes: votes
            };
        }));

        res.render('admin/election-details', {
            title: 'Election Details',
            election,
            candidatesWithVotes,
            votes
        });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'An error occurred while fetching election details');
        res.redirect('/admin/elections');
    }
});


// Edit Election Form
router.get('/:id/edit', ensureAdmin, async (req, res) => {
    try {
        const election = await Election.findById(req.params.id).populate('candidates');
        const candidates = await Candidate.find();
        if (!election.candidates) {
            election.candidates = []; // Ensure candidates is an array
        }
        res.render('admin/edit-election', { title: 'Edit Election', errors: [], election, candidates });
    } catch (err) {
        console.error(err);
        res.redirect('/election/elections');
    }
});


// Edit Election
router.post('/:id/edit', ensureAdmin, async (req, res) => {
    const { name, description, startDate, endDate, location, type, eligibility, candidates } = req.body;
    let errors = [];

    if (!name || !description || !startDate || !endDate || !location || !type || !eligibility) {
        errors.push({ msg: 'Please enter all fields' });
    }

    if (errors.length > 0) {
        const election = await Election.findById(req.params.id);
        const allCandidates = await Candidate.find();
        res.render('admin/edit-election', {
            errors,
            election,
            name,
            description,
            startDate,
            endDate,
            location,
            type,
            eligibility,
            candidates: allCandidates,
            title: 'Edit Election'
        });
    } else {
        await Election.findByIdAndUpdate(req.params.id, { name, description, startDate, endDate, location, type, eligibility, candidates });
        req.flash('success_msg', 'Election updated');
        res.redirect('/election/elections');
    }
});

// End Election
router.post('/:id/end', ensureAdmin, async (req, res) => {
    try {
        await Election.findByIdAndUpdate(req.params.id, { endDate: new Date() });
        req.flash('success_msg', 'Election ended');
        res.redirect('/election/elections');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'An error occurred while ending the election');
        res.redirect('/election/elections');
    }
});


// Add Candidates to Election Page
router.get('/:id/add-candidates', ensureAdmin, async (req, res) => {
    try {
        const election = await Election.findById(req.params.id).populate('candidates');
        const allCandidates = await Candidate.find();
        if (!election.candidates) {
            election.candidates = []; // Ensure candidates is an array
        }
        res.render('admin/add-candidates', {
            title: 'Add Candidates',
            election: election,
            allCandidates: allCandidates
        });
    } catch (err) {
        console.error(err);
        res.redirect('/admin/dashboard');
    }
});


// Add Candidates to Election
router.post('/:id/add-candidates', ensureAdmin, async (req, res) => {
    try {
        const { candidateId } = req.body;
        const election = await Election.findById(req.params.id);
        const candidate = await Candidate.findById(candidateId);

        if (!election.candidates.includes(candidateId)) {
            election.candidates.push(candidateId);
            await election.save();
        }

        if (!candidate.electionIds.includes(req.params.id)) {
            candidate.electionIds.push(req.params.id);
            await candidate.save();
        }

        req.flash('success_msg', 'Candidate added to election successfully');
        res.redirect(`/election/${req.params.id}/add-candidates`);
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'An error occurred while adding the candidate to the election');
        res.redirect('/admin/dashboard');
    }
});





module.exports = router;
