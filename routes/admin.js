const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const passport = require('passport');
const { ensureAdmin, ensureAuthenticated, forwardAuthenticated } = require('../config/auth');
const User = require('../models/User');
const Candidate = require('../models/candidate');
const Vote = require('../models/Vote');
const Election = require('../models/Election');

// Admin Dashboard
// Admin Dashboard Page
router.get('/dashboard', ensureAdmin, async (req, res) => {
    try {
        const elections = await Election.find();
        const candidates = await Candidate.find();
        const votes = await Vote.find().populate('userId').populate('candidateId').populate('electionId');

        // Determine election statuses
        const currentDate = new Date();
        const ongoingElections = elections.filter(election => election.startDate <= currentDate && currentDate <= election.endDate);
        const upcomingElections = elections.filter(election => election.startDate > currentDate);
        const endedElections = elections.filter(election => election.endDate < currentDate);

        // Aggregated vote data
        const voteData = await Vote.aggregate([
            {
                $group: {
                    _id: "$electionId",
                    totalVotes: { $sum: 1 },
                }
            }
        ]);

        res.render('admin/dashboard', {
            title: 'Admin Dashboard',
            user: req.user,
            elections: elections,
            candidates: candidates,
            votes: votes,
            ongoingElections: ongoingElections,
            upcomingElections: upcomingElections,
            endedElections: endedElections,
            voteData: voteData
        });
    } catch (err) {
        console.error(err);
        res.redirect('/');
    }
});

// Add Candidate Form
router.get('/create-candidate', ensureAdmin, (req, res) => res.render('admin/create-candidate', {
    title: 'Create Candidate',
    errors: []
}));

// Create Candidate
router.post('/create-candidate', ensureAdmin, async (req, res) => {
    const { name, age, party, biography } = req.body;
    let errors = [];

    if (!name || !age || !party || !biography) {
        errors.push({ msg: 'Please enter all fields' });
    }

    if (errors.length > 0) {
        res.render('admin/create-candidate', {
            errors: errors,
            name,
            age,
            party,
            biography,
            title: 'Create Candidate'
        });
    } else {
        const newCandidate = new Candidate({ name, age, party, biography });
        await newCandidate.save();
        req.flash('success_msg', 'Candidate added');
        res.redirect('/admin/candidates');
    }
});

// List Candidates
router.get('/candidates', ensureAdmin, async (req, res) => {
    const candidates = await Candidate.find();
    res.render('admin/candidates', {
        title: 'Manage Candidates',
        success_msg: req.flash('success_msg'),
        candidates
    });
});

// View Candidate Details
router.get('/candidates/:id', ensureAdmin, async (req, res) => {
    try {
        const candidate = await Candidate.findById(req.params.id);
        const elections = await Election.find({ candidates: req.params.id });
        const votes = await Vote.find({ candidateId: req.params.id });

        const totalVotes = votes.length;
        const totalElections = elections.length;

        const electionDetails = await Promise.all(elections.map(async (election) => {
            const votesInElection = votes.filter(vote => vote.electionId.equals(election._id)).length;
            return {
                name: election.name,
                startDate: election.startDate,
                endDate: election.endDate,
                votes: votesInElection
            };
        }));

        res.render('admin/candidate-details', {
            title: 'Candidate Details',
            candidate: candidate,
            totalElections: totalElections,
            totalVotes: totalVotes,
            electionDetails: electionDetails
        });
    } catch (err) {
        console.error(err);
        res.redirect('/admin/candidates');
    }
});


// Remove Candidate
router.post('/remove-candidate/:id', ensureAdmin, async (req, res) => {
    await Candidate.findByIdAndRemove(req.params.id);
    req.flash('success_msg', 'Candidate removed');
    res.redirect('/admin/candidates');
});

// Edit Candidate Form
router.get('/candidates/:id/edit', ensureAdmin, async (req, res) => {
    try {
        const candidate = await Candidate.findById(req.params.id);
        res.render('admin/edit-candidate', {
            title: 'Edit Candidate',
            candidate: candidate,
            errors: []
        });
    } catch (err) {
        console.error(err);
        res.redirect('/admin/candidates');
    }
});

// Update Candidate
router.post('/candidates/:id/edit', ensureAdmin, async (req, res) => {
    const { name, age, party, biography } = req.body;
    let errors = [];

    if (!name || !age || !party || !biography) {
        errors.push({ msg: 'Please enter all fields' });
    }

    if (errors.length > 0) {
        const candidate = { _id: req.params.id, name, age, party, biography };
        res.render('admin/edit-candidate', {
            errors: errors,
            title: 'Edit Candidate',
            candidate: candidate
        });
    } else {
        try {
            await Candidate.findByIdAndUpdate(req.params.id, { name, age, party, biography });
            req.flash('success_msg', 'Candidate updated');
            res.redirect('/admin/candidates');
        } catch (err) {
            console.error(err);
            req.flash('error_msg', 'An error occurred while updating the candidate');
            res.redirect('/admin/candidates');
        }
    }
});


// View Votes Page
router.get('/votes', ensureAdmin, async (req, res) => {
    const elections = await Election.find().populate('candidates');
    const votes = await Vote.find().populate('userId').populate('candidateId');
    res.render('admin/votes', {
        title: 'View Votes',
        elections: elections,
        votes: votes
    });
});

// Admin Login Page
router.get('/login', forwardAuthenticated, (req, res) => res.render('admin/login', { title: 'Admin Login' }));

// Admin Login
router.post('/login', (req, res, next) => {
    passport.authenticate('local', {
        successRedirect: '/admin/dashboard',
        failureRedirect: '/admin/login',
        failureFlash: true
    })(req, res, next);
});

// Admin Logout
router.get('/logout', (req, res) => {
    req.logout();
    req.flash('success_msg', 'You are logged out');
    res.redirect('/admin/login');
});

// Admin Registration Page
router.get('/register', (req, res) => res.render('admin/register', {
    title: 'Register Admin',
    errors: []
}));

// Admin Registration
router.post('/register', async (req, res) => {
    const { name, email, password, password2 } = req.body;
    let errors = [];

    if (!name || !email || !password || !password2) {
        errors.push({ msg: 'Please enter all fields' });
    }

    if (password !== password2) {
        errors.push({ msg: 'Passwords do not match' });
    }

    if (password.length < 6) {
        errors.push({ msg: 'Password must be at least 6 characters' });
    }

    if (errors.length > 0) {
        res.render('admin/register', {
            errors,
            name,
            email,
            password,
            password2,
            title: 'Register Admin'
        });
    } else {
        User.findOne({ email: email }).then(user => {
            if (user) {
                errors.push({ msg: 'Email already exists' });
                res.render('admin/register', {
                    errors,
                    name,
                    email,
                    password,
                    password2,
                    title: 'Register Admin'
                });
            } else {
                const newUser = new User({
                    name,
                    email,
                    password,
                    isAdmin: true // Set to true for admin registration
                });

                bcrypt.genSalt(10, (err, salt) => {
                    bcrypt.hash(newUser.password, salt, (err, hash) => {
                        if (err) throw err;
                        newUser.password = hash;
                        newUser.save()
                            .then(user => {
                                req.flash('success_msg', 'Admin registered');
                                res.redirect('/admin');
                            })
                            .catch(err => console.log(err));
                    });
                });
            }
        });
    }
});

module.exports = router;
