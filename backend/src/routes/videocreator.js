const express = require('express');
const { adminmiddleware } = require('../middleware/adminmiddleware');
const videoRouter = express.Router();
const {
  testCloudinary,
  generateUploadSignature,
  saveVideoMetadata,
  deleteVideo,
  getVideoForProblem,
  listAllVideos,
  getVideoById,
  deleteVideoById,
  deleteProblemVideos
} = require("../controllers/videoSection");

// Test endpoint (no auth required for testing)
videoRouter.get("/test", testCloudinary);

// Public endpoints
videoRouter.get("/problem/:problemId", getVideoForProblem);
videoRouter.get("/:videoId", getVideoById);

// Admin endpoints
videoRouter.get("/create/:problemId", adminmiddleware, generateUploadSignature);
videoRouter.post("/save", adminmiddleware, saveVideoMetadata);

// Delete endpoints
videoRouter.delete("/delete/:problemId", adminmiddleware, deleteVideo); // Single video delete by user
videoRouter.delete("/:videoId", adminmiddleware, deleteVideoById); // Delete by video ID
videoRouter.delete("/problem/:problemId/all", adminmiddleware, deleteProblemVideos); // Delete all videos for problem

// List all videos (admin only)
videoRouter.get("/list", adminmiddleware, listAllVideos);

module.exports = videoRouter;