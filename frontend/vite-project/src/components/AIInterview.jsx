// src/components/AIInterview.jsx - Updated with better audio controls
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axiosclient from '../utilis/axiosclient';
import { 
  Mic, MicOff, Play, Pause, Volume2, VolumeX, 
  Send, Code, CheckCircle, XCircle, Loader2,
  ArrowLeft, Clock, Award, FileText, AlertCircle
} from 'lucide-react';

function AIInterview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  
  // State
  const [interview, setInterview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [code, setCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isInterviewMode, setIsInterviewMode] = useState(true); // true = general interview
  const [audioSupported, setAudioSupported] = useState(true);
  const [recordingError, setRecordingError] = useState(null);
  
  // Refs
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  
  // Get interview details
  useEffect(() => {
    fetchInterviewDetails();
  }, [id]);
  
  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);
  
  // Initialize Speech Recognition
  useEffect(() => {
    // Check if browser supports speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setAudioSupported(false);
      console.warn('Speech recognition not supported in this browser');
      return;
    }
    
    try {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.maxAlternatives = 1;
      
      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        if (finalTranscript) {
          setMessage(finalTranscript);
          // Auto-send after a short delay
          setTimeout(() => {
            handleSendMessage(finalTranscript);
            setMessage('');
          }, 500);
        } else if (interimTranscript) {
          setTranscript(interimTranscript);
        }
      };
      
      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setRecordingError(`Speech error: ${event.error}`);
        setIsRecording(false);
        
        // Handle specific errors
        if (event.error === 'not-allowed') {
          alert('Please allow microphone access to use voice input.');
        }
      };
      
      recognitionRef.current.onend = () => {
        setIsRecording(false);
        setTranscript('');
      };
      
    } catch (err) {
      console.error('Speech recognition init error:', err);
      setAudioSupported(false);
    }
    
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);
  
  const fetchInterviewDetails = async () => {
    try {
      setLoading(true);
      const response = await axiosclient.get(`/interview/${id}`);
      setInterview(response.data.interview);
      setConversation(response.data.interview.conversation || []);
      setCode(response.data.interview.code || '');
      setIsInterviewMode(response.data.interview.isGeneralMode !== false);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load interview');
      setLoading(false);
    }
  };
  
  const handleSendMessage = async (msg) => {
    if (!msg || !msg.trim()) return;
    
    const messageToSend = msg.trim();
    setMessage('');
    setTranscript('');
    
    // Add user message locally
    setConversation(prev => [
      ...prev,
      { role: 'user', message: messageToSend, timestamp: new Date() }
    ]);
    
    try {
      const response = await axiosclient.post(`/interview/${id}/message`, {
        message: messageToSend,
        code: code
      });
      
      const aiReply = response.data.response || response.data.message;
      if (aiReply) {
        setConversation(prev => [
          ...prev,
          { role: 'ai', message: aiReply, timestamp: new Date() }
        ]);
        speakText(aiReply);
      }
      
    } catch (err) {
      console.error('Send message error:', err);
      setConversation(prev => [
        ...prev,
        { role: 'system', message: 'Error: Could not get response. Please try again.', timestamp: new Date() }
      ]);
    }
  };
  
  const handleSubmit = async () => {
    if (!code.trim()) {
      alert('Please write your code before submitting.');
      return;
    }
    
    if (!window.confirm('Submit your solution for evaluation?')) return;
    
    setIsSubmitting(true);
    
    try {
      const response = await axiosclient.post(`/interview/${id}/submit`, {
        code: code,
        language: interview?.language || 'javascript'
      });
      
      alert(`Interview Complete!\nScore: ${response.data.evaluation.score}/${response.data.evaluation.maxScore}\n\nFeedback: ${response.data.evaluation.feedback}`);
      
      navigate('/interviews');
    } catch (err) {
      console.error('Submit error:', err);
      alert(err.response?.data?.message || 'Failed to submit solution');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const toggleRecording = () => {
    if (!audioSupported) {
      alert('Voice recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }
    
    if (isRecording) {
      try {
        recognitionRef.current?.stop();
      } catch (e) {}
      setIsRecording(false);
      setRecordingError(null);
    } else {
      try {
        // Request microphone permission
        navigator.mediaDevices.getUserMedia({ audio: true })
          .then(() => {
            recognitionRef.current?.start();
            setIsRecording(true);
            setTranscript('Listening... Speak now');
            setRecordingError(null);
          })
          .catch((err) => {
            console.error('Microphone permission denied:', err);
            setRecordingError('Microphone access denied. Please allow microphone access.');
            alert('Please allow microphone access to use voice input.');
          });
      } catch (err) {
        console.error('Start recording error:', err);
        setRecordingError('Failed to start recording');
      }
    }
  };
  
  const speakText = (text) => {
    if (!text) return;
    const synth = window.speechSynthesis || synthRef.current;
    if (!synth) return;
    
    try {
      synth.cancel();
    } catch (e) {}
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    const voices = synth.getVoices();
    if (voices && voices.length > 0) {
      const preferredVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('David') || v.name.includes('Zira'))) || voices.find(v => v.lang.startsWith('en')) || voices[0];
      if (preferredVoice) utterance.voice = preferredVoice;
    }
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = (err) => {
      console.warn('Speech error:', err);
      setIsSpeaking(false);
    };
    
    try {
      synth.speak(utterance);
    } catch (err) {
      console.warn('Speech synthesis failed:', err);
    }
  };
  
  const stopSpeaking = () => {
    try {
      synthRef.current.cancel();
    } catch (e) {}
    setIsSpeaking(false);
  };
  
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-400">Loading interview...</p>
        </div>
      </div>
    );
  }
  
  if (error || !interview) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white p-8">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate('/interviews')}
            className="mb-6 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Interviews
          </button>
          <div className="bg-red-900/30 border border-red-700 rounded-xl p-6 text-center">
            <div className="text-4xl mb-4">❌</div>
            <h2 className="text-xl font-bold mb-3">Interview Not Found</h2>
            <p className="text-gray-400">{error || 'The interview you\'re looking for doesn\'t exist.'}</p>
          </div>
        </div>
      </div>
    );
  }
  
  const problem = interview.problem || {};
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      <div className="max-w-6xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <button
              onClick={() => navigate('/interviews')}
              className="mb-2 px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded-lg transition flex items-center gap-1 text-sm"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Mic className="w-6 h-6 text-purple-400" />
              AI Interview
            </h1>
            {isInterviewMode ? (
              <p className="text-gray-400 text-sm mt-1">General coding interview - No specific problem</p>
            ) : (
              <div className="flex items-center gap-3 mt-1">
                <span className="text-gray-400">Problem: {problem.title}</span>
                <span className={`px-2 py-1 rounded text-xs ${
                  problem.difficulty === 'easy' ? 'bg-green-900/30 text-green-400' :
                  problem.difficulty === 'medium' ? 'bg-yellow-900/30 text-yellow-400' :
                  'bg-red-900/30 text-red-400'
                }`}>
                  {problem.difficulty}
                </span>
              </div>
            )}
            {interview.status === 'in_progress' && (
              <span className="inline-block px-2 py-1 bg-green-900/30 text-green-400 rounded text-xs mt-1">
                In Progress
              </span>
            )}
            {interview.status === 'completed' && (
              <span className="inline-block px-2 py-1 bg-blue-900/30 text-blue-400 rounded text-xs mt-1">
                Completed
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-400">
              <Clock className="w-4 h-4 inline mr-1" />
              {formatTime(interview.timeSpent || 0)}
            </div>
            <button
              onClick={() => setShowCode(!showCode)}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition flex items-center gap-2 text-sm"
            >
              <Code className="w-4 h-4" />
              {showCode ? 'Hide Code' : 'Show Code'}
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chat Area */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden h-[550px] flex flex-col">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {conversation.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <div className="text-6xl mb-4">🤖</div>
                    <p className="text-lg font-medium">Welcome to your AI Interview!</p>
                    <p className="text-sm mt-2">Click the microphone button 🎤 to start speaking</p>
                    <p className="text-xs text-gray-500 mt-1">Or type your message below</p>
                  </div>
                ) : (
                  conversation.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                    >
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        msg.role === 'user' ? 'bg-blue-600' : msg.role === 'ai' ? 'bg-purple-600' : 'bg-gray-600'
                      }`}>
                        {msg.role === 'user' ? '👤' : msg.role === 'ai' ? '🤖' : 'ℹ️'}
                      </div>
                      <div className={`max-w-[80%] rounded-xl p-4 ${
                        msg.role === 'user'
                          ? 'bg-blue-600/20 border border-blue-700'
                          : msg.role === 'ai'
                            ? 'bg-purple-900/20 border border-purple-700'
                            : 'bg-yellow-900/20 border border-yellow-700'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                        <div className="flex items-center justify-between text-xs text-gray-400 mt-2 gap-4">
                          <span>{msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : ''}</span>
                          {msg.role === 'ai' && (
                            <button
                              onClick={() => speakText(msg.message)}
                              className="text-purple-400 hover:text-purple-300 px-2 py-0.5 rounded bg-purple-950/80 hover:bg-purple-900 transition flex items-center gap-1 text-xs border border-purple-800"
                              title="Listen to interviewer voice"
                            >
                              <Volume2 className="w-3.5 h-3.5 text-purple-400" />
                              <span>Listen</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                {/* Voice recognition interim transcript */}
                {isRecording && transcript && (
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                      👤
                    </div>
                    <div className="max-w-[80%] rounded-xl p-4 bg-blue-600/10 border border-blue-700/50">
                      <p className="text-sm text-gray-400 italic">{transcript}</p>
                      <div className="text-xs text-red-400 mt-1 flex items-center gap-1">
                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                        Recording...
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              
              {/* Input Area */}
              {interview.status === 'in_progress' && (
                <div className="border-t border-gray-700 p-4">
                  <div className="flex gap-3">
                    {/* Voice Input Button - More prominent */}
                    <button
                      onClick={toggleRecording}
                      className={`px-6 py-3 rounded-xl transition flex items-center gap-2 font-medium ${
                        isRecording
                          ? 'bg-red-600 hover:bg-red-700 animate-pulse'
                          : 'bg-purple-600 hover:bg-purple-700'
                      }`}
                      title={isRecording ? 'Stop recording' : 'Start speaking'}
                    >
                      {isRecording ? (
                        <>
                          <MicOff className="w-5 h-5" />
                          Stop
                        </>
                      ) : (
                        <>
                          <Mic className="w-5 h-5" />
                          Speak
                        </>
                      )}
                    </button>
                    
                    {/* Text Input */}
                    <input
                      ref={inputRef}
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && message.trim()) {
                          handleSendMessage(message);
                        }
                      }}
                      placeholder={isRecording ? 'Listening...' : 'Type your message...'}
                      className="flex-1 px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                      disabled={isRecording}
                    />
                    
                    {/* Send Button */}
                    <button
                      onClick={() => handleSendMessage(message)}
                      disabled={!message.trim() || isRecording}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <Send className="w-5 h-5" />
                      Send
                    </button>
                  </div>
                  
                  {/* Voice Status */}
                  {isRecording && (
                    <div className="mt-2 text-sm text-red-400 flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      Recording... Speak clearly
                      <button
                        onClick={toggleRecording}
                        className="ml-2 px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-xs"
                      >
                        Stop Recording
                      </button>
                    </div>
                  )}
                  
                  {recordingError && (
                    <div className="mt-2 text-sm text-yellow-400 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      {recordingError}
                    </div>
                  )}
                  
                  {/* Speaking Status */}
                  {isSpeaking && (
                    <div className="mt-2 text-sm text-green-400 flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      AI is speaking...
                      <button
                        onClick={stopSpeaking}
                        className="ml-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs"
                      >
                        Stop
                      </button>
                    </div>
                  )}
                  
                  {/* Audio Support Warning */}
                  {!audioSupported && (
                    <div className="mt-2 text-sm text-yellow-400 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Voice input not supported in this browser. Please use Chrome or Edge for voice features.
                    </div>
                  )}
                </div>
              )}
              
              {/* Completed Status */}
              {interview.status === 'completed' && (
                <div className="border-t border-gray-700 p-4 bg-blue-900/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-blue-400">Interview Completed</h3>
                      <p className="text-sm text-gray-400">Score: {interview.score}/{interview.maxScore}</p>
                    </div>
                    <button
                      onClick={() => navigate(`/problem/${problem._id}`)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
                    >
                      View Problem
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Sidebar */}
          <div className="space-y-4">
            {/* Voice Controls Card */}
            <div className="bg-purple-900/20 border border-purple-700 rounded-xl p-4">
              <h3 className="font-semibold text-purple-400 mb-3 flex items-center gap-2">
                <Mic className="w-4 h-4" />
                Voice Controls
              </h3>
              <div className="space-y-2">
                <button
                  onClick={toggleRecording}
                  className={`w-full py-3 rounded-lg transition flex items-center justify-center gap-2 font-medium ${
                    isRecording
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-purple-600 hover:bg-purple-700'
                  }`}
                >
                  {isRecording ? (
                    <>
                      <MicOff className="w-5 h-5" />
                      Stop Recording
                    </>
                  ) : (
                    <>
                      <Mic className="w-5 h-5" />
                      Start Speaking
                    </>
                  )}
                </button>
                {isSpeaking && (
                  <button
                    onClick={stopSpeaking}
                    className="w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition text-sm flex items-center justify-center gap-2"
                  >
                    <VolumeX className="w-4 h-4" />
                    Stop AI Speaking
                  </button>
                )}
                <p className="text-xs text-gray-400 text-center">
                  {isRecording ? '🔴 Recording... Speak clearly' : '🎤 Click to speak'}
                </p>
              </div>
            </div>
            
            {/* Problem Info */}
            {!isInterviewMode && (
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Problem
                </h3>
                <p className="text-sm text-gray-300">{problem.title}</p>
                <p className="text-xs text-gray-400 mt-1 capitalize">{problem.difficulty}</p>
              </div>
            )}
            
            {/* Code Editor */}
            {showCode && (
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                <h3 className="font-semibold mb-3">Your Code</h3>
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Write your solution here..."
                  rows="6"
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white font-mono text-sm resize-none"
                />
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || interview.status === 'completed'}
                  className="w-full mt-3 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Evaluating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Submit Solution
                    </>
                  )}
                </button>
              </div>
            )}
            
            {/* Tips */}
            <div className="bg-yellow-900/20 border border-yellow-700 rounded-xl p-4">
              <h4 className="font-semibold text-yellow-400 mb-2">Interview Tips</h4>
              <ul className="text-xs text-gray-300 space-y-1">
                <li>• 🎤 Click "Speak" to use voice</li>
                <li>• 💬 Explain your thought process</li>
                <li>• 📝 You can type if you prefer</li>
                <li>• 🔄 The AI will respond naturally</li>
                <li>• ✅ Click "Submit Solution" to finish</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AIInterview;