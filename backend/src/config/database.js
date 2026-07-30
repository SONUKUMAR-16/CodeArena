const mongoose = require('mongoose');
const path = require('path');

// Force load .env from the backend root (one level up from src)
require('dotenv').config({
    path: path.join(__dirname, '../.env')
});

async function main() {
    console.log('🔍 DATABASESTRING from .env:', process.env.DATABASESTRING);
    const connectionString = process.env.DATABASESTRING;

    try {
        await mongoose.connect(connectionString, {
            serverSelectionTimeoutMS: 15000,
            socketTimeoutMS: 45000,
        });
        console.log('✅ Primary MongoDB connected successfully');
        console.log('📊 Database:', mongoose.connection.name);
        console.log('📊 Host:', mongoose.connection.host);
    } catch (error) {
        console.warn('⚠️ Could not connect to primary MongoDB:', error.message);
        console.log('🚀 Launching In-Memory MongoDB Fallback...');
        try {
            const { MongoMemoryServer } = require('mongodb-memory-server');
            const mongod = await MongoMemoryServer.create();
            const uri = mongod.getUri();
            await mongoose.connect(uri);
            console.log('✅ In-Memory MongoDB connected successfully at:', uri);
            console.log('📊 Database:', mongoose.connection.name);
        } catch (memError) {
            console.error('❌ In-Memory MongoDB fallback failed:', memError.message);
            throw error;
        }
    }

    try {
        const User = require('../models/user');
        await User.collection.dropIndex('problemsolved_1');
        console.log('🧹 Cleaned up stale problemsolved_1 index');
    } catch (e) {
        // Index didn't exist or already dropped, ignore
    }
}

module.exports = main;