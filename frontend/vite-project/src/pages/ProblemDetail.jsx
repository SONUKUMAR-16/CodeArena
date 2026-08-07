import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MonacoEditor from '@monaco-editor/react';
import { useSelector } from 'react-redux';
import axiosclient from '../utilis/axiosclient';
import { FiMessageSquare } from 'react-icons/fi';

function ProblemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  
  // State for problem data
  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // State for code execution
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);
  const [activeTab, setActiveTab] = useState('description');
  const [testCases, setTestCases] = useState([]);
  
  // State for submissions
  const [submissions, setSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [showCodeModal, setShowCodeModal] = useState(false);
  
  // State for video solution
  const [solutionVideo, setSolutionVideo] = useState(null);
  const [loadingVideo, setLoadingVideo] = useState(false);
  const [deletingVideo, setDeletingVideo] = useState(false);
  const [showVideoDeleteConfirm, setShowVideoDeleteConfirm] = useState(false);
  const [videoError, setVideoError] = useState(null);
  
  // Editor theme
  const [theme, setTheme] = useState('vs-dark');
  
  // Language configurations
  const languages = [
    { value: 'javascript', label: 'JavaScript', monacoLang: 'javascript' },
    { value: 'java', label: 'Java', monacoLang: 'java' },
    { value: 'c++', label: 'C++', monacoLang: 'cpp' }
  ];

  // Default starter code templates
  const starterTemplates = {
    javascript: `function solution(input) {
  // Write your code here
  return input;
}

// Test the function
console.log(solution("test"));`,
    java: `import java.util.*;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        // Write your code here
        System.out.println("Hello World");
        sc.close();
    }
}`,
    'c++': `#include <iostream>
using namespace std;

int main() {
    // Write your code here
    cout << "Hello World" << endl;
    return 0;
}`
  };

  // Notification system
  const [notification, setNotification] = useState({ message: '', type: '', visible: false });

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type, visible: true });
    setTimeout(() => {
      setNotification({ message: '', type: '', visible: false });
    }, 5000);
  };

  // Base64 decoder for older submissions (if needed)
  const decodeBase64IfNeeded = (str) => {
    if (!str || typeof str !== 'string') return '';
    
    try {
      const base64Regex = /^[A-Za-z0-9+/]+={0,2}$/;
      const cleanedStr = str.replace(/\s/g, '');
      
      if (base64Regex.test(cleanedStr) && cleanedStr.length % 4 === 0) {
        return atob(str);
      }
      return str;
    } catch (e) {
      return str;
    }
  };

  // Format duration for video
  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Fetch problem details
  useEffect(() => {
    const fetchProblem = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await axiosclient.get(`/problem/problembyid/${id}`);
        
        console.log('Problem data:', response.data);
        setProblem(response.data);
        
        // Initialize code with starter code if available
        if (response.data.startcode && response.data.startcode.length > 0) {
          const jsStarter = response.data.startcode.find(sc => sc.language === 'javascript');
          const javaStarter = response.data.startcode.find(sc => sc.language === 'java');
          const cppStarter = response.data.startcode.find(sc => sc.language === 'c++');
          
          if (language === 'javascript' && jsStarter) {
            setCode(jsStarter.initialcode);
          } else if (language === 'java' && javaStarter) {
            setCode(javaStarter.initialcode);
          } else if (language === 'c++' && cppStarter) {
            setCode(cppStarter.initialcode);
          } else {
            setCode(starterTemplates[language] || starterTemplates.javascript);
          }
        } else {
          setCode(starterTemplates[language]);
        }
        
        // Initialize test cases
        if (response.data.visibletestcases) {
          setTestCases(response.data.visibletestcases.map((tc, index) => ({
            ...tc,
            id: index + 1,
            isHidden: false
          })));
        }
        
        showNotification('Problem loaded successfully', 'success');
        
      } catch (err) {
        const errorMsg = err.response?.data || err.message || 'Failed to fetch problem';
        setError(errorMsg);
        showNotification(errorMsg, 'error');
        console.error('Error fetching problem:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProblem();
    fetchSolutionVideo();
  }, [id, language]);

  // Fetch video solution
  const fetchSolutionVideo = async () => {
    try {
      setLoadingVideo(true);
      setVideoError(null);
      
      const response = await axiosclient.get(`/video/problem/${id}`);
      
      if (response.data.video) {
        setSolutionVideo(response.data.video);
        console.log('Video solution found:', response.data.video);
      } else if (response.data.error === 'No video solution found for this problem') {
        // No video exists, that's fine
        setSolutionVideo(null);
      }
    } catch (error) {
      console.log('No video solution found or error:', error.message);
      setSolutionVideo(null);
      if (error.response?.status !== 404) {
        setVideoError('Failed to load video solution');
      }
    } finally {
      setLoadingVideo(false);
    }
  };

  // Fetch submissions for the current problem
  useEffect(() => {
    if (activeTab === 'submissions' && user && id) {
      fetchProblemSubmissions();
    }
  }, [activeTab, id, user]);

  const fetchProblemSubmissions = async () => {
    if (!id || !user) return;
    
    try {
      setLoadingSubmissions(true);
      const response = await axiosclient.get(`/problem/submittedproblem/${id}`);
      
      // Handle different response formats
      if (response.data && Array.isArray(response.data)) {
        setSubmissions(response.data);
      } else if (response.data && response.data.submissions) {
        setSubmissions(response.data.submissions);
      } else if (response.data && response.data.success === true) {
        setSubmissions(response.data.submissions || []);
      } else {
        setSubmissions([]);
      }
    } catch (error) {
      console.error('Error fetching submissions:', error);
      showNotification('Failed to load submission history', 'error');
      setSubmissions([]);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  // Handle code run (visible test cases only)
  const handleRunCode = async () => {
    if (!code.trim()) {
      showNotification('Please write some code first!', 'error');
      return;
    }

    try {
      setIsRunning(true);
      setExecutionResult(null);

      const response = await axiosclient.post(`/submit/run/${id}`, {
        code,
        language
      });

      console.log('Run result:', response.data);
      
      // Handle both response formats
      let results = [];
      if (response.data && response.data.results) {
        results = response.data.results;
      } else if (Array.isArray(response.data)) {
        results = response.data;
      }
      
      // Process and display results
      const processedResults = results.map((item, index) => {
        const testCase = testCases[index] || {};
        
        // Get status description from backend (simple message)
        const statusDescription = item.status_description || 
                                (item.status ? item.status.description : 'Unknown');
        
        return {
          testCaseId: index + 1,
          input: testCase.input || 'N/A',
          expectedOutput: testCase.output || 'N/A',
          actualOutput: item.stdout || 'No output',
          status: item.status_id === 3 ? 'passed' : 'failed',
          statusDescription: statusDescription,
          time: item.time || 0,
          memory: item.memory || 0
        };
      });
      
      setExecutionResult({
        type: 'run',
        results: processedResults,
        summary: {
          total: processedResults.length,
          passed: processedResults.filter(r => r.status === 'passed').length,
          failed: processedResults.filter(r => r.status !== 'passed').length
        }
      });
      
      const passedCount = processedResults.filter(r => r.status === 'passed').length;
      const totalCount = processedResults.length;
      
      if (passedCount === totalCount) {
        showNotification(`✅ All ${totalCount} test cases passed!`, 'success');
      } else {
        showNotification(`${passedCount}/${totalCount} test cases passed`, 'warning');
      }
      
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to run code';
      showNotification(errorMsg, 'error');
      setError(errorMsg);
      console.error('Error running code:', err);
    } finally {
      setIsRunning(false);
    }
  };

  // Handle code submission (all test cases)
  const handleSubmitCode = async () => {
    if (!code.trim()) {
      showNotification('Please write some code first!', 'error');
      return;
    }

    // Check if user is logged in
    if (!user) {
      showNotification('Please login to submit solutions', 'error');
      navigate('/login');
      return;
    }

    try {
      setIsSubmitting(true);
      setExecutionResult(null);

      console.log('Submitting to:', `/submit/submit/${id}`);

      const response = await axiosclient.post(`/submit/submit/${id}`, {
        code,
        language
      });

      console.log('Submission response:', response.data);
      
      // Set execution result
      setExecutionResult({
        type: 'submit',
        result: response.data,
        message: response.data.status === 'accepted' ? 
          '✅ All test cases passed!' : 
          `❌ ${response.data.message || 'Some test cases failed'}`,
        timestamp: new Date().toLocaleTimeString()
      });
      
      // Show success message
      if (response.data.status === 'accepted') {
        showNotification('🎉 Congratulations! All test cases passed!', 'success');
      } else {
        showNotification(`${response.data.message || 'Some test cases failed'}`, 'warning');
      }
      
      // Refresh submissions list
      if (activeTab === 'submissions') {
        fetchProblemSubmissions();
      }
      
    } catch (err) {
      console.error('Submission error details:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
        stack: err.stack
      });
      
      let errorMsg = 'Failed to submit code';
      
      if (err.response) {
        // Server responded with error
        if (err.response.status === 500) {
          errorMsg = 'Server error. Please try again later.';
        } else if (err.response.status === 401) {
          errorMsg = 'Session expired. Please login again.';
          navigate('/login');
        } else if (err.response.status === 404) {
          errorMsg = 'Submission endpoint not found.';
        } else if (err.response.data?.message) {
          errorMsg = err.response.data.message;
        }
      } else if (err.request) {
        // Request was made but no response
        errorMsg = 'No response from server. Check if backend is running.';
      } else {
        // Something else happened
        errorMsg = err.message || 'Unknown error occurred';
      }
      
      showNotification(`❌ ${errorMsg}`, 'error');
      setError(errorMsg);
      
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete video function
  const handleDeleteVideo = async () => {
    if (!solutionVideo) return;
    
    setDeletingVideo(true);
    try {
      await axiosclient.delete(`/video/${solutionVideo.id}`);
      setSolutionVideo(null);
      setShowVideoDeleteConfirm(false);
      showNotification('✅ Video deleted successfully!', 'success');
    } catch (error) {
      console.error('Delete error:', error);
      showNotification(`Failed to delete video: ${error.response?.data?.error || error.message}`, 'error');
    } finally {
      setDeletingVideo(false);
    }
  };

  // Handle editor change
  const handleEditorChange = (value) => {
    setCode(value);
  };

  // Reset code to starter template
  const handleResetCode = () => {
    if (problem?.startcode) {
      const starter = problem.startcode.find(sc => sc.language === language);
      if (starter) {
        setCode(starter.initialcode);
        showNotification('Code reset to starter template', 'info');
      } else {
        setCode(starterTemplates[language]);
        showNotification('Loaded default template', 'info');
      }
    } else {
      setCode(starterTemplates[language]);
      showNotification('Loaded default template', 'info');
    }
  };

  // Copy code to clipboard
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      showNotification('Code copied to clipboard!', 'success');
    } catch (err) {
      showNotification('Failed to copy code', 'error');
    }
  };

  // Load template
  const handleLoadTemplate = () => {
    setCode(starterTemplates[language]);
    showNotification(`Loaded ${language} template`, 'info');
  };

  // Get difficulty color
  const getDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy': return 'bg-green-900/30 text-green-400 border-green-700';
      case 'medium': return 'bg-yellow-900/30 text-yellow-400 border-yellow-700';
      case 'hard': return 'bg-red-900/30 text-red-400 border-red-700';
      default: return 'bg-gray-700 text-gray-300 border-gray-600';
    }
  };

  // Get tag color
  const getTagColor = (tag) => {
    const tagColors = {
      'array': 'bg-blue-900/30 text-blue-400 border-blue-700',
      'linkedList': 'bg-purple-900/30 text-purple-400 border-purple-700',
      'graph': 'bg-teal-900/30 text-teal-400 border-teal-700',
      'dp': 'bg-orange-900/30 text-orange-400 border-orange-700'
    };
    return tagColors[tag] || 'bg-gray-700 text-gray-300 border-gray-600';
  };

  // Get notification color
  const getNotificationColor = (type) => {
    switch (type) {
      case 'success': return 'bg-green-900/30 border-green-700 text-green-400';
      case 'error': return 'bg-red-900/30 border-red-700 text-red-400';
      case 'warning': return 'bg-yellow-900/30 border-yellow-700 text-yellow-400';
      default: return 'bg-blue-900/30 border-blue-700 text-blue-400';
    }
  };

  // Get submission status color
  const getSubmissionStatusColor = (status) => {
    switch (status) {
      case 'accepted':
        return 'text-green-400 bg-green-900/30 border-green-800';
      case 'wrong':
        return 'text-red-400 bg-red-900/30 border-red-800';
      case 'error':
        return 'text-yellow-400 bg-yellow-900/30 border-yellow-800';
      case 'pending':
        return 'text-blue-400 bg-blue-900/30 border-blue-800';
      default:
        return 'text-gray-400 bg-gray-800 border-gray-700';
    }
  };

  // Format memory for display
  const formatMemory = (memory) => {
    if (!memory || memory === 0) return '0 KB';
    if (memory < 1024) return `${memory} KB`;
    return `${(memory / 1024).toFixed(2)} MB`;
  };

  // Format date for submission
  const formatSubmissionDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Handle viewing submission code
  const handleViewSubmissionCode = (submission) => {
    setSelectedSubmission(submission);
    setShowCodeModal(true);
  };

  // Handle viewing all submissions
  const handleViewAllSubmissions = () => {
    navigate('/submissions');
  };

  // Handle AI Tutor navigation
  const handleAITutor = () => {
    if (!problem) {
      showNotification('Problem data not loaded yet', 'error');
      return;
    }
    navigate(`/chat/${id}`, { state: { problem ,code,language }});
  };

  // Handle video upload navigation
  const handleVideoUpload = () => {
    navigate(`/admin/upload/${id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            <p className="ml-4 text-lg">Loading problem...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !problem) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white p-4">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => navigate('/')}
            className="mb-4 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition flex items-center"
          >
            ← Back to Problems
          </button>
          <div className="bg-red-900/30 border border-red-700 rounded-xl p-6 text-center">
            <div className="text-4xl mb-4">❌</div>
            <h2 className="text-xl font-bold mb-3">Problem Not Found</h2>
            <p className="text-gray-300 mb-4">{error || "The problem you're looking for doesn't exist."}</p>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
            >
              Browse Problems
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white p-2 md:p-4">
      {/* Notification */}
      {notification.visible && (
        <div className={`fixed top-4 right-4 z-50 ${getNotificationColor(notification.type)} border px-4 py-2 rounded-lg shadow-lg max-w-xs md:max-w-md transition-all duration-300 text-sm md:text-base`}>
          <div className="flex items-center justify-between">
            <span>{notification.message}</span>
            <button
              onClick={() => setNotification({ ...notification, visible: false })}
              className="ml-2 text-gray-400 hover:text-white text-sm"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4">
          <button
            onClick={() => navigate('/')}
            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg transition flex items-center text-sm mb-3"
          >
            ← Back
          </button>
          
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3">
            <div className="flex-1">
              <h1 className="text-xl md:text-2xl font-bold truncate">{problem.title}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 rounded-full text-xs border ${getDifficultyColor(problem.difficulty)}`}>
                  {problem.difficulty}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs border ${getTagColor(problem.tags)}`}>
                  {problem.tags}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-gray-400 text-xs">Logged in as</p>
                <p className="font-medium text-sm truncate max-w-[120px]">{user?.firstname || 'User'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Responsive Layout */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Left Column - Problem Description */}
          <div className="lg:w-2/5 flex flex-col gap-4">
            {/* Problem Description Tabs */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden flex-1">
              <div className="flex border-b border-gray-700">
                {['description', 'submissions', 'editorial'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 px-3 py-2 text-xs md:text-sm font-medium transition ${
                      activeTab === tab
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-900 text-gray-400 hover:bg-gray-800'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
              
              <div className="p-3 md:p-4 h-[calc(100%-45px)] overflow-y-auto">
                {activeTab === 'description' && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Problem Description</h3>
                    <div className="text-sm text-gray-300 whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                      {problem.description}
                    </div>
                    
                    {/* Visible Test Cases */}
                    {testCases.length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-semibold mb-2">Test Cases</h4>
                        <div className="space-y-2 max-h-[250px] overflow-y-auto">
                          {testCases.map((tc) => (
                            <div
                              key={tc.id}
                              className="bg-gray-900/50 border border-gray-700 rounded-lg p-2"
                            >
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-medium">Test {tc.id}</span>
                                {tc.explanation && (
                                  <span className="text-xs text-gray-400 truncate max-w-[100px]">{tc.explanation}</span>
                                )}
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <p className="text-xs text-gray-400 mb-0.5">Input</p>
                                  <pre className="bg-black rounded p-1 text-xs overflow-x-auto">
                                    {tc.input}
                                  </pre>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-400 mb-0.5">Expected</p>
                                  <pre className="bg-black rounded p-1 text-xs overflow-x-auto">
                                    {tc.output}
                                  </pre>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {activeTab === 'submissions' && (
                  <div className="h-full">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-lg font-semibold">Your Submissions</h3>
                      <button
                        onClick={fetchProblemSubmissions}
                        disabled={loadingSubmissions}
                        className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs transition flex items-center gap-1"
                      >
                        {loadingSubmissions ? (
                          <>
                            <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></span>
                            Loading...
                          </>
                        ) : (
                          '🔄 Refresh'
                        )}
                      </button>
                    </div>
                    
                    {!user ? (
                      <div className="text-center py-8">
                        <div className="text-4xl mb-4">🔒</div>
                        <p className="text-gray-400 mb-4">Please log in to view your submissions</p>
                        <button
                          onClick={() => navigate('/login')}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
                        >
                          Login
                        </button>
                      </div>
                    ) : loadingSubmissions ? (
                      <div className="flex justify-center items-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                      </div>
                    ) : submissions.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="text-4xl mb-4">📭</div>
                        <p className="text-gray-400">No submissions yet for this problem</p>
                        <p className="text-gray-500 text-sm mt-2">Submit your solution to see it here!</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                        {submissions.map((submission, index) => (
                          <div
                            key={submission._id || index}
                            className="bg-gray-900/50 border border-gray-700 rounded-lg p-3 hover:bg-gray-800/50 transition"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`px-2 py-1 rounded text-xs ${getSubmissionStatusColor(submission.status)}`}>
                                    {submission.status.toUpperCase()}
                                  </span>
                                  <span className="text-xs text-gray-400">
                                    {submission.language}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-400">
                                  {formatSubmissionDate(submission.submittedAt || submission.createdAt)}
                                </div>
                              </div>
                              
                              <button
                                onClick={() => handleViewSubmissionCode(submission)}
                                className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs transition"
                              >
                                View Code
                              </button>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div className="text-center">
                                <p className="text-gray-400">Runtime</p>
                                <p className="font-medium">{submission.runtime || 0} ms</p>
                              </div>
                              <div className="text-center">
                                <p className="text-gray-400">Memory</p>
                                <p className="font-medium">{formatMemory(submission.memory)}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-gray-400">Test Cases</p>
                                <p className="font-medium">
                                  {submission.testcasesPassed || submission.testcasespassed || 0}/
                                  {submission.testcasesTotal || submission.testcasestotal || 0}
                                </p>
                              </div>
                            </div>
                            
                            {submission.errorMessage && (
                              <div className="mt-2">
                                <div className="text-xs text-red-400 bg-red-900/20 p-2 rounded overflow-x-auto">
                                  <pre className="whitespace-pre-wrap text-xs">
                                    {decodeBase64IfNeeded(submission.errorMessage)}
                                  </pre>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {submissions.length > 0 && (
                      <div className="mt-4 text-center">
                        <button
                          onClick={handleViewAllSubmissions}
                          className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-xs transition"
                        >
                          View All Submissions →
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'editorial' && (
  <div className="h-full">
    {/* Video Solution in Editorial Tab */}
    {loadingVideo ? (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
        <span className="ml-3">Checking for video solution...</span>
      </div>
    ) : solutionVideo ? (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold">Video Solution</h3>
          {user?.role === 'admin' && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowVideoDeleteConfirm(true)}
                className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs transition"
                title="Delete video"
              >
                🗑️ Delete
              </button>
              <button
                onClick={handleVideoUpload}
                className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs transition"
                title="Upload new video"
              >
                📤 Replace
              </button>
            </div>
          )}
        </div>
        
        {/* Simplified Video Container */}
        <div className="bg-gray-900/50 border border-gray-700 rounded-xl overflow-hidden">
          {/* Video Player - Simple and Working */}
          <div className="aspect-video bg-black">
            {solutionVideo && solutionVideo.secureUrl ? (
              <video
                key={solutionVideo.id} // Force re-render when video changes
                controls
                controlsList="nodownload"
                className="w-full h-full object-contain"
                poster={solutionVideo.thumbnailUrl}
                preload="metadata"
                onError={(e) => {
                  console.error("Video failed to load:", e);
                  setVideoError("Failed to load video. Please try refreshing the page.");
                }}
              >
                <source src={solutionVideo.secureUrl} type="video/mp4" />
                <source src={solutionVideo.secureUrl.replace('.mp4', '.webm')} type="video/webm" />
                <p className="text-white p-4">
                  Your browser does not support the video tag. 
                  <a 
                    href={solutionVideo.secureUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-400 underline ml-2"
                  >
                    Download video
                  </a>
                </p>
              </video>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                <span className="text-6xl mb-4">📺</span>
                <p className="text-gray-400">Video not available</p>
                {videoError && (
                  <p className="text-red-400 text-sm mt-2">{videoError}</p>
                )}
              </div>
            )}
          </div>
          
          {/* Video Info */}
          <div className="p-3 md:p-4">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs md:text-sm font-medium text-white">Video Solution</span>
                  <span className="text-xs text-green-400 bg-green-900/30 px-2 py-0.5 rounded-full">
                    {formatDuration(solutionVideo.duration)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span>📅 {new Date(solutionVideo.uploadedAt).toLocaleDateString()}</span>
                  {solutionVideo.width && solutionVideo.height && (
                    <span>🎬 {solutionVideo.width}×{solutionVideo.height}</span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <a
                  href={solutionVideo.secureUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 px-2 py-1 bg-blue-900/20 hover:bg-blue-900/30 rounded transition"
                  onClick={(e) => {
                    e.preventDefault();
                    window.open(solutionVideo.secureUrl, '_blank', 'noopener,noreferrer');
                  }}
                >
                  <span>🔗</span> Open in new tab
                </a>
              </div>
            </div>
            
            {/* Video Stats */}
            <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
              <div className="bg-gray-800/50 rounded p-2 text-center">
                <div className="text-gray-400">Duration</div>
                <div className="text-white font-medium">{formatDuration(solutionVideo.duration)}</div>
              </div>
              <div className="bg-gray-800/50 rounded p-2 text-center">
                <div className="text-gray-400">Format</div>
                <div className="text-white font-medium uppercase">{solutionVideo.format || 'MP4'}</div>
              </div>
              <div className="bg-gray-800/50 rounded p-2 text-center">
                <div className="text-gray-400">Status</div>
                <div className="text-green-400 font-medium">Ready</div>
              </div>
            </div>
            
            {solutionVideo.uploadedBy && (
              <div className="mt-3 text-xs text-gray-400 flex items-center gap-1">
                <span>👤</span>
                <span>By: {solutionVideo.uploadedBy}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Troubleshooting Tips */}
        <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3">
          <h4 className="font-semibold text-blue-400 mb-2 flex items-center gap-2">
            <span>ℹ️</span> Video Troubleshooting
          </h4>
          <ul className="text-sm text-gray-300 space-y-1">
            <li>• If video doesn't play, try opening it in a new tab</li>
            <li>• Make sure you have a stable internet connection</li>
            <li>• Check if video format is supported by your browser</li>
            <li>• Contact admin if video continues to fail</li>
          </ul>
        </div>
      </div>
    ) : user?.role === 'admin' ? (
      <div className="text-center py-6 md:py-8">
        <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">🎬</span>
        </div>
        <h3 className="text-lg md:text-xl font-bold mb-2">No Video Solution Yet</h3>
        <p className="text-gray-400 mb-4 text-sm">Upload a video solution to help users understand this problem better.</p>
        <button
          onClick={handleVideoUpload}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition text-sm"
        >
          📤 Upload Video Solution
        </button>
      </div>
    ) : (
      <div className="text-center py-6 md:py-8">
        <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">📺</span>
        </div>
        <h3 className="text-lg md:text-xl font-bold mb-2">Video Solution Coming Soon</h3>
        <p className="text-gray-400 mb-2 text-sm">A video explanation for this problem is not available yet.</p>
        <p className="text-gray-500 text-xs">Check back later or try solving it yourself first!</p>
      </div>
    )}
    
    {/* Editorial Text Content */}
    {solutionVideo && (
      <div className="mt-6">
        <h4 className="font-semibold mb-2">Written Explanation</h4>
        <div className="text-sm text-gray-300 space-y-3">
          <p>
            While the video provides a visual walkthrough, here's a brief written explanation:
          </p>
          <p>
            This problem tests your understanding of {problem.tags} concepts. 
            The optimal solution typically involves {problem.difficulty === 'easy' ? 'a straightforward approach' : 
            problem.difficulty === 'medium' ? 'some optimization techniques' : 'advanced algorithms and data structures'}.
          </p>
          <p>
            Key points to consider:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Time complexity should be optimized</li>
            <li>Consider edge cases mentioned in constraints</li>
            <li>Use appropriate data structures</li>
            <li>Test your solution with provided examples</li>
          </ul>
        </div>
      </div>
    )}
  </div>
)}
              </div>
            </div>

            {/* Constraints */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-3 md:p-4">
              <h3 className="font-semibold mb-2">Constraints</h3>
              <ul className="space-y-1 text-xs text-gray-300">
                <li>• Time limit: 2 seconds per test case</li>
                <li>• Memory limit: 256 MB</li>
                <li>• Code size limit: 64 KB</li>
                <li>• Language: JavaScript, Java, C++</li>
              </ul>
            </div>
          </div>

          {/* Right Column - Code Editor and Results */}
          <div className="lg:w-3/5 flex flex-col gap-3">
            {/* Editor Controls - Fixed Height */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Language</label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="px-2 py-1 bg-gray-900 border border-gray-700 rounded text-white text-xs"
                    >
                      {languages.map((lang) => (
                        <option key={lang.value} value={lang.value}>
                          {lang.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Theme</label>
                    <select
                      value={theme}
                      onChange={(e) => setTheme(e.target.value)}
                      className="px-2 py-1 bg-gray-900 border border-gray-700 rounded text-white text-xs"
                    >
                      <option value="vs-dark">Dark</option>
                      <option value="vs-light">Light</option>
                      <option value="hc-black">High Contrast</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleCopyCode}
                    className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs transition flex items-center gap-1"
                    title="Copy code"
                  >
                    <span>📋</span>
                  </button>
                  <button
                    onClick={handleResetCode}
                    className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs transition flex items-center gap-1"
                    title="Reset to starter code"
                  >
                    <span>🔄</span>
                  </button>
                  <button
                    onClick={handleLoadTemplate}
                    className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs transition flex items-center gap-1"
                    title="Load template"
                  >
                    <span>📄</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Editor - Fixed Height */}
            <div className="border border-gray-700 rounded-xl overflow-hidden flex-grow min-h-[300px]">
              <MonacoEditor
                height="100%"
                language={languages.find(l => l.value === language)?.monacoLang || 'javascript'}
                value={code}
                onChange={handleEditorChange}
                theme={theme}
                options={{
                  minimap: { enabled: true },
                  scrollBeyondLastLine: false,
                  fontSize: 13,
                  wordWrap: 'on',
                  automaticLayout: true,
                  formatOnPaste: true,
                  formatOnType: true,
                  suggestOnTriggerCharacters: true,
                  acceptSuggestionOnEnter: 'on',
                  tabSize: 2,
                }}
              />
            </div>

            {/* Action Buttons - Always Visible */}
            <div className="flex gap-2 md:gap-3">
              {/* AI Tutor Button */}
              <button
                onClick={handleAITutor}
                className="px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition flex items-center justify-center text-sm flex-shrink-0"
                title="Get AI help with this problem"
              >
                <FiMessageSquare className="mr-1" />
                AI Tutor
              </button>
              
              <button
                onClick={handleRunCode}
                disabled={isRunning}
                className={`flex-1 py-2 rounded-lg font-medium transition flex items-center justify-center text-sm ${
                  isRunning
                    ? 'bg-yellow-800 text-yellow-300 cursor-not-allowed'
                    : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                }`}
              >
                {isRunning ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                    Running...
                  </>
                ) : (
                  <>
                    <span className="mr-1">▶</span> Run Code
                  </>
                )}
              </button>
              
              <button
                onClick={handleSubmitCode}
                disabled={isSubmitting}
                className={`flex-1 py-2 rounded-lg font-medium transition flex items-center justify-center text-sm ${
                  isSubmitting
                    ? 'bg-green-800 text-green-300 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                    Submitting...
                  </>
                ) : (
                  <>
                    <span className="mr-1">✓</span> Submit
                  </>
                )}
              </button>
            </div>

            {/* Execution Results - Scrollable with Fixed Max Height */}
            {executionResult && (
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden max-h-[300px] flex flex-col">
                <div className="px-3 py-2 border-b border-gray-700 flex justify-between items-center">
                  <h3 className="text-sm font-semibold">
                    {executionResult.type === 'run' ? 'Test Results' : 'Submission Result'}
                  </h3>
                  <button
                    onClick={() => setExecutionResult(null)}
                    className="text-gray-400 hover:text-white text-xs"
                  >
                    ✕ Clear
                  </button>
                </div>
                
                <div className="p-3 overflow-y-auto flex-grow">
                  {executionResult.type === 'run' ? (
                    <div>
                      {/* Summary */}
                      <div className="mb-3 p-2 bg-gray-900/50 rounded-lg">
                        <div className="flex justify-between items-center mb-1">
                          <div className="text-sm">
                            <span className="text-gray-400">Results: </span>
                            <span className={`font-bold ${
                              executionResult.summary.passed === executionResult.summary.total
                                ? 'text-green-400'
                                : 'text-yellow-400'
                            }`}>
                              {executionResult.summary.passed} / {executionResult.summary.total} passed
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-800 rounded-full h-1.5">
                          <div
                            className="bg-green-500 h-1.5 rounded-full transition-all"
                            style={{
                              width: `${(executionResult.summary.passed / executionResult.summary.total) * 100}%`
                            }}
                          ></div>
                        </div>
                      </div>

                      {/* Detailed Results - Scrollable */}
                      <div className="space-y-2 max-h-[150px] overflow-y-auto">
                        {executionResult.results.map((result) => (
                          <div
                            key={result.testCaseId}
                            className={`border rounded p-2 text-xs ${
                              result.status === 'passed'
                                ? 'border-green-800 bg-green-900/10'
                                : 'border-red-800 bg-red-900/10'
                            }`}
                          >
                            <div className="flex justify-between items-center mb-1">
                              <div className="flex items-center gap-1">
                                <span className={`px-1 py-0.5 rounded text-xs font-medium ${
                                  result.status === 'passed'
                                    ? 'bg-green-900/30 text-green-400'
                                    : 'bg-red-900/30 text-red-400'
                                }`}>
                                  {result.status === 'passed' ? '✓' : '✗'}
                                </span>
                                <span className="text-gray-400">
                                  Test {result.testCaseId}
                                </span>
                              </div>
                              <div className="text-gray-400 text-xs">
                                {result.time}s | {result.memory}KB
                              </div>
                            </div>
                            
                            {/* Show simple error message if failed */}
                            {result.status !== 'passed' && result.statusDescription && (
                              <div className="mt-1 text-red-300 text-xs">
                                {result.statusDescription}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* Submission Results */
                    <div>
                      <div className={`text-center p-3 rounded-lg mb-3 ${
                        executionResult.result.status === 'accepted'
                          ? 'bg-green-900/20 border border-green-700'
                          : 'bg-red-900/20 border border-red-700'
                      }`}>
                        <div className="text-2xl mb-2">
                          {executionResult.result.status === 'accepted' ? '✅' : '❌'}
                        </div>
                        <h4 className="font-bold text-sm mb-1">
                          {executionResult.result.status === 'accepted' 
                            ? 'Accepted!' 
                            : executionResult.result.message || 'Wrong Answer'}
                        </h4>
                        <p className="text-gray-300 text-xs">
                          {executionResult.message}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-gray-900/50 p-2 rounded-lg text-center">
                          <p className="text-xs text-gray-400">Status</p>
                          <p className={`text-sm font-bold ${
                            executionResult.result.status === 'accepted'
                              ? 'text-green-400'
                              : 'text-red-400'
                          }`}>
                            {executionResult.result.status}
                          </p>
                        </div>
                        <div className="bg-gray-900/50 p-2 rounded-lg text-center">
                          <p className="text-xs text-gray-400">Test Cases</p>
                          <p className="text-sm font-bold">
                            {executionResult.result.testcasespassed || 0} / {executionResult.result.testcasestotal || 0}
                          </p>
                        </div>
                        <div className="bg-gray-900/50 p-2 rounded-lg text-center">
                          <p className="text-xs text-gray-400">Runtime</p>
                          <p className="text-sm font-bold">
                            {executionResult.result.runtime || 0}s
                          </p>
                        </div>
                        <div className="bg-gray-900/50 p-2 rounded-lg text-center">
                          <p className="text-xs text-gray-400">Memory</p>
                          <p className="text-sm font-bold">
                            {executionResult.result.memory || 0}KB
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Error Display - Small and Non-intrusive */}
            {error && (
              <div className="bg-red-900/30 border border-red-700 rounded-xl p-2">
                <div className="flex justify-between items-center mb-1">
                  <h4 className="font-medium text-red-400 text-sm">Error</h4>
                  <button
                    onClick={() => setError(null)}
                    className="text-red-400 hover:text-red-300 text-xs"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-xs text-red-300 truncate">{typeof error === 'string' ? error : error?.error || JSON.stringify(error)}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Submission Code Modal */}
      {showCodeModal && selectedSubmission && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-700 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold">Submission Code</h3>
                <p className="text-gray-400 text-sm">
                  Problem: {problem.title} • Language: {selectedSubmission.language} • 
                  Status: <span className={selectedSubmission.status === 'accepted' ? 'text-green-400' : 'text-red-400'}>
                    {selectedSubmission.status}
                  </span>
                </p>
              </div>
              <button
                onClick={() => setShowCodeModal(false)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-800/50 p-4 rounded-lg">
                  <div className="text-sm text-gray-300">Runtime</div>
                  <div className="text-lg font-bold">{selectedSubmission.runtime || 0} ms</div>
                </div>
                <div className="bg-gray-800/50 p-4 rounded-lg">
                  <div className="text-sm text-gray-300">Memory</div>
                  <div className="text-lg font-bold">{formatMemory(selectedSubmission.memory)}</div>
                </div>
                <div className="bg-gray-800/50 p-4 rounded-lg">
                  <div className="text-sm text-gray-300">Test Cases</div>
                  <div className="text-lg font-bold">
                    {selectedSubmission.testcasesPassed || selectedSubmission.testcasespassed || 0}/
                    {selectedSubmission.testcasesTotal || selectedSubmission.testcasestotal || 0}
                  </div>
                </div>
              </div>
              
              <div className="mb-4">
                <h4 className="text-lg font-semibold mb-2">Code</h4>
                <div className="bg-gray-950 border border-gray-800 rounded-lg overflow-hidden">
                  <div className="bg-gray-900 px-4 py-2 border-b border-gray-800 text-sm text-gray-400">
                    {selectedSubmission.language}
                  </div>
                  <pre className="p-4 overflow-x-auto text-sm max-h-[400px] overflow-y-auto">
                    <code className="text-gray-300 whitespace-pre-wrap">
                      {selectedSubmission.code || '// No code available for this submission'}
                    </code>
                  </pre>
                </div>
              </div>

              {selectedSubmission.errorMessage && (
                <div className="mt-4">
                  <h4 className="text-lg font-semibold mb-2 text-red-400">Error Message</h4>
                  <div className="bg-red-950/30 border border-red-800 p-4 rounded-lg overflow-x-auto">
                    <pre className="text-sm whitespace-pre-wrap">
                      {decodeBase64IfNeeded(selectedSubmission.errorMessage)}
                    </pre>
                  </div>
                </div>
              )}

              <div className="mt-4 text-sm text-gray-400">
                Submitted: {new Date(selectedSubmission.submittedAt || selectedSubmission.createdAt).toLocaleString()}
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-700 flex justify-end">
              <button
                onClick={() => setShowCodeModal(false)}
                className="px-6 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Delete Confirmation Modal */}
      {showVideoDeleteConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-xl font-bold text-red-400 mb-2 flex items-center gap-2">
                <span>⚠️</span> Delete Video Solution
              </h3>
              <p className="text-gray-300">
                Are you sure you want to delete this video solution? This action cannot be undone.
              </p>
              <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 mt-4">
                <p className="text-sm text-red-300 font-medium">This will permanently delete:</p>
                <ul className="list-disc list-inside text-sm text-red-300/80 mt-1 ml-2">
                  <li>Video from Cloudinary storage</li>
                  <li>Video metadata from database</li>
                  <li>All access for users</li>
                </ul>
              </div>
            </div>
            
            <div className="p-6 flex justify-end gap-4">
              <button
                onClick={() => setShowVideoDeleteConfirm(false)}
                disabled={deletingVideo}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteVideo}
                disabled={deletingVideo}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition disabled:opacity-50 flex items-center gap-2"
              >
                {deletingVideo ? (
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
  );
}

export default ProblemDetail;