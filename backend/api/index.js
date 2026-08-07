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

// Robust CORS setup for Vercel Serverless & Cross-Origin requests
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});

app.use(express.json());
app.use(cookieparser());

// Ensure MongoDB Atlas Connection with cached promise
let dbPromise = null;

const connectDb = async () => {
    if (mongoose.connection.readyState >= 1) return;
    if (!dbPromise) {
        if (!process.env.DATABASESTRING) {
            console.error('❌ DATABASESTRING env variable is missing on Vercel');
            return;
        }
        dbPromise = mongoose.connect(process.env.DATABASESTRING, {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 5000
        }).then((m) => {
            console.log('✅ Serverless DB connected');
            return m;
        }).catch((err) => {
            dbPromise = null;
            console.error('❌ Serverless DB connection error:', err.message);
        });
    }
    await dbPromise;
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

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl
    });
});

// Global Error Handler for Serverless Stability
app.use((err, req, res, next) => {
    console.error('❌ Serverless API Error:', err.stack || err.message || err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error',
        success: false
    });
});

module.exports = app;
