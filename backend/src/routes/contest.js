// routes/contest.js
const express = require('express');
const contestRouter = express.Router();
const { usermiddleware } = require('../middleware/usermiddleware');
const { adminmiddleware } = require('../middleware/adminmiddleware');
const {
    createContest,
    updateContest,
    deleteContest,
    registerForContest,
    unregisterFromContest,
    submitContestSolution,
    getContestRankings,
    getLiveLeaderboard,
    getMyRank,
    getContests,
    getContestById,
    startContest,
    endContest,
    getContestProblems,
    getContestProblemById,
    getMySubmissions,
    getContestStandings
} = require('../controllers/contest');

// Admin routes - must be before /:id to avoid "create" being treated as an id
contestRouter.post('/create', adminmiddleware, createContest);

// Public routes (with auth)
contestRouter.get('/', usermiddleware, getContests);
contestRouter.get('/:id', usermiddleware, getContestById);

// Contest problems
contestRouter.get('/:id/problems', usermiddleware, getContestProblems);
contestRouter.get('/:id/problem/:problemId', usermiddleware, getContestProblemById);

// STEP 5 & 6: Optimized Leaderboard & Standings APIs
contestRouter.get('/:id/standings', usermiddleware, getContestStandings);
contestRouter.get('/:id/rankings', usermiddleware, getContestRankings);
contestRouter.get('/:id/leaderboard', usermiddleware, getLiveLeaderboard);
contestRouter.get('/:id/my-rank', usermiddleware, getMyRank);
contestRouter.get('/:id/rank', usermiddleware, getMyRank);

// My submissions
contestRouter.get('/:id/my-submissions', usermiddleware, getMySubmissions);

// Registration
contestRouter.post('/:id/register', usermiddleware, registerForContest);
contestRouter.post('/:id/unregister', usermiddleware, unregisterFromContest);

// Submission
contestRouter.post('/:id/submit', usermiddleware, submitContestSolution);

// Admin routes
contestRouter.patch('/:id', adminmiddleware, updateContest);
contestRouter.delete('/:id', adminmiddleware, deleteContest);
contestRouter.post('/:id/start', adminmiddleware, startContest);
contestRouter.post('/:id/end', adminmiddleware, endContest);

module.exports = contestRouter;