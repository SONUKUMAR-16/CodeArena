// backend/src/index.js - Connected to Primary Atlas (IP 152.58.32.53)
const path = require('path');

// Load .env from backend root
require('dotenv').config({ 
    path: path.join(__dirname, '../.env') 
});

// Debug: Check environment
console.log('🔍 Environment Check:');
console.log('  DATABASESTRING:', process.env.DATABASESTRING ? '✅ Set' : '❌ Not Set');
console.log('  PORT:', process.env.PORT || '3000 (default)');

const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);

const socketIo = require('socket.io');

const io = socketIo(server, {
    cors: {
        origin: (origin, callback) => callback(null, true),
        credentials: true
    }
});

const main = require('./config/database');
const cookieparser = require('cookie-parser');
const cors = require('cors');

// Import routes - FIX: Make sure these files exist
const authrouter = require('./routes/userauth');
const problemrouter = require('./routes/problemcreator');
const submitrouter = require('./routes/submit');
const chatting = require('./routes/chatai');
const videoRouter = require('./routes/videocreator');
const contestRouter = require('./routes/contest');
const profileRouter = require('./routes/profile');
const interviewRouter = require('./routes/interview');

const rateLimiter = require('./middleware/ratelimiter');
const redisclient = require('./config/redis');
app.use(cors({
    origin: (origin, callback) => callback(null, true),
    credentials: true
}));

app.use(express.json());
app.use(cookieparser());

app.use(rateLimiter);

// Root route
app.get('/', (req, res) => {
    res.json({
        message: '🚀 LeetCode Clone API is running!',
        version: '1.0.0',
        endpoints: {
            users: '/user',
            problems: '/problem',
            submissions: '/submit',
            ai: '/ai',
            video: '/video',
            contest: '/contest',
            profile: '/profile',
            interview: '/interview'
        },
        status: 'healthy'
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Routes
app.use('/user', authrouter);
app.use('/problem', problemrouter);
app.use('/submit', submitrouter);
app.use('/ai', chatting);
app.use('/video', videoRouter);
app.use('/contest', contestRouter);
app.use('/profile', profileRouter);
app.use('/interview', interviewRouter);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl
    });
});

// Socket.io
io.on('connection', (socket) => {
    console.log('Client Connected:', socket.id);

    socket.on('join-contest', (contestId) => {
        socket.join(`contest-${contestId}`);
        console.log(`${socket.id} joined contest ${contestId}`);
    });

    socket.on('leave-contest', (contestId) => {
        socket.leave(`contest-${contestId}`);
        console.log(`${socket.id} left contest ${contestId}`);
    });

    socket.on('update-leaderboard', async (contestId) => {
        try {
            const { getLiveContestLeaderboard } = require('./controllers/contest');
            const leaderboard = await getLiveContestLeaderboard(contestId);
            io.to(`contest-${contestId}`).emit('leaderboard-update', leaderboard);
        } catch (err) {
            console.error(err);
        }
    });

    socket.on('disconnect', () => {
        console.log('Disconnected:', socket.id);
    });
});

const initialconnection = async () => {
    try {
        await redisclient.connect();
        console.log("✅ Redis connected");
    } catch (err) {
        console.error("❌ Redis connection error:");
        console.error(err);
    }
};
initialconnection();

const connectfun = async () => {
    const port = process.env.PORT || 3000;
    server.listen(port, () => {
        console.log(`🚀 Server listening on port ${port}`);
    });

    try {
        await main();
        console.log("✅ MongoDB Connected");
        const seedProblems = require('./utils/seedProblems');
        await seedProblems();
    } catch (err) {
        console.log("❌ MongoDB Connection Warning:", err.message || err);
    }
};

connectfun();

module.exports = { io };