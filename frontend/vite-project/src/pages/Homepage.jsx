// src/pages/Homepage.jsx - Fixed imports
import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { logoutUser } from '../authslice';
import { useNavigate } from 'react-router-dom';
import axiosclient from '../utilis/axiosclient';
import { 
  History, Trophy, Mic, GitBranch, 
  Home, User as UserIcon, LogOut, Shield, Code2,
  Search, RefreshCw, Sparkles,
  Calendar, Award, Users, Activity
} from 'lucide-react';

function Homepage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [selectedTag, setSelectedTag] = useState('all');

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchProblems();
  }, []);

  const fetchProblems = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axiosclient.get('/problem/getallproblem/');
      setProblems(response.data);
    } catch (err) {
      setError(err.response?.data || 'Failed to load problems');
    } finally {
      setLoading(false);
    }
  };

  // Dynamically extract unique tags from problems list
  const availableTags = ['all', ...Array.from(new Set(
    problems.flatMap(p => {
      if (!p.tags) return [];
      if (Array.isArray(p.tags)) return p.tags;
      return p.tags.split(',').map(t => t.trim().toLowerCase());
    }).filter(Boolean)
  ))];

  // Filter problems by search term, difficulty, and tag
  const filteredProblems = problems.filter(problem => {
    const matchesSearch = problem.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (problem.description && problem.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesDifficulty = selectedDifficulty === 'all' || 
                              problem.difficulty?.toLowerCase() === selectedDifficulty.toLowerCase();
    
    const problemTags = Array.isArray(problem.tags) 
      ? problem.tags.map(t => t.toLowerCase())
      : (problem.tags || '').split(',').map(t => t.trim().toLowerCase());

    const matchesTag = selectedTag === 'all' || problemTags.includes(selectedTag.toLowerCase());

    return matchesSearch && matchesDifficulty && matchesTag;
  });

  const handleLogout = async () => {
    try {
      await dispatch(logoutUser()).unwrap();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleProblemClick = (problemId) => {
    navigate(`/problem/${problemId}`);
  };

  const navItems = [
    { icon: <Mic className="w-4 h-4" />, label: 'AI Interview', path: '/interviews', color: 'bg-purple-600 hover:bg-purple-700' },
    { icon: <Trophy className="w-4 h-4" />, label: 'Contests', path: '/contests', color: 'bg-yellow-600 hover:bg-yellow-700' },
    { icon: <GitBranch className="w-4 h-4" />, label: 'Visualizer', path: '/visualizer', color: 'bg-green-600 hover:bg-green-700' },
    { icon: <History className="w-4 h-4" />, label: 'Submissions', path: '/submissions', color: 'bg-blue-600 hover:bg-blue-700' },
  ];

  // Get difficulty counts
  const easyCount = problems.filter(p => p.difficulty === 'easy').length;
  const hardCount = problems.filter(p => p.difficulty === 'hard').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-400 font-medium">Loading problems...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
        {/* Header */}
        <header className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-4 md:p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Left Section */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Code2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Code Arena
                </h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-gray-400 text-sm">Welcome back,</p>
                  <p className="text-white font-medium text-sm">{user?.firstname || 'Coder'}</p>
                  {isAdmin && (
                    <span className="px-2 py-0.5 bg-purple-900/50 text-purple-300 text-xs rounded-full border border-purple-700">
                      Admin
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right Section - Navigation Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {navItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`px-4 py-2 rounded-xl text-white text-sm font-medium transition-all duration-200 flex items-center gap-2 ${item.color} shadow-lg hover:scale-105`}
                >
                  {item.icon}
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              ))}
              
              {/* Profile Button - NEW */}
              <button
                onClick={() => navigate(`/profile/${user?.firstname}`)}
                className="px-4 py-2 rounded-xl text-white text-sm font-medium transition-all duration-200 flex items-center gap-2 bg-gray-700/50 hover:bg-gray-700 hover:scale-105 border border-gray-600"
              >
                <UserIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Profile</span>
              </button>
              
              {/* Admin Button - Only for admins */}
              {isAdmin && (
                <button
                  onClick={() => navigate('/admin')}
                  className="px-4 py-2 rounded-xl text-white text-sm font-medium transition-all duration-200 flex items-center gap-2 bg-red-600 hover:bg-red-700 shadow-lg hover:scale-105"
                >
                  <Shield className="w-4 h-4" />
                  <span className="hidden sm:inline">Admin</span>
                </button>
              )}
              
              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-xl text-gray-300 text-sm font-medium transition-all duration-200 flex items-center gap-2 bg-gray-700/50 hover:bg-gray-700 hover:text-white hover:scale-105 border border-gray-600"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4 text-center hover:border-blue-500/50 transition-all duration-300">
            <p className="text-3xl font-bold text-white">{problems.length}</p>
            <p className="text-gray-400 text-sm mt-1">Total Problems</p>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4 text-center hover:border-green-500/50 transition-all duration-300">
            <p className="text-3xl font-bold text-green-400">{filteredProblems.length}</p>
            <p className="text-gray-400 text-sm mt-1">Showing</p>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4 text-center hover:border-green-500/50 transition-all duration-300">
            <p className="text-3xl font-bold text-green-400">{easyCount}</p>
            <p className="text-gray-400 text-sm mt-1">Easy</p>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4 text-center hover:border-red-500/50 transition-all duration-300">
            <p className="text-3xl font-bold text-red-400">{hardCount}</p>
            <p className="text-gray-400 text-sm mt-1">Hard</p>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4 mb-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="Search problems by title or keyword..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-all"
              />
            </div>

            {/* Tag Filter Dropdown */}
            <div className="flex items-center gap-2">
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className="px-4 py-2.5 bg-gray-900/50 border border-gray-700 rounded-xl text-gray-200 text-sm font-medium focus:outline-none focus:border-blue-500 transition-all capitalize"
              >
                <option value="all">🏷️ All Tags</option>
                {availableTags.filter(t => t !== 'all').map(tag => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>

              {/* Clear Filters Button */}
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedDifficulty('all');
                  setSelectedTag('all');
                }}
                className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 rounded-xl text-white text-sm font-medium transition-all duration-200 flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Clear
              </button>
            </div>
          </div>

          {/* Difficulty Filter Pills */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-700/50 pt-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mr-1">Difficulty:</span>
              {[
                { id: 'all', label: 'All', color: 'bg-gray-700 text-white' },
                { id: 'easy', label: 'Easy', color: 'bg-green-900/60 text-green-300 border-green-700' },
                { id: 'medium', label: 'Medium', color: 'bg-yellow-900/60 text-yellow-300 border-yellow-700' },
                { id: 'hard', label: 'Hard', color: 'bg-red-900/60 text-red-300 border-red-700' },
              ].map(diff => (
                <button
                  key={diff.id}
                  onClick={() => setSelectedDifficulty(diff.id)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-all duration-200 ${
                    selectedDifficulty === diff.id
                      ? `${diff.color} ring-2 ring-blue-500 scale-105 shadow-md`
                      : 'bg-gray-800/80 text-gray-400 border-gray-700 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  {diff.label}
                </button>
              ))}
            </div>

            <div className="text-xs text-gray-400">
              Showing <span className="text-white font-medium">{filteredProblems.length}</span> of <span className="text-white font-medium">{problems.length}</span> problems
            </div>
          </div>
        </div>

        {/* Problems List */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-700 flex justify-between items-center bg-gray-900/30">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              Problems
              <span className="ml-2 px-2 py-0.5 bg-gray-700 rounded-full text-xs text-gray-300">
                {filteredProblems.length}
              </span>
            </h2>
            <button
              onClick={fetchProblems}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4 text-gray-400 hover:text-white" />
            </button>
          </div>

          {error ? (
            <div className="p-12 text-center">
              <div className="text-5xl mb-4">⚠️</div>
              <p className="text-red-400 font-medium">{typeof error === 'string' ? error : error?.error || JSON.stringify(error)}</p>
              <button
                onClick={fetchProblems}
                className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl text-white text-sm font-medium transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : filteredProblems.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-5xl mb-4">📝</div>
              <h3 className="text-xl font-medium text-gray-300">No problems found</h3>
              <p className="text-gray-500 mt-2">
                {problems.length === 0 ? 'No problems in database.' : 'Try a different search term'}
              </p>
              {problems.length === 0 && isAdmin && (
                <button
                  onClick={() => navigate('/admin')}
                  className="mt-4 px-6 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-xl text-white text-sm font-medium transition-colors"
                >
                  Create First Problem
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-800/50">
              {filteredProblems.map((problem) => (
                <div
                  key={problem._id}
                  onClick={() => handleProblemClick(problem._id)}
                  className="px-4 py-4 hover:bg-gray-800/30 cursor-pointer transition-all duration-200 group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-medium text-white group-hover:text-blue-400 transition-colors truncate">
                          {problem.title}
                        </h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 capitalize ${
                          problem.difficulty === 'easy' ? 'bg-green-900/50 text-green-400 border border-green-800' :
                          problem.difficulty === 'medium' ? 'bg-yellow-900/50 text-yellow-400 border border-yellow-800' :
                          'bg-red-900/50 text-red-400 border border-red-800'
                        }`}>
                          {problem.difficulty}
                        </span>
                        {problem.tags && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-900/40 text-blue-300 border border-blue-800/60 flex-shrink-0 capitalize">
                            🏷️ {Array.isArray(problem.tags) ? problem.tags.join(', ') : problem.tags}
                          </span>
                        )}
                      </div>
                      {problem.description && (
                        <p className="text-gray-400 text-sm mt-1 line-clamp-1">
                          {problem.description}
                        </p>
                      )}
                    </div>
                    <button 
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm font-medium transition-all duration-200 flex items-center gap-1 group-hover:scale-105 flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleProblemClick(problem._id);
                      }}
                    >
                      Solve
                      <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500 text-sm border-t border-gray-800/50 pt-6">
          <p>© {new Date().getFullYear()} Code Arena • {problems.length} problems available</p>
          <p className="mt-1 text-xs text-gray-600">
            {isAdmin ? '👑 Admin Mode' : '💻 Happy Coding!'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default Homepage;