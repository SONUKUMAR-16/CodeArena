// models/interview.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const interviewSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    role: {
        type: String,
        enum: ['software_developer', 'data_analyst', 'frontend_developer', 'backend_developer', 'full_stack_developer', 'devops_engineer'],
        required: true
    },
    status: {
        type: String,
        enum: ['not_started', 'in_progress', 'completed', 'abandoned'],
        default: 'in_progress'
    },
    language: {
        type: String,
        default: 'javascript'
    },
    conversation: [{
        role: {
            type: String,
            enum: ['user', 'ai', 'system'],
            required: true
        },
        message: {
            type: String,
            required: true
        },
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    code: {
        type: String,
        default: ''
    },
    score: {
        type: Number,
        default: 0
    },
    maxScore: {
        type: Number,
        default: 100
    },
    feedback: {
        type: String,
        default: ''
    },
    evaluation: {
        type: Schema.Types.Mixed,
        default: null
    },
    startedAt: {
        type: Date,
        default: Date.now
    },
    completedAt: Date,
    timeSpent: {
        type: Number,
        default: 0
    },
    topics: [{
        type: String
    }]
}, {
    timestamps: true
});

const Interview = mongoose.model('Interview', interviewSchema);
module.exports = Interview;