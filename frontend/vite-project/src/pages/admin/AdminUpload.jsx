// src/pages/AdminUpload.jsx (Updated version)
import { useParams, useNavigate } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import axiosclient from '../../utilis/axiosclient';

function AdminUpload() {
    const { problemId } = useParams();
    const navigate = useNavigate();
    
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadedVideo, setUploadedVideo] = useState(null);
    const [errorDetails, setErrorDetails] = useState(null);
    const [debugInfo, setDebugInfo] = useState([]);
    const [signatureData, setSignatureData] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [existingVideo, setExistingVideo] = useState(null);
    const [loadingVideo, setLoadingVideo] = useState(false);
    
    // Thumbnail states
    const [thumbnailUrls, setThumbnailUrls] = useState(null);
    const [generatingThumbnail, setGeneratingThumbnail] = useState(false);
    const [customTimestamp, setCustomTimestamp] = useState('00:00:01');
    const [selectedThumbnail, setSelectedThumbnail] = useState('medium');
    const [thumbnailError, setThumbnailError] = useState(null);
    
    const addDebug = (message, data = null) => {
        const timestamp = new Date().toISOString();
        const entry = { timestamp, message, data };
        setDebugInfo(prev => [entry, ...prev].slice(0, 50));
        console.log(`[DEBUG] ${message}`, data);
    };
    
    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
        reset,
        setError,
        clearErrors
    } = useForm();

    const selectedFile = watch('videoFile')?.[0];

    // Check for existing video on component mount
    useEffect(() => {
        checkExistingVideo();
    }, [problemId]);

    const checkExistingVideo = async () => {
        try {
            setLoadingVideo(true);
            const response = await axiosclient.get(`/video/problem/${problemId}`);
            if (response.data.video) {
                setExistingVideo(response.data.video);
                if (response.data.video.thumbnailUrls) {
                    setThumbnailUrls(response.data.video.thumbnailUrls);
                }
                addDebug('Found existing video:', response.data.video);
            } else {
                addDebug('No existing video found');
            }
        } catch (error) {
            // No video exists, that's fine
            addDebug('No existing video (error):', error.message);
        } finally {
            setLoadingVideo(false);
        }
    };

    // Upload video to Cloudinary
    const onSubmit = async (data) => {
        const file = data.videoFile[0];
        
        setUploading(true);
        setUploadProgress(0);
        setErrorDetails(null);
        setDebugInfo([]);
        setSignatureData(null);
        setThumbnailUrls(null);
        setThumbnailError(null);
        clearErrors();

        try {
            addDebug('🚀 Starting upload process...');
            addDebug(`📁 Selected file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);

            // Step 1: Get upload signature
            addDebug('1️⃣ Getting upload signature from backend...');
            const signatureResponse = await axiosclient.get(`/video/create/${problemId}`);
            
            const { 
                signature, 
                timestamp, 
                public_id, 
                api_key, 
                cloud_name,
                folder,
                resource_type 
            } = signatureResponse.data;
            
            addDebug('✅ Signature received!', {
                timestamp,
                public_id: public_id?.substring(0, 30) + '...',
                cloud_name,
                signature_length: signature?.length
            });

            // Step 2: Create FormData with EXACT parameters
            addDebug('2️⃣ Creating FormData...');
            const formData = new FormData();
            
            // CRITICAL: Parameters in correct order
            if (folder) formData.append('folder', folder);
            if (public_id) formData.append('public_id', public_id);
            formData.append('timestamp', timestamp.toString());
            formData.append('signature', signature);
            formData.append('api_key', api_key);
            formData.append('file', file);
            if (resource_type) formData.append('resource_type', resource_type);

            // Debug: Show FormData
            addDebug('📋 FormData contents:');
            for (let [key, value] of formData.entries()) {
                if (key !== 'file') {
                    addDebug(`   ${key}: ${value}`);
                }
            }

            // Step 3: Upload to Cloudinary
            addDebug(`3️⃣ Uploading to Cloudinary: ${cloud_name}`);
            const uploadUrl = `https://api.cloudinary.com/v1_1/${cloud_name}/video/upload`;
            
            const uploadResponse = await axios.post(uploadUrl, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                timeout: 300000,
                onUploadProgress: (progressEvent) => {
                    if (progressEvent.total) {
                        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        setUploadProgress(progress);
                        if (progress % 20 === 0) {
                            addDebug(`📊 Upload progress: ${progress}%`);
                        }
                    }
                },
            });

            addDebug('✅ Cloudinary upload successful!', {
                secure_url: uploadResponse.data.secure_url?.substring(0, 50) + '...',
                public_id: uploadResponse.data.public_id,
                duration: uploadResponse.data.duration,
                width: uploadResponse.data.width,
                height: uploadResponse.data.height
            });

            // Step 4: Save video metadata
            addDebug('4️⃣ Saving video metadata...');
            const metadataResponse = await axiosclient.post('/video/save', {
                problemId: problemId,
                cloudinaryPublicId: uploadResponse.data.public_id,
                secureUrl: uploadResponse.data.secure_url,
                duration: uploadResponse.data.duration,
                width: uploadResponse.data.width,
                height: uploadResponse.data.height,
                format: uploadResponse.data.format,
            });

            addDebug('💾 Metadata saved!', metadataResponse.data);
            
            // Set uploaded video data
            const videoData = metadataResponse.data.videoSolution;
            setUploadedVideo(videoData);
            setExistingVideo(videoData);
            
            // Set thumbnail URLs if available
            if (videoData.thumbnailUrls) {
                setThumbnailUrls(videoData.thumbnailUrls);
            } else if (videoData.thumbnailUrl) {
                setThumbnailUrls({
                    medium: videoData.thumbnailUrl,
                    small: videoData.thumbnailUrl.replace('/w_640,h_360/', '/w_320,h_180/'),
                    large: videoData.thumbnailUrl.replace('/w_640,h_360/', '/w_1280,h_720/')
                });
            }
            
            reset();
            
            // Success!
            setTimeout(() => {
                alert('🎉 Video uploaded successfully!');
            }, 1000);
            
        } catch (err) {
            console.error('❌ Upload error:', err);
            
            const errorLog = {
                message: err.message,
                status: err.response?.status,
                error: err.response?.data?.error,
                details: err.response?.data?.details
            };
            
            addDebug('❌ UPLOAD FAILED:', errorLog);
            setErrorDetails(errorLog);
            
            let errorMessage = 'Upload failed. ';
            
            if (err.response?.status === 401) {
                errorMessage = 'Cloudinary authentication failed (401). Check FormData parameters.';
            } else if (err.response?.data?.error) {
                errorMessage += err.response.data.error;
            } else {
                errorMessage += err.message;
            }
            
            setError('root', { type: 'manual', message: errorMessage });
            
        } finally {
            setUploading(false);
        }
    };

    // Delete video function
    const handleDeleteVideo = async () => {
        if (!existingVideo) return;
        
        setDeleting(true);
        try {
            addDebug('🗑️ Deleting video...');
            await axiosclient.delete(`/video/${existingVideo.id}`);
            
            setExistingVideo(null);
            setUploadedVideo(null);
            setThumbnailUrls(null);
            setShowDeleteConfirm(false);
            
            addDebug('✅ Video deleted successfully');
            alert('✅ Video deleted successfully!');
            
        } catch (error) {
            console.error('Delete error:', error);
            addDebug('❌ Delete failed:', error.message);
            alert(`Failed to delete video: ${error.response?.data?.error || error.message}`);
        } finally {
            setDeleting(false);
        }
    };

    // Generate custom thumbnail function
    const handleGenerateThumbnail = async () => {
        if (!uploadedVideo?.id) {
            alert('Please upload a video first');
            return;
        }
        
        setGeneratingThumbnail(true);
        setThumbnailError(null);
        
        try {
            addDebug('🎞️ Generating custom thumbnail...', { timestamp: customTimestamp });
            
            const response = await axiosclient.post(`/video/${uploadedVideo.id}/thumbnail`, {
                timestamp: customTimestamp
            });
            
            if (response.data.success) {
                // Update thumbnail URLs
                const newThumbnailUrls = {
                    ...thumbnailUrls,
                    custom: response.data.thumbnailUrl
                };
                setThumbnailUrls(newThumbnailUrls);
                setSelectedThumbnail('custom');
                
                addDebug('✅ Custom thumbnail generated:', response.data);
                alert('✅ Custom thumbnail generated successfully!');
            }
        } catch (error) {
            console.error('Error generating thumbnail:', error);
            addDebug('❌ Failed to generate thumbnail:', error.message);
            setThumbnailError(error.response?.data?.error || error.message);
            alert(`Failed to generate thumbnail: ${error.response?.data?.error || error.message}`);
        } finally {
            setGeneratingThumbnail(false);
        }
    };

    // Format file size
    const formatFileSize = (bytes) => {
        if (!bytes) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Format duration
    const formatDuration = (seconds) => {
        if (!seconds) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Format timestamp input
    const formatTimestampInput = (value) => {
        // Allow HH:MM:SS format or just seconds
        const regex = /^(\d{1,2}:)?(\d{1,2}:)?\d{1,2}$/;
        if (regex.test(value) || value === '') {
            setCustomTimestamp(value);
        }
    };

    // Reset form
    const handleReset = () => {
        reset();
        setUploadedVideo(null);
        setErrorDetails(null);
        setDebugInfo([]);
        setSignatureData(null);
        setThumbnailUrls(null);
        setThumbnailError(null);
        setCustomTimestamp('00:00:01');
        setSelectedThumbnail('medium');
        clearErrors();
    };

    // Handle quick timestamp selection
    const handleQuickTimestamp = (seconds) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        setCustomTimestamp(
            `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
        );
    };

    // Main render logic - Clean separation of states
    const renderContent = () => {
        if (loadingVideo) {
            return (
                <div className="mb-6 bg-gray-800/50 border border-gray-700 rounded-xl p-8 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                    <p className="text-gray-400">Checking for existing video...</p>
                </div>
            );
        }

        if (existingVideo && !uploadedVideo) {
            return (
                <>
                    {/* Video Exists Section */}
                    <div className="mb-6 bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-semibold text-green-400 flex items-center gap-2">
                                <span>✅</span> Video Solution Exists
                            </h3>
                            <div className="flex gap-2">
                                <a 
                                    href={existingVideo.secureUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2"
                                >
                                    <span>▶️</span> Play Video
                                </a>
                                <button
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg flex items-center gap-2"
                                >
                                    <span>🗑️</span> Delete Video
                                </button>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Video Preview */}
                            <div className="md:col-span-2">
                                <div className="bg-black rounded-lg overflow-hidden mb-4">
                                    <div className="relative aspect-video">
                                        <img 
                                            src={existingVideo.thumbnailUrl || 'https://via.placeholder.com/640x360/374151/ffffff?text=No+Thumbnail'} 
                                            alt="Video thumbnail"
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                e.target.src = 'https://via.placeholder.com/640x360/374151/ffffff?text=No+Thumbnail';
                                            }}
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                                        <div className="absolute bottom-4 left-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
                                                    <span className="text-lg">▶</span>
                                                </div>
                                                <div>
                                                    <p className="text-white font-medium">Click to play</p>
                                                    <p className="text-gray-300 text-sm">Duration: {formatDuration(existingVideo.duration)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Video Details */}
                            <div className="space-y-4">
                                <div className="bg-gray-900/50 rounded-lg p-4">
                                    <h4 className="font-medium text-gray-300 mb-2">Video Details</h4>
                                    <div className="space-y-2">
                                        <div>
                                            <p className="text-gray-400 text-sm">Upload Date</p>
                                            <p className="text-white">
                                                {new Date(existingVideo.uploadedAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-gray-400 text-sm">Duration</p>
                                            <p className="text-white">{formatDuration(existingVideo.duration)}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-400 text-sm">Resolution</p>
                                            <p className="text-white">{existingVideo.width}×{existingVideo.height}</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
                                    <h4 className="font-medium text-yellow-400 mb-2 flex items-center gap-2">
                                        <span>⚠️</span> Want to Replace?
                                    </h4>
                                    <p className="text-gray-300 text-sm">
                                        You can upload a new video below. It will replace this existing video.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Replace Video Section */}
                    <div className="mb-6 bg-blue-900/20 border border-blue-700 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-blue-400 mb-4 flex items-center gap-2">
                            <span>🔄</span> Replace Video Solution
                        </h3>
                        {renderUploadForm()}
                    </div>
                </>
            );
        }

        // No video exists - Show upload form
        return (
            <div className="mb-6">
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 mb-6">
                    <div className="text-center py-8">
                        <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-3xl">🎬</span>
                        </div>
                        <h3 className="text-xl font-semibold mb-2">No Video Solution Yet</h3>
                        <p className="text-gray-400 mb-6">
                            Upload a video solution for this problem. The video will be stored securely and can be viewed by users.
                        </p>
                    </div>
                    {renderUploadForm()}
                </div>
            </div>
        );
    };

    const renderUploadForm = () => (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* File Input */}
            <div className="space-y-3">
                <label className="block text-gray-300 font-medium">
                    Select Video File *
                </label>
                <div className="relative">
                    <input
                        type="file"
                        id="videoFile"
                        accept="video/*,.mp4,.mov,.avi,.wmv,.flv,.mkv,.webm"
                        {...register('videoFile', {
                            required: 'Please select a video file',
                            validate: {
                                isVideo: (files) => {
                                    if (!files || !files[0]) return 'Please select a video file';
                                    const file = files[0];
                                    const validTypes = [
                                        'video/mp4',
                                        'video/quicktime',
                                        'video/x-msvideo',
                                        'video/x-ms-wmv',
                                        'video/x-flv'
                                    ];
                                    return validTypes.includes(file.type) || 
                                           file.name.match(/\.(mp4|mov|avi|wmv|flv)$/i) ||
                                           'Please select a valid video file (MP4, MOV, AVI, WMV, FLV)';
                                },
                                fileSize: (files) => {
                                    if (!files || !files[0]) return true;
                                    const file = files[0];
                                    const maxSize = 100 * 1024 * 1024; // 100MB
                                    return file.size <= maxSize || 'File size must be less than 100MB';
                                }
                            }
                        })}
                        className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-700 file:text-white hover:file:bg-gray-600 disabled:opacity-50"
                        disabled={uploading}
                    />
                </div>
                {errors.videoFile && (
                    <p className="text-red-400 text-sm animate-pulse">{errors.videoFile.message}</p>
                )}
                
                {/* File requirements info */}
                <div className="text-sm text-gray-500 bg-gray-900/30 p-3 rounded">
                    <p className="font-medium text-gray-400 mb-1">Requirements:</p>
                    <ul className="list-disc list-inside space-y-1">
                        <li>Maximum file size: 100MB</li>
                        <li>Supported formats: MP4, MOV, AVI, WMV, FLV</li>
                        <li>Recommended resolution: 1280×720 (720p) or higher</li>
                    </ul>
                </div>
            </div>

            {/* Selected File Info */}
            {selectedFile && (
                <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 space-y-3">
                    <h3 className="font-medium text-lg flex items-center gap-2">
                        <span>📁</span> Selected File
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <p className="text-gray-400 text-sm">Name</p>
                            <p className="text-white truncate" title={selectedFile.name}>
                                {selectedFile.name}
                            </p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-gray-400 text-sm">Size</p>
                            <p className="text-white">{formatFileSize(selectedFile.size)}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-gray-400 text-sm">Type</p>
                            <p className="text-white">{selectedFile.type || 'Unknown'}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-gray-400 text-sm">Last Modified</p>
                            <p className="text-white">
                                {new Date(selectedFile.lastModified).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Upload Progress */}
            {uploading && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <span className="text-gray-300">Uploading to Cloudinary...</span>
                        <span className="text-white font-medium text-lg">
                            {uploadProgress}%
                        </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-3">
                        <div 
                            className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-300 ease-out"
                            style={{ width: `${uploadProgress}%` }}
                        ></div>
                    </div>
                    <p className="text-center text-gray-400 text-sm">
                        Please don't close this window until upload is complete.
                    </p>
                </div>
            )}

            {/* Success Message */}
            {uploadedVideo && (
                <div className="bg-green-900/30 border border-green-700 rounded-lg p-4">
                    <div className="flex items-center">
                        <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center mr-3">
                            <span className="text-xl">✓</span>
                        </div>
                        <div>
                            <h3 className="font-bold text-green-400">Upload Successful!</h3>
                            <p className="text-gray-300 mt-1">
                                Video has been uploaded and saved. You can now generate thumbnails or go back to the admin dashboard.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Error Message */}
            {errors.root && (
                <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
                    <div className="flex items-start">
                        <span className="text-red-400 mr-2">⚠️</span>
                        <div>
                            <h4 className="text-red-400 font-bold">Upload Failed</h4>
                            <p className="text-red-300 mt-1">{errors.root.message}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-gray-700">
                <button
                    type="button"
                    onClick={handleReset}
                    disabled={uploading}
                    className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition disabled:opacity-50 flex-1 flex items-center justify-center gap-2"
                >
                    <span>🔄</span> Reset
                </button>
                <button
                    type="submit"
                    disabled={uploading || !selectedFile}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 rounded-lg transition disabled:opacity-50 flex-1 flex items-center justify-center gap-2 font-bold"
                >
                    {uploading ? (
                        <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            Uploading...
                        </>
                    ) : (
                        <>
                            <span>🚀</span>
                            {existingVideo ? 'Replace Video' : 'Upload Video Solution'}
                        </>
                    )}
                </button>
            </div>
        </form>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold">
                            {existingVideo ? 'Manage Video Solution' : 'Upload Video Solution'}
                        </h1>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                            <p className="text-gray-400">Problem ID:</p>
                            <code className="px-2 py-1 bg-gray-800 rounded text-sm font-mono text-yellow-300">
                                {problemId?.substring(0, 12)}...
                            </code>
                            {existingVideo && (
                                <span className="ml-2 px-2 py-1 bg-green-900/30 text-green-400 text-xs rounded-full">
                                    Video Exists ✓
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={() => navigate(`/problem/${problemId}`)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition flex items-center gap-2 justify-center"
                        >
                            <span>👁️</span> View Problem
                        </button>
                        <button
                            onClick={() => navigate('/admin')}
                            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition flex items-center gap-2 justify-center"
                        >
                            <span>←</span> Back to Admin
                        </button>
                    </div>
                </div>

                {/* Main Content */}
                {renderContent()}

                {/* Thumbnail Management Section - Only show if video exists */}
                {(uploadedVideo || (existingVideo && thumbnailUrls)) && (
                    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 md:p-6 mb-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <span>🖼️</span> Video Thumbnails
                        </h3>
                        
                        {/* ... (keep existing thumbnail management code) */}
                    </div>
                )}

                {/* Debug Information - Optional */}
                {process.env.NODE_ENV === 'development' && (
                    <div className="bg-gray-900/70 border border-gray-700 rounded-xl p-4 md:p-6 mb-6">
                        {/* ... (keep existing debug console code) */}
                    </div>
                )}

                {/* Delete Confirmation Modal */}
                {showDeleteConfirm && (
                    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 max-w-md w-full">
                            <h3 className="text-xl font-bold text-red-400 mb-4 flex items-center gap-2">
                                <span>⚠️</span> Delete Video Solution
                            </h3>
                            <p className="text-gray-300 mb-4">
                                Are you sure you want to delete this video solution? This action cannot be undone.
                            </p>
                            <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 mb-6">
                                <p className="text-sm text-red-300">
                                    The video will be permanently deleted from:
                                </p>
                                <ul className="list-disc list-inside text-sm text-red-300/80 mt-1 ml-2">
                                    <li>Cloudinary storage</li>
                                    <li>Your database</li>
                                    <li>All user access</li>
                                </ul>
                            </div>
                            <div className="flex justify-end gap-4">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    disabled={deleting}
                                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteVideo}
                                    disabled={deleting}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition disabled:opacity-50 flex items-center gap-2"
                                >
                                    {deleting ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            Deleting...
                                        </>
                                    ) : (
                                        'Delete Permanently'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default AdminUpload;