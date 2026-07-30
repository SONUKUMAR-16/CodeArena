// src/components/AIInterview.jsx - Updated with End Interview & AI Scorecard Modal
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-[#redux]' || 'react-redux';
import axiosclient from '../utilis/axiosclient';
import { 
  Mic, MicOff, Play, Pause, Volume2, VolumeX, 
  Send, Code, CheckCircle, XCircle, Loader2,
  ArrowLeft, Clock, Award, FileText, AlertCircle,
  Flag, Sparkles, TrendingUp, Target, BarChart2, X
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
  const [isInterviewMode, setIsInterviewMode] = useState(true);
  const [audioSupported, setAudioSupported] = useState(true);
  const [recordingError, setRecordingError] = useState(null);
  
  // Evaluation Modal State
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [showEvaluationModal, setShowEvaluationModal] = useState(false);
  
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
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setAudioSupported(false);
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
          setTimeout(() => {
            handleSendMessage(finalTranscript);
            setMessage('');
          }, 500);
        } else if (interimTranscript) {
          setTranscript(interimTranscript);
        }
      };
      
      recognitionRef.current.onerror = (event) => {
        setRecordingError(`Speech error: ${event.error}`);
        setIsRecording(false);
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
        try { recognitionRef.current.stop(); } catch (e) {}
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
      if (response.data.interview.evaluation) {
        setEvaluationResult(response.data.interview.evaluation);
      }
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
  
  const handleEndInterview = async () => {
    const userTurns = conversation.filter(m => m.role === 'user').length;
    if (userTurns === 0) {
      if (!window.confirm('You have not answered any questions yet. End interview anyway?')) return;
    } else {
      if (!window.confirm('End interview now and generate your AI performance evaluation scorecard?')) return;
    }
    
    setIsSubmitting(true);
    try {
      const response = await axiosclient.post(`/interview/${id}/submit`, {
        code: code,
        language: interview?.language || 'javascript'
      });
      
      const evalData = response.data.evaluation || response.data.interview?.evaluation;
      setEvaluationResult(evalData);
      setShowEvaluationModal(true);
      fetchInterviewDetails();
    } catch (err) {
      console.error('End interview error:', err);
      alert(err.response?.data?.message || 'Failed to submit and evaluate interview');
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
      try { recognitionRef.current?.stop(); } catch (e) {}
      setIsRecording(false);
      setRecordingError(null);
    } else {
      try {
        navigator.mediaDevices.getUserMedia({ audio: true })
          .then(() => {
            recognitionRef.current?.start();
            setIsRecording(true);
            setTranscript('Listening... Speak now');
            setRecordingError(null);
          })
          .catch((err) => {
            setRecordingError('Microphone access denied. Please allow microphone access.');
            alert('Please allow microphone access to use voice input.');
          });
      } catch (err) {
        setRecordingError('Failed to start recording');
      }
    }
  };
  
  const speakText = (text) => {
    if (!text) return;
    const synth = window.speechSynthesis || synthRef.current;
    if (!synth) return;
    
    try { synth.cancel(); } catch (e) {}
    
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
    utterance.onerror = () => setIsSpeaking(false);
    
    try { synth.speak(utterance); } catch (err) {}
  };
  
  const stopSpeaking = () => {
    try { synthRef.current.cancel(); } catch (e) {}
    setIsSpeaking(false);
  };
  
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getScoreColor = (score) => {
    if (score >= 85) return 'from-emerald-500 to-teal-600 text-emerald-400 border-emerald-500';
    if (score >= 70) return 'from-blue-500 to-indigo-600 text-blue-400 border-blue-500';
    if (score >= 50) return 'from-yellow-500 to-amber-600 text-yellow-400 border-yellow-500';
    return 'from-rose-500 to-red-600 text-rose-400 border-rose-500';
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading interview session...</p>
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
            <p className="text-gray-400">{error || 'The interview you are looking for does not exist.'}</p>
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
              className="mb-2 px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded-lg transition flex items-center gap-1 text-sm text-gray-300 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Mic className="w-6 h-6 text-purple-400" />
              AI Interview Session
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2.5 py-0.5 bg-purple-900/40 border border-purple-700/60 text-purple-300 rounded-md text-xs capitalize font-medium">
                {interview.role?.replace('_', ' ')}
              </span>
              {interview.status === 'in_progress' && (
                <span className="px-2 py-0.5 bg-emerald-900/40 text-emerald-400 border border-emerald-700/60 rounded text-xs">
                  ● In Progress
                </span>
              )}
              {interview.status === 'completed' && (
                <span className="px-2 py-0.5 bg-blue-900/40 text-blue-400 border border-blue-700/60 rounded text-xs">
                  ✓ Evaluated & Completed
                </span>
              )}
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-sm text-gray-400 bg-gray-800/80 px-3 py-1.5 rounded-lg border border-gray-700 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-purple-400" />
              {formatTime(interview.timeSpent || 0)}
            </div>
            
            <button
              onClick={() => setShowCode(!showCode)}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition flex items-center gap-2 text-sm border border-gray-700"
            >
              <Code className="w-4 h-4 text-blue-400" />
              {showCode ? 'Hide Code' : 'Show Code'}
            </button>

            {/* End Interview Button */}
            {interview.status === 'in_progress' ? (
              <button
                onClick={handleEndInterview}
                disabled={isSubmitting}
                className="px-5 py-2 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white rounded-lg font-semibold transition flex items-center gap-2 text-sm shadow-lg shadow-red-900/30 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Flag className="w-4 h-4" />
                )}
                End Interview & Get Score
              </button>
            ) : (
              <button
                onClick={() => setShowEvaluationModal(true)}
                className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg font-semibold transition flex items-center gap-2 text-sm shadow-lg shadow-emerald-900/30"
              >
                <Award className="w-4 h-4" />
                View AI Scorecard
              </button>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chat Area */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden h-[580px] flex flex-col shadow-xl">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {conversation.length === 0 ? (
                  <div className="text-center py-16 text-gray-400">
                    <div className="text-6xl mb-4">🤖</div>
                    <p className="text-lg font-semibold text-white">Welcome to your AI Technical Interview!</p>
                    <p className="text-sm mt-2 text-gray-300">Click <span className="text-purple-400 font-semibold">Speak</span> to answer using your microphone 🎤</p>
                    <p className="text-xs text-gray-500 mt-1">Or type your response in the box below</p>
                  </div>
                ) : (
                  conversation.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                    >
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                        msg.role === 'user' ? 'bg-blue-600 text-white' : msg.role === 'ai' ? 'bg-purple-600 text-white' : 'bg-gray-600'
                      }`}>
                        {msg.role === 'user' ? '👤' : msg.role === 'ai' ? '🤖' : 'ℹ️'}
                      </div>
                      <div className={`max-w-[82%] rounded-xl p-4 shadow-md ${
                        msg.role === 'user'
                          ? 'bg-blue-600/20 border border-blue-600/40 text-blue-50'
                          : msg.role === 'ai'
                            ? 'bg-purple-900/25 border border-purple-700/50 text-purple-50'
                            : 'bg-yellow-900/20 border border-yellow-700/40 text-yellow-100'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                        <div className="flex items-center justify-between text-xs text-gray-400 mt-2 gap-4">
                          <span>{msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : ''}</span>
                          {msg.role === 'ai' && (
                            <button
                              onClick={() => speakText(msg.message)}
                              className="text-purple-300 hover:text-white px-2 py-0.5 rounded bg-purple-950/90 hover:bg-purple-900 transition flex items-center gap-1 text-xs border border-purple-700/60"
                              title="Listen to interviewer"
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
                      <p className="text-sm text-gray-300 italic">{transcript}</p>
                      <div className="text-xs text-red-400 mt-1 flex items-center gap-1">
                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                        Listening...
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              
              {/* Input Area */}
              {interview.status === 'in_progress' && (
                <div className="border-t border-gray-700/80 p-4 bg-gray-900/60">
                  <div className="flex gap-3">
                    {/* Voice Input Button */}
                    <button
                      onClick={toggleRecording}
                      className={`px-5 py-3 rounded-xl transition flex items-center gap-2 font-medium shadow-md ${
                        isRecording
                          ? 'bg-red-600 hover:bg-red-700 animate-pulse text-white'
                          : 'bg-purple-600 hover:bg-purple-700 text-white'
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
                      placeholder={isRecording ? 'Listening...' : 'Type your answer or topic discussion...'}
                      className="flex-1 px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm"
                      disabled={isRecording}
                    />
                    
                    {/* Send Button */}
                    <button
                      onClick={() => handleSendMessage(message)}
                      disabled={!message.trim() || isRecording}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm shadow-md"
                    >
                      <Send className="w-4 h-4" />
                      Send
                    </button>
                  </div>
                  
                  {/* Speaking Status */}
                  {isSpeaking && (
                    <div className="mt-2 text-sm text-green-400 flex items-center justify-between bg-green-950/40 px-3 py-1.5 rounded-lg border border-green-800/60">
                      <span className="flex items-center gap-2 text-xs">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        AI Interviewer is speaking...
                      </span>
                      <button
                        onClick={stopSpeaking}
                        className="px-2.5 py-0.5 bg-green-900 hover:bg-green-800 text-white rounded text-xs"
                      >
                        Stop Audio
                      </button>
                    </div>
                  )}
                </div>
              )}
              
              {/* Completed Status */}
              {interview.status === 'completed' && (
                <div className="border-t border-gray-700 p-4 bg-gradient-to-r from-purple-900/30 to-blue-900/30 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-purple-300 flex items-center gap-2">
                      <Award className="w-4 h-4 text-yellow-400" />
                      Interview Completed & Evaluated
                    </h3>
                    <p className="text-xs text-gray-300 mt-0.5">
                      Score: <span className="font-bold text-emerald-400">{interview.score || evaluationResult?.score || 0}/100</span>
                    </p>
                  </div>
                  <button
                    onClick={() => setShowEvaluationModal(true)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition text-xs font-semibold text-white shadow-md flex items-center gap-1.5"
                  >
                    <Award className="w-3.5 h-3.5" />
                    Open AI Scorecard
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* Sidebar */}
          <div className="space-y-4">
            {/* End Interview Action Card */}
            {interview.status === 'in_progress' && (
              <div className="bg-gradient-to-br from-purple-900/40 via-gray-800/60 to-gray-800/50 border border-purple-700/60 rounded-xl p-5 shadow-lg">
                <h3 className="font-semibold text-purple-300 mb-2 flex items-center gap-2">
                  <Award className="w-5 h-5 text-yellow-400" />
                  Evaluate & Complete
                </h3>
                <p className="text-xs text-gray-300 mb-4 leading-relaxed">
                  Ready to finish? Click below to end your session and receive an instant AI score, strengths, and role performance evaluation!
                </p>
                <button
                  onClick={handleEndInterview}
                  disabled={isSubmitting}
                  className="w-full py-3 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white rounded-xl font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-red-900/40 disabled:opacity-50 text-sm"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Flag className="w-4 h-4" />
                  )}
                  End Interview & Get AI Points
                </button>
              </div>
            )}

            {/* Voice Controls Card */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
              <h3 className="font-semibold text-purple-400 mb-3 flex items-center gap-2 text-sm">
                <Mic className="w-4 h-4" />
                Voice Controls
              </h3>
              <div className="space-y-2">
                <button
                  onClick={toggleRecording}
                  disabled={interview.status === 'completed'}
                  className={`w-full py-2.5 rounded-lg transition flex items-center justify-center gap-2 text-xs font-semibold ${
                    isRecording
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-purple-600 hover:bg-purple-700 text-white'
                  }`}
                >
                  {isRecording ? (
                    <>
                      <MicOff className="w-4 h-4" />
                      Stop Mic
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4" />
                      Start Mic
                    </>
                  )}
                </button>
                {isSpeaking && (
                  <button
                    onClick={stopSpeaking}
                    className="w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition text-xs flex items-center justify-center gap-1.5 text-gray-300"
                  >
                    <VolumeX className="w-4 h-4" />
                    Stop AI Voice
                  </button>
                )}
              </div>
            </div>

            {/* Code Editor */}
            {showCode && (
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                <h3 className="font-semibold mb-3 text-sm flex items-center gap-2">
                  <Code className="w-4 h-4 text-blue-400" />
                  Code Scratchpad
                </h3>
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Write your code solution here..."
                  rows="6"
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white font-mono text-xs resize-none"
                />
              </div>
            )}
            
            {/* Tips */}
            <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-xl p-4">
              <h4 className="font-semibold text-yellow-400 mb-2 text-xs flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                Interview Tips
              </h4>
              <ul className="text-xs text-gray-300 space-y-1.5">
                <li>• 🎤 Click <span className="text-purple-400 font-medium">Speak</span> to answer using voice</li>
                <li>• 💬 Explain your thought process & trade-offs</li>
                <li>• 🏁 Click <span className="text-red-400 font-medium">End Interview</span> when finished to calculate your AI Score!</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* AI Scorecard & Performance Evaluation Modal */}
      {showEvaluationModal && evaluationResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-gray-900 border border-purple-500/40 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 shadow-2xl relative">
            <button
              onClick={() => setShowEvaluationModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header / Score Badge */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-900/50 border border-purple-500/40 rounded-full text-purple-300 text-xs font-semibold uppercase tracking-wider mb-3">
                <Award className="w-4 h-4 text-yellow-400" />
                AI Interview Scorecard
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-white">
                {evaluationResult.score >= 80 ? '🎉 Outstanding Performance!' : evaluationResult.score >= 65 ? '👏 Great Effort!' : '💪 Solid Practice Session'}
              </h2>
              <p className="text-xs text-gray-400 mt-1 capitalize">
                Role: {interview?.role?.replace('_', ' ')}
              </p>
            </div>

            {/* Main Score Display */}
            <div className="bg-gradient-to-br from-gray-800/80 via-purple-950/30 to-gray-800/80 border border-purple-600/30 rounded-xl p-6 mb-6 flex flex-col md:flex-row items-center justify-around gap-6 text-center md:text-left">
              <div className="flex items-center gap-4">
                <div className="relative flex items-center justify-center w-24 h-24 rounded-full bg-gray-900 border-4 border-purple-500 shadow-lg shadow-purple-900/50">
                  <div className="text-center">
                    <span className="text-3xl font-black text-emerald-400">{evaluationResult.score}</span>
                    <span className="text-xs text-gray-400 block font-medium">/ 100</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Performance Grade</div>
                  <div className="text-3xl font-black text-purple-300">{evaluationResult.grade || (evaluationResult.score >= 80 ? 'A' : 'B')}</div>
                </div>
              </div>

              {/* Category Breakdown */}
              {evaluationResult.categoryScores && (
                <div className="w-full md:w-64 space-y-2 text-xs">
                  <div>
                    <div className="flex justify-between text-gray-300 mb-1">
                      <span>Technical Knowledge</span>
                      <span className="font-semibold text-purple-300">{evaluationResult.categoryScores.technical || 20}/25</span>
                    </div>
                    <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                      <div className="bg-purple-500 h-full rounded-full" style={{ width: `${((evaluationResult.categoryScores.technical || 20) / 25) * 100}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-gray-300 mb-1">
                      <span>Communication</span>
                      <span className="font-semibold text-blue-300">{evaluationResult.categoryScores.communication || 20}/25</span>
                    </div>
                    <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                      <div className="bg-blue-500 h-full rounded-full" style={{ width: `${((evaluationResult.categoryScores.communication || 20) / 25) * 100}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-gray-300 mb-1">
                      <span>Problem Solving</span>
                      <span className="font-semibold text-emerald-300">{evaluationResult.categoryScores.problemSolving || 20}/25</span>
                    </div>
                    <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${((evaluationResult.categoryScores.problemSolving || 20) / 25) * 100}%` }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* AI Feedback */}
            {evaluationResult.feedback && (
              <div className="mb-6 bg-gray-800/40 border border-gray-700 rounded-xl p-4">
                <h4 className="text-xs uppercase tracking-wider font-semibold text-gray-400 mb-2 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-purple-400" /> AI Feedback Summary
                </h4>
                <p className="text-sm text-gray-200 leading-relaxed">{evaluationResult.feedback}</p>
              </div>
            )}

            {/* Strengths & Growth Areas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Strengths */}
              {evaluationResult.strengths?.length > 0 && (
                <div className="bg-emerald-950/20 border border-emerald-800/40 rounded-xl p-4">
                  <h4 className="text-xs uppercase tracking-wider font-semibold text-emerald-400 mb-2 flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4" /> Key Strengths
                  </h4>
                  <ul className="space-y-1.5">
                    {evaluationResult.strengths.map((st, i) => (
                      <li key={i} className="text-xs text-emerald-200 flex items-start gap-1.5">
                        <span className="text-emerald-400 font-bold">•</span> {st}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Suggestions */}
              {evaluationResult.suggestions?.length > 0 && (
                <div className="bg-blue-950/20 border border-blue-800/40 rounded-xl p-4">
                  <h4 className="text-xs uppercase tracking-wider font-semibold text-blue-400 mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" /> Growth Recommendations
                  </h4>
                  <ul className="space-y-1.5">
                    {evaluationResult.suggestions.map((sg, i) => (
                      <li key={i} className="text-xs text-blue-200 flex items-start gap-1.5">
                        <span className="text-blue-400 font-bold">•</span> {sg}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowEvaluationModal(false);
                  navigate('/interviews');
                }}
                className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition text-sm shadow-md"
              >
                Back to Interviews
              </button>
              <button
                onClick={() => setShowEvaluationModal(false)}
                className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-xl transition text-sm"
              >
                Close Scorecard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AIInterview;