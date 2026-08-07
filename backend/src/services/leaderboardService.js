// services/leaderboardService.js
const redisClient = require('../config/redis');
const ContestScore = require('../models/contestScore');
const Contest = require('../models/contest');
const User = require('../models/user');

/**
 * Key format: contest:leaderboard:{contestId}
 */
const getRedisKey = (contestId) => `contest:leaderboard:${contestId}`;

/**
 * 1. Update user score in Redis Sorted Set (ZADD)
 */
const updateContestLeaderboard = async (contestId, userId, score) => {
    const key = getRedisKey(contestId);
    const userIdStr = userId.toString();

    try {
        if (redisClient && typeof redisClient.zAdd === 'function') {
            await redisClient.zAdd(key, [{
                score: Number(score),
                value: userIdStr
            }]);
            return true;
        }
    } catch (err) {
        console.error(`⚠️ Redis ZADD error for key ${key}:`, err.message);
    }
    return false;
};

/**
 * 2. Get user current rank from Redis (ZREVRANK, 1-based)
 */
const getUserContestRank = async (contestId, userId) => {
    const key = getRedisKey(contestId);
    const userIdStr = userId.toString();

    try {
        if (redisClient && typeof redisClient.zRevRank === 'function') {
            const rank = await redisClient.zRevRank(key, userIdStr);
            if (rank !== null && rank !== undefined) {
                const score = await redisClient.zScore(key, userIdStr);
                return {
                    rank: rank + 1,
                    score: score !== null ? Number(score) : 0,
                    userId: userIdStr
                };
            }
        }
    } catch (err) {
        console.error(`⚠️ Redis ZREVRANK error for user ${userIdStr}:`, err.message);
    }

    // Fallback to MongoDB
    const scoreDoc = await ContestScore.findOne({ contestId, userId }).lean();
    if (!scoreDoc) {
        return { rank: null, score: 0, userId: userIdStr, message: 'No score recorded' };
    }

    const betterScoresCount = await ContestScore.countDocuments({
        contestId,
        $or: [
            { solvedCount: { $gt: scoreDoc.solvedCount } },
            { solvedCount: scoreDoc.solvedCount, totalPenalty: { $lt: scoreDoc.totalPenalty } },
            { solvedCount: scoreDoc.solvedCount, totalPenalty: scoreDoc.totalPenalty, lastSubmissionTime: { $lt: scoreDoc.lastSubmissionTime } }
        ]
    });

    return {
        rank: betterScoresCount + 1,
        score: scoreDoc.solvedCount * 1000 - scoreDoc.totalPenalty,
        userId: userIdStr
    };
};

/**
 * 3. Get paginated leaderboard slice (ZREVRANGE)
 */
const getContestLeaderboard = async (contestId, page = 1, limit = 50) => {
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
    const start = (pageNum - 1) * limitNum;
    const stop = start + limitNum - 1;

    const key = getRedisKey(contestId);
    let userIds = [];
    let totalUsers = 0;
    let usedRedis = false;

    try {
        if (redisClient && typeof redisClient.zRangeWithScores === 'function') {
            totalUsers = await redisClient.zCard(key);
            if (totalUsers > 0) {
                const range = await redisClient.zRangeWithScores(key, start, stop, { REV: true });
                userIds = range.map(r => r.value);
                usedRedis = true;
            }
        }
    } catch (err) {
        console.error(`⚠️ Redis ZREVRANGE error for contest ${contestId}:`, err.message);
        usedRedis = false;
    }

    // Fallback to MongoDB
    if (!usedRedis) {
        totalUsers = await ContestScore.countDocuments({ contestId });
        const scoresFromDb = await ContestScore.find({ contestId })
            .sort({ solvedCount: -1, totalPenalty: 1, lastSubmissionTime: 1 })
            .skip(start)
            .limit(limitNum)
            .populate('userId', 'firstname emailid')
            .lean();

        const leaderboard = scoresFromDb.map((s, idx) => ({
            rank: start + idx + 1,
            userId: s.userId ? (s.userId._id || s.userId).toString() : s.userId,
            username: s.userId ? s.userId.firstname : 'User',
            solvedCount: s.solvedCount,
            totalPenalty: s.totalPenalty,
            score: s.solvedCount * 1000 - s.totalPenalty,
            lastSubmissionTime: s.lastSubmissionTime
        }));

        // Rebuild Redis in background
        rebuildContestLeaderboard(contestId).catch(() => {});

        return {
            page: pageNum,
            limit: limitNum,
            totalUsers,
            totalPages: Math.ceil(totalUsers / limitNum),
            leaderboard
        };
    }

    // Populate user details for slice
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
            score: s ? (s.solvedCount * 1000 - s.totalPenalty) : 0,
            lastSubmissionTime: s ? s.lastSubmissionTime : null
        };
    });

    return {
        page: pageNum,
        limit: limitNum,
        totalUsers,
        totalPages: Math.ceil(totalUsers / limitNum),
        leaderboard
    };
};

/**
 * 4. Rebuild Redis leaderboard from MongoDB source of truth
 */
const rebuildContestLeaderboard = async (contestId) => {
    try {
        const contestDoc = await Contest.findById(contestId).lean();
        const contestStartTime = contestDoc ? contestDoc.startTime : null;
        const allScores = await ContestScore.find({ contestId }).lean();

        if (allScores.length === 0) return;

        const key = getRedisKey(contestId);
        const members = allScores.map(s => {
            const timeTakenMinutes = contestStartTime && s.lastSubmissionTime
                ? Math.max(0, Math.floor((new Date(s.lastSubmissionTime).getTime() - new Date(contestStartTime).getTime()) / 60000))
                : 0;
            const score = s.solvedCount > 0 ? (s.solvedCount * 1000000000 - s.totalPenalty * 1000 - (timeTakenMinutes % 1000)) : 0;
            return {
                score: Number(score),
                value: s.userId.toString()
            };
        });

        if (redisClient && typeof redisClient.zAdd === 'function') {
            await redisClient.del(key);
            await redisClient.zAdd(key, members);
            console.log(`✅ Redis Leaderboard rebuilt for key ${key} (${members.length} participants)`);
        }
    } catch (err) {
        console.error(`❌ Failed to rebuild Redis leaderboard for contest ${contestId}:`, err.message);
    }
};

/**
 * 5. Invalidate / clear contest leaderboard in Redis
 */
const invalidateContestLeaderboard = async (contestId) => {
    const key = getRedisKey(contestId);
    try {
        if (redisClient && typeof redisClient.del === 'function') {
            await redisClient.del(key);
        }
    } catch (err) {
        console.error(`⚠️ Failed to invalidate Redis leaderboard for key ${key}:`, err.message);
    }
};

module.exports = {
    updateContestLeaderboard,
    getUserContestRank,
    getContestLeaderboard,
    rebuildContestLeaderboard,
    invalidateContestLeaderboard
};
