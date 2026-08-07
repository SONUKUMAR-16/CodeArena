// controllers/contest.js
const Contest = require('../models/contest');
const ContestSubmission = require('../models/contestSubmission');
const Problem = require('../models/problem');
const User = require('../models/user');
const Submission = require('../models/submission');
const { getlanguagebyid, submitbatch, submittoken } = require('../utils/problemutility');
const { 
    processContestSubmissionResult, 
    getLeaderboard, 
    getUserRank 
} = require('../services/contestScoringService');

// ==================== HELPER FUNCTIONS ====================

const calculateScore = (contest, timeTaken, attempts) => {
    const baseScore = 100;
    const timePenalty = Math.floor(timeTaken / 60);
    const attemptPenalty = (attempts - 1) * (contest.penalty || 0);
    return Math.max(0, baseScore - timePenalty - attemptPenalty);
};

const scheduleContestStatusUpdate = (contest) => {
    const now = new Date();
    const startTime = new Date(contest.startTime);
    const endTime = new Date(contest.endTime);

    if (startTime > now) {
        const timeUntilStart = startTime.getTime() - now.getTime();
        setTimeout(async () => {
            await Contest.findByIdAndUpdate(contest._id, { status: 'active' });
            console.log(`Contest ${contest._id} started`);
        }, timeUntilStart);
    }

    if (endTime > now) {
        const timeUntilEnd = endTime.getTime() - now.getTime();
        setTimeout(async () => {
            await Contest.findByIdAndUpdate(contest._id, { status: 'completed' });
            console.log(`Contest ${contest._id} ended`);
        }, timeUntilEnd);
    }
};

const updateContestLeaderboard = async (contestId) => {
    try {
        const submissions = await ContestSubmission.find({ 
            contestId: contestId,
            isCorrect: true 
        }).populate('userId', 'firstname email');

        const userScores = {};

        submissions.forEach(sub => {
            const userId = sub.userId._id.toString();
            if (!userScores[userId]) {
                userScores[userId] = {
                    userId: sub.userId._id,
                    username: sub.userId.firstname,
                    email: sub.userId.email,
                    score: 0,
                    problemsSolved: 0,
                    totalTime: 0
                };
            }
            userScores[userId].score += sub.score || 100;
            userScores[userId].problemsSolved += 1;
            userScores[userId].totalTime += sub.timeTaken || 0;
        });

        const rankings = Object.values(userScores);
        rankings.sort((a, b) => {
            if (a.score !== b.score) return b.score - a.score;
            return a.totalTime - b.totalTime;
        });

        console.log(`📊 Leaderboard updated for contest ${contestId}`);
        return rankings;

    } catch (error) {
        console.error('Update contest leaderboard error:', error);
        return [];
    }
};

const getLiveContestLeaderboard = async (contestId) => {
    try {
        const submissions = await ContestSubmission.find({ 
            contestId: contestId,
            isCorrect: true 
        }).populate('userId', 'firstname email');

        const userScores = {};

        submissions.forEach(sub => {
            const userId = sub.userId._id.toString();
            if (!userScores[userId]) {
                userScores[userId] = {
                    userId: sub.userId._id,
                    username: sub.userId.firstname,
                    email: sub.userId.email,
                    score: 0,
                    problemsSolved: 0,
                    totalTime: 0,
                    lastSubmission: sub.submittedAt
                };
            }
            userScores[userId].score += sub.score || 100;
            userScores[userId].problemsSolved += 1;
            userScores[userId].totalTime += sub.timeTaken || 0;
        });

        const rankings = Object.values(userScores);
        rankings.sort((a, b) => {
            if (a.score !== b.score) return b.score - a.score;
            return a.totalTime - b.totalTime;
        });

        rankings.forEach((item, index) => {
            item.rank = index + 1;
        });

        return rankings;

    } catch (error) {
        console.error('Get live contest leaderboard error:', error);
        return [];
    }
};

// ==================== CONTEST MANAGEMENT ====================

