// src/pages/Profile.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axiosclient from '../utilis/axiosclient';
import {
  User, Calendar, Trophy, Award, Clock, 
  TrendingUp, Users, MessageSquare, Settings,
  Code2, CheckCircle, XCircle, AlertCircle,
  BarChart3, Activity, Zap, Star, Medal,
  ChevronRight, Edit2, ArrowLeft
} from 'lucide-react';

function Profile() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useSelector((state) => state.auth);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  useEffect(() => {
    fetchProfileData();
  }, [username]);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const usernameParam = username || currentUser?.firstname;
      
      if (!usernameParam) {
        throw new Error('No username provided');
      }

      const profileRes = await axiosclient.get(`/profile/${usernameParam}`);
      setProfile(profileRes.data.profile);
      setSubmissions(profileRes.data.profile.submissions || []);
      
      try {
        const statsRes = await axiosclient.get('/profile/stats');
        setStats(statsRes.data.stats);
      } catch (err) {
        console.log('Stats not available');
      }
      
    } catch (err) {
      console.error('Profile fetch error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const getSubmissionStats = () => {
    if (!stats) {
      const total = submissions.length;
      const accepted = submissions.filter(s => s.status === 'accepted').length;
      const wrong = submissions.filter(s => s.status === 'wrong').length;
      const pending = submissions.filter(s => s.status === 'pending').length;
      return { total, accepted, wrong, pending };
    }
    return {
      total: stats.totalSubmissions || 0,
      accepted: stats.acceptedSubmissions || 0,
      wrong: stats.wrongSubmissions || 0,
      pending: stats.pendingSubmissions || 0
    };
  };

  const getDailyActivity = () => {
    if (stats && stats.dailyActivity) {
      return stats.dailyActivity;
    }
    const activity = {};
    submissions.forEach(sub => {
      const date = new Date(sub.createdAt).toISOString().split('T')[0];
      activity[date] = (activity[date] || 0) + 1;
    });
    return Object.keys(activity).map(date => ({ date, count: activity[date] }));
  };

  const getLast6MonthsData = () => {
    const dailyActivity = getDailyActivity();
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const monthMap = {};
    dailyActivity.forEach(item => {
      const date = new Date(item.date + 'T00:00:00');
      if (date >= sixMonthsAgo && date <= now) {
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthMap[monthKey] = (monthMap[monthKey] || 0) + item.count;
      }
    });

    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push({
        month: d.toLocaleString('default', { month: 'short', year: 'numeric' }),
        count: monthMap[monthKey] || 0
      });
    }
    return months;
  };

  const last6Months = getLast6MonthsData();
  const maxCount = Math.max(...last6Months.map(m => m.count), 1);
  const dailyActivityMap = (() => {
    const map = {};
    const daily = getDailyActivity();
    daily.forEach(item => { map[item.date] = item.count; });
    return map;
  })();

  const statsData = getSubmissionStats();

  // ---- Heatmap rendering (compact) ----
  const renderHeatmap = () => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    
    const weeks = [];
    let week = [];
    for (let i = 0; i < firstDay; i++) week.push(null);
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toISOString().split('T')[0];
      const count = dailyActivityMap[dateStr] || 0;
      week.push({ day, count, date });
      if (week.length === 7) {
        weeks.push(week);
        week = [];
      }
    }
    if (week.length > 0) {
      while (week.length < 7) week.push(null);
      weeks.push(week);
    }

    const getColor = (count) => {
      if (count === 0) return 'bg-gray-800/50';
      if (count < 3) return 'bg-green-900/60';
      if (count < 6) return 'bg-green-700/60';
      if (count < 10) return 'bg-green-500/60';
      return 'bg-green-400/60';
    };

    return (
      <div className="w-full">
        <div className="flex items-center justify-between mb-2 text-sm">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedMonth(new Date(year, month - 1))}
              className="p-1 hover:bg-gray-700 rounded transition text-xs"
            >
              ←
            </button>
            <span className="font-medium text-sm">
              {new Date(year, month).toLocaleString('default', { month: 'short', year: 'numeric' })}
            </span>
            <button
              onClick={() => setSelectedMonth(new Date(year, month + 1))}
              className="p-1 hover:bg-gray-700 rounded transition text-xs"
            >
              →
            </button>
          </div>
          <button
            onClick={() => setSelectedMonth(new Date())}
            className="px-2 py-0.5 bg-gray-700 hover:bg-gray-600 rounded text-xs transition"
          >
            Today
          </button>
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
            <div key={day} className="text-center text-[9px] text-gray-500 py-0.5">{day}</div>
          ))}
          {weeks.map((week, wi) => (
            week.map((day, di) => (
              <div
                key={`${wi}-${di}`}
                className={`aspect-square rounded-sm ${day ? getColor(day.count) : 'bg-transparent'} 
                  flex items-center justify-center text-[8px] ${day?.count > 0 ? 'text-white' : 'text-gray-600'}`}
                title={day ? `${day.date.toDateString()}: ${day.count} submissions` : ''}
              >
                {day?.day || ''}
              </div>
            ))
          ))}
        </div>
        <div className="flex items-center justify-end gap-1 mt-1 text-[8px] text-gray-500">
          <span>Less</span>
          {[0, 3, 6, 10].map((level) => (
            <div
              key={level}
              className={`w-3 h-3 rounded-sm ${level === 0 ? 'bg-gray-800/50' : 
                level < 3 ? 'bg-green-900/60' :
                level < 6 ? 'bg-green-700/60' :
                'bg-green-400/60'}`}
            />
          ))}
          <span>More</span>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-8 max-w-md text-center">
          <div className="text-5xl mb-4">👤</div>
          <h2 className="text-2xl font-bold text-white mb-2">Profile Not Found</h2>
          <p className="text-gray-400">{error || 'User profile not found'}</p>
          <div className="mt-4 flex flex-col gap-2">
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl text-white transition"
            >
              Go Home
            </button>
            <button
              onClick={() => {
                setError(null);
                fetchProfileData();
              }}
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-xl text-white transition"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUser?._id === profile._id;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/')}
          className="mb-4 px-4 py-2 bg-gray-800/50 hover:bg-gray-700/50 rounded-xl text-gray-300 text-sm transition flex items-center gap-2 border border-gray-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </button>

        {/* Profile Header */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 mb-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg shadow-blue-500/20">
                {profile.firstname?.[0]}{profile.lastname?.[0]}
              </div>
            </div>

            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-bold text-white">
                  {profile.firstname} {profile.lastname}
                </h1>
                <span className="px-3 py-1 bg-blue-900/50 text-blue-300 text-sm rounded-full border border-blue-700">
                  {profile.role === 'admin' ? 'Admin' : 'Developer'}
                </span>
                {isOwnProfile && (
                  <span className="px-3 py-1 bg-green-900/50 text-green-300 text-sm rounded-full border border-green-700">
                    You
                  </span>
                )}
              </div>
              <p className="text-gray-400 mt-1">{profile.email}</p>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Joined {new Date(profile.createdAt).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1">
                  <Award className="w-4 h-4" />
                  Rating: {profile.rating || 'Unrated'}
                </span>
                <span className="flex items-center gap-1">
                  <Code2 className="w-4 h-4" />
                  {profile.totalSubmissions || 0} submissions
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4 text-center hover:border-blue-500/50 transition">
            <p className="text-2xl font-bold text-white">{statsData.total}</p>
            <p className="text-gray-400 text-sm">Total Submissions</p>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4 text-center hover:border-green-500/50 transition">
            <p className="text-2xl font-bold text-green-400">{statsData.accepted}</p>
            <p className="text-gray-400 text-sm">Accepted</p>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4 text-center hover:border-red-500/50 transition">
            <p className="text-2xl font-bold text-red-400">{statsData.wrong}</p>
            <p className="text-gray-400 text-sm">Wrong Answer</p>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4 text-center hover:border-yellow-500/50 transition">
            <p className="text-2xl font-bold text-yellow-400">
              {statsData.total > 0 ? Math.round((statsData.accepted / statsData.total) * 100) : 0}%
            </p>
            <p className="text-gray-400 text-sm">Success Rate</p>
          </div>
        </div>

        {/* LAST 6 MONTHS CHART (Prominent) */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 mb-6">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            Last 6 Months Submissions
          </h3>
          <div className="flex items-end h-56 gap-2">
            {last6Months.map((item, idx) => {
              const height = item.count === 0 ? 4 : (item.count / maxCount) * 180 + 4;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                  <div 
                    className="w-full bg-blue-500 rounded-t transition-all duration-300 hover:bg-blue-400"
                    style={{ height: `${height}px`, minHeight: '4px' }}
                  ></div>
                  <span className="text-xs text-gray-400">{item.month.split(' ')[0]}</span>
                  <span className="text-xs text-gray-500">{item.count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* DAILY ACTIVITY HEATMAP (Compact) */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-4 mb-6">
          <h3 className="font-semibold text-white mb-2 flex items-center gap-2 text-sm">
            <Activity className="w-4 h-4 text-green-400" />
            Daily Activity
          </h3>
          {renderHeatmap()}
        </div>

        {/* Recent Submissions */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-400" />
            Recent Submissions
          </h3>
          {submissions.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No submissions yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-2 px-3 text-xs text-gray-400">Problem</th>
                    <th className="text-left py-2 px-3 text-xs text-gray-400">Status</th>
                    <th className="text-left py-2 px-3 text-xs text-gray-400">Language</th>
                    <th className="text-left py-2 px-3 text-xs text-gray-400">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.slice(0, 10).map((sub, idx) => (
                    <tr key={idx} className="border-b border-gray-700/50 hover:bg-gray-800/30 transition">
                      <td className="py-2 px-3 text-sm text-gray-300">
                        {sub.problemId?.title || 'Unknown'}
                      </td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          sub.status === 'accepted' ? 'bg-green-900/50 text-green-400' :
                          sub.status === 'wrong' ? 'bg-red-900/50 text-red-400' :
                          'bg-yellow-900/50 text-yellow-400'
                        }`}>
                          {sub.status}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-sm text-gray-400">{sub.language}</td>
                      <td className="py-2 px-3 text-sm text-gray-500">
                        {new Date(sub.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Profile;