import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axiosclient from '../utilis/axiosclient';
import {
  Code, Clock, Cpu, MemoryStick, CheckCircle, XCircle,
  AlertCircle, Loader2, Filter, Search, BarChart3,
  RefreshCw, ExternalLink, FileText, ChevronRight,
  Calendar, Hash, Type, Globe
} from 'lucide-react';

function SubmissionsPage() {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [submissions, setSubmissions] = useState([]);
  const [allProblems, setAllProblems] = useState([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingProblems, setLoadingProblems] = useState(false);
  const [error, setError] = useState(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [languageFilter, setLanguageFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProblemId, setSelectedProblemId] = useState('');
  const [problemSubmissions, setProblemSubmissions] = useState([]);
  const [showProblemSubmissions, setShowProblemSubmissions] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [showCodeModal, setShowCodeModal] = useState(false);
  
  // Stats
  const [stats, setStats] = useState({
    total: 0,
    accepted: 0,
    pending: 0,
    failed: 0,
    languages: {}
  });

  // Available filters
  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'accepted', label: 'Accepted' },
    { value: 'wrong', label: 'Wrong Answer' },
    { value: 'error', label: 'Error' },
    { value: 'pending', label: 'Pending' }
  ];

  const languageOptions = [
    { value: 'all', label: 'All Languages' },
    { value: 'javascript', label: 'JavaScript' },
    { value: 'java', label: 'Java' },
    { value: 'c++', label: 'C++' }
  ];

  const difficultyOptions = [
    { value: 'all', label: 'All Difficulties' },
    { value: 'easy', label: 'Easy' },
    { value: 'medium', label: 'Medium' },
    { value: 'hard', label: 'Hard' }
  ];

  // Fetch all problems for dropdown
  const fetchAllProblems = async () => {
    try {
      setLoadingProblems(true);
      const response = await axiosclient.get('/problem/getallproblem/');
      if (response.data) {
        setAllProblems(response.data);
      }
    } catch (err) {
      console.error('Error fetching problems:', err);
    } finally {
      setLoadingProblems(false);
    }
  };

  // Fetch user submissions using the new route
  const fetchUserSubmissions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axiosclient.get('/problem/submissions/all');
      
      if (response.data.success) {
        setSubmissions(response.data.submissions);
        calculateStats(response.data.submissions);
      } else {
        setError(response.data.message || 'Failed to fetch submissions');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 
                         `HTTP ${err.response?.status}: ${err.response?.statusText}` || 
                         err.message || 'Network error';
      
      setError(errorMessage);
      console.error('Error fetching submissions:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch submissions for a specific problem using your existing route
  const fetchProblemSubmissions = async (problemId) => {
    try {
      setLoading(true);
      const response = await axiosclient.get(`/problem/submittedproblem/${problemId}`);
      
      if (response.data.success) {
        setProblemSubmissions(response.data.submissions);
        setSelectedProblemId(problemId);
        setShowProblemSubmissions(true);
      }
    } catch (err) {
      console.error('Error fetching problem submissions:', err);
      setError('Failed to fetch problem submissions');
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const calculateStats = (subs) => {
    const stats = {
      total: subs.length,
      accepted: 0,
      pending: 0,
      failed: 0,
      languages: {}
    };

    subs.forEach(sub => {
      if (sub.status === 'accepted') stats.accepted++;
      else if (sub.status === 'pending') stats.pending++;
      else stats.failed++;

      if (sub.language) {
        stats.languages[sub.language] = (stats.languages[sub.language] || 0) + 1;
      }
    });

    setStats(stats);
  };

  // Apply filters
  useEffect(() => {
    let filtered = [...submissions];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(sub => sub.status === statusFilter);
    }

    if (languageFilter !== 'all') {
      filtered = filtered.filter(sub => sub.language === languageFilter);
    }

    if (difficultyFilter !== 'all') {
      filtered = filtered.filter(sub => sub.difficulty === difficultyFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(sub => 
        sub.problemTitle.toLowerCase().includes(term) ||
        sub.language.toLowerCase().includes(term) ||
        (sub._id && sub._id.toLowerCase().includes(term))
      );
    }

    if (selectedProblemId) {
      filtered = filtered.filter(sub => sub.problemId === selectedProblemId);
    }

    setFilteredSubmissions(filtered);
  }, [submissions, statusFilter, languageFilter, difficultyFilter, searchTerm, selectedProblemId]);

  // Fetch data on component mount
  useEffect(() => {
    fetchAllProblems();
    fetchUserSubmissions();
  }, []);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'wrong':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'pending':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-900/30 text-green-400 border-green-800';
      case 'wrong':
        return 'bg-red-900/30 text-red-400 border-red-800';
      case 'error':
        return 'bg-yellow-900/30 text-yellow-400 border-yellow-800';
      case 'pending':
        return 'bg-blue-900/30 text-blue-400 border-blue-800';
      default:
        return 'bg-gray-800 text-gray-400 border-gray-700';
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy':
        return 'bg-green-900/30 text-green-400';
      case 'medium':
        return 'bg-yellow-900/30 text-yellow-400';
      case 'hard':
        return 'bg-red-900/30 text-red-400';
      default:
        return 'bg-gray-700 text-gray-300';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatMemory = (memory) => {
    if (!memory || memory === 0) return '0 KB';
    if (memory < 1024) return `${memory} KB`;
    return `${(memory / 1024).toFixed(2)} MB`;
  };

  const handleViewCode = (submission) => {
    setSelectedSubmission(submission);
    setShowCodeModal(true);
  };

  const handleProblemClick = (problemId) => {
    navigate(`/problem/${problemId}`);
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setLanguageFilter('all');
    setDifficultyFilter('all');
    setSearchTerm('');
    setSelectedProblemId('');
    setShowProblemSubmissions(false);
  };

  const handleShowAllSubmissions = () => {
    setShowProblemSubmissions(false);
    setSelectedProblemId('');
  };

  if (loading && submissions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <header className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Submissions History</h1>
          </header>
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-500" />
              <p className="text-gray-400">Loading your submissions...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold">Submissions History</h1>
              <p className="text-gray-400 mt-2">
                {showProblemSubmissions 
                  ? `Submissions for ${problemSubmissions[0]?.problemTitle || 'Problem'}`
                  : `Track your coding journey - ${stats.total} total submissions`
                }
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {showProblemSubmissions ? (
                <button
                  onClick={handleShowAllSubmissions}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition flex items-center gap-2"
                >
                  ← Back to All Submissions
                </button>
              ) : (
                <>
                  <button
                    onClick={() => navigate('/')}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
                  >
                    ← Back to Problems
                  </button>
                  <button
                    onClick={fetchUserSubmissions}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                  </button>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Stats Cards - Only show when not viewing specific problem */}
        {!showProblemSubmissions && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-gray-400 text-sm">Total Submissions</div>
              </div>
              <div className="bg-green-900/20 border border-green-800 rounded-xl p-4">
                <div className="text-2xl font-bold">{stats.accepted}</div>
                <div className="text-green-400 text-sm">Accepted</div>
                <div className="text-xs text-gray-400 mt-1">
                  {stats.total > 0 ? ((stats.accepted / stats.total) * 100).toFixed(1) : 0}% success rate
                </div>
              </div>
              <div className="bg-red-900/20 border border-red-800 rounded-xl p-4">
                <div className="text-2xl font-bold">{stats.failed}</div>
                <div className="text-red-400 text-sm">Failed</div>
              </div>
              <div className="bg-blue-900/20 border border-blue-800 rounded-xl p-4">
                <div className="text-2xl font-bold">{stats.pending}</div>
                <div className="text-blue-400 text-sm">Pending</div>
              </div>
            </div>

            {/* Language Distribution */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Language Distribution
              </h2>
              <div className="flex flex-wrap gap-3">
                {Object.entries(stats.languages).map(([lang, count]) => (
                  <div key={lang} className="flex items-center gap-2 bg-gray-900/50 px-4 py-2 rounded-lg">
                    <span className="text-lg">
                      {lang === 'javascript' ? '🟨' : lang === 'java' ? '☕' : lang === 'c++' ? '🔷' : '📝'}
                    </span>
                    <span className="font-medium">{lang}</span>
                    <span className="text-gray-400">({count})</span>
                  </div>
                ))}
                {Object.keys(stats.languages).length === 0 && (
                  <p className="text-gray-400">No submissions yet</p>
                )}
              </div>
            </div>
          </>
        )}

        {/* Filters - Only show when not viewing specific problem */}
        {!showProblemSubmissions && (
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filter Submissions
              </h2>
              <button
                onClick={clearFilters}
                className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition"
              >
                Clear All
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div>
                <label className="block text-gray-400 text-sm mb-2">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Problem title, language, ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-gray-400 text-sm mb-2">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                >
                  {statusOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Language Filter */}
              <div>
                <label className="block text-gray-400 text-sm mb-2">Language</label>
                <select
                  value={languageFilter}
                  onChange={(e) => setLanguageFilter(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                >
                  {languageOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Problem Filter */}
              <div>
                <label className="block text-gray-400 text-sm mb-2">Problem</label>
                <select
                  value={selectedProblemId}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value) {
                      fetchProblemSubmissions(value);
                    } else {
                      setSelectedProblemId('');
                    }
                  }}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                >
                  <option value="">All Problems</option>
                  {allProblems.map(problem => (
                    <option key={problem._id} value={problem._id}>
                      {problem.title} ({problem.difficulty})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Results Info */}
        <div className="mb-4 flex justify-between items-center">
          <div className="text-gray-400">
            {showProblemSubmissions ? (
              <>
                Showing {problemSubmissions.length} submissions for this problem
              </>
            ) : (
              <>
                Showing {filteredSubmissions.length} of {submissions.length} submissions
              </>
            )}
          </div>
        </div>

        {/* Submissions Table */}
        <div className="bg-gray-800/30 border border-gray-700 rounded-xl overflow-hidden">
          {error ? (
            <div className="p-8 text-center">
              <div className="text-red-400 text-xl mb-4">⚠️ Error Loading Submissions</div>
              <p className="text-gray-400 mb-6">{typeof error === 'string' ? error : error?.error || JSON.stringify(error)}</p>
              <button
                onClick={fetchUserSubmissions}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg"
              >
                Try Again
              </button>
            </div>
          ) : (showProblemSubmissions ? problemSubmissions : filteredSubmissions).length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-5xl mb-4">📭</div>
              <h3 className="text-xl font-medium mb-2">No submissions found</h3>
              <p className="text-gray-400 mb-6">
                {submissions.length === 0 
                  ? 'You haven\'t made any submissions yet.'
                  : 'Try changing your filters'}
              </p>
              {submissions.length === 0 && (
                <button
                  onClick={() => navigate('/')}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg"
                >
                  Start Solving Problems
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-4 px-6 text-gray-400 font-medium">Problem</th>
                    <th className="text-left py-4 px-6 text-gray-400 font-medium">Status</th>
                    <th className="text-left py-4 px-6 text-gray-400 font-medium">Language</th>
                    <th className="text-left py-4 px-6 text-gray-400 font-medium">Runtime</th>
                    <th className="text-left py-4 px-6 text-gray-400 font-medium">Memory</th>
                    <th className="text-left py-4 px-6 text-gray-400 font-medium">Submitted</th>
                    <th className="text-left py-4 px-6 text-gray-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {(showProblemSubmissions ? problemSubmissions : filteredSubmissions).map((submission) => (
                    <tr 
                      key={submission._id} 
                      className="hover:bg-gray-800/50 transition"
                    >
                      <td className="py-4 px-6">
                        {!showProblemSubmissions && (
                          <div>
                            <div 
                              onClick={() => handleProblemClick(submission.problemId)}
                              className="font-medium hover:text-blue-400 cursor-pointer transition"
                            >
                              {submission.problemTitle}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`px-2 py-1 text-xs rounded-full ${getDifficultyColor(submission.difficulty)}`}>
                                {submission.difficulty}
                              </span>
                            </div>
                          </div>
                        )}
                        {showProblemSubmissions && (
                          <div className="font-medium">{submission.problemTitle}</div>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(submission.status)}
                          <span className={`px-3 py-1 rounded-lg text-sm border ${getStatusColor(submission.status)}`}>
                            {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                          </span>
                          {submission.testcasesTotal > 0 && (
                            <span className="text-xs text-gray-400">
                              ({submission.testcasesPassed}/{submission.testcasesTotal})
                            </span>
                          )}
                        </div>
                        {submission.errorMessage && (
                          <div className="text-xs text-red-400 mt-1 truncate max-w-xs">
                            {submission.errorMessage}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">
                            {submission.language === 'javascript' ? '🟨' : 
                             submission.language === 'java' ? '☕' : 
                             submission.language === 'c++' ? '🔷' : '📝'}
                          </span>
                          <span>{submission.language}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <Cpu className="w-4 h-4 text-gray-400" />
                          <span>{submission.runtime || 0} ms</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <MemoryStick className="w-4 h-4 text-gray-400" />
                          <span>{formatMemory(submission.memory || 0)}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2 text-gray-400">
                          <Clock className="w-4 h-4" />
                          <span>{formatDate(submission.submittedAt)}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <button
                          onClick={() => handleViewCode(submission)}
                          className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg transition flex items-center gap-2 text-sm"
                        >
                          <Code className="w-3 h-3" />
                          View Code
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Code Modal */}
        {showCodeModal && selectedSubmission && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
              <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold">Submission Code</h3>
                  <p className="text-gray-400 text-sm">
                    Problem: {selectedSubmission.problemTitle} | 
                    Language: {selectedSubmission.language} | 
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
                <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
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
                      {selectedSubmission.testcasesPassed}/{selectedSubmission.testcasesTotal}
                    </div>
                  </div>
                </div>
                
                <div className="mb-4">
                  <h4 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    <FileText className="w-5 h-5" /> Code
                  </h4>
                  <div className="relative">
                    <div className="absolute top-3 right-3 bg-gray-800 px-2 py-1 rounded text-sm">
                      {selectedSubmission.language}
                    </div>
                    <pre className="bg-gray-950 p-4 rounded-lg overflow-x-auto text-sm pt-10">
                      <code>
                        {selectedSubmission.code || '// No code available'}
                      </code>
                    </pre>
                  </div>
                </div>

                {selectedSubmission.errorMessage && (
                  <div className="mt-4">
                    <h4 className="text-lg font-semibold mb-2 text-red-400 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5" /> Error Message
                    </h4>
                    <div className="bg-red-950/30 border border-red-800 p-4 rounded-lg text-sm">
                      {selectedSubmission.errorMessage}
                    </div>
                  </div>
                )}

                <div className="mt-4 text-sm text-gray-400 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Submitted: {new Date(selectedSubmission.submittedAt).toLocaleString()}
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
      </div>
    </div>
  );
}

export default SubmissionsPage;