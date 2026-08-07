// models/contestScore.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const contestScoreSchema = new Schema({
    contestId: {
        type: Schema.Types.ObjectId,
        ref: 'Contest',
        required: true,
        index: true
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'user',
        required: true,
        index: true
    },
    solvedCount: {
        type: Number,
        default: 0,
        index: true
    },
    totalPenalty: {
        type: Number,
        default: 0,
        index: true
    },
    problemsSolved: [{
        type: Schema.Types.ObjectId,
        ref: 'problem'
    }],
    wrongAttempts: {
        type: Map,
        of: Number,
        default: {}
    },
    lastSubmissionTime: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// STEP 6: Compound Indexes for database optimization
contestScoreSchema.index({ contestId: 1, userId: 1 }, { unique: true });
contestScoreSchema.index({ contestId: 1, solvedCount: -1, totalPenalty: 1 });
contestScoreSchema.index({ contestId: 1, problemsSolved: 1 });

const ContestScore = mongoose.model('ContestScore', contestScoreSchema);
module.exports = ContestScore;
