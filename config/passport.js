const LocalStrategy = require('passport-local').Strategy;
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Load User model
const User = require('../models/User');

module.exports = function(passport) {
    passport.use(
        new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
            try {
                // Match user
                const user = await User.findOne({ email: email });
                if (!user) {
                    return done(null, false, { message: 'That email is not registered' });
                }

                // Log for debugging
                console.log('User found:', user.email);
                console.log('Entered password:', password);
                console.log('Stored hashed password:', typeof user.password);

                // Match password
                const isMatch = await bcrypt.compare(password, user.password);
                
                if (isMatch) {
                    console.log('Password match successful');
                    return done(null, user);
                } else {
                    console.log('Password mismatch');
                    return done(null, false, { message: 'Password incorrect' });
                }
            } catch (err) {
                console.error('Authentication error:', err);
                return done(err);
            }
        })
    );

    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    passport.deserializeUser(function(id, done) {
        User.findById(id, function(err, user) {
            done(err, user);
        });
    });
};
