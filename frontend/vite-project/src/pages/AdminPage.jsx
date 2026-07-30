// src/pages/AdminPage.jsx - Updated with tags and difficulty removed
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axiosclient from '../utilis/axiosclient';

function AdminPage() {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [videoStatusMap, setVideoStatusMap] = useState({});
  const [loadingVideos, setLoadingVideos] = useState({});

  // Check if user is admin
  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
    }
  }, [user, navigate]);

  // Fetch all problems
  useEffect(() => {
    fetchProblems();
  }, []);

  // Check video status for each problem after problems are loaded
  useEffect(() => {
    if (problems.length > 0) {
      checkVideoStatusForAllProblems();
    }
  }, [problems]);

  const fetchProblems = async () => {
    try {
      setLoading(true);
      const response = await axiosclient.get('/problem/getallproblem/');
      setProblems(response.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data || err.message || 'Failed to fetch problems');
      console.error('Error fetching problems:', err);
    } finally {
      setLoading(false);
    }
  };

  // Check video status for all problems
  const checkVideoStatusForAllProblems = async () => {
    const statusMap = {};
    const loadingMap = {};
    
    problems.forEach(problem => {
      loadingMap[problem._id] = true;
    });
    setLoadingVideos(loadingMap);
    
    // Check video status for each problem
    for (const problem of problems) {
      try {
        const response = await axiosclient.get(`/video/problem/${problem._id}`);
        statusMap[problem._id] = !!response.data.video; // true if video exists
      } catch (err) {
        // If 404 or no video, status is false
        statusMap[problem._id] = false;
      }
      
      // Update loading state for this problem
      setLoadingVideos(prev => ({
        ...prev,
        [problem._id]: false
      }));
    }
    
    setVideoStatusMap(statusMap);
  };

  // Check video status for a single problem
  const checkVideoStatus = async (problemId) => {
    setLoadingVideos(prev => ({
      ...prev,
      [problemId]: true
    }));
    
    try {
      const response = await axiosclient.get(`/video/problem/${problemId}`);
      const hasVideo = !!response.data.video;
      
      setVideoStatusMap(prev => ({
        ...prev,
        [problemId]: hasVideo
      }));
      
      return hasVideo;
    } catch (err) {
      setVideoStatusMap(prev => ({
        ...prev,
        [problemId]: false
      }));
      return false;
    } finally {
      setLoadingVideos(prev => ({
        ...prev,
        [problemId]: false
      }));
    }
  };

  const handleCreateProblem = () => {
    navigate('/admin/create');
  };

  const handleUpdateProblem = (problemId) => {
    navigate(`/admin/update/${problemId}`);
  };

  const handleDeleteProblem = (problemId) => {
    if (window.confirm('Are you sure you want to delete this problem?')) {
      deleteProblem(problemId);
    }
  };

  const handlevideoupload = (problemId) => {
    navigate(`/admin/upload/${problemId}`);
  };

  const handleDeleteVideo = async (problemId) => {
    if (!window.confirm('Are you sure you want to delete the video solution? This action cannot be undone.')) {
      return;
    }
    
    try {
      // First get the video by problemId to check if it exists
      const videoCheckResponse = await axiosclient.get(`/video/problem/${problemId}`);
      
      if (!videoCheckResponse.data.video) {
        alert('No video found to delete.');
        return;
      }
      
      const videoId = videoCheckResponse.data.video._id || videoCheckResponse.data.video.id;
      
      if (!videoId) {
        alert('Video ID not found in response.');
        return;
      }
      
      // Try different delete endpoints
      let deleteSuccessful = false;
      
      // Try endpoint 1: /video/:videoId
      try {
        await axiosclient.delete(`/video/${videoId}`);
        deleteSuccessful = true;
      } catch (err1) {
        console.log('First delete endpoint failed, trying alternative...', err1);
        
        // Try endpoint 2: /video/delete/:videoId
        try {
          await axiosclient.delete(`/video/delete/${videoId}`);
          deleteSuccessful = true;
        } catch (err2) {
          console.log('Second delete endpoint failed, trying third...', err2);
          
          // Try endpoint 3: /video/problem/:problemId
          try {
            await axiosclient.delete(`/video/problem/${problemId}`);
            deleteSuccessful = true;
          } catch (err3) {
            console.log('Third delete endpoint failed', err3);
            throw new Error(`All delete endpoints failed: ${err1.message}, ${err2.message}, ${err3.message}`);
          }
        }
      }
      
      if (deleteSuccessful) {
        // Update status map
        setVideoStatusMap(prev => ({
          ...prev,
          [problemId]: false
        }));
        
        alert('✅ Video deleted successfully!');
      }
      
    } catch (err) {
      console.error('Error deleting video:', err);
      alert(`❌ Failed to delete video: ${err.response?.data?.error || err.message || 'Unknown error'}`);
    }
  };

  const deleteProblem = async (problemId) => {
    try {
      await axiosclient.delete(`/problem/delete/${problemId}`);
      setProblems(problems.filter(p => p._id !== problemId));
      
      // Remove from video status map
      const newVideoStatusMap = { ...videoStatusMap };
      delete newVideoStatusMap[problemId];
      setVideoStatusMap(newVideoStatusMap);
      
      alert('Problem deleted successfully');
    } catch (err) {
      alert(err.response?.data || 'Failed to delete problem');
    }
  };

  const handleViewProblem = (problemId) => {
    navigate(`/problem/${problemId}`);
  };

  const filteredProblems = problems.filter(problem =>
    problem.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    problem._id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Refresh video status for a specific problem
  const refreshVideoStatus = async (problemId) => {
    await checkVideoStatus(problemId);
  };

  // Table headers - removed difficulty and tag columns
  const tableHeaders = [
    { key: 'title', label: 'Title' },
    { key: 'video', label: 'Video' },
    { key: 'id', label: 'ID' },
    { key: 'actions', label: 'Actions' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            <p className="ml-4">Loading admin dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold">Admin Dashboard</h1>
              <p className="text-gray-400 mt-2">Manage problems and settings</p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => navigate('/')}
                className="px-6 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
              >
                Back to Home
              </button>
              <button
                onClick={handleCreateProblem}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition flex items-center gap-2"
              >
                <span>+</span> Create New Problem
              </button>
              <button
                onClick={checkVideoStatusForAllProblems}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition flex items-center gap-2"
                title="Refresh video status for all problems"
              >
                <span>🔄</span> Refresh Videos
              </button>
            </div>
          </div>
          
          {/* Admin Stats - Simplified */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
              <div className="text-2xl font-bold">{problems.length}</div>
              <div className="text-gray-400">Total Problems</div>
            </div>
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
              <div className="text-2xl font-bold">
                {Object.values(videoStatusMap).filter(hasVideo => hasVideo).length}
              </div>
              <div className="text-blue-400">Problems with Video</div>
            </div>
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
              <div className="text-2xl font-bold">
                {Object.values(videoStatusMap).filter(hasVideo => !hasVideo).length}
              </div>
              <div className="text-gray-400">No Video</div>
            </div>
          </div>
        </header>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-900/30 border border-red-700 rounded-xl p-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-red-400 font-semibold">Error</h3>
                <p className="text-gray-300">{typeof error === 'string' ? error : error?.error || JSON.stringify(error)}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-300"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-gray-400 mb-2">Search Problems</label>
              <input
                type="text"
                placeholder="Search by title or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-gray-400 mb-2">Quick Action</label>
              <select
                value={selectedAction}
                onChange={(e) => {
                  setSelectedAction(e.target.value);
                  if (e.target.value === 'create') {
                    handleCreateProblem();
                  } else if (e.target.value === 'refresh') {
                    fetchProblems();
                  }
                }}
                className="w-full md:w-48 px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
              >
                <option value="">Select Action</option>
                <option value="create">Create New Problem</option>
                <option value="refresh">Refresh List</option>
              </select>
            </div>
          </div>
        </div>

        {/* Problems Table */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-700">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">
                  Manage Problems ({filteredProblems.length})
                </h2>
                <p className="text-gray-400 text-sm mt-1">
                  Click on problem title to view, or use action buttons to manage
                </p>
              </div>
              <div className="text-sm text-gray-400">
                {Object.values(videoStatusMap).filter(hasVideo => hasVideo).length} / {problems.length} problems have videos
              </div>
            </div>
          </div>

          {filteredProblems.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-5xl mb-4">📝</div>
              <h3 className="text-xl font-medium mb-2">No problems found</h3>
              <p className="text-gray-400 mb-6">
                {searchTerm ? 'Try a different search term' : 'Create your first problem to get started'}
              </p>
              <button
                onClick={handleCreateProblem}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg transition"
              >
                Create First Problem
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-full divide-y divide-gray-800">
                <thead>
                  <tr className="bg-gray-900/50">
                    {tableHeaders.map((header) => (
                      <th
                        key={header.key}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider"
                      >
                        {header.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {filteredProblems.map((problem) => (
                    <tr key={problem._id} className="hover:bg-gray-800/30 transition">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleViewProblem(problem._id)}
                          className="text-left hover:text-blue-400 transition font-medium"
                        >
                          {problem.title}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {loadingVideos[problem._id] ? (
                          <div className="flex items-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            <span className="text-xs text-gray-400">Checking...</span>
                          </div>
                        ) : videoStatusMap[problem._id] ? (
                          <div className="flex items-center">
                            <span className="text-green-400 mr-2">✓</span>
                            <span className="text-green-300 text-sm">Video</span>
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <span className="text-gray-500 mr-2">—</span>
                            <span className="text-gray-400 text-sm">No Video</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-gray-400 text-sm">
                        {problem._id.substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => handleUpdateProblem(problem._id)}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm transition"
                            title="Update Problem"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteProblem(problem._id)}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm transition"
                            title="Delete Problem"
                          >
                            Delete
                          </button>
                          
                          {/* Video Button - Conditional */}
                          {loadingVideos[problem._id] ? (
                            <button
                              disabled
                              className="px-3 py-1 bg-gray-800 rounded text-sm transition flex items-center gap-1"
                            >
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                            </button>
                          ) : videoStatusMap[problem._id] ? (
                            <button
                              onClick={() => handleDeleteVideo(problem._id)}
                              className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm transition"
                              title="Delete Video Solution"
                            >
                              Delete Video
                            </button>
                          ) : (
                            <button
                              onClick={() => handlevideoupload(problem._id)}
                              className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm transition"
                              title="Upload Video Solution"
                            >
                              Upload Video
                            </button>
                          )}
                          
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(problem._id);
                              alert('Problem ID copied to clipboard!');
                            }}
                            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm transition"
                            title="Copy ID"
                          >
                            📋
                          </button>
                          <button
                            onClick={() => refreshVideoStatus(problem._id)}
                            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm transition"
                            title="Refresh Video Status"
                          >
                            🔄
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Debug Info - Optional */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-6 bg-gray-900/70 border border-gray-700 rounded-xl p-4">
            <h3 className="text-lg font-semibold mb-3 text-yellow-400">Debug Info</h3>
            <div className="text-sm text-gray-400 space-y-2">
              <p>Total problems: {problems.length}</p>
              <p>Problems with video: {Object.values(videoStatusMap).filter(v => v).length}</p>
              <p>Video status map keys: {Object.keys(videoStatusMap).length}</p>
            </div>
          </div>
        )}

        {/* Video Management Tips */}
        <div className="mt-8 bg-purple-900/20 border border-purple-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-3 text-purple-400">Video Management Tips</h3>
          <ul className="space-y-2 text-gray-300">
            <li>• <span className="text-green-400">Upload Video</span> button appears when no video exists for a problem</li>
            <li>• <span className="text-red-400">Delete Video</span> button appears when a video already exists</li>
            <li>• Videos are stored in Cloudinary and can be managed from the upload page</li>
            <li>• Use the refresh button (🔄) to update video status if you've just uploaded/deleted a video</li>
            <li>• Deleting a problem will also remove its associated video solution</li>
            <li>• If delete fails, check the browser console for detailed error messages</li>
          </ul>
        </div>

        {/* Quick Tips */}
        <div className="mt-6 bg-blue-900/20 border border-blue-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-3 text-blue-400">Admin Tips</h3>
          <ul className="space-y-2 text-gray-300">
            <li>• Click on problem title to view it as a regular user would</li>
            <li>• Use the Edit button to modify existing problems</li>
            <li>• Test cases and solutions are validated when creating/updating problems</li>
            <li>• Deleted problems cannot be recovered</li>
            <li>• Always test problems thoroughly before making them visible to users</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default AdminPage;