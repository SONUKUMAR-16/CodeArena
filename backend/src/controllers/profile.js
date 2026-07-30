// backend/src/controllers/profile.js
const User = require('../models/user');
const Submission = require('../models/submission');
const Problem = require('../models/problem');

const getProfile = async (req, res) => {
    try {
        let user;
        
        // Check if username is provided
        if (req.params.username) {
            const rawUsername = decodeURIComponent(req.params.username).trim();
            const escaped = rawUsername.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
            const regex = new RegExp(`^${escaped}\\s*$`, 'i');
            user = await User.findOne({
                $or: [
                    { firstname: rawUsername },
                    { firstname: regex },
                    { emailid: rawUsername },
                    { emailid: regex }
                ]
            });
        } else {
            // Use current user
            user = await User.findById(req.user._id);
        }

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Get user's submissions
        const submissions = await Submission.find({ userid: user._id })
            .populate('problemid', 'title difficulty')
            .sort({ createdAt: -1 })
            .limit(50);

        // Calculate stats
        const totalSubmissions = await Submission.countDocuments({ userid: user._id });
        const acceptedSubmissions = await Submission.countDocuments({ 
            userid: user._id,
            status: 'accepted' 
        });

        // Calculate rating (simple formula)
        const rating = totalSubmissions > 0 
            ? Math.round((acceptedSubmissions / totalSubmissions) * 1500) + 800
            : 0;

        res.status(200).json({
            success: true,
            profile: {
                _id: user._id,
                firstname: user.firstname,
                lastname: user.lastname || '',
                email: user.emailid,
                role: user.role || 'user',
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
                rating: rating,
                totalSubmissions,
                acceptedSubmissions,
                submissions: submissions.map(s => ({
                    _id: s._id,
                    problemId: s.problemid,
                    status: s.status,
                    language: s.language,
                    createdAt: s.createdAt
                }))
            }
        });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load profile',
            error: error.message
        });
    }
};

const getProfileStats = async (req, res) => {
    try {
        const userId = req.user._id;

        const totalSubmissions = await Submission.countDocuments({ userid: userId });
        const acceptedSubmissions = await Submission.countDocuments({ 
            userid: userId,
            status: 'accepted' 
        });
        const wrongSubmissions = await Submission.countDocuments({ 
            userid: userId,
            status: 'wrong' 
        });
        const pendingSubmissions = await Submission.countDocuments({ 
            userid: userId,
            status: 'pending' 
        });

        // Get daily submission activity
        const dailyActivity = await Submission.aggregate([
            { $match: { userid: userId } },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' },
                        day: { $dayOfMonth: '$createdAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
        ]);

        const formattedActivity = dailyActivity.map(item => ({
            date: `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`,
            count: item.count
        }));

        res.status(200).json({
            success: true,
            stats: {
                totalSubmissions,
                acceptedSubmissions,
                wrongSubmissions,
                pendingSubmissions,
                successRate: totalSubmissions > 0 
                    ? Math.round((acceptedSubmissions / totalSubmissions) * 100) 
                    : 0,
                dailyActivity: formattedActivity
            }
        });

    } catch (error) {
        console.error('Get profile stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load stats',
            error: error.message
        });
    }
};

module.exports = {
    getProfile,
    getProfileStats
};