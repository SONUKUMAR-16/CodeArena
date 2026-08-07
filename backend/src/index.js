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
app.set('io', io);

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
            profile: '/profile'
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

    // Section 3: Room format contest:{contestId} and event joinContest
    socket.on('joinContest', (data) => {
        const cId = typeof data === 'object' ? data.contestId : data;
        if (cId) {
            socket.join(`contest:${cId}`);
            socket.join(`contest-${cId}`);
            console.log(`Socket ${socket.id} joined room contest:${cId}`);
        }
    });

    socket.on('join-contest', (contestId) => {
        if (contestId) {
            socket.join(`contest:${contestId}`);
            socket.join(`contest-${contestId}`);
            console.log(`Socket ${socket.id} joined room contest-${contestId}`);
        }
    });

    socket.on('leaveContest', (data) => {
        const cId = typeof data === 'object' ? data.contestId : data;
        if (cId) {
            socket.leave(`contest:${cId}`);
            socket.leave(`contest-${cId}`);
            console.log(`Socket ${socket.id} left room contest:${cId}`);
        }
    });

    socket.on('leave-contest', (contestId) => {
        if (contestId) {
            socket.leave(`contest:${contestId}`);
            socket.leave(`contest-${contestId}`);
            console.log(`Socket ${socket.id} left room contest-${contestId}`);
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

module.exports = app;
module.exports.io = io;