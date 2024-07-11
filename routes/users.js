const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcrypt');
const passport = require('passport');
const Vote = require("../models/Vote");
const Election = require("../models/Election");
const Candidate = require("../models/candidate")
const { forwardAuthenticated, ensureAuthenticated } = require('../config/auth');

// Register Page
router.get('/register', forwardAuthenticated, (req, res) => res.render('register', { title: 'Register', errors: [] }));

// Register
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
        return res.render('register', {
            errors,
            name,
            email,
            password,
            password2,
            title: 'Register'
        });
    }

    try {
        const existingUser = await User.findOne({ email: email });

        if (existingUser) {
            errors.push({ msg: 'Email already exists' });
            return res.render('register', {
                errors,
                name,
                email,
                password,
                password2,
                title: 'Register'
            });
        }

        const newUser = new User({
            name,
            email,
            password
        });

        // Hash password before saving
        const hash = await bcrypt.hash(newUser.password, 10);
        console.log(hash)
        newUser.password = hash;
        await newUser.save();

        req.flash('success_msg', 'You are now registered and can log in');
        res.redirect('/users/login');
    } catch (error) {
        console.error('Registration error:', error);
        errors.push({ msg: 'An error occurred during registration' });
        res.render('register', {
            errors,
            name,
            email,
            password,
            password2,
            title: 'Register'
        });
    }
});

// Login Page
router.get('/login', forwardAuthenticated, (req, res) => res.render('login', { title: 'Login' }));

// Login
router.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            return next(err);
        }
        if (!user) {
            req.flash('error_msg', 'Invalid credentials');
            return res.redirect('/users/login');
        }
        req.logIn(user, (err) => {
            if (err) {
                return next(err);
            }
            if (user.isAdmin) {
                return res.redirect('/admin/dashboard');
            } else {
                return res.redirect('/users/dashboard');
            }
        });
    })(req, res, next);
});

// User Dashboard
router.get('/dashboard', ensureAuthenticated, async (req, res) => {
    if (req.user.isAdmin) {
        return res.redirect('/admin/dashboard');
    }
    try {
        const userVotes = await Vote.find({ userId: req.user.id }).populate('candidateId').populate('electionId');
        const elections = await Election.find();

        res.render('dashboard', {
            title: 'Dashboard',
            user: req.user,
            userVotes: userVotes,
            elections: elections
        });
    } catch (err) {
        console.error(err);
        res.redirect('/');
    }
});

// View Vote History
router.get('/vote-history', ensureAuthenticated, async (req, res) => {
    try {
        const votes = await Vote.find({ userId: req.user._id }).populate('electionId').populate('candidateId');
        res.render('vote-history', { title: "Vote-history", votes });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'An error occurred while fetching vote history');
        res.redirect('/dashboard');
    }
});

// View Candidate Profile
router.get('/candidate/:id', ensureAuthenticated, async (req, res) => {
    try {
        const candidate = await Candidate.findById(req.params.id);
        const elections = await Election.find({ candidates: candidate._id });
        const votes = await Vote.find({ candidateId: candidate._id });

        const totalElections = elections.length;
        const totalVotes = votes.length;

        const electionDetails = await Promise.all(elections.map(async (election) => {
            const electionVotes = await Vote.find({ electionId: election._id, candidateId: candidate._id }).count();
            return {
                name: election.name,
                startDate: election.startDate,
                endDate: election.endDate,
                votes: electionVotes
            };
        }));

        res.render('candidate-profile', {
            title: "View candidate details",
            candidate,
            totalElections,
            totalVotes,
            electionDetails,
            success_msg: req.flash('success_msg'),
            error_msg: req.flash('error_msg')
        });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'An error occurred while fetching candidate details');
        res.redirect('/dashboard');
    }
});

// View Profile
router.get('/profile', ensureAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        res.render('profile', { title: "View Profile", user, success_msg: req.flash('success_msg'), error_msg: req.flash('error_msg') });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'An error occurred while fetching your profile');
        res.redirect('/dashboard');
    }
});

// Edit Profile Form
router.get('/profile/edit', ensureAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        res.render('edit-profile', {title: "Edit Profile", user, success_msg: req.flash('success_msg'), error_msg: req.flash('error_msg') });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'An error occurred while fetching your profile');
        res.redirect('/dashboard');
    }
});

// Edit Profile
router.post('/profile/edit', ensureAuthenticated, async (req, res) => {
    try {
        const { name, email } = req.body;
        await User.findByIdAndUpdate(req.user._id, { name, email });
        req.flash('success_msg', 'Profile updated successfully');
        res.redirect('/users/profile');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'An error occurred while updating your profile');
        res.redirect('/users/profile/edit');
    }
});

// Logout
router.get('/logout', (req, res) => {
    req.logout();
    req.flash('success_msg', 'You are logged out');
    res.redirect('/users/login');
});

module.exports = router;
