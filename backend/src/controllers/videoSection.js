const cloudinary = require('cloudinary').v2;
const Problem = require("../models/problem");
const User = require("../models/user");
const SolutionVideo = require("../models/solutionVideo");
const { sanitizeFilter } = require('mongoose');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Test Cloudinary connection
const testCloudinary = async (req, res) => {
  try {
    console.log('Testing Cloudinary connection...');
    console.log('Cloudinary Config:', {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY ? process.env.CLOUDINARY_API_KEY.substring(0, 8) + '...' : 'Not set',
      api_secret_set: !!process.env.CLOUDINARY_API_SECRET
    });

    // Check if credentials exist
    if (!process.env.CLOUDINARY_CLOUD_NAME || 
        !process.env.CLOUDINARY_API_KEY || 
        !process.env.CLOUDINARY_API_SECRET) {
      console.error('Missing Cloudinary credentials in .env file');
      return res.status(500).json({ 
        success: false, 
        error: 'Cloudinary credentials missing in .env file',
        config: {
          cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
          api_key_exists: !!process.env.CLOUDINARY_API_KEY,
          api_secret_exists: !!process.env.CLOUDINARY_API_SECRET
        }
      });
    }

    // Try a simple ping to Cloudinary
    const result = await cloudinary.api.ping();
    
    console.log('Cloudinary ping successful:', result);
    
    res.json({ 
      success: true, 
      message: 'Cloudinary connection successful',
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key_short: process.env.CLOUDINARY_API_KEY.substring(0, 8) + '...',
      status: result.status || 'connected'
    });

  } catch (error) {
    console.error('Cloudinary test error:', error.message);
    console.error('Error details:', error);
    
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Cloudinary connection failed',
      details: {
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key_exists: !!process.env.CLOUDINARY_API_KEY,
        api_secret_exists: !!process.env.CLOUDINARY_API_SECRET,
        error_message: error.message,
        error_code: error.error?.code,
        error_http_code: error.http_code
      }
    });
  }
};