const createContest = async (req, res) => {
    try {
        const { 
            title, description, problems, startTime, endTime, 
            duration, isPublic, maxParticipants, rules, scoring,
            showParticipants, showStandings
        } = req.body;

        if (!title || !description || !problems || !startTime || !endTime || !duration) {
            return res.status(400).json({ 
                success: false, 
                message: "Missing required fields" 
            });
        }

        const problemDocs = await Problem.find({ _id: { $in: problems } });
        if (problemDocs.length !== problems.length) {
            return res.status(400).json({ 
                success: false, 
                message: "One or more problems not found" 
            });
        }

        const start = new Date(startTime);
        const end = new Date(endTime);
        if (start >= end) {
            return res.status(400).json({ 
                success: false, 
                message: "End time must be after start time" 
            });
        }

        const contest = await Contest.create({
            title,
            description,
            problems,
            startTime: start,
            endTime: end,
            duration,
            createdBy: req.user._id,
            isPublic: isPublic !== undefined ? isPublic : true,
            maxParticipants: maxParticipants || 100,
            rules: rules || 'Standard contest rules apply.',
            scoring: scoring || 'standard',
            showParticipants: showParticipants !== undefined ? showParticipants : true,
            showStandings: showStandings !== undefined ? showStandings : true
        });

        scheduleContestStatusUpdate(contest);

        res.status(201).json({
            success: true,
            message: 'Contest created successfully',
            contest
        });

    } catch (error) {
        console.error('Create contest error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to create contest',
            error: error.message 
        });
    }
};

const updateContest = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const contest = await Contest.findById(id);
        if (!contest) {
            return res.status(404).json({ 
                success: false, 
                message: 'Contest not found' 
            });
        }

        if (contest.status === 'active') {
            return res.status(400).json({ 
                success: false, 
                message: 'Cannot update active contest' 
            });
        }

        if (updates.problems && contest.status !== 'upcoming') {
            return res.status(400).json({ 
                success: false, 
                message: 'Cannot change problems after contest has started' 
            });
        }

        const updatedContest = await Contest.findByIdAndUpdate(
            id,
            updates,
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: 'Contest updated successfully',
            contest: updatedContest
        });

    } catch (error) {
        console.error('Update contest error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to update contest',
            error: error.message 
        });
    }
};

const deleteContest = async (req, res) => {
    try {
        const { id } = req.params;

        const contest = await Contest.findById(id);
        if (!contest) {
            return res.status(404).json({ 
                success: false, 
                message: 'Contest not found' 
            });
        }

        if (contest.status === 'active' || contest.status === 'completed') {
            return res.status(400).json({ 
                success: false, 
                message: 'Cannot delete active or completed contest' 
            });
        }

        await ContestSubmission.deleteMany({ contestId: id });
        await Contest.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: 'Contest deleted successfully'
        });

    } catch (error) {
        console.error('Delete contest error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to delete contest',
            error: error.message 
        });
    }
};

const startContest = async (req, res) => {
    try {
        const { id } = req.params;

        const contest = await Contest.findById(id);
        if (!contest) {
            return res.status(404).json({
                success: false,
                message: 'Contest not found'
            });
        }

        if (contest.status !== 'upcoming') {
            return res.status(400).json({
                success: false,
                message: `Cannot start contest with status: ${contest.status}`
            });
        }

        contest.status = 'active';
        contest.startTime = new Date();
        contest.endTime = new Date(Date.now() + contest.duration * 60 * 1000);
        await contest.save();

        res.status(200).json({
            success: true,
            message: 'Contest started successfully',
            contest
        });

    } catch (error) {
        console.error('Start contest error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to start contest',
            error: error.message
        });
    }
};

