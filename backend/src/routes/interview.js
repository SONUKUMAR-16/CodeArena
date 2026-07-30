// routes/interview.js
const express = require('express');
const interviewRouter = express.Router();
const { usermiddleware } = require('../middleware/usermiddleware');
const {
    startInterview,
    sendMessage,
    submitInterview,
    getInterviews,
    getInterviewDetails
} = require('../controllers/interview');

// Start a new role-based interview
interviewRouter.post('/start', usermiddleware, startInterview);

// Send a message during interview
interviewRouter.post('/:id/message', usermiddleware, sendMessage);

// Submit/complete interview
interviewRouter.post('/:id/submit', usermiddleware, submitInterview);

// Get all interviews for user
interviewRouter.get('/', usermiddleware, getInterviews);

// Get interview details
interviewRouter.get('/:id', usermiddleware, getInterviewDetails);

module.exports = interviewRouter;