import { useState, useRef, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axiosclient from '../utilis/axiosclient';
import { FiSend, FiUser, FiMessageSquare, FiCode, FiRefreshCw, FiCopy, FiX } from 'react-icons/fi';
import { TbBulb, TbBug, TbChartBar, TbTestPipe } from 'react-icons/tb';

function ChatPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  // Get problem data from location state or fetch it
  const [problem, setProblem] = useState(location.state?.problem || null);
  const [loading, setLoading] = useState(!location.state?.problem);
  const [error, setError] = useState(null);

  // Chat state
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingResponse, setStreamingResponse] = useState('');
  const [activeSuggestion, setActiveSuggestion] = useState(null);
  const [cooldownTimer, setCooldownTimer] = useState(0);

  useEffect(() => {
    if (cooldownTimer <= 0) return;
    const interval = setInterval(() => {
      setCooldownTimer(prev => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownTimer]);

  // UI state
  const [language, setLanguage] = useState('javascript');
  const [theme, setTheme] = useState('dark');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  // Add this state for current code
  const [currentCode, setCurrentCode] = useState('');
  // Refs
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Notification system
  const [notification, setNotification] = useState({
    message: '',
    type: '',
    visible: false
  });

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type, visible: true });
    setTimeout(() => {
      setNotification({ message: '', type: '', visible: false });
    }, 5000);
  };

  // Fetch problem if not passed via state
  useEffect(() => {
    const fetchProblem = async () => {
      if (!location.state?.problem && id) {
        try {
          setLoading(true);
          const response = await axiosclient.get(`/problem/problembyid/${id}`);
          setProblem(response.data);
        } catch (err) {
          setError(err.response?.data || err.message);
          showNotification('Failed to load problem', 'error');
        } finally {
          setLoading(false);
        }
      }
    };

    fetchProblem();
  }, [id, location.state]);

  // Initialize chat with welcome message
  useEffect(() => {
    if (problem && messages.length === 0) {
      const welcomeMessage = {
        id: Date.now(),
        role: 'assistant',
        content: `Hello! I'm your DSA tutor. I can help you with **"${problem.title}"**. 
                I can see you're working in **${location.state?.language || language}**. 
                How can I assist you with this problem?`,
        timestamp: new Date().toISOString()
      };
      setMessages([welcomeMessage]);

      // Set language from passed state if available
      if (location.state?.language) {
        setLanguage(location.state.language);
      }
    }
  }, [problem]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingResponse]);


  useEffect(() => {
    if (location.state?.code) {
      setCurrentCode(location.state.code);
    } else if (problem?.startcode) {
      // Fallback to problem's starter code
      const starter = problem.startcode.find(sc => sc.language === language);
      if (starter) {
        setCurrentCode(starter.initialcode);
      }
    }
  }, [location.state, problem, language]);
  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Predefined suggestions
  // In your ChatPage.jsx, update suggestions:
  const suggestions = [
    {
      id: 1,
      title: 'Review My Code',
      icon: <TbBug className="text-red-500" />,
      prompt: `Can you review my current ${language} code and suggest improvements?`
    },
    {
      id: 2,
      title: 'Debug My Code',
      icon: <TbBulb className="text-yellow-500" />,
      prompt: 'My code isn\'t working. Can you help me debug it?'
    },
    {
      id: 3,
      title: 'Optimize Solution',
      icon: <TbChartBar className="text-green-500" />,
      prompt: 'What\'s the optimal solution for this problem in my language?'
    },
    {
      id: 4,
      title: 'Test My Code',
      icon: <TbTestPipe className="text-blue-500" />,
      prompt: 'What edge cases should I test with my current approach?'
    }
  ];
  // Handle sending a message
  const handleSendMessage = async (customMessage = null) => {
    const messageToSend = customMessage || inputMessage.trim();

    if (!messageToSend || isLoading) return;

    // Add user message to chat
    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: messageToSend,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setStreamingResponse('');

    try {
      // Prepare request body
      // Inside handleSendMessage function, update requestBody:
      const requestBody = {
        message: messageToSend,
        title: problem?.title || '',
        description: problem?.description || '',
        testcases: problem?.visibletestcases?.map(tc =>
          `Input: ${tc.input}\nOutput: ${tc.output}`
        ).join('\n\n') || '',
        startcode: currentCode || '',  // Changed from problem?.startcode... to currentCode
        language: language,             // Explicitly send language
        stream: true
      };

      // Make streaming request using dynamic API URL
      const baseUrl = axiosclient.defaults.baseURL || '';
      const aiEndpoint = baseUrl ? `${baseUrl.replace(/\/$/, '')}/ai/chat` : '/ai/chat';

      const response = await fetch(aiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(axiosclient.defaults.headers?.common?.Authorization
            ? { 'Authorization': axiosclient.defaults.headers.common.Authorization }
            : {})
        },
        credentials: 'include',
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        let errText = `HTTP error! status: ${response.status}`;
        try {
          const errJson = await response.json();
          if (errJson.message) errText = errJson.message;
        } catch (e) {
          // ignore json parse error
        }
        throw new Error(errText);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        fullResponse += chunk;
        setStreamingResponse(fullResponse);
      }

      // Add complete response to messages
      const assistantMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: fullResponse,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);
      setStreamingResponse('');
      showNotification('Response received', 'success');

    } catch (err) {
      console.error('Error sending message:', err);

      const isRateLimit = err.message && (err.message.includes('429') || err.message.includes('rate limit'));
      if (isRateLimit) {
        setCooldownTimer(25);
      }

      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: isRateLimit
          ? "⏳ Gemini Free Tier rate limit reached. Please wait 25 seconds before sending another message."
          : `I apologize, but I encountered an error: ${err.message}. Please try again.`,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, errorMessage]);
      showNotification(isRateLimit ? 'Rate limit reached. Please wait.' : 'Failed to get response', 'error');

    } finally {
      setIsLoading(false);
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion) => {
    setActiveSuggestion(suggestion);
    handleSendMessage(suggestion.prompt);
  };

  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Copy code block
  const handleCopyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      showNotification('Code copied to clipboard!', 'success');
    } catch (err) {
      showNotification('Failed to copy code', 'error');
    }
  };

  // Reset chat
  const handleResetChat = () => {
    if (window.confirm('Are you sure you want to reset the chat?')) {
      setMessages([]);
      setStreamingResponse('');
      showNotification('Chat reset', 'info');
    }
  };

  // Format message content (with code highlighting)
  const formatMessageContent = (content) => {
    if (!content) return null;

    // Split by code blocks
    const parts = content.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      if (part.startsWith('```')) {
        // Extract language and code
        const match = part.match(/```(\w+)?\n([\s\S]*?)```/);
        if (match) {
          const [, lang, code] = match;
          return (
            <div key={index} className="relative my-2">
              <div className="flex justify-between items-center bg-gray-900 px-3 py-1 rounded-t-lg">
                <span className="text-xs text-gray-400">
                  {lang || 'code'}
                </span>
                <button
                  onClick={() => handleCopyCode(code.trim())}
                  className="text-gray-400 hover:text-white text-sm"
                  title="Copy code"
                >
                  <FiCopy />
                </button>
              </div>
              <pre className="bg-black p-3 rounded-b-lg overflow-x-auto text-sm">
                <code className={`language-${lang}`}>
                  {code.trim()}
                </code>
              </pre>
            </div>
          );
        }
      }
      // Regular text with markdown-like formatting
      const formattedText = part
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code class="bg-gray-800 px-1 rounded">$1</code>');

      return (
        <div
          key={index}
          className="whitespace-pre-wrap"
          dangerouslySetInnerHTML={{ __html: formattedText }}
        />
      );
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p>Loading AI Tutor...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !problem) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white p-4">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate(`/problem/${id}`)}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition flex items-center mb-6"
          >
            ← Back to Problem
          </button>
          <div className="bg-red-900/30 border border-red-700 rounded-xl p-6 text-center">
            <div className="text-4xl mb-4">❌</div>
            <h2 className="text-xl font-bold mb-3">Unable to Load AI Tutor</h2>
            <p className="text-gray-300 mb-4">
              {error || "Problem data is required to start the AI tutor."}
            </p>
            <button
              onClick={() => navigate(`/problem/${id}`)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
            >
              Go to Problem
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      {/* Notification */}
      {notification.visible && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg max-w-xs transition-all duration-300 text-sm ${notification.type === 'success' ? 'bg-green-900/30 border border-green-700 text-green-400' :
            notification.type === 'error' ? 'bg-red-900/30 border border-red-700 text-red-400' :
              'bg-blue-900/30 border border-blue-700 text-blue-400'
          }`}>
          <div className="flex items-center justify-between">
            <span>{notification.message}</span>
            <button
              onClick={() => setNotification({ ...notification, visible: false })}
              className="ml-2 text-gray-400 hover:text-white"
            >
              <FiX />
            </button>
          </div>
        </div>
      )}

      <div className="flex h-screen">
        {/* Sidebar (Expanded Width: 420px for Full Text Visibility) */}
        <div className={`${isSidebarOpen ? 'w-96 lg:w-[420px] flex-shrink-0' : 'w-0'} transition-all duration-300 bg-gray-900/70 border-r border-gray-800 overflow-hidden`}>
          <div className="p-4 h-full flex flex-col min-w-[380px] lg:min-w-[400px] overflow-y-auto">
            {/* Problem Info */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-bold text-gray-100 break-words pr-2">{problem.title}</h2>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-1 text-gray-400 hover:text-white rounded transition flex-shrink-0"
                  title="Close Sidebar"
                >
                  <FiX />
                </button>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <span className={`px-2.5 py-1 rounded text-xs font-semibold ${problem.difficulty === 'easy' ? 'bg-green-900/40 text-green-400 border border-green-700/50' :
                    problem.difficulty === 'medium' ? 'bg-yellow-900/40 text-yellow-400 border border-yellow-700/50' :
                      'bg-red-900/40 text-red-400 border border-red-700/50'
                  }`}>
                  {problem.difficulty}
                </span>
                <span className="px-2.5 py-1 rounded text-xs bg-gray-800 text-gray-300 border border-gray-700">
                  {problem.tags}
                </span>
              </div>
              <div className="max-h-32 overflow-y-auto pr-1 text-xs text-gray-300 leading-relaxed bg-gray-950/40 p-2.5 rounded-lg border border-gray-800">
                {problem.description}
              </div>
            </div>

            {/* Quick Suggestions */}
            <div className="mb-5">
              <h3 className="text-xs font-bold uppercase tracking-wider mb-2.5 text-gray-400">Quick Help & Prompts</h3>
              <div className="space-y-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    onClick={() => handleSuggestionClick(suggestion)}
                    disabled={isLoading || activeSuggestion?.id === suggestion.id}
                    className={`w-full text-left p-3 rounded-lg transition-all flex items-start gap-3 ${activeSuggestion?.id === suggestion.id
                        ? 'bg-blue-600/20 border border-blue-600'
                        : 'bg-gray-800/60 hover:bg-gray-800 border border-gray-700'
                      } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="text-xl mt-0.5 flex-shrink-0">{suggestion.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-gray-200 mb-0.5">{suggestion.title}</div>
                      <div className="text-xs text-gray-300 leading-normal whitespace-normal">{suggestion.prompt}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Actions */}
            <div className="mt-auto">
              <div className="flex gap-2 mb-4">
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-gray-200 outline-none focus:border-blue-500"
                >
                  <option value="javascript">JavaScript</option>
                  <option value="java">Java</option>
                  <option value="c++">C++</option>
                </select>
                <button
                  onClick={handleResetChat}
                  className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded transition flex items-center text-gray-300"
                  title="Reset Chat"
                >
                  <FiRefreshCw />
                </button>
              </div>
              <button
                onClick={() => navigate(`/problem/${id}`)}
                className="w-full px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition flex items-center justify-center gap-2 text-gray-200"
              >
                <FiCode />
                Back to Problem
              </button>
            </div>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-900/40">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 hover:bg-gray-800 rounded-lg transition text-gray-300"
                title={isSidebarOpen ? "Hide Problem Panel" : "Show Problem Panel"}
              >
                <FiMessageSquare />
              </button>
              <div>
                <h1 className="text-xl font-bold">DSA AI Tutor</h1>
                <p className="text-sm text-gray-400">
                  Helping you solve: <span className="text-blue-400">{problem.title}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-xs text-gray-400">Student</p>
                <p className="text-sm font-medium">{user?.firstname || 'User'}</p>
              </div>
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <FiUser />
              </div>
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  {/* Avatar */}
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${message.role === 'user'
                      ? 'bg-blue-600'
                      : 'bg-purple-600'
                    }`}>
                    {message.role === 'user' ? <FiUser /> : <FiMessageSquare />}
                  </div>

                  {/* Message Bubble */}
                  <div className={`max-w-[80%] rounded-xl p-4 ${message.role === 'user'
                      ? 'bg-blue-600/20 border border-blue-700'
                      : 'bg-gray-800/50 border border-gray-700'
                    }`}>
                    <div className="mb-2">
                      {formatMessageContent(message.content)}
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(message.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
              ))}

              {/* Streaming Response */}
              {streamingResponse && (
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-purple-600">
                    <FiMessageSquare /> {/* ✅ FIXED: Changed from <FiBot /> */}
                  </div>
                  <div className="max-w-[80%] rounded-xl p-4 bg-gray-800/50 border border-gray-700">
                    <div className="mb-2">
                      {formatMessageContent(streamingResponse)}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                      <div className="text-xs text-gray-400">AI is typing...</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Empty State */}
              {messages.length === 0 && !streamingResponse && (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🤖</div>
                  <h3 className="text-xl font-bold mb-2">Welcome to DSA AI Tutor</h3>
                  <p className="text-gray-400 mb-6">
                    I can help you understand and solve this problem. Try asking for hints or code review!
                  </p>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-gray-800">
            <div className="max-w-3xl mx-auto">
              {cooldownTimer > 0 && (
                <div className="mb-3 p-3 bg-amber-950/60 border border-amber-500/30 rounded-lg text-amber-300 text-xs flex items-center justify-between shadow-sm">
                  <span>⏳ Gemini Free Tier rate limit reached. Please wait <strong>{cooldownTimer}s</strong> before sending next message.</span>
                </div>
              )}
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={cooldownTimer > 0 ? `Please wait ${cooldownTimer}s for rate limit to reset...` : "Ask your DSA question or paste your code..."}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none disabled:opacity-60"
                    rows="2"
                    disabled={isLoading || cooldownTimer > 0}
                  />
                  <div className="absolute bottom-2 right-2 flex items-center gap-2">
                    {isLoading && (
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                        Thinking...
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleSendMessage()}
                  disabled={!inputMessage.trim() || isLoading || cooldownTimer > 0}
                  className={`px-6 py-3 rounded-lg transition flex items-center gap-2 ${!inputMessage.trim() || isLoading || cooldownTimer > 0
                      ? 'bg-gray-800 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                >
                  <FiSend />
                  {cooldownTimer > 0 ? `${cooldownTimer}s` : 'Send'}
                </button>
              </div>
              <div className="mt-2 text-xs text-gray-400">
                Press Enter to send, Shift+Enter for new line
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatPage;