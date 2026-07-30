// src/pages/Interviews.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axiosclient from '../utilis/axiosclient';
import { 
  Calendar, Clock, Play, CheckCircle, 
  Award, ArrowRight, Search, Mic, Loader2,
  Code, Database, Layout, Server, Layers, Cloud
} from 'lucide-react';

function Interviews() {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchInterviews();
  }, []);

  const fetchInterviews = async () => {
    try {
      setLoading(true);
      const response = await axiosclient.get('/interview/');
      setInterviews(response.data.interviews || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load interviews');
    } finally {
      setLoading(false);
    }
  };

  const handleStartInterview = () => {
    navigate('/interview/select');
  };

  const handleViewInterview = (id) => {
    navigate(`/interview/${id}`);
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'software_developer': return <Code className="w-4 h-4" />;
      case 'data_analyst': return <Database className="w-4 h-4" />;
      case 'frontend_developer': return <Layout className="w-4 h-4" />;
      case 'backend_developer': return <Server className="w-4 h-4" />;
      case 'full_stack_developer': return <Layers className="w-4 h-4" />;
      case 'devops_engineer': return <Cloud className="w-4 h-4" />;
      default: return <Code className="w-4 h-4" />;
    }
  };

  const getRoleDisplay = (role) => {
    const roleMap = {
      'software_developer': 'Software Developer',
      'data_analyst': 'Data Analyst',
      'frontend_developer': 'Frontend Developer',
      'backend_developer': 'Backend Developer',
      'full_stack_developer': 'Full Stack Developer',
      'devops_engineer': 'DevOps Engineer'
    };
    return roleMap[role] || role;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'in_progress':
        return { color: 'text-green-400 bg-green-900/30 border-green-700', icon: <Play className="w-4 h-4" />, label: 'In Progress' };
      case 'completed':
        return { color: 'text-blue-400 bg-blue-900/30 border-blue-700', icon: <CheckCircle className="w-4 h-4" />, label: 'Completed' };
      default:
        return { color: 'text-gray-400 bg-gray-800 border-gray-700', icon: <Clock className="w-4 h-4" />, label: 'Not Started' };
    }
  };

  const filteredInterviews = interviews.filter(interview => {
    const roleDisplay = getRoleDisplay(interview.role);
    if (searchTerm && !roleDisplay.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (statusFilter !== 'all' && interview.status !== statusFilter) {
      return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white p-8 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-400 mx-auto mb-4" />
          <p className="text-gray-400">Loading interviews...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <Mic className="w-8 h-8 text-purple-400" />
              <div>
                <h1 className="text-4xl font-bold">AI Interviews</h1>
                <p className="text-gray-400 mt-1">Practice interviews for different roles</p>
              </div>
            </div>
          </div>
          <button
            onClick={handleStartInterview}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl transition flex items-center gap-2 font-semibold"
          >
            <Play className="w-5 h-5" />
            New Interview
          </button>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
            <div className="text-2xl font-bold">{interviews.length}</div>
            <div className="text-gray-400 text-sm">Total Interviews</div>
          </div>
          <div className="bg-green-900/20 border border-green-800 rounded-xl p-4">
            <div className="text-2xl font-bold text-green-400">
              {interviews.filter(i => i.status === 'completed').length}
            </div>
            <div className="text-green-400 text-sm">Completed</div>
          </div>
          <div className="bg-yellow-900/20 border border-yellow-800 rounded-xl p-4">
            <div className="text-2xl font-bold text-yellow-400">
              {interviews.filter(i => i.status === 'in_progress').length}
            </div>
            <div className="text-yellow-400 text-sm">In Progress</div>
          </div>
          <div className="bg-blue-900/20 border border-blue-800 rounded-xl p-4">
            <div className="text-2xl font-bold text-blue-400">
              {interviews.length > 0 ? Math.round(interviews.reduce((sum, i) => sum + (i.score || 0), 0) / interviews.length) : 0}
            </div>
            <div className="text-blue-400 text-sm">Average Score</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 md:p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search by role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500"
              />
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full md:w-48 px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
              >
                <option value="all">All Status</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 mb-6">
            <p className="text-red-400">{typeof error === 'string' ? error : error?.error || JSON.stringify(error)}</p>
          </div>
        )}

        {/* Interviews List */}
        {filteredInterviews.length === 0 ? (
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-12 text-center">
            <div className="text-6xl mb-4">🎯</div>
            <h3 className="text-xl font-medium mb-2">No Interviews Found</h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              {interviews.length === 0 
                ? 'You haven\'t started any interviews yet. Start your first role-based interview now!'
                : 'Try changing your filters'}
            </p>
            <button
              onClick={handleStartInterview}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl transition flex items-center gap-2 mx-auto font-semibold"
            >
              <Play className="w-5 h-5" />
              Start Your First Interview
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredInterviews.map((interview) => {
              const status = getStatusBadge(interview.status);
              const roleDisplay = getRoleDisplay(interview.role);
              
              return (
                <div
                  key={interview._id}
                  className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 md:p-6 hover:bg-gray-800/70 transition cursor-pointer"
                  onClick={() => handleViewInterview(interview._id)}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          {getRoleIcon(interview.role)}
                          <h2 className="text-xl font-bold">{roleDisplay}</h2>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm border flex items-center gap-1 ${status.color}`}>
                          {status.icon}
                          {status.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {interview.timeSpent ? `${Math.floor(interview.timeSpent / 60)}m ${interview.timeSpent % 60}s` : 'Not started'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(interview.createdAt).toLocaleDateString()}
                        </span>
                        {interview.score > 0 && (
                          <span className="flex items-center gap-1 text-yellow-400">
                            <Award className="w-4 h-4" />
                            Score: {interview.score}/{interview.maxScore}
                          </span>
                        )}
                      </div>
                    </div>
                    <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition flex items-center gap-2 text-sm whitespace-nowrap">
                      {interview.status === 'in_progress' ? 'Continue' : 'View Details'}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default Interviews;