const endContest = async (req, res) => {
    try {
        const { id } = req.params;

        const contest = await Contest.findById(id);
        if (!contest) {
            return res.status(404).json({
                success: false,
                message: 'Contest not found'
            });
        }

        if (contest.status !== 'active') {
            return res.status(400).json({
                success: false,
                message: `Cannot end contest with status: ${contest.status}`
            });
        }

        contest.status = 'completed';
        contest.endTime = new Date();
        await contest.save();

        const leaderboardService = require('../services/leaderboardService');
        const standings = await leaderboardService.getContestLeaderboard(id, 1, 100);

        const io = req.app.get('io');
        if (io) {
            const payload = {
                contestId: id.toString(),
                status: 'completed',
                finalRankings: standings.leaderboard
            };
            io.to(`contest:${id}`).emit('contest:ended', payload);
            io.to(`contest-${id}`).emit('contest:ended', payload);
        }

        res.status(200).json({
            success: true,
            message: 'Contest ended successfully',
            contest,
            finalRankings: standings.leaderboard
        });

    } catch (error) {
        console.error('End contest error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to end contest',
            error: error.message
        });
    }
};

// ==================== CONTEST PARTICIPATION ====================

const registerForContest = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const contest = await Contest.findById(id);
        if (!contest) {
            return res.status(404).json({ 
                success: false, 
                message: 'Contest not found' 
            });
        }

        if (contest.status !== 'upcoming') {
            return res.status(400).json({ 
                success: false, 
                message: 'Contest is not open for registration' 
            });
        }

        const alreadyRegistered = contest.participants.some(
            p => p.user.toString() === userId.toString()
        );
        if (alreadyRegistered) {
            return res.status(400).json({ 
                success: false, 
                message: 'Already registered for this contest' 
            });
        }

        if (contest.participants.length >= contest.maxParticipants) {
            return res.status(400).json({ 
                success: false, 
                message: 'Contest is full' 
            });
        }

        contest.participants.push({ user: userId });
        await contest.save();

        res.status(200).json({
            success: true,
            message: 'Successfully registered for contest',
            contest: {
                id: contest._id,
                title: contest.title,
                startTime: contest.startTime,
                endTime: contest.endTime
            }
        });

    } catch (error) {
        console.error('Register for contest error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to register for contest',
            error: error.message 
        });
    }
};

const unregisterFromContest = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const contest = await Contest.findById(id);
        if (!contest) {
            return res.status(404).json({ 
                success: false, 
                message: 'Contest not found' 
            });
        }

        contest.participants = contest.participants.filter(
            p => p.user.toString() !== userId.toString()
        );
        await contest.save();

        res.status(200).json({
            success: true,
            message: 'Successfully unregistered from contest'
        });

    } catch (error) {
        console.error('Unregister from contest error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to unregister from contest',
            error: error.message 
        });
    }
};

// ==================== CONTEST SUBMISSION ====================

