// backend/src/routes/profile.js
const express = require('express');
const profileRouter = express.Router();
const { usermiddleware } = require('../middleware/usermiddleware');
const {
    getProfile,
    getProfileStats
} = require('../controllers/profile');

// Public test route (no auth required) - for debugging
profileRouter.get('/test/:username', async (req, res) => {
    try {
        const User = require('../models/user');
        const user = await User.findOne({ firstname: req.params.username });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, user: { firstname: user.firstname, email: user.emailid } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get profile statistics
profileRouter.get('/stats', usermiddleware, getProfileStats);

// Get current user's profile
profileRouter.get('/me', usermiddleware, (req, res, next) => {
    req.params.username = req.user.firstname;
    next();
}, getProfile);

// Get profile by username
profileRouter.get('/:username', usermiddleware, getProfile);

module.exports = profileRouter;