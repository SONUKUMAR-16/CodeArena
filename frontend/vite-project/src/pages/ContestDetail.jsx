// src/pages/ContestDetail.jsx - Real-time Leaderboard with Redis & Socket.IO
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axiosclient from '../utilis/axiosclient';
import MonacoEditor from '@monaco-editor/react';
import { io } from 'socket.io-client';
import {
  Trophy, Clock, Users, Play, CheckCircle, XCircle,
  Award, Send, ArrowLeft, Loader2, ChevronLeft, ChevronRight, UserCheck
} from 'lucide-react';

function ContestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const isAdmin = user?.role === 'admin';

  // State
  const [contest, setContest] = useState(null);
  const [problems, setProblems] = useState([]);
  const [selectedProblemIndex, setSelectedProblemIndex] = useState(0);
  
  // Leaderboard & Standings State (STEP 5 & 11)
  const [leaderboard, setLeaderboard] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [myRank, setMyRank] = useState(null);

  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('problems');
  const [isRegistered, setIsRegistered] = useState(false);
  const [isContestActive, setIsContestActive] = useState(false);
  const [isContestCompleted, setIsContestCompleted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);
  
  // Code Editor State
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [executionResult, setExecutionResult] = useState(null);
  const [testCases, setTestCases] = useState([]);
  const socketRef = useRef(null);

  // Languages
  const languages = [
    { value: 'javascript', label: 'JavaScript', monacoLang: 'javascript' },
    { value: 'java', label: 'Java', monacoLang: 'java' },
    { value: 'c++', label: 'C++', monacoLang: 'cpp' }
  ];

  // Fetch contest data
  useEffect(() => {
    fetchContestData();
  }, [id]);

  // Fetch leaderboard when page changes
  useEffect(() => {
    if (activeTab === 'standings') {
      fetchLeaderboard(page);
      fetchMyRank();
    }
  }, [id, activeTab, page]);

  // STEP 8: Socket.IO Real-time Leaderboard Updates
  useEffect(() => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
    const socket = io(backendUrl, { withCredentials: true });
    socketRef.current = socket;

    socket.emit('joinContest', { contestId: id });
    socket.emit('join-contest', id);

    socket.on('leaderboard:update', (data) => {
      if (data.contestId === id) {
        fetchLeaderboard(page);
        fetchMyRank();
      }
    });

    socket.on('score-update', (payload) => {
      if (payload.contestId === id) {
        fetchLeaderboard(page);
        fetchMyRank();
      }
    });

    socket.on('contest:ended', (payload) => {
      if (payload.contestId === id) {
        setIsContestActive(false);
        setIsContestCompleted(true);
        setTimeRemaining('Contest ended');
        fetchLeaderboard(1);
        fetchMyRank();
      }
    });

    return () => {
      socket.emit('leaveContest', { contestId: id });
      socket.emit('leave-contest', id);
      socket.disconnect();
    };
  }, [id, page]);

  // Set code when problem changes
  useEffect(() => {
    if (problems[selectedProblemIndex]?.startcode) {
      const starter = problems[selectedProblemIndex].startcode.find(
        sc => sc.language === language
      );
      setCode(starter?.initialcode || '// Write your solution here');
    }
  }, [selectedProblemIndex, language, problems]);

  const fetchContestData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get contest details
      const contestRes = await axiosclient.get(`/contest/${id}`);
      setContest(contestRes.data.contest);
      setIsRegistered(contestRes.data.contest.isRegistered || false);
      setIsContestActive(contestRes.data.contest.status === 'active');
      setIsContestCompleted(contestRes.data.contest.status === 'completed');

      // Get problems
      const problemsRes = await axiosclient.get(`/contest/${id}/problems`);
      setProblems(problemsRes.data.problems);
      
      if (problemsRes.data.problems.length > 0) {
        setTestCases(problemsRes.data.problems[0].visibleTestCases || []);
      }

      // Initial Leaderboard Fetch
      await fetchLeaderboard(1);
      await fetchMyRank();

      // Get my submissions
      try {
        const subsRes = await axiosclient.get(`/contest/${id}/my-submissions`);
        setSubmissions(subsRes.data.submissions);
      } catch (err) {
        console.log('Submissions not available');
      }

    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load contest');
    } finally {
      setLoading(false);
    }
  };

  // STEP 5: Paginated Redis-backed Leaderboard API Call
  const fetchLeaderboard = async (pageNum = 1) => {
    try {
      const res = await axiosclient.get(`/contest/${id}/leaderboard?page=${pageNum}&limit=50`);
      if (res.data.success) {
        setLeaderboard(res.data.leaderboard || []);
        setPage(res.data.page || 1);
        setTotalPages(res.data.totalPages || 1);
        setTotalUsers(res.data.totalUsers || 0);
      }
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
    }
  };

  // STEP 5: Fetch My Rank
  const fetchMyRank = async () => {
    try {
      const res = await axiosclient.get(`/contest/${id}/my-rank`);
      if (res.data.success) {
        setMyRank(res.data.myRank);
      }
    } catch (err) {
      console.error('Failed to fetch user rank:', err);
    }
  };

  // Timer
  useEffect(() => {
    if (contest?.status === 'active' && contest?.endTime) {
      const updateTimer = () => {
        const now = new Date();
        const end = new Date(contest.endTime);
        const diff = end - now;

        if (diff <= 0) {
          setTimeRemaining('Contest ended');
          setIsContestActive(false);
          setIsContestCompleted(true);
        } else {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          setTimeRemaining(
            `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
          );
        }
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }
  }, [contest]);

  const handleRegister = async () => {
    try {
      await axiosclient.post(`/contest/${id}/register`);
      setIsRegistered(true);
      await fetchContestData();
    } catch (err) {
      alert(err.response?.data?.message || 'Registration failed');
    }
  };

  const handleUnregister = async () => {
    if (!window.confirm('Are you sure you want to unregister?')) return;
    try {
      await axiosclient.post(`/contest/${id}/unregister`);
      setIsRegistered(false);
      await fetchContestData();
    } catch (err) {
      alert(err.response?.data?.message || 'Unregistration failed');
    }
  };

  const handleRunCode = async () => {
    if (!problems[selectedProblemIndex]) return;

    try {
      setIsRunning(true);
      setExecutionResult(null);

      const problemId = problems[selectedProblemIndex]._id;
      const res = await axiosclient.post(`/submit/run/${problemId}`, {
        code,
        language
      });

      const results = res.data.results || [];
      const passedCount = results.filter(r => r.status_id === 3 || r.status?.id === 3 || r.status === 'passed' || r.status === 'accepted').length;

      setExecutionResult({
        type: 'run',
        results,
        summary: { passed: passedCount, total: results.length }
      });
    } catch (err) {
      setExecutionResult({
        type: 'run',
        error: err.response?.data?.message || 'Run execution failed'
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmitSolution = async () => {
    if (!problems[selectedProblemIndex]) return;

    try {
      setIsSubmitting(true);
      setSubmissionResult(null);

      const problemId = problems[selectedProblemIndex]._id;
      const res = await axiosclient.post(`/contest/${id}/submit`, {
        problemId,
        code,
        language
      });

      setSubmissionResult(res.data);
      
      // Refresh submissions & leaderboard
      const subsRes = await axiosclient.get(`/contest/${id}/my-submissions`);
      setSubmissions(subsRes.data.submissions);
      
      fetchLeaderboard(page);
      fetchMyRank();

    } catch (err) {
      setSubmissionResult({
        status: 'error',
        message: err.response?.data?.message || 'Submission failed'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentProblem = problems[selectedProblemIndex];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <span>Loading Contest Details...</span>
        </div>
      </div>
    );
  }

  if (error || !contest) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate('/contests')}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-6"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Contests
          </button>
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-6 text-center">
            <h2 className="text-xl font-bold mb-2">Error Loading Contest</h2>
            <p className="text-gray-300">{error || 'Contest not found'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/contests')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Contests
          </button>

          <div className="flex items-center gap-3">
            {!isRegistered && !isAdmin && (
              <button
                onClick={handleRegister}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-semibold transition"
              >
                Register for Contest
              </button>
            )}

            {isRegistered && !isContestCompleted && (
              <button
                onClick={handleUnregister}
                className="px-4 py-2 bg-gray-800 hover:bg-red-900/40 border border-gray-700 hover:border-red-700 text-gray-300 text-sm rounded-lg transition"
              >
                Unregister
              </button>
            )}
          </div>
        </div>

        {/* Contest Info Card */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold">{contest.title}</h1>
                <span className={`px-2.5 py-0.5 text-xs font-semibold rounded ${
                  contest.status === 'active' ? 'bg-green-900/50 text-green-400 border border-green-700' :
                  contest.status === 'upcoming' ? 'bg-yellow-900/50 text-yellow-400 border border-yellow-700' :
                  'bg-gray-700 text-gray-300'
                }`}>
                  {contest.status.toUpperCase()}
                </span>
              </div>
              <p className="text-gray-400 text-sm">{contest.description}</p>
            </div>

            {/* Timer */}
            {isContestActive && timeRemaining && (
              <div className="flex items-center gap-3 bg-gray-900 px-4 py-3 rounded-lg border border-gray-700">
                <Clock className="w-5 h-5 text-blue-400 animate-pulse" />
                <div>
                  <div className="text-xs text-gray-400 uppercase font-semibold">Time Remaining</div>
                  <div className="text-lg font-mono font-bold text-blue-400">{timeRemaining}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-800 space-x-6">
          <button
            onClick={() => setActiveTab('problems')}
            className={`pb-3 text-sm font-semibold transition border-b-2 ${
              activeTab === 'problems'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            Problems ({problems.length})
          </button>
          <button
            onClick={() => setActiveTab('standings')}
            className={`pb-3 text-sm font-semibold transition border-b-2 ${
              activeTab === 'standings'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            Standings & Leaderboard
          </button>
          <button
            onClick={() => setActiveTab('submissions')}
            className={`pb-3 text-sm font-semibold transition border-b-2 ${
              activeTab === 'submissions'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            My Submissions ({submissions.length})
          </button>
        </div>

        {/* Tab 1: Problems */}
        {activeTab === 'problems' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar Problems List */}
            <div className="lg:col-span-1 bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 px-1">
                Contest Problems
              </h3>
              {problems.map((p, idx) => (
                <button
                  key={p._id}
                  onClick={() => setSelectedProblemIndex(idx)}
                  className={`w-full text-left p-3 rounded-lg text-sm font-medium transition flex items-center justify-between ${
                    selectedProblemIndex === idx
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-900/50 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <div className="truncate">
                    <span className="font-bold mr-2">{String.fromCharCode(65 + idx)}.</span>
                    {p.title}
                  </div>
                  {p.solved && <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />}
                </button>
              ))}
            </div>

            {/* Problem Details & Editor */}
            <div className="lg:col-span-3 space-y-4">
              {currentProblem ? (
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4 border-b border-gray-700 pb-3">
                    <div>
                      <h2 className="text-xl font-bold">
                        {String.fromCharCode(65 + selectedProblemIndex)}. {currentProblem.title}
                      </h2>
                      <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded font-semibold ${
                        currentProblem.difficulty === 'easy' ? 'bg-green-900/40 text-green-400' :
                        currentProblem.difficulty === 'medium' ? 'bg-yellow-900/40 text-yellow-400' :
                        'bg-red-900/40 text-red-400'
                      }`}>
                        {currentProblem.difficulty}
                      </span>
                    </div>
                  </div>

                  <p className="text-gray-300 text-sm whitespace-pre-wrap mb-6">{currentProblem.description}</p>

                  {/* Example Input / Output Test Cases */}
                  {((currentProblem.visibletestcases || currentProblem.visibleTestCases || []).length > 0) && (
                    <div className="space-y-4 mb-6">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">Example Test Cases</h3>
                      {(currentProblem.visibletestcases || currentProblem.visibleTestCases).map((tc, tcIdx) => (
                        <div key={tcIdx} className="bg-gray-900/80 border border-gray-700/80 rounded-lg p-4 text-xs space-y-2 font-mono">
                          <div className="font-bold text-gray-300">Example {tcIdx + 1}:</div>
                          <div>
                            <span className="text-blue-400 font-semibold">Input: </span>
                            <code className="bg-gray-800 px-2 py-1 rounded text-gray-200 block mt-1 overflow-x-auto">{tc.input}</code>
                          </div>
                          <div>
                            <span className="text-green-400 font-semibold">Output: </span>
                            <code className="bg-gray-800 px-2 py-1 rounded text-gray-200 block mt-1 overflow-x-auto">{tc.output}</code>
                          </div>
                          {tc.explanation && (
                            <div className="font-sans text-gray-400 text-xs mt-2 pt-1 border-t border-gray-800">
                              <span className="font-semibold text-gray-300">Explanation: </span>{tc.explanation}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Code Editor */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center bg-gray-900 p-3 rounded-t-lg border border-gray-700 border-b-0">
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="bg-gray-800 text-gray-200 border border-gray-700 px-3 py-1.5 rounded text-sm outline-none"
                      >
                        {languages.map(l => (
                          <option key={l.value} value={l.value}>{l.label}</option>
                        ))}
                      </select>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleRunCode}
                          disabled={isRunning}
                          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 disabled:opacity-50 text-gray-200 rounded font-semibold text-sm transition flex items-center gap-2"
                        >
                          {isRunning ? <Loader2 className="w-4 h-4 animate-spin text-blue-400" /> : <Play className="w-4 h-4 text-green-400" />}
                          Run Code
                        </button>

                        {!isRegistered && !isAdmin ? (
                          <button
                            onClick={handleRegister}
                            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold text-sm transition flex items-center gap-2"
                          >
                            Register to Submit
                          </button>
                        ) : (
                          <button
                            onClick={handleSubmitSolution}
                            disabled={isSubmitting || (!isContestActive && !isAdmin)}
                            className="px-5 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded font-semibold text-sm transition flex items-center gap-2"
                          >
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            Submit Solution
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="border border-gray-700 rounded-b-lg overflow-hidden h-[360px]">
                      <MonacoEditor
                        language={languages.find(l => l.value === language)?.monacoLang || 'javascript'}
                        value={code}
                        onChange={(val) => setCode(val || '')}
                        theme="vs-dark"
                        options={{ fontSize: 13, scrollBeyondLastLine: false, automaticLayout: true }}
                      />
                    </div>

                    {/* Run Code Execution Results */}
                    {executionResult && (
                      <div className="p-4 rounded-lg border border-gray-700 bg-gray-900/90 text-sm space-y-2">
                        <div className="font-bold flex items-center justify-between text-gray-200">
                          <span>Run Execution Output</span>
                          {executionResult.summary && (
                            <span className="text-xs text-blue-400 font-mono">
                              Passed {executionResult.summary.passed} / {executionResult.summary.total}
                            </span>
                          )}
                        </div>
                        {executionResult.error ? (
                          <p className="text-red-400 text-xs">{executionResult.error}</p>
                        ) : (
                          <div className="space-y-2 max-h-[180px] overflow-y-auto pt-1">
                            {executionResult.results.map((resItem, idx) => {
                              const isTestCasePassed = resItem.status_id === 3 || resItem.status?.id === 3 || resItem.status === 'passed' || resItem.status === 'accepted';
                              const statusLabel = isTestCasePassed ? 'Passed' : (resItem.status_description || resItem.status?.description || 'Failed');

                              return (
                                <div key={idx} className="p-2.5 bg-gray-800/80 rounded border border-gray-700/60 text-xs space-y-1 font-mono">
                                  <div className="flex justify-between font-bold">
                                    <span>Test Case #{idx + 1}</span>
                                    <span className={isTestCasePassed ? 'text-green-400' : 'text-red-400 font-semibold'}>
                                      {statusLabel}
                                    </span>
                                  </div>
                                  {resItem.stdin && <div><span className="text-gray-400">Input:</span> {resItem.stdin}</div>}
                                  <div><span className="text-gray-400">Expected:</span> {resItem.expected_output || resItem.expectedOutput}</div>
                                  <div><span className="text-gray-400">Actual:</span> {resItem.stdout || resItem.actualOutput || (isTestCasePassed ? 'No output' : statusLabel)}</div>
                                  {(resItem.stderr || resItem.compile_output) && (
                                    <div className="text-red-300 bg-red-950/40 p-1.5 rounded text-[11px] mt-1 whitespace-pre-wrap">
                                      {resItem.stderr || resItem.compile_output}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Official Contest Submission Feedback */}
                    {submissionResult && (
                      <div className={`p-4 rounded-lg border text-sm ${
                        submissionResult.isCorrect ? 'bg-green-900/30 border-green-700 text-green-300' : 'bg-red-900/30 border-red-700 text-red-300'
                      }`}>
                        <div className="font-bold mb-1">
                          {submissionResult.isCorrect ? '✅ Solution Accepted!' : `❌ ${submissionResult.message || 'Submission Failed'}`}
                        </div>
                        <div>Passed: {submissionResult.testCasesPassed} / {submissionResult.totalTestCases} testcases</div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-800 p-6 text-center text-gray-400 rounded-xl">No Problem Selected</div>
              )}
            </div>
          </div>
        )}

        {/* STEP 11: Clean, Human-made Standings & Leaderboard UI */}
        {activeTab === 'standings' && (
          <div className="space-y-4">
            {/* My Rank Summary Box */}
            {myRank && myRank.rank && (
              <div className="bg-blue-950/40 border border-blue-800/60 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-600/20 border border-blue-500/40 rounded-lg">
                    <UserCheck className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <div className="text-xs text-blue-300 font-bold uppercase tracking-wider">Your Current Standings</div>
                    <div className="text-lg font-bold text-white">Rank #{myRank.rank}</div>
                  </div>
                </div>
                <div className="flex gap-6 text-sm">
                  <div>
                    <span className="text-gray-400">Solved: </span>
                    <span className="font-bold text-green-400">{myRank.solvedCount}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Total Penalty: </span>
                    <span className="font-bold text-yellow-400">{myRank.totalPenalty}m</span>
                  </div>
                </div>
              </div>
            )}

            {/* Standings Table */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                  Contest Leaderboard
                </h2>
                <div className="text-xs text-gray-400">
                  Total Participants: <span className="font-bold text-white">{totalUsers}</span>
                </div>
              </div>

              {leaderboard.length === 0 ? (
                <div className="p-8 text-center text-gray-400">No submissions recorded yet for this contest.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-900/60 border-b border-gray-700 text-gray-400 uppercase text-xs">
                      <tr>
                        <th className="py-3 px-4 w-16">Rank</th>
                        <th className="py-3 px-4">Participant</th>
                        <th className="py-3 px-4 text-center">Solved</th>
                        <th className="py-3 px-4 text-center">Penalty</th>
                        <th className="py-3 px-4 text-right">Last Submission</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {leaderboard.map((row) => {
                        const isMe = row.userId === user?._id;
                        return (
                          <tr key={row.userId} className={`hover:bg-gray-750 transition ${isMe ? 'bg-blue-900/25' : ''}`}>
                            <td className="py-3 px-4 font-bold text-gray-300">
                              {row.rank === 1 ? <Trophy className="w-5 h-5 text-yellow-400 inline" /> :
                               row.rank === 2 ? <Award className="w-5 h-5 text-gray-300 inline" /> :
                               row.rank === 3 ? <Award className="w-5 h-5 text-amber-600 inline" /> :
                               `#${row.rank}`}
                            </td>
                            <td className="py-3 px-4 font-semibold text-gray-100 flex items-center gap-2">
                              {row.username}
                              {isMe && <span className="text-[10px] bg-blue-600 px-1.5 py-0.5 rounded text-white font-bold">YOU</span>}
                            </td>
                            <td className="py-3 px-4 text-center font-bold text-green-400">{row.solvedCount}</td>
                            <td className="py-3 px-4 text-center text-yellow-400 font-mono">{row.totalPenalty}m</td>
                            <td className="py-3 px-4 text-right text-xs text-gray-400 font-mono">
                              {row.lastSubmissionTime ? new Date(row.lastSubmissionTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="p-4 border-t border-gray-700 flex items-center justify-between bg-gray-900/40">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-xs font-semibold rounded border border-gray-700 flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" /> Previous
                  </button>
                  <span className="text-xs text-gray-400">
                    Page <strong className="text-white">{page}</strong> of <strong className="text-white">{totalPages}</strong>
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-xs font-semibold rounded border border-gray-700 flex items-center gap-1"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Submissions Tab */}
        {activeTab === 'submissions' && (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-bold">My Submissions</h2>
            {submissions.map((sub, idx) => (
              <div key={sub._id || idx} className="p-4 bg-gray-900 border border-gray-700 rounded-lg flex justify-between items-center">
                <div>
                  <div className="font-semibold">{sub.problemIndex}. {sub.problemId?.title}</div>
                  <div className="text-xs text-gray-400 mt-1">Submitted: {new Date(sub.submittedAt).toLocaleString()}</div>
                </div>
                <span className={`px-2.5 py-1 text-xs font-bold rounded ${sub.isCorrect ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                  {sub.status.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ContestDetail;