// src/pages/Contests.jsx
import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { getContests, registerForContest, unregisterFromContest } from '../contestSlice';
import { 
  Calendar, Clock, Users, Trophy, CheckCircle, XCircle, 
  Play, ChevronRight, Filter, Search, RefreshCw,
  Timer, Award, Star, Zap, Shield, Crown
} from 'lucide-react';

function Contests() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { contests, loading, error, pagination } = useSelector((state) => state.contest);
  
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showRegisteredOnly, setShowRegisteredOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState({});

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchContests();
  }, [activeTab, page]);

  const fetchContests = () => {
    const status = activeTab === 'all' ? null : activeTab;
    dispatch(getContests({ status, page, limit: 10 }));
  };

  const handleRegister = async (contestId) => {
    setActionLoading(prev => ({ ...prev, [contestId]: 'registering' }));
    try {
      await dispatch(registerForContest(contestId)).unwrap();
      fetchContests();
    } catch (err) {
      console.error('Registration failed:', err);
    } finally {
      setActionLoading(prev => ({ ...prev, [contestId]: null }));
    }
  };

  const handleUnregister = async (contestId) => {
    setActionLoading(prev => ({ ...prev, [contestId]: 'unregistering' }));
    try {
      await dispatch(unregisterFromContest(contestId)).unwrap();
      fetchContests();
    } catch (err) {
      console.error('Unregistration failed:', err);
    } finally {
      setActionLoading(prev => ({ ...prev, [contestId]: null }));
    }
  };

  const handleViewContest = (contestId) => {
    navigate(`/contest/${contestId}`);
  };

  const handleCreateContest = () => {
    navigate('/contest/create');
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'upcoming':
        return { color: 'text-blue-400 bg-blue-900/30 border-blue-700', icon: <Clock className="w-4 h-4" />, label: 'Upcoming' };
      case 'active':
        return { color: 'text-green-400 bg-green-900/30 border-green-700', icon: <Play className="w-4 h-4" />, label: 'Live' };
      case 'completed':
        return { color: 'text-gray-400 bg-gray-800 border-gray-700', icon: <CheckCircle className="w-4 h-4" />, label: 'Completed' };
      default:
        return { color: 'text-gray-400 bg-gray-800 border-gray-700', icon: null, label: status };
    }
  };

  const getDifficultyBadge = (difficulty) => {
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
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeRemaining = (endTime) => {
    const now = new Date();
    const end = new Date(endTime);
    const diff = end - now;
    
    if (diff <= 0) return 'Ended';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h remaining`;
    }
    return `${hours}h ${minutes}m remaining`;
  };

  const filteredContests = contests.filter(contest => {
    // Search filter
    if (searchTerm && !contest.title.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    // Registered only filter
    if (showRegisteredOnly && !contest.isRegistered) {
      return false;
    }
    return true;
  });

  if (loading && contests.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p className="text-gray-400">Loading contests...</p>
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
              <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
                <Trophy className="w-8 h-8 text-yellow-500" />
                Contests
              </h1>
              <p className="text-gray-400 mt-1">
                Compete with others and showcase your skills
              </p>
            </div>
            {isAdmin && (
              <button
                onClick={handleCreateContest}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition flex items-center gap-2"
              >
                <span className="text-xl">+</span>
                Create Contest
              </button>
            )}
          </div>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
            <div className="text-2xl font-bold">{contests.length}</div>
            <div className="text-gray-400 text-sm">Total Contests</div>
          </div>
          <div className="bg-green-900/20 border border-green-800 rounded-xl p-4">
            <div className="text-2xl font-bold text-green-400">
              {contests.filter(c => c.status === 'active').length}
            </div>
            <div className="text-green-400 text-sm">Live Now</div>
          </div>
          <div className="bg-blue-900/20 border border-blue-800 rounded-xl p-4">
            <div className="text-2xl font-bold text-blue-400">
              {contests.filter(c => c.status === 'upcoming').length}
            </div>
            <div className="text-blue-400 text-sm">Upcoming</div>
          </div>
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
            <div className="text-2xl font-bold">
              {contests.reduce((sum, c) => sum + (c.participantCount || 0), 0)}
            </div>
            <div className="text-gray-400 text-sm">Total Participants</div>
          </div>
        </div>

        {/* Filters and Tabs */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 md:p-6 mb-6">
          {/* Tabs */}
          <div className="flex flex-wrap gap-2 mb-4">
            {['all', 'upcoming', 'active', 'completed'].map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setPage(1);
                }}
                className={`px-4 py-2 rounded-lg transition capitalize ${
                  activeTab === tab
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                }`}
              >
                {tab === 'all' ? 'All' : tab}
              </button>
            ))}
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search contests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-gray-300">
                <input
                  type="checkbox"
                  checked={showRegisteredOnly}
                  onChange={(e) => setShowRegisteredOnly(e.target.checked)}
                  className="w-4 h-4 rounded bg-gray-900 border-gray-700 text-blue-600"
                />
                Registered Only
              </label>
              <button
                onClick={fetchContests}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-900/30 border border-red-700 rounded-xl p-4">
            <div className="flex justify-between items-center">
              <p className="text-red-300">{typeof error === 'string' ? error : 'Failed to load contests'}</p>
              <button onClick={fetchContests} className="text-red-400 hover:text-red-300 text-sm">
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Contest List */}
        {filteredContests.length === 0 ? (
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-8 text-center">
            <div className="text-5xl mb-4">🏆</div>
            <h3 className="text-xl font-medium mb-2">No Contests Found</h3>
            <p className="text-gray-400">
              {searchTerm || showRegisteredOnly 
                ? 'Try changing your filters' 
                : 'Check back later for new contests'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredContests.map((contest) => {
              const status = getStatusBadge(contest.status);
              const timeRemaining = contest.status === 'active' ? getTimeRemaining(contest.endTime) : null;
              
              return (
                <div
                  key={contest._id}
                  className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 md:p-6 hover:bg-gray-800/70 transition cursor-pointer"
                  onClick={() => handleViewContest(contest._id)}
                >
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    {/* Contest Info */}
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <h2 className="text-xl font-bold">{contest.title}</h2>
                        <span className={`px-3 py-1 rounded-full text-sm border flex items-center gap-1 ${status.color}`}>
                          {status.icon}
                          {status.label}
                        </span>
                        {contest.isRegistered && (
                          <span className="px-3 py-1 bg-green-900/30 text-green-400 border border-green-700 rounded-full text-sm flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Registered
                          </span>
                        )}
                      </div>
                      
                      <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                        {contest.description}
                      </p>
                      
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-1 text-gray-400">
                          <Calendar className="w-4 h-4" />
                          <span>Start: {formatDate(contest.startTime)}</span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-400">
                          <Clock className="w-4 h-4" />
                          <span>Duration: {contest.duration} min</span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-400">
                          <Users className="w-4 h-4" />
                          <span>{contest.participantCount || 0} participants</span>
                        </div>
                        {timeRemaining && (
                          <div className="flex items-center gap-1 text-yellow-400">
                            <Timer className="w-4 h-4" />
                            <span>{timeRemaining}</span>
                          </div>
                        )}
                      </div>

                      {/* Problems Preview */}
                      {contest.problems && contest.problems.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="text-xs text-gray-500">Problems:</span>
                          {contest.problems.slice(0, 3).map((p, i) => (
                            <span key={i} className="px-2 py-1 bg-gray-900/50 rounded text-xs text-gray-300">
                              {typeof p === 'object' ? p.title : `Problem ${i + 1}`}
                            </span>
                          ))}
                          {contest.problems.length > 3 && (
                            <span className="px-2 py-1 bg-gray-900/50 rounded text-xs text-gray-500">
                              +{contest.problems.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 min-w-[140px]">
                      {contest.status === 'upcoming' && (
                        contest.isRegistered ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUnregister(contest._id);
                            }}
                            disabled={actionLoading[contest._id] === 'unregistering'}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {actionLoading[contest._id] === 'unregistering' ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                ...
                              </>
                            ) : (
                              <>Unregister</>
                            )}
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRegister(contest._id);
                            }}
                            disabled={actionLoading[contest._id] === 'registering'}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {actionLoading[contest._id] === 'registering' ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                ...
                              </>
                            ) : (
                              <>Register</>
                            )}
                          </button>
                        )
                      )}
                      
                      {contest.status === 'active' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewContest(contest._id);
                          }}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition flex items-center justify-center gap-2"
                        >
                          <Play className="w-4 h-4" />
                          Join
                        </button>
                      )}
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewContest(contest._id);
                        }}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition flex items-center justify-center gap-2"
                      >
                        View Details
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="mt-6 flex justify-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-4 py-2 bg-gray-800 rounded-lg">
              Page {page} of {pagination.pages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
              disabled={page === pagination.pages}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Contests;