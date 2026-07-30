// src/pages/ContestDetail.jsx - Fixed imports
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import axiosclient from '../utilis/axiosclient';
import MonacoEditor from '@monaco-editor/react';
import {
  Trophy, Clock, Users, Calendar, Play, CheckCircle, XCircle,
  Timer, Award, FileText, Send, ArrowLeft, ChevronDown,
  ChevronUp, User, Eye, EyeOff, Lock, Unlock, Code, Loader2
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
  const [standings, setStandings] = useState([]);
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
  const [showCode, setShowCode] = useState(true);
  
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
      
      // Set test cases from first problem
      if (problemsRes.data.problems.length > 0) {
        setTestCases(problemsRes.data.problems[0].visibleTestCases || []);
      }

      // Get standings
      try {
        const standingsRes = await axiosclient.get(`/contest/${id}/standings`);
        setStandings(standingsRes.data.standings);
      } catch (err) {
        console.log('Standings not available');
      }

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

  // Handle Run Code (visible test cases only)
  const handleRunCode = async () => {
    if (!code.trim()) {
      alert('Please write some code first!');
      return;
    }

    const problem = problems[selectedProblemIndex];
    if (!problem) return;

    setIsRunning(true);
    setExecutionResult(null);

    try {
      const response = await axiosclient.post(`/submit/run/${problem._id}`, {
        code,
        language
      });

      console.log('Run result:', response.data);
      
      let results = [];
      if (response.data && response.data.results) {
        results = response.data.results;
      } else if (Array.isArray(response.data)) {
        results = response.data;
      }
      
      const processedResults = results.map((item, index) => {
        const testCase = testCases[index] || {};
        return {
          testCaseId: index + 1,
          input: testCase.input || 'N/A',
          expectedOutput: testCase.output || 'N/A',
          actualOutput: item.stdout || 'No output',
          status: item.status_id === 3 ? 'passed' : 'failed',
          statusDescription: item.status_description || (item.status ? item.status.description : 'Unknown'),
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
      
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to run code');
    } finally {
      setIsRunning(false);
    }
  };

  // Handle Submit Code (all test cases)
  const handleSubmitCode = async () => {
    if (!code.trim()) {
      alert('Please write some code first!');
      return;
    }

    const problem = problems[selectedProblemIndex];
    if (!problem) return;

    setIsSubmitting(true);
    setSubmissionResult(null);

    try {
      const response = await axiosclient.post(`/submit/submit/${problem._id}`, {
        code,
        language
      });

      setSubmissionResult(response.data);
      
      // Refresh contest data
      await fetchContestData();
      
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit solution');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'accepted': return 'text-green-400 bg-green-900/30';
      case 'wrong': return 'text-red-400 bg-red-900/30';
      case 'error': return 'text-yellow-400 bg-yellow-900/30';
      default: return 'text-gray-400 bg-gray-800';
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy': return 'text-green-400 bg-green-900/30';
      case 'medium': return 'text-yellow-400 bg-yellow-900/30';
      case 'hard': return 'text-red-400 bg-red-900/30';
      default: return 'text-gray-400 bg-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-400">Loading contest...</p>
        </div>
      </div>
    );
  }

  if (error || !contest) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white p-8">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate('/contests')}
            className="mb-6 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Contests
          </button>
          <div className="bg-red-900/30 border border-red-700 rounded-xl p-6 text-center">
            <div className="text-4xl mb-4">❌</div>
            <h2 className="text-xl font-bold mb-3">Contest Not Found</h2>
            <p className="text-gray-400">{error || 'The contest you\'re looking for doesn\'t exist.'}</p>
          </div>
        </div>
      </div>
    );
  }

  const currentProblem = problems[selectedProblemIndex];
  const canAccessProblems = isRegistered || isContestActive || isContestCompleted || isAdmin;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/contests')}
            className="mb-4 px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded-lg transition flex items-center gap-1 text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">{contest.title}</h1>
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <span className={`px-3 py-1 rounded-full text-sm border flex items-center gap-1 ${
                  isContestActive ? 'text-green-400 bg-green-900/30 border-green-700' :
                  contest.status === 'upcoming' ? 'text-blue-400 bg-blue-900/30 border-blue-700' :
                  'text-gray-400 bg-gray-800 border-gray-700'
                }`}>
                  {isContestActive ? <Play className="w-3 h-3" /> :
                   contest.status === 'upcoming' ? <Clock className="w-3 h-3" /> :
                   <CheckCircle className="w-3 h-3" />}
                  {isContestActive ? 'Live' :
                   contest.status === 'upcoming' ? 'Upcoming' : 'Completed'}
                </span>
                <span className="text-gray-400 text-sm flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {contest.duration} minutes
                </span>
                <span className="text-gray-400 text-sm flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatDate(contest.startTime)}
                </span>
                {isRegistered && (
                  <span className="px-2 py-1 bg-green-900/30 text-green-400 border border-green-700 rounded-full text-xs flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Registered
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              {isContestActive && timeRemaining && (
                <div className="flex items-center gap-3 bg-gray-900/70 border border-gray-700 rounded-lg px-4 py-2">
                  <Timer className="w-5 h-5 text-yellow-400" />
                  <div>
                    <div className="text-xs text-gray-400">Time Remaining</div>
                    <div className="text-xl font-mono font-bold text-yellow-400">{timeRemaining}</div>
                  </div>
                </div>
              )}

              {contest.status === 'upcoming' && !isRegistered && (
                <button
                  onClick={handleRegister}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
                >
                  Register Now
                </button>
              )}
              {contest.status === 'upcoming' && isRegistered && (
                <button
                  onClick={handleUnregister}
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition"
                >
                  Unregister
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-800">
          <button
            onClick={() => setActiveTab('problems')}
            className={`px-4 py-2 transition ${
              activeTab === 'problems'
                ? 'border-b-2 border-blue-500 text-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-1" />
            Problems
          </button>
          <button
            onClick={() => setActiveTab('standings')}
            className={`px-4 py-2 transition ${
              activeTab === 'standings'
                ? 'border-b-2 border-blue-500 text-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Trophy className="w-4 h-4 inline mr-1" />
            Standings
          </button>
          <button
            onClick={() => setActiveTab('submissions')}
            className={`px-4 py-2 transition ${
              activeTab === 'submissions'
                ? 'border-b-2 border-blue-500 text-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Send className="w-4 h-4 inline mr-1" />
            My Submissions
          </button>
        </div>

        {/* Content */}
        {activeTab === 'problems' && (
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            {/* Problem List Sidebar */}
            <div className="xl:col-span-1">
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Problems ({problems.length})
                </h3>
                <div className="space-y-2">
                  {problems.map((problem, index) => (
                    <button
                      key={problem._id}
                      onClick={() => {
                        setSelectedProblemIndex(index);
                        setTestCases(problem.visibleTestCases || []);
                        setSubmissionResult(null);
                        setExecutionResult(null);
                      }}
                      className={`w-full text-left p-3 rounded-lg transition ${
                        selectedProblemIndex === index
                          ? 'bg-blue-600/20 border border-blue-600'
                          : 'hover:bg-gray-700/50 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                              {problem.index}. {problem.title}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs ${getDifficultyColor(problem.difficulty)}`}>
                              {problem.difficulty}
                            </span>
                          </div>
                          {problem.description && (
                            <p className="text-gray-400 text-xs mt-1 line-clamp-2">
                              {problem.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          {problem.solved && (
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          )}
                          {problem.attempts > 0 && !problem.solved && (
                            <XCircle className="w-4 h-4 text-red-400" />
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Problem Content */}
            <div className="xl:col-span-3">
              {!canAccessProblems ? (
                <div className="bg-yellow-900/20 border border-yellow-700 rounded-xl p-8 text-center">
                  <div className="text-4xl mb-4">🔒</div>
                  <h3 className="text-xl font-medium mb-2">Register to View Problems</h3>
                  <p className="text-gray-400 mb-4">
                    You need to register for this contest to view the problems.
                  </p>
                  <button
                    onClick={handleRegister}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
                  >
                    Register Now
                  </button>
                </div>
              ) : currentProblem ? (
                <div className="space-y-4">
                  {/* Problem Description */}
                  <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 md:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h2 className="text-xl font-bold">
                          {currentProblem.index}. {currentProblem.title}
                        </h2>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className={`px-3 py-1 rounded-full text-sm ${getDifficultyColor(currentProblem.difficulty)}`}>
                            {currentProblem.difficulty}
                          </span>
                          {currentProblem.solved && (
                            <span className="px-3 py-1 bg-green-900/30 text-green-400 rounded-full text-sm flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> Solved
                            </span>
                          )}
                          {currentProblem.attempts > 0 && (
                            <span className="px-3 py-1 bg-gray-900 rounded-full text-sm text-gray-400">
                              Attempts: {currentProblem.attempts}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <h3 className="font-semibold mb-2">Description</h3>
                      <div className="text-gray-300 text-sm whitespace-pre-wrap">
                        {currentProblem.description}
                      </div>
                    </div>

                    {/* Test Cases */}
                    {testCases && testCases.length > 0 && (
                      <div className="mt-4">
                        <h3 className="font-semibold mb-2">Test Cases</h3>
                        <div className="space-y-2">
                          {testCases.map((tc, i) => (
                            <div key={i} className="bg-gray-900/50 rounded-lg p-3">
                              <div className="text-xs text-gray-400 mb-1">Test {i + 1}</div>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <span className="text-gray-500">Input:</span>
                                  <pre className="bg-black p-2 rounded mt-1 text-xs overflow-x-auto">
                                    {tc.input}
                                  </pre>
                                </div>
                                <div>
                                  <span className="text-gray-500">Expected:</span>
                                  <pre className="bg-black p-2 rounded mt-1 text-xs overflow-x-auto">
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

                  {/* Code Editor - Only show for registered users in active contest */}
                  {(isRegistered || isAdmin) && (isContestActive || isContestCompleted) && (
                    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 md:p-6">
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3">
                          <select
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                            className="px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm"
                          >
                            {languages.map(lang => (
                              <option key={lang.value} value={lang.value}>
                                {lang.label}
                              </option>
                            ))}
                          </select>
                          <span className="text-sm text-gray-400">
                            Problem {currentProblem.index}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleRunCode}
                            disabled={isRunning}
                            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg transition disabled:opacity-50 flex items-center gap-2"
                          >
                            {isRunning ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Running...
                              </>
                            ) : (
                              <>
                                <Play className="w-4 h-4" />
                                Run
                              </>
                            )}
                          </button>
                          <button
                            onClick={handleSubmitCode}
                            disabled={isSubmitting || !isContestActive}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {isSubmitting ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Submitting...
                              </>
                            ) : (
                              <>
                                <Send className="w-4 h-4" />
                                Submit
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="border border-gray-700 rounded-lg overflow-hidden h-[400px]">
                        <MonacoEditor
                          language={languages.find(l => l.value === language)?.monacoLang || 'javascript'}
                          value={code}
                          onChange={(value) => setCode(value || '')}
                          theme="vs-dark"
                          options={{
                            minimap: { enabled: true },
                            scrollBeyondLastLine: false,
                            fontSize: 13,
                            wordWrap: 'on',
                            automaticLayout: true,
                            tabSize: 2,
                          }}
                        />
                      </div>

                      {/* Execution Results */}
                      {executionResult && (
                        <div className="mt-4 bg-gray-900/50 border border-gray-700 rounded-lg p-4 max-h-[200px] overflow-y-auto">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">Test Results</h4>
                            <span className={`text-sm ${
                              executionResult.summary.passed === executionResult.summary.total
                                ? 'text-green-400'
                                : 'text-yellow-400'
                            }`}>
                              {executionResult.summary.passed}/{executionResult.summary.total} passed
                            </span>
                          </div>
                          <div className="space-y-2">
                            {executionResult.results.map((result, idx) => (
                              <div
                                key={idx}
                                className={`p-2 rounded text-sm ${
                                  result.status === 'passed'
                                    ? 'bg-green-900/20 border border-green-800'
                                    : 'bg-red-900/20 border border-red-800'
                                }`}
                              >
                                <div className="flex justify-between items-center">
                                  <span className="font-medium">Test {result.testCaseId}</span>
                                  <span className={result.status === 'passed' ? 'text-green-400' : 'text-red-400'}>
                                    {result.status === 'passed' ? '✅ Passed' : '❌ Failed'}
                                  </span>
                                </div>
                                {result.status !== 'passed' && (
                                  <div className="mt-1 text-xs text-gray-400">
                                    <div>Expected: {result.expectedOutput}</div>
                                    <div>Got: {result.actualOutput || 'No output'}</div>
                                    {result.statusDescription && (
                                      <div className="text-red-300">{result.statusDescription}</div>
                                    )}
                                  </div>
                                )}
                                <div className="mt-1 text-xs text-gray-500">
                                  Time: {result.time}s | Memory: {result.memory}KB
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Submission Result */}
                      {submissionResult && (
                        <div className={`mt-4 p-4 rounded-lg ${
                          submissionResult.status === 'accepted'
                            ? 'bg-green-900/30 border border-green-700'
                            : 'bg-red-900/30 border border-red-700'
                        }`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {submissionResult.status === 'accepted' ? (
                                <CheckCircle className="w-5 h-5 text-green-400" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-400" />
                              )}
                              <span className="font-medium">
                                {submissionResult.status === 'accepted' ? 'Accepted!' : 'Wrong Answer'}
                              </span>
                            </div>
                            <span className="text-sm text-gray-400">
                              {submissionResult.testCasesPassed}/{submissionResult.totalTestCases} test cases passed
                            </span>
                          </div>
                          {submissionResult.message && (
                            <p className="mt-2 text-sm text-gray-300">{submissionResult.message}</p>
                          )}
                        </div>
                      )}

                      {isContestCompleted && (
                        <div className="mt-3 text-sm text-gray-400 text-center">
                          ⚠️ Contest has ended. You can view problems but cannot submit new solutions.
                        </div>
                      )}
                    </div>
                  )}

                  {!isRegistered && !isAdmin && (
                    <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-6 text-center">
                      <div className="text-4xl mb-4">🔒</div>
                      <h3 className="text-xl font-medium mb-2">Register to Submit Solutions</h3>
                      <p className="text-gray-400 mb-4">
                        You need to register for this contest to submit solutions.
                      </p>
                      <button
                        onClick={handleRegister}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
                      >
                        Register Now
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  No problems available for this contest.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Standings Tab */}
        {activeTab === 'standings' && (
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
                Contest Standings
              </h2>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Users className="w-4 h-4" />
                {standings.length} participants
              </div>
            </div>

            {standings.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">📊</div>
                <p className="text-gray-400">No standings available yet</p>
                <p className="text-gray-500 text-sm mt-2">Be the first to submit a solution!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-3 px-4 text-gray-400 text-sm">#</th>
                      <th className="text-left py-3 px-4 text-gray-400 text-sm">Participant</th>
                      {problems.map((p, i) => (
                        <th key={p._id} className="text-center py-3 px-2 text-gray-400 text-sm">
                          {String.fromCharCode(65 + i)}
                        </th>
                      ))}
                      <th className="text-center py-3 px-4 text-gray-400 text-sm">Solved</th>
                      <th className="text-center py-3 px-4 text-gray-400 text-sm">Penalty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((item, index) => (
                      <tr
                        key={item.userId}
                        className={`border-b border-gray-800 ${
                          item.userId === user?._id ? 'bg-blue-900/20' : ''
                        } hover:bg-gray-800/30 transition`}
                      >
                        <td className="py-3 px-4">
                          {index === 0 ? (
                            <Trophy className="w-5 h-5 text-yellow-400" />
                          ) : index === 1 ? (
                            <Award className="w-5 h-5 text-gray-400" />
                          ) : index === 2 ? (
                            <Award className="w-5 h-5 text-amber-600" />
                          ) : (
                            <span className="text-gray-400">{index + 1}</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {item.username}
                            </span>
                            {item.userId === user?._id && (
                              <span className="px-2 py-0.5 bg-blue-600/30 text-blue-300 rounded text-xs">
                                You
                              </span>
                            )}
                          </div>
                        </td>
                        {item.problemResults.map((result, i) => (
                          <td key={i} className="text-center py-3 px-2">
                            {result.solved ? (
                              <div className="flex flex-col items-center">
                                <CheckCircle className="w-4 h-4 text-green-400" />
                                <span className="text-xs text-green-400">+{result.attempts}</span>
                              </div>
                            ) : result.attempts > 0 ? (
                              <div className="flex flex-col items-center">
                                <XCircle className="w-4 h-4 text-red-400" />
                                <span className="text-xs text-red-400">-{result.attempts}</span>
                              </div>
                            ) : (
                              <span className="text-gray-600">-</span>
                            )}
                          </td>
                        ))}
                        <td className="text-center py-3 px-4 font-bold">
                          {item.solvedCount}
                        </td>
                        <td className="text-center py-3 px-4 text-gray-400">
                          {item.totalPenalty > 0 ? `${Math.floor(item.totalPenalty / 60)}m` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Submissions Tab */}
        {activeTab === 'submissions' && (
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Send className="w-5 h-5" />
              My Submissions
            </h2>

            {submissions.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">📭</div>
                <p className="text-gray-400">No submissions yet</p>
                <p className="text-gray-500 text-sm mt-2">Start solving problems to submit solutions!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {submissions.map((sub, index) => (
                  <div
                    key={sub._id || index}
                    className="bg-gray-900/50 border border-gray-700 rounded-lg p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {sub.problemIndex}. {sub.problemId?.title || 'Unknown Problem'}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs ${getStatusColor(sub.status)}`}>
                            {sub.isCorrect ? '✅ Accepted' : '❌ Wrong Answer'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-400">
                          <span>Language: {sub.language}</span>
                          <span>Attempts: {sub.attempts || 1}</span>
                          {sub.score > 0 && <span>Score: {sub.score}</span>}
                          <span className="text-xs">
                            {formatDate(sub.submittedAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


export default ContestDetail;