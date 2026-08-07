// services/contestScoringService.js
const ContestScore = require('../models/contestScore');
const ContestSubmission = require('../models/contestSubmission');
const Contest = require('../models/contest');
const User = require('../models/user');
const redisClient = require('../config/redis');

/**
 * Calculates a composite numeric score for Redis Sorted Sets.
 * Strategy:
 *   Score = (solvedCount * 1,000,000,000) - (totalPenalty * 1,000) - (timeTakenMinutes % 1000)
 * Higher solvedCount -> Higher Score
 * Lower penalty -> Higher Score
 * Earlier submission time -> Higher Score
 */
const calculateRedisScore = (solvedCount, totalPenalty, lastSubmissionTime, contestStartTime) => {
    if (solvedCount === 0) return 0;
    
    const timeTakenMinutes = contestStartTime && lastSubmissionTime
        ? Math.max(0, Math.floor((new Date(lastSubmissionTime).getTime() - new Date(contestStartTime).getTime()) / 60000))
        : 0;

    const baseScore = solvedCount * 1000000000;
    const penaltyDeduction = totalPenalty * 1000;
    const timeDeduction = timeTakenMinutes % 1000;

    return baseScore - penaltyDeduction - timeDeduction;
};

/**
 * STEP 3: Process submission result after Judge0 execution
 * Keeps contest scoring logic separate from Judge0 code execution.
 */
const processContestSubmissionResult = async (contestSubmissionDoc, contestDoc, io = null) => {
    const { contestId, userId, problemId, status, submittedAt } = contestSubmissionDoc;
    const contestStartTime = contestDoc ? contestDoc.startTime : null;
    const penaltyPerWrongAttempt = contestDoc ? (contestDoc.penalty || 20) : 20;

    // STEP 9: Check contest status & user registration
    const now = new Date();
    if (contestDoc && (now < new Date(contestDoc.startTime) || now > new Date(contestDoc.endTime))) {
        console.log(`⚠️ Submission outside contest active window for contest ${contestId}`);
    }

    // Find or create ContestScore persistent document in MongoDB (STEP 10)
    let scoreDoc = await ContestScore.findOne({ contestId, userId });
    if (!scoreDoc) {
        scoreDoc = new ContestScore({
            contestId,
            userId,
            solvedCount: 0,
            totalPenalty: 0,
            problemsSolved: [],
            wrongAttempts: new Map(),
            lastSubmissionTime: null
        });
    }

    const problemIdStr = problemId.toString();
    const isAlreadySolved = scoreDoc.problemsSolved.some(id => id.toString() === problemIdStr);

    let scoreUpdated = false;

    if (status === 'accepted') {
        if (!isAlreadySolved) {
            // STEP 3: First Accepted Submission for this problem
            scoreDoc.problemsSolved.push(problemId);
            scoreDoc.solvedCount += 1;

            // Calculate penalty (Minutes from start + wrong attempts * 20 mins)
            const timeTakenMinutes = contestStartTime
                ? Math.max(0, Math.floor((new Date(submittedAt).getTime() - new Date(contestStartTime).getTime()) / 60000))
                : 0;
            
            const existingWrongAttempts = scoreDoc.wrongAttempts.get(problemIdStr) || 0;
            const problemPenalty = timeTakenMinutes + (existingWrongAttempts * penaltyPerWrongAttempt);

            scoreDoc.totalPenalty += problemPenalty;
            scoreDoc.lastSubmissionTime = submittedAt;
            scoreUpdated = true;
        }
    } else if (['wrong', 'error', 'timeout'].includes(status)) {
        if (!isAlreadySolved) {
            // Track wrong attempts before first accepted submission
            const currentWrong = scoreDoc.wrongAttempts.get(problemIdStr) || 0;
            scoreDoc.wrongAttempts.set(problemIdStr, currentWrong + 1);
            scoreUpdated = true;
        }
    }

    // Save persistent MongoDB record (STEP 10: Persistent Source of Truth)
    await scoreDoc.save();

    // Update Redis Sorted Set ranking & emit Socket event
    if (scoreUpdated) {
        const redisScore = calculateRedisScore(
            scoreDoc.solvedCount,
            scoreDoc.totalPenalty,
            scoreDoc.lastSubmissionTime,
            contestStartTime
        );

        const leaderboardService = require('./leaderboardService');
        await leaderboardService.updateContestLeaderboard(contestId, userId, redisScore);

        if (io) {
            const userRank = await leaderboardService.getUserContestRank(contestId, userId);
            const payload = {
                userId: userId.toString(),
                score: scoreDoc.solvedCount * 1000 - scoreDoc.totalPenalty,
                rank: userRank.rank,
                contestId: contestId.toString()
            };
            io.to(`contest:${contestId}`).emit('leaderboard:update', payload);
            io.to(`contest-${contestId}`).emit('leaderboard:update', payload);
            io.to(`contest-${contestId}`).emit('score-update', payload);
        }
    }

    return scoreDoc;
};

/**
 * STEP 4 & STEP 5: Retrieve Paginated Leaderboard from Redis with MongoDB Fallback
 */
