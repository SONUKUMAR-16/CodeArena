const User = require('../models/user');
const jwt = require('jsonwebtoken');
// const { client } = require('../config/redis');

const adminmiddleware = async (req, res, next) => {
    try {
        const { token } = req.cookies;
        if (!token) {
            throw new Error("Invalid token");
        }

        // Verify JWT token
        const verify = jwt.verify(token, process.env.JWT_KEY);
        const { _id } = verify;
        
        if (!_id) {
            throw new Error("Invalid token");
        }

        // Check if token is blocked in Redis
        // const blocked = await client.get(`token:${token}`);
        // if (blocked === 'blocked') {
        //     throw new Error("Invalid token (blocked)");
        // }

        // Find user in database
        const user = await User.findById(_id);
        if (!user) {
            throw new Error("User does not exist");
        }

        // Check if user is admin
        if (user.role !== 'admin') {
            throw new Error('Access not granted');
        }
        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({
            success: false,
            message: error.message || "Authentication failed"
        });
    }
};

module.exports = { adminmiddleware };