const submitContestSolution = async (req, res) => {
    try {
        const { id } = req.params;
        const { problemId, code, language } = req.body;
        const userId = req.user._id;

        const contest = await Contest.findById(id);
        if (!contest) {
            return res.status(404).json({ 
                success: false, 
                message: 'Contest not found' 
            });
        }

        const now = new Date();
        const isTimeActive = now >= new Date(contest.startTime) && now <= new Date(contest.endTime);
        const isAdmin = req.user?.role === 'admin';

        if (contest.status !== 'active' && !isTimeActive && !isAdmin) {
            return res.status(400).json({ 
                success: false, 
                message: 'Contest is not active' 
            });
        }

        const isRegistered = (contest.participants || []).some(
            p => (p?.user?._id?.toString() === userId.toString()) || (p?.user?.toString() === userId.toString())
        );

        if (!isRegistered) {
            contest.participants.push({ user: userId });
            await contest.save();
        }

        if (!contest.problems.includes(problemId)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Problem is not part of this contest' 
            });
        }

        const problem = await Problem.findById(problemId);
        if (!problem) {
            return res.status(404).json({ 
                success: false, 
                message: 'Problem not found' 
            });
        }

        const timeTaken = Math.floor((Date.now() - new Date(contest.startTime).getTime()) / 1000);

        let contestSubmission = await ContestSubmission.findOne({
            contestId: id,
            userId: userId,
            problemId: problemId
        });

        if (contestSubmission && contestSubmission.isCorrect) {
            return res.status(400).json({
                success: false,
                message: 'You have already solved this problem'
            });
        }

        const languageId = getlanguagebyid(language);
        if (!languageId) {
            return res.status(400).json({
                success: false,
                message: 'Unsupported language'
            });
        }

        const allTestCases = [...problem.visibletestcases, ...problem.hiddentestcases];
        const submissionBatch = allTestCases.map(test => ({
            stdin: test.input,
            expected_output: test.output,
            language_id: languageId,
            source_code: code
        }));

        const result = await submitbatch(submissionBatch);
        const tokens = result.map(value => value.token);
        const outputs = await submittoken(tokens);

        let testCasesPassed = 0;
        let status = 'accepted';
        let errorMessage = null;

        for (let i = 0; i < outputs.length; i++) {
            const output = outputs[i];
            const test = allTestCases[i];
            const actualStdout = (output.stdout || '').trim();
            const expectedOutput = (test?.output || '').trim();
            const statusId = output.status_id;
            const statusDesc = output.status?.description || '';

            const isPassed = statusId === 3 || (statusId <= 3 && actualStdout === expectedOutput && actualStdout !== '');

            if (isPassed) {
                testCasesPassed++;
            } else {
                if ([5, 9, 13, 14, 15, 16].includes(statusId) || statusDesc.toLowerCase().includes('time limit') || statusDesc.toLowerCase().includes('timeout') || statusDesc.toLowerCase().includes('output limit')) {
                    if (status === 'accepted') status = 'timeout';
                    if (!errorMessage) errorMessage = `Test case ${i + 1} failed: Time Limit Exceeded (TLE)`;
                } else if (statusId === 6 || statusDesc.toLowerCase().includes('compilation')) {
                    if (status === 'accepted') status = 'error';
                    if (!errorMessage) errorMessage = `Test case ${i + 1} failed: Compilation Error`;
                } else if (statusId >= 7 || statusDesc.toLowerCase().includes('runtime') || statusDesc.toLowerCase().includes('memory')) {
                    if (status === 'accepted') status = 'error';
                    if (!errorMessage) errorMessage = `Test case ${i + 1} failed: ${statusDesc || 'Runtime Error'}`;
                } else {
                    if (status === 'accepted') status = 'wrong';
                    if (!errorMessage) errorMessage = `Test case ${i + 1} failed: Wrong Answer`;
                }
            }
        }

        const isCorrect = status === 'accepted';

        const submission = await Submission.create({
            problemid: problemId,
            userid: userId,
            code,
            language,
            status: isCorrect ? 'accepted' : status,
            testcasespassed: testCasesPassed,
            testcasestotal: allTestCases.length,
            errormessage: errorMessage
        });

        if (contestSubmission) {
            contestSubmission.attempts += 1;
            contestSubmission.code = code;
            contestSubmission.language = language;
            contestSubmission.status = status;
            contestSubmission.submissionId = submission._id;
            contestSubmission.testCasesPassed = testCasesPassed;
            contestSubmission.totalTestCases = allTestCases.length;
            contestSubmission.submittedAt = new Date();
            
            if (isCorrect) {
                contestSubmission.isCorrect = true;
                contestSubmission.timeTaken = timeTaken;
                contestSubmission.score = calculateScore(contest, timeTaken, contestSubmission.attempts);
            }
            await contestSubmission.save();
        } else {
            contestSubmission = await ContestSubmission.create({
                contestId: id,
                problemId: problemId,
                userId: userId,
                submissionId: submission._id,
                code,
                language,
                status,
                isCorrect,
                timeTaken: isCorrect ? timeTaken : 0,
                attempts: 1,
                testCasesPassed,
                totalTestCases: allTestCases.length,
                score: isCorrect ? calculateScore(contest, timeTaken, 1) : 0
            });
        }

        if (isCorrect) {
            const user = await User.findById(userId);
            if (!user.problemsolved.includes(problemId)) {
                user.problemsolved.push(problemId);
                await user.save();
            }
        }

        // STEP 3 & STEP 8: Asynchronous/atomic contest scoring & leaderboard update
        try {
            await processContestSubmissionResult(contestSubmission, contest, req.app.get('io'));
        } catch (scoreErr) {
            console.error('⚠️ Contest scoring processing warning:', scoreErr.message);
        }

        res.status(201).json({
            success: true,
            isCorrect,
            testCasesPassed,
            totalTestCases: allTestCases.length,
            status,
            message: isCorrect ? 'Solution accepted!' : 'Solution failed some test cases',
            attempts: contestSubmission.attempts,
            score: contestSubmission.score,
            submissionId: submission._id
        });

    } catch (error) {
        console.error('Contest submission error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit solution',
            error: error.message
        });
    }
};

