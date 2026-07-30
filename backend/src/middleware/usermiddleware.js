const User = require('../models/user');
const jwt = require('jsonwebtoken');
const client = require('../config/redis');

const usermiddleware = async (req, res, next) => {
    try {
        const { token } = req.cookies;
        if (!token) {
            return res.status(401).json({
                success: false,
                message: "No token provided"
            });
        }

        // Redis check for blacklisted tokens
        try {
            const blocked = await client.get(`token:${token}`);
            if (blocked) {
                return res.status(401).json({
                    success: false,
                    message: "Token is invalid or logged out"
                });
            }
        } catch (redisErr) {
            console.log('⚠️ Redis auth check warning (bypassing):', redisErr.message);
        }

        const verify = jwt.verify(token, process.env.JWT_KEY);
        const { _id } = verify;

        if (!_id) {
            return res.status(401).json({
                success: false,
                message: "Invalid token"
            });
        }

        const user = await User.findById(_id);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User does not exist"
            });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: "Invalid token"
            });
        }

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: "Token expired"
            });
        }

        res.status(500).json({
            success: false,
            message: "Authentication error",
            error: error.message
        });
    }
};

module.exports = { usermiddleware };