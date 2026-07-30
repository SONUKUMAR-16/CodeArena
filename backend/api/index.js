const express = require('express');
const app = express();
const path = require('path');
const cors = require('cors');
const cookieparser = require('cookie-parser');
const mongoose = require('mongoose');

// Load environment variables if in local dev
try {
    require('dotenv').config({ path: path.join(__dirname, '../.env') });
} catch (e) {
    // Ignore in production
}

// CORS setup
app.use(cors({
    origin: (origin, callback) => callback(null, true),
    credentials: true
}));

app.use(express.json());
app.use(cookieparser());

// Ensure MongoDB Atlas Connection
const connectDb = async () => {
    if (mongoose.connection.readyState >= 1) return;
    try {
        if (!process.env.DATABASESTRING) {
            console.error('❌ DATABASESTRING env variable is missing on Vercel');
            return;
        }
        await mongoose.connect(process.env.DATABASESTRING, {
            serverSelectionTimeoutMS: 15000
        });
        console.log('✅ Serverless DB connected');
    } catch (err) {
        console.error('❌ Serverless DB connection error:', err.message);
    }
};

// Database connection middleware
app.use(async (req, res, next) => {
    await connectDb();
    next();
});

// Import Routes
const authrouter = require('../src/routes/userauth');
const problemrouter = require('../src/routes/problemcreator');
const submitrouter = require('../src/routes/submit');
const chatting = require('../src/routes/chatai');
const videoRouter = require('../src/routes/videocreator');
const contestRouter = require('../src/routes/contest');
const profileRouter = require('../src/routes/profile');
const interviewRouter = require('../src/routes/interview');

app.get('/', (req, res) => {
    res.json({
        message: '🚀 Code Arena API is running on Vercel Serverless!',
        status: 'healthy'
    });
});

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

module.exports = app;