// ==================== CONTEST QUERIES ====================

const getContests = async (req, res) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;
        const userId = req.user?._id;

        const filter = {};
        if (status) filter.status = status;

        const contests = await Contest.find(filter)
            .populate('createdBy', 'firstname email')
            .sort({ startTime: 1 })
            .skip((parseInt(page) - 1) * parseInt(limit))
            .limit(parseInt(limit));

        const total = await Contest.countDocuments(filter);

        const contestsWithRegistration = contests.map(contest => {
            const isRegistered = userId ? contest.participants.some(
                p => p.user.toString() === userId.toString()
            ) : false;

            return {
                ...contest.toObject(),
                isRegistered,
                participantCount: contest.participants.length
            };
        });

        res.status(200).json({
            success: true,
            contests: contestsWithRegistration,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('Get contests error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get contests',
            error: error.message
        });
    }
};

const getContestById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?._id;

        const contest = await Contest.findById(id)
            .populate('problems', 'title difficulty tags')
            .populate('createdBy', 'firstname email')
            .populate('participants.user', 'firstname email');

        if (!contest) {
            return res.status(404).json({
                success: false,
                message: 'Contest not found'
            });
        }

        const isRegistered = (userId && contest.participants) ? contest.participants.some(
            p => (p?.user?._id?.toString() === userId.toString()) || (p?.user?.toString() === userId.toString())
        ) : false;

        let userSubmissions = [];
        if (userId) {
            userSubmissions = await ContestSubmission.find({
                contestId: id,
                userId: userId
            }).populate('problemId', 'title');
        }

        const validParticipants = (contest.participants || []).filter(p => p && p.user);

        res.status(200).json({
            success: true,
            contest: {
                ...contest.toObject(),
                participants: validParticipants,
                isRegistered,
                participantCount: validParticipants.length,
                userSubmissions
            }
        });

    } catch (error) {
        console.error('Get contest by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get contest',
            error: error.message
        });
    }
};

// ==================== CONTEST PROBLEMS ====================

const getContestProblems = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const contest = await Contest.findById(id);
        if (!contest) {
            return res.status(404).json({
                success: false,
                message: 'Contest not found'
            });
        }

        const isRegistered = (contest.participants || []).some(
            p => (p?.user?._id?.toString() === userId.toString()) || (p?.user?.toString() === userId.toString())
        );

        const isActive = contest.status === 'active';
        const isCompleted = contest.status === 'completed';

        const problemsWithStatus = await Promise.all(contest.problems.map(async (problemId) => {
            const problem = await Problem.findById(problemId)
                .select('_id title description difficulty tags visibletestcases startcode');
            
            const solved = await ContestSubmission.findOne({
                contestId: id,
                userId: userId,
                problemId: problemId,
                isCorrect: true
            });

            const submissionCount = await ContestSubmission.countDocuments({
                contestId: id,
                problemId: problemId,
                userId: userId
            });

            return {
                ...problem.toObject(),
                solved: !!solved,
                attempts: submissionCount,
                visibletestcases: problem.visibletestcases || [],
                visibleTestCases: problem.visibletestcases || []
            };
        }));

        const sortedProblems = contest.problems.map((pid, index) => {
            const problem = problemsWithStatus.find(p => p._id.toString() === pid.toString());
            return {
                ...problem,
                index: String.fromCharCode(65 + index),
                order: index + 1
            };
        });

        res.status(200).json({
            success: true,
            contest: {
                id: contest._id,
                title: contest.title,
                status: contest.status,
                startTime: contest.startTime,
                endTime: contest.endTime,
                duration: contest.duration
            },
            problems: sortedProblems,
            isRegistered,
            isActive,
            isCompleted
        });

    } catch (error) {
        console.error('Get contest problems error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get contest problems',
            error: error.message
        });
    }
};