const getLeaderboard = async (contestId, page = 1, limit = 50) => {
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
    const start = (pageNum - 1) * limitNum;
    const stop = start + limitNum - 1;

    const redisKey = `contest:${contestId}:leaderboard`;
    let userIds = [];
    let totalCount = 0;
    let usedRedis = false;

    try {
        if (redisClient && typeof redisClient.zRangeWithScores === 'function') {
            totalCount = await redisClient.zCard(redisKey);
            if (totalCount > 0) {
                // Fetch top-N ranked users using ZREVRANGE in Redis
                const range = await redisClient.zRangeWithScores(redisKey, start, stop, { REV: true });
                userIds = range.map(r => r.value);
                usedRedis = true;
            }
        }
    } catch (err) {
        console.error('⚠️ Redis leaderboard fetch failed, rebuilding from MongoDB:', err.message);
        usedRedis = false;
    }

    // STEP 10: Fallback to MongoDB if Redis unavailable or empty
    if (!usedRedis) {
        totalCount = await ContestScore.countDocuments({ contestId });
        const scoresFromDb = await ContestScore.find({ contestId })
            .sort({ solvedCount: -1, totalPenalty: 1, lastSubmissionTime: 1 })
            .skip(start)
            .limit(limitNum)
            .populate('userId', 'firstname emailid')
            .lean();

        const leaderboard = scoresFromDb.map((s, idx) => ({
            rank: start + idx + 1,
            userId: s.userId ? s.userId._id : s.userId,
            username: s.userId ? s.userId.firstname : 'User',
            solvedCount: s.solvedCount,
            totalPenalty: s.totalPenalty,
            lastSubmissionTime: s.lastSubmissionTime,
            problemsSolvedCount: s.problemsSolved ? s.problemsSolved.length : 0
        }));

        // Rebuild Redis in background if Redis is running
        rebuildRedisLeaderboard(contestId).catch(() => {});

        return {
            page: pageNum,
            limit: limitNum,
            totalUsers: totalCount,
            totalPages: Math.ceil(totalCount / limitNum),
            leaderboard
        };
    }

    // Populate user details for the paginated slice
    const usersMap = new Map();
    const scoresMap = new Map();

    const userDocs = await User.find({ _id: { $in: userIds } }).select('firstname emailid').lean();
    userDocs.forEach(u => usersMap.set(u._id.toString(), u));

    const scoreDocs = await ContestScore.find({ contestId, userId: { $in: userIds } }).lean();
    scoreDocs.forEach(s => scoresMap.set(s.userId.toString(), s));

    const leaderboard = userIds.map((uId, idx) => {
        const u = usersMap.get(uId);
        const s = scoresMap.get(uId);
        return {
            rank: start + idx + 1,
            userId: uId,
            username: u ? u.firstname : 'User',
            solvedCount: s ? s.solvedCount : 0,
            totalPenalty: s ? s.totalPenalty : 0,
            lastSubmissionTime: s ? s.lastSubmissionTime : null,
            problemsSolvedCount: s && s.problemsSolved ? s.problemsSolved.length : 0
        };
    });

    return {
        page: pageNum,
        limit: limitNum,
        totalUsers: totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
        leaderboard
    };
};

/**
 * STEP 5: Get specific user's current rank in contest
 */
const getUserRank = async (contestId, userId) => {
    const redisKey = `contest:${contestId}:leaderboard`;
    const userIdStr = userId.toString();

    try {
        if (redisClient && typeof redisClient.zRevRank === 'function') {
            const rank = await redisClient.zRevRank(redisKey, userIdStr);
            if (rank !== null && rank !== undefined) {
                const scoreDoc = await ContestScore.findOne({ contestId, userId }).lean();
                return {
                    rank: rank + 1,
                    solvedCount: scoreDoc ? scoreDoc.solvedCount : 0,
                    totalPenalty: scoreDoc ? scoreDoc.totalPenalty : 0,
                    lastSubmissionTime: scoreDoc ? scoreDoc.lastSubmissionTime : null
                };
            }
        }
    } catch (err) {
        console.error('⚠️ Redis user rank fallback to MongoDB:', err.message);
    }

    // MongoDB Fallback
    const userScore = await ContestScore.findOne({ contestId, userId }).lean();
    if (!userScore) {
        return { rank: null, message: 'User has no score recorded' };
    }

    // Count how many users have better score
    const betterScoresCount = await ContestScore.countDocuments({
        contestId,
        $or: [
            { solvedCount: { $gt: userScore.solvedCount } },
            { solvedCount: userScore.solvedCount, totalPenalty: { $lt: userScore.totalPenalty } },
            { solvedCount: userScore.solvedCount, totalPenalty: userScore.totalPenalty, lastSubmissionTime: { $lt: userScore.lastSubmissionTime } }
        ]
    });

    return {
        rank: betterScoresCount + 1,
        solvedCount: userScore.solvedCount,
        totalPenalty: userScore.totalPenalty,
        lastSubmissionTime: userScore.lastSubmissionTime
    };
};

/**
 * STEP 10: Rebuild Redis Sorted Set from MongoDB persistent data
 */
const rebuildRedisLeaderboard = async (contestId) => {
    try {
        const contestDoc = await Contest.findById(contestId).lean();
        const contestStartTime = contestDoc ? contestDoc.startTime : null;
        const allScores = await ContestScore.find({ contestId }).lean();

        if (allScores.length === 0) return;

        const redisKey = `contest:${contestId}:leaderboard`;
        const members = allScores.map(s => ({
            score: calculateRedisScore(s.solvedCount, s.totalPenalty, s.lastSubmissionTime, contestStartTime),
            value: s.userId.toString()
        }));

        if (redisClient && typeof redisClient.zAdd === 'function') {
            await redisClient.del(redisKey);
            await redisClient.zAdd(redisKey, members);
            console.log(`✅ Redis Leaderboard rebuilt for contest ${contestId} (${members.length} participants)`);
        }
    } catch (err) {
        console.error(`❌ Failed to rebuild Redis leaderboard for contest ${contestId}:`, err.message);
    }
};

module.exports = {
    processContestSubmissionResult,
    getLeaderboard,
    getUserRank,
    rebuildRedisLeaderboard,
    calculateRedisScore
};
