// src/pages/InterviewSelect.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axiosclient from '../utilis/axiosclient';
import { 
  Play, Loader2, ArrowLeft, Mic, 
  Code, Database, Layout, Server, 
  Layers, Cloud, Brain, TrendingUp,
  CheckCircle
} from 'lucide-react';

function InterviewSelect() {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  
  const [selectedRole, setSelectedRole] = useState(null);
  const [language, setLanguage] = useState('javascript');
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState(null);

  const roles = [
    {
      id: 'software_developer',
      title: 'Software Developer',
      icon: <Code className="w-8 h-8" />,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-900/20 border-blue-700',
      description: 'Algorithms, data structures, system design, and problem-solving',
      skills: ['Algorithms', 'Data Structures', 'System Design', 'Problem Solving']
    },
    {
      id: 'data_analyst',
      title: 'Data Analyst',
      icon: <Database className="w-8 h-8" />,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-900/20 border-green-700',
      description: 'SQL, Python, statistics, data visualization, and business intelligence',
      skills: ['SQL', 'Python', 'Statistics', 'Data Visualization']
    },
    {
      id: 'frontend_developer',
      title: 'Frontend Developer',
      icon: <Layout className="w-8 h-8" />,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-900/20 border-purple-700',
      description: 'HTML, CSS, JavaScript, React, performance, and accessibility',
      skills: ['React', 'JavaScript', 'CSS/HTML', 'Performance']
    },
    {
      id: 'backend_developer',
      title: 'Backend Developer',
      icon: <Server className="w-8 h-8" />,
      color: 'from-yellow-500 to-yellow-600',
      bgColor: 'bg-yellow-900/20 border-yellow-700',
      description: 'APIs, databases, server architecture, microservices, and authentication',
      skills: ['APIs', 'Databases', 'Microservices', 'Authentication']
    },
    {
      id: 'full_stack_developer',
      title: 'Full Stack Developer',
      icon: <Layers className="w-8 h-8" />,
      color: 'from-pink-500 to-pink-600',
      bgColor: 'bg-pink-900/20 border-pink-700',
      description: 'Frontend, backend, databases, deployment, and system architecture',
      skills: ['Full Stack', 'Architecture', 'Databases', 'Deployment']
    },
    {
      id: 'devops_engineer',
      title: 'DevOps Engineer',
      icon: <Cloud className="w-8 h-8" />,
      color: 'from-cyan-500 to-cyan-600',
      bgColor: 'bg-cyan-900/20 border-cyan-700',
      description: 'CI/CD, cloud services, containerization, monitoring, and infrastructure',
      skills: ['CI/CD', 'Cloud', 'Docker', 'Kubernetes', 'Monitoring']
    }
  ];

  const handleStartInterview = async () => {
    if (!selectedRole) {
      alert('Please select a role for your interview');
      return;
    }

    setStarting(true);
    setError(null);
    
    try {
      const response = await axiosclient.post('/interview/start', {
        role: selectedRole.id,
        language: language
      });

      navigate(`/interview/${response.data.interviewId}`);
    } catch (err) {
      console.error('Start interview error:', err);
      setError(err.response?.data?.message || 'Failed to start interview. Please try again.');
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <button
          onClick={() => navigate('/interviews')}
          className="mb-6 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Interviews
        </button>

        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-purple-600/20 rounded-full mb-4">
            <Mic className="w-10 h-10 text-purple-400" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Choose Your Interview Role
          </h1>
          <p className="text-gray-400 mt-3 max-w-lg mx-auto">
            Select a role and our AI interviewer will conduct a personalized interview
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-900/30 border border-red-700 rounded-xl p-4">
            <p className="text-red-400">{typeof error === 'string' ? error : error?.error || JSON.stringify(error)}</p>
          </div>
        )}

        {/* Role Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => setSelectedRole(role)}
              className={`p-6 rounded-xl border-2 transition-all duration-300 text-left ${
                selectedRole?.id === role.id
                  ? `${role.bgColor} border-${role.id === 'software_developer' ? 'blue' : role.id === 'data_analyst' ? 'green' : role.id === 'frontend_developer' ? 'purple' : role.id === 'backend_developer' ? 'yellow' : role.id === 'full_stack_developer' ? 'pink' : 'cyan'}-500 shadow-lg shadow-${role.id === 'software_developer' ? 'blue' : role.id === 'data_analyst' ? 'green' : role.id === 'frontend_developer' ? 'purple' : role.id === 'backend_developer' ? 'yellow' : role.id === 'full_stack_developer' ? 'pink' : 'cyan'}-500/10`
                  : 'border-gray-700 hover:border-gray-500 bg-gray-900/50 hover:bg-gray-800/50'
              }`}
            >
              <div className={`inline-flex p-3 rounded-lg ${
                selectedRole?.id === role.id ? `bg-${role.id === 'software_developer' ? 'blue' : role.id === 'data_analyst' ? 'green' : role.id === 'frontend_developer' ? 'purple' : role.id === 'backend_developer' ? 'yellow' : role.id === 'full_stack_developer' ? 'pink' : 'cyan'}-600/20` : 'bg-gray-700'
              }`}>
                {role.icon}
              </div>
              <h3 className="text-xl font-semibold mt-3 mb-1">{role.title}</h3>
              <p className="text-gray-400 text-sm">{role.description}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {role.skills.slice(0, 3).map((skill, idx) => (
                  <span key={idx} className="px-2 py-0.5 bg-gray-800 rounded text-xs text-gray-300">
                    {skill}
                  </span>
                ))}
                {role.skills.length > 3 && (
                  <span className="px-2 py-0.5 bg-gray-800 rounded text-xs text-gray-400">
                    +{role.skills.length - 3}
                  </span>
                )}
              </div>
              {selectedRole?.id === role.id && (
                <div className="mt-3 flex items-center gap-1 text-green-400 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  Selected
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Settings & Start */}
        {selectedRole && (
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 mb-6">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="flex-1 w-full">
                <label className="block text-gray-400 mb-2 text-sm">Programming Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="javascript">JavaScript</option>
                  <option value="python">Python</option>
                  <option value="java">Java</option>
                  <option value="c++">C++</option>
                  <option value="typescript">TypeScript</option>
                  <option value="go">Go</option>
                  <option value="rust">Rust</option>
                </select>
              </div>
              <div className="w-full md:w-auto">
                <label className="block text-gray-400 mb-2 text-sm">Action</label>
                <button
                  onClick={handleStartInterview}
                  disabled={starting}
                  className="w-full md:w-auto px-8 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold"
                >
                  {starting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5" />
                      Start Interview
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center text-sm text-gray-400">
          <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-3">
            <span className="block text-xl mb-1">🎙️</span>
            Voice & Text Input
          </div>
          <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-3">
            <span className="block text-xl mb-1">🤖</span>
            AI Interviewer
          </div>
          <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-3">
            <span className="block text-xl mb-1">📊</span>
            Detailed Feedback
          </div>
        </div>
      </div>
    </div>
  );
}

export default InterviewSelect;