// ==================== CONTEST PROBLEM BY ID ====================

const getContestProblemById = async (req, res) => {
    try {
        const { id, problemId } = req.params;
        const userId = req.user._id;

        const contest = await Contest.findById(id);
        if (!contest) {
            return res.status(404).json({
                success: false,
                message: 'Contest not found'
            });
        }

        const isRegistered = (contest.participants || []).some(
            p => (p?.user?._id?.toString() === userId.toString()) || (p?.user?.toString() === userId.toString())
        );

        const isActive = contest.status === 'active';
        const isCompleted = contest.status === 'completed';
        const isAdmin = req.user?.role === 'admin';

        if (!isActive && !isCompleted && !isRegistered && !isAdmin) {
            return res.status(200).json({
                success: true,
                message: 'You are not registered for this contest',
                problem: null,
                isRegistered: false
            });
        }

        const problemIndex = contest.problems.indexOf(problemId);
        if (problemIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Problem not found in this contest'
            });
        }

        const problem = await Problem.findById(problemId)
            .select('_id title description difficulty tags visibletestcases startcode');

        if (!problem) {
            return res.status(404).json({
                success: false,
                message: 'Problem not found'
            });
        }

        const solved = await ContestSubmission.findOne({
            contestId: id,
            userId: userId,
            problemId: problemId,
            isCorrect: true
        });

        const submissionCount = await ContestSubmission.countDocuments({
            contestId: id,
            problemId: problemId,
            userId: userId
        });

        const latestSubmission = await ContestSubmission.findOne({
            contestId: id,
            userId: userId,
            problemId: problemId
        }).sort({ submittedAt: -1 });

        res.status(200).json({
            success: true,
            problem: {
                ...problem.toObject(),
                index: String.fromCharCode(65 + problemIndex),
                order: problemIndex + 1,
                solved: !!solved,
                attempts: submissionCount,
                latestSubmission: latestSubmission ? {
                    status: latestSubmission.status,
                    isCorrect: latestSubmission.isCorrect,
                    submittedAt: latestSubmission.submittedAt,
                    score: latestSubmission.score
                } : null
            }
        });

    } catch (error) {
        console.error('Get contest problem by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get problem',
            error: error.message
        });
    }
};

// ==================== CONTEST STANDINGS ====================

const getContestStandings = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const contest = await Contest.findById(id);
        if (!contest) {
            return res.status(404).json({
                success: false,
                message: 'Contest not found'
            });
        }

        if (!contest.showStandings && contest.status !== 'completed') {
            return res.status(403).json({
                success: false,
                message: 'Standings are hidden for this contest'
            });
        }

        const submissions = await ContestSubmission.find({
            contestId: id
        }).populate('userId', 'firstname email')
          .populate('problemId', 'title');

        const participants = await User.find({
            _id: { $in: contest.participants.map(p => p.user) }
        });

        const standings = participants.map(participant => {
            const userSubmissions = submissions.filter(
                s => s.userId._id.toString() === participant._id.toString()
            );

            const problemResults = contest.problems.map((problemId, index) => {
                const problemSubmissions = userSubmissions.filter(
                    s => s.problemId._id.toString() === problemId.toString()
                );

                const solved = problemSubmissions.some(s => s.isCorrect);
                const attempts = problemSubmissions.length;
                const bestSubmission = problemSubmissions
                    .filter(s => s.isCorrect)
                    .sort((a, b) => a.timeTaken - b.timeTaken)[0];

                return {
                    problemIndex: String.fromCharCode(65 + index),
                    problemId: problemId,
                    solved,
                    attempts,
                    timeTaken: bestSubmission?.timeTaken || null,
                    score: bestSubmission?.score || 0,
                    wrongAttempts: attempts - (solved ? 1 : 0)
                };
            });

            const totalScore = problemResults.reduce((sum, p) => sum + p.score, 0);
            const solvedCount = problemResults.filter(p => p.solved).length;
            const totalPenalty = problemResults.reduce((sum, p) => {
                if (p.solved) {
                    return sum + p.timeTaken + (p.wrongAttempts * (contest.penalty || 0));
                }
                return sum;
            }, 0);

            return {
                userId: participant._id,
                username: participant.firstname,
                email: participant.email,
                totalScore,
                solvedCount,
                totalPenalty,
                problemResults
            };
        });

        standings.sort((a, b) => {
            if (a.solvedCount !== b.solvedCount) return b.solvedCount - a.solvedCount;
            return a.totalPenalty - b.totalPenalty;
        });

        standings.forEach((item, index) => {
            item.rank = index + 1;
        });

        res.status(200).json({
            success: true,
            contest: {
                id: contest._id,
                title: contest.title,
                status: contest.status
            },
            standings,
            totalParticipants: standings.length,
            showParticipants: contest.showParticipants
        });

    } catch (error) {
        console.error('Get contest standings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get standings',
            error: error.message
        });
    }
};

// ==================== MY SUBMISSIONS ====================

const getMySubmissions = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const contest = await Contest.findById(id);
        if (!contest) {
            return res.status(404).json({
                success: false,
                message: 'Contest not found'
            });
        }

        const submissions = await ContestSubmission.find({
            contestId: id,
            userId: userId
        }).populate('problemId', 'title')
          .sort({ submittedAt: -1 });

        const submissionsWithIndex = submissions.map(sub => {
            const index = contest.problems.indexOf(sub.problemId._id);
            return {
                ...sub.toObject(),
                problemIndex: index !== -1 ? String.fromCharCode(65 + index) : '?'
            };
        });

        res.status(200).json({
            success: true,
            submissions: submissionsWithIndex,
            total: submissionsWithIndex.length
        });

    } catch (error) {
        console.error('Get my submissions error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get submissions',
            error: error.message
        });
    }
};

// ==================== CONTEST RANKINGS ====================

const getContestRankings = async (req, res) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 50 } = req.query;

        const contest = await Contest.findById(id).lean();
        if (!contest) {
            return res.status(404).json({
                success: false,
                message: 'Contest not found'
            });
        }

        const result = await getLeaderboard(id, page, limit);

        res.status(200).json({
            success: true,
            contest: {
                id: contest._id,
                title: contest.title,
                status: contest.status
            },
            ...result
        });

    } catch (error) {
        console.error('Get contest rankings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get rankings',
            error: error.message
        });
    }
};

const getLiveLeaderboard = async (req, res) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 50 } = req.query;

        const contest = await Contest.findById(id).lean();
        if (!contest) {
            return res.status(404).json({
                success: false,
                message: 'Contest not found'
            });
        }

        const result = await getLeaderboard(id, page, limit);

        res.status(200).json({
            success: true,
            contest: {
                id: contest._id,
                title: contest.title,
                status: contest.status,
                timeRemaining: contest.status === 'active' ? 
                    Math.max(0, new Date(contest.endTime).getTime() - Date.now()) : 0
            },
            ...result
        });

    } catch (error) {
        console.error('Get live leaderboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get live leaderboard',
            error: error.message
        });
    }
};

const getMyRank = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const contest = await Contest.findById(id).lean();
        if (!contest) {
            return res.status(404).json({
                success: false,
                message: 'Contest not found'
            });
        }

        const rankData = await getUserRank(id, userId);

        res.status(200).json({
            success: true,
            contestId: id,
            myRank: rankData
        });
    } catch (error) {
        console.error('Get my rank error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user rank',
            error: error.message
        });
    }
};

// ==================== EXPORTS ====================

module.exports = {
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
    updateContestLeaderboard,
    getLiveContestLeaderboard,
    calculateScore,
    getContestProblems,
    getContestProblemById,
    getMySubmissions,
    getContestStandings
};