// models/contest.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const contestSchema = new Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    problems: [{
        type: Schema.Types.ObjectId,
        ref: 'problem',
        required: true
    }],
    startTime: {
        type: Date,
        required: true
    },
    endTime: {
        type: Date,
        required: true
    },
    duration: {
        type: Number, // in minutes
        required: true
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    status: {
        type: String,
        enum: ['upcoming', 'active', 'completed', 'cancelled'],
        default: 'upcoming'
    },
    participants: [{
        user: {
            type: Schema.Types.ObjectId,
            ref: 'user'
        },
        registeredAt: {
            type: Date,
            default: Date.now
        }
    }],
    isPublic: {
        type: Boolean,
        default: true
    },
    maxParticipants: {
        type: Number,
        default: 100
    },
    rules: {
        type: String,
        default: 'Standard contest rules apply.'
    },
    scoring: {
        type: String,
        enum: ['standard', 'acm', 'icpc'],
        default: 'standard'
    },
    penalty: {
        type: Number,
        default: 0
    },
    showParticipants: {
        type: Boolean,
        default: true
    },
    showStandings: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

contestSchema.index({ status: 1, startTime: 1 });
contestSchema.index({ 'participants.user': 1 });
contestSchema.index({ endTime: 1 });

const Contest = mongoose.model('Contest', contestSchema);
module.exports = Contest;