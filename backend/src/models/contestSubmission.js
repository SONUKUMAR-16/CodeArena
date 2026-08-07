// models/contestSubmission.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const contestSubmissionSchema = new Schema({
    contestId: {
        type: Schema.Types.ObjectId,
        ref: 'Contest',
        required: true,
        index: true
    },
    problemId: {
        type: Schema.Types.ObjectId,
        ref: 'problem',
        required: true,
        index: true
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'user',
        required: true,
        index: true
    },
    submissionId: {
        type: Schema.Types.ObjectId,
        ref: 'submission',
        required: true
    },
    code: {
        type: String,
        required: true
    },
    language: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'wrong', 'error', 'timeout'],
        default: 'pending',
        index: true
    },
    score: {
        type: Number,
        default: 0
    },
    timeTaken: {
        type: Number, // seconds from contest start
        default: 0
    },
    attempts: {
        type: Number,
        default: 1
    },
    isCorrect: {
        type: Boolean,
        default: false,
        index: true
    },
    submittedAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    testCasesPassed: {
        type: Number,
        default: 0
    },
    totalTestCases: {
        type: Number,
        default: 0
    }
});

// STEP 6: Optimized MongoDB Indexes
contestSubmissionSchema.index({ contestId: 1, userId: 1, problemId: 1 });
contestSubmissionSchema.index({ contestId: 1, userId: 1, isCorrect: 1 });
contestSubmissionSchema.index({ contestId: 1, problemId: 1, status: 1 });
contestSubmissionSchema.index({ contestId: 1, status: 1, timeTaken: 1 });
contestSubmissionSchema.index({ contestId: 1, submittedAt: -1 });

const ContestSubmission = mongoose.model('ContestSubmission', contestSubmissionSchema);
module.exports = ContestSubmission;