const generateUploadSignature = async (req, res) => {
  try {
    const { problemId } = req.params;
    const userId = req.user._id; // Changed from req.result._id to req.user._id
    
    console.log('🔐 Generating Cloudinary signature for:', {
      problemId,
      userId: userId.toString().substring(0, 8) + '...'
    });

    // Verify problem exists
    const problem = await Problem.findById(problemId);
    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    // Generate timestamp (seconds since epoch)
    const timestamp = Math.round(new Date().getTime() / 1000);
    
    // Create folder and public_id
    const folder = `leetcode-solutions/${problemId}`;
    const publicId = `leetcode-solutions/${problemId}/${userId}_${timestamp}`;
    
    console.log('📝 Parameters for signature:', {
      timestamp,
      folder,
      publicId
    });

    // IMPORTANT: Create signature with EXACT parameters
    // Cloudinary signs parameters in alphabetical order
    const paramsToSign = {
      folder: folder,
      public_id: publicId,
      timestamp: timestamp
    };

    // Generate signature
    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET
    );

    console.log('✅ Signature generated:', signature.substring(0, 20) + '...');

    // Return all necessary data
    res.json({
      signature,
      timestamp,
      public_id: publicId,
      api_key: process.env.CLOUDINARY_API_KEY,
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      folder: folder,
      upload_url: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload`,
      resource_type: 'video'
    });

  } catch (error) {
    console.error('❌ Signature generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate upload credentials',
      details: error.message 
    });
  }
};

const saveVideoMetadata = async (req, res) => {
  try {
    const {
      problemId,
      cloudinaryPublicId,
      secureUrl,
      duration,
      width,
      height,
      format
    } = req.body;

    const userId = req.user._id; // Changed from req.result._id to req.user._id

    console.log('Saving video metadata:', {
      problemId,
      userId,
      cloudinaryPublicId,
      duration
    });

    // Verify the upload with Cloudinary
    let cloudinaryResource;
    try {
      cloudinaryResource = await cloudinary.api.resource(
        cloudinaryPublicId,
        { resource_type: 'video' }
      );
      console.log('Cloudinary resource verified:', cloudinaryResource.public_id);
    } catch (cloudinaryError) {
      console.error('Cloudinary resource verification failed:', cloudinaryError);
      return res.status(400).json({ 
        error: 'Video not found on Cloudinary',
        details: cloudinaryError.message 
      });
    }

    // Check if video already exists for this problem and user
    const existingVideo = await SolutionVideo.findOne({
      problemId,
      userId,
      cloudinaryPublicId
    });

    if (existingVideo) {
      console.warn('Video already exists:', existingVideo._id);
      return res.status(409).json({ error: 'Video already exists' });
    }

    // Generate thumbnail URL
    const thumbnailUrl = cloudinary.url(cloudinaryPublicId, {
      resource_type: 'video',
      transformation: [
        { width: 400, height: 225, crop: 'fill' },
        { quality: 'auto' },
        { format: 'jpg' }
      ]
    });

    console.log('Generated thumbnail URL:', thumbnailUrl);

    // Create video solution record
    const videoSolution = await SolutionVideo.create({
      problemId,
      userId,
      cloudinaryPublicId,
      secureUrl,
      duration: cloudinaryResource.duration || duration,
      thumbnailUrl,
      width: cloudinaryResource.width || width,
      height: cloudinaryResource.height || height,
      format: cloudinaryResource.format || format
    });

    console.log('Video solution saved:', videoSolution._id);

    res.status(201).json({
      message: 'Video solution saved successfully',
      videoSolution: {
        id: videoSolution._id,
        thumbnailUrl: videoSolution.thumbnailUrl,
        duration: videoSolution.duration,
        uploadedAt: videoSolution.createdAt,
        width: videoSolution.width,
        height: videoSolution.height
      }
    });

  } catch (error) {
    console.error('Error saving video metadata:', error);
    console.error('Error stack:', error.stack);
    
    res.status(500).json({ 
      error: 'Failed to save video metadata',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

const deleteVideo = async (req, res) => {
  try {
    const { problemId } = req.params;
    const userId = req.user._id; // Changed from req.result._id to req.user._id

    console.log('Deleting video for problem:', {
      problemId,
      userId
    });

    const video = await SolutionVideo.findOneAndDelete({
      problemId: problemId,
      userId: userId
    });

    if (!video) {
      console.warn('Video not found for deletion:', { problemId, userId });
      return res.status(404).json({ error: 'Video not found' });
    }

    console.log('Found video to delete:', video.cloudinaryPublicId);

    try {
      // Delete from Cloudinary
      await cloudinary.uploader.destroy(video.cloudinaryPublicId, { 
        resource_type: 'video',
        invalidate: true 
      });
      console.log('Video deleted from Cloudinary:', video.cloudinaryPublicId);
    } catch (cloudinaryError) {
      console.error('Error deleting from Cloudinary:', cloudinaryError);
      // Continue even if Cloudinary deletion fails
    }

    res.json({ 
      message: 'Video deleted successfully',
      deletedId: video._id 
    });

  } catch (error) {
    console.error('Error deleting video:', error);
    console.error('Error stack:', error.stack);
    
    res.status(500).json({ 
      error: 'Failed to delete video',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Get video for a problem
const getVideoForProblem = async (req, res) => {
  try {
    const { problemId } = req.params;
    
    console.log('Getting video for problem:', problemId);

    const video = await SolutionVideo.findOne({ 
      problemId: problemId 
    }).populate('userId', 'username');

    if (!video) {
      console.log('No video found for problem:', problemId);
      return res.status(404).json({ 
        error: 'No video solution found for this problem' 
      });
    }

    console.log('Video found:', video._id);

    res.json({
      video: {
        id: video._id,
        secureUrl: video.secureUrl,
        thumbnailUrl: video.thumbnailUrl,
        duration: video.duration,
        uploadedAt: video.createdAt,
        uploadedBy: video.userId?.username || 'Admin',
        width: video.width,
        height: video.height
      }
    });

  } catch (error) {
    console.error('Error getting video:', error);
    
    res.status(500).json({ 
      error: 'Failed to get video',
      details: error.message
    });
  }
};

// List all videos (admin only)
const listAllVideos = async (req, res) => {
  try {
    const videos = await SolutionVideo.find({})
      .populate('problemId', 'title difficulty')
      .populate('userId', 'username email')
      .sort({ createdAt: -1 });

    console.log('Found videos:', videos.length);

    res.json({
      count: videos.length,
      videos: videos.map(video => ({
        id: video._id,
        problem: video.problemId ? {
          id: video.problemId._id,
          title: video.problemId.title,
          difficulty: video.problemId.difficulty
        } : null,
        uploadedBy: video.userId ? {
          username: video.userId.username,
          email: video.userId.email
        } : null,
        duration: video.duration,
        thumbnailUrl: video.thumbnailUrl,
        uploadedAt: video.createdAt,
        size: video.size
      }))
    });

  } catch (error) {
    console.error('Error listing videos:', error);
    
    res.status(500).json({ 
      error: 'Failed to list videos',
      details: error.message
    });
  }
};

// Delete video by ID (admin only)
const deleteVideoById = async (req, res) => {
  try {
    const { videoId } = req.params;
    const userId = req.user._id; // Changed from req.result._id to req.user._id

    console.log('Deleting video by ID:', videoId);

    // Find the video
    const video = await SolutionVideo.findById(videoId);
    
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Check if user owns the video or is admin
    const user = await User.findById(userId);
    if (video.userId.toString() !== userId.toString() && user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this video' });
    }

    // Delete from Cloudinary
    try {
      await cloudinary.uploader.destroy(video.cloudinaryPublicId, { 
        resource_type: 'video',
        invalidate: true 
      });
      console.log('Deleted from Cloudinary:', video.cloudinaryPublicId);
    } catch (cloudinaryError) {
      console.error('Cloudinary deletion error:', cloudinaryError);
      // Continue with database deletion even if Cloudinary fails
    }

    // Delete from database
    await SolutionVideo.findByIdAndDelete(videoId);

    console.log('Video deleted from database:', videoId);

    res.json({ 
      success: true,
      message: 'Video deleted successfully',
      deletedVideo: {
        id: videoId,
        title: video.title || 'Untitled'
      }
    });

  } catch (error) {
    console.error('Error deleting video by ID:', error);
    res.status(500).json({ 
      error: 'Failed to delete video',
      details: error.message 
    });
  }
};

// Delete all videos for a problem (admin only)
const deleteProblemVideos = async (req, res) => {
  try {
    const { problemId } = req.params;
    const userId = req.user._id; // Changed from req.result._id to req.user._id

    console.log('Deleting all videos for problem:', problemId);

    // Verify user is admin
    const user = await User.findById(userId);
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Find all videos for this problem
    const videos = await SolutionVideo.find({ problemId });
    
    if (videos.length === 0) {
      return res.status(404).json({ error: 'No videos found for this problem' });
    }

    // Delete each from Cloudinary
    const deletionPromises = videos.map(async (video) => {
      try {
        await cloudinary.uploader.destroy(video.cloudinaryPublicId, { 
          resource_type: 'video',
          invalidate: true 
        });
        console.log('Deleted from Cloudinary:', video.cloudinaryPublicId);
      } catch (cloudinaryError) {
        console.error('Failed to delete from Cloudinary:', video.cloudinaryPublicId);
      }
    });

    await Promise.all(deletionPromises);

    // Delete all from database
    const result = await SolutionVideo.deleteMany({ problemId });

    console.log(`Deleted ${result.deletedCount} videos for problem ${problemId}`);

    res.json({ 
      success: true,
      message: `Deleted ${result.deletedCount} video(s) for problem ${problemId}`,
      deletedCount: result.deletedCount
    });

  } catch (error) {
    console.error('Error deleting problem videos:', error);
    res.status(500).json({ 
      error: 'Failed to delete videos',
      details: error.message 
    });
  }
};

// Get video by ID
const getVideoById = async (req, res) => {
  try {
    const { videoId } = req.params;

    const video = await SolutionVideo.findById(videoId)
      .populate('problemId', 'title difficulty')
      .populate('userId', 'username email');

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    res.json({
      success: true,
      video: {
        id: video._id,
        problem: {
          id: video.problemId?._id,
          title: video.problemId?.title,
          difficulty: video.problemId?.difficulty
        },
        uploadedBy: {
          username: video.userId?.username,
          email: video.userId?.email
        },
        secureUrl: video.secureUrl,
        thumbnailUrl: video.thumbnailUrl,
        duration: video.duration,
        width: video.width,
        height: video.height,
        format: video.format,
        uploadedAt: video.createdAt,
        cloudinaryPublicId: video.cloudinaryPublicId
      }
    });

  } catch (error) {
    console.error('Error getting video by ID:', error);
    res.status(500).json({ 
      error: 'Failed to get video',
      details: error.message 
    });
  }
};

module.exports = {
  testCloudinary,
  generateUploadSignature,
  saveVideoMetadata,
  deleteVideo,
  getVideoForProblem,
  listAllVideos,
  deleteVideoById,
  deleteProblemVideos,
  getVideoById
};