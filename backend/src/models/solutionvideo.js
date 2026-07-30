const mongoose = require('mongoose');
const {Schema} = mongoose;

const videoSchema = new Schema({
    problemId: {
        type: Schema.Types.ObjectId,
        ref: 'problem',
        required: true
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'user',
        required: true,
    },
    title: {
        type: String,
        default: function() {
            return `Solution for Problem ${this.problemId}`;
        }
    },
    cloudinaryPublicId: {
        type: String,
        required: true,
        unique: true
    },
    secureUrl: {
        type: String,
        required: true
    },
    thumbnailUrl: {
        type: String,
        default: ''
    },
    thumbnailUrls: {
        type: Map,
        of: String,
        default: {
            small: '',
            medium: '',
            large: '',
            custom: ''
        }
    },
    duration: {
        type: Number,
        required: true
    },
    width: Number,
    height: Number,
    format: String,
    size: Number, // File size in bytes
    aspectRatio: String,
    frameRate: Number,
    bitRate: Number,
},{
    timestamps:true
});

const SolutionVideo = mongoose.model("solutionVideo",videoSchema);

module.exports = SolutionVideo;