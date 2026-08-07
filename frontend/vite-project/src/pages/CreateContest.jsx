// src/pages/CreateContest.jsx (Updated with Codeforces-style options)
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { createContest } from '../contestSlice';
import axiosclient from '../utilis/axiosclient';
import { ArrowLeft, Plus, X, Clock, Users, Calendar, Eye, EyeOff, Trophy } from 'lucide-react';

function CreateContest() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { loading, error, success } = useSelector((state) => state.contest);
  
  const [availableProblems, setAvailableProblems] = useState([]);
  const [loadingProblems, setLoadingProblems] = useState(true);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    problems: [],
    startTime: '',
    endTime: '',
    duration: 120,
    isPublic: true,
    maxParticipants: 100,
    rules: 'Standard contest rules apply. No cheating allowed.',
    scoring: 'standard',
    penalty: 0,
    showParticipants: true,
    showStandings: true
  });

  const [selectedProblems, setSelectedProblems] = useState([]);
  const [showProblemSelector, setShowProblemSelector] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Check if user is admin
  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
    }
  }, [user, navigate]);

  // Fetch available problems
  useEffect(() => {
    const fetchProblems = async () => {
      try {
        setLoadingProblems(true);
        const response = await axiosclient.get('/problem/getallproblem/');
        setAvailableProblems(response.data || []);
      } catch (err) {
        console.error('Error fetching problems:', err);
      } finally {
        setLoadingProblems(false);
      }
    };
    fetchProblems();
  }, []);

  // Auto-calculate duration
  useEffect(() => {
    if (formData.startTime && formData.endTime) {
      const start = new Date(formData.startTime);
      const end = new Date(formData.endTime);
      if (end > start) {
        const diffMinutes = Math.round((end - start) / (1000 * 60));
        setFormData(prev => ({ ...prev, duration: diffMinutes }));
      }
    }
  }, [formData.startTime, formData.endTime]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAddProblem = (problem) => {
    if (!selectedProblems.some(p => p._id === problem._id)) {
      setSelectedProblems([...selectedProblems, problem]);
      setFormData(prev => ({
        ...prev,
        problems: [...prev.problems, problem._id]
      }));
    }
    setShowProblemSelector(false);
    setSearchTerm('');
  };

  const handleRemoveProblem = (problemId) => {
    setSelectedProblems(prev => prev.filter(p => p._id !== problemId));
    setFormData(prev => ({
      ...prev,
      problems: prev.problems.filter(id => id !== problemId)
    }));
  };

  const filteredProblems = availableProblems.filter(p =>
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.difficulty?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.tags?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const validateForm = () => {
    if (!formData.title.trim()) {
      alert('Please enter a contest title');
      return false;
    }
    if (!formData.description.trim()) {
      alert('Please enter a contest description');
      return false;
    }
    if (formData.problems.length === 0) {
      alert('Please select at least one problem');
      return false;
    }
    if (!formData.startTime) {
      alert('Please select a start time');
      return false;
    }
    if (!formData.endTime) {
      alert('Please select an end time');
      return false;
    }
    const start = new Date(formData.startTime);
    const end = new Date(formData.endTime);
    if (end <= start) {
      alert('End time must be after start time');
      return false;
    }
    if (formData.duration < 5) {
      alert('Duration must be at least 5 minutes');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const result = await dispatch(createContest(formData)).unwrap();
      if (result.success) {
        setTimeout(() => {
          navigate('/contests');
        }, 1500);
      }
    } catch (err) {
      console.error('Failed to create contest:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <button
              onClick={() => navigate('/contests')}
              className="mb-2 px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded-lg transition flex items-center gap-1 text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Contests
            </button>
            <h1 className="text-3xl font-bold">Create New Contest</h1>
            <p className="text-gray-400 mt-1">Set up a Codeforces-style coding competition</p>
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 bg-green-900/30 border border-green-700 rounded-xl p-4">
            <p className="text-green-400">{typeof success === 'string' ? success : 'Contest created successfully!'}</p>
            <p className="text-sm text-gray-400 mt-1">Redirecting...</p>
          </div>
        )}
        
        {error && (
          <div className="mb-6 bg-red-900/30 border border-red-700 rounded-xl p-4">
            <p className="text-red-300">{typeof error === 'string' ? error : 'Failed to create contest'}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-6">Basic Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 mb-2">Contest Title *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="e.g., Codeforces Round #1234"
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                  required
                />
              </div>
              
              <div>
                <label className="block text-gray-400 mb-2">Description *</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Describe the contest, rules, and any special instructions"
                  rows="4"
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white resize-vertical"
                  required
                />
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-6">Schedule</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-400 mb-2">Start Time *</label>
                <input
                  type="datetime-local"
                  name="startTime"
                  value={formData.startTime}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                  required
                />
              </div>
              
              <div>
                <label className="block text-gray-400 mb-2">End Time *</label>
                <input
                  type="datetime-local"
                  name="endTime"
                  value={formData.endTime}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                  required
                />
              </div>
            </div>
            
            <div className="mt-4">
              <label className="block text-gray-400 mb-2">Duration</label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  name="duration"
                  value={formData.duration}
                  onChange={handleInputChange}
                  min="5"
                  max="1440"
                  className="w-32 px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                />
                <span className="text-gray-400">minutes</span>
                <span className="text-sm text-gray-500 ml-4">
                  {formData.duration >= 60 ? `(${Math.floor(formData.duration / 60)}h ${formData.duration % 60}m)` : ''}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Auto-calculated from start and end times. Minimum 5 minutes.
              </p>
            </div>
          </div>

          {/* Problems */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Problems ({selectedProblems.length})</h2>
              <button
                type="button"
                onClick={() => setShowProblemSelector(!showProblemSelector)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Problem
              </button>
            </div>

            {/* Problem Selector */}
            {showProblemSelector && (
              <div className="mb-4 bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                <div className="flex gap-3 mb-3">
                  <input
                    type="text"
                    placeholder="Search problems by title, difficulty, or tag..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowProblemSelector(false)}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
                  >
                    Cancel
                  </button>
                </div>
                
                {loadingProblems ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto"></div>
                    <p className="text-gray-400 mt-2">Loading problems...</p>
                  </div>
                ) : filteredProblems.length === 0 ? (
                  <div className="text-center py-4 text-gray-400">
                    {searchTerm ? 'No problems found' : 'No problems available'}
                  </div>
                ) : (
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {filteredProblems.map(problem => {
                      const isSelected = selectedProblems.some(p => p._id === problem._id);
                      return (
                        <div
                          key={problem._id}
                          className={`flex items-center justify-between p-3 rounded-lg transition ${
                            isSelected
                              ? 'bg-blue-600/20 border border-blue-600'
                              : 'hover:bg-gray-800/50 border border-transparent'
                          }`}
                        >
                          <div>
                            <span className="font-medium">{problem.title}</span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`px-2 py-0.5 rounded text-xs ${
                                problem.difficulty === 'easy' ? 'bg-green-900/30 text-green-400' :
                                problem.difficulty === 'medium' ? 'bg-yellow-900/30 text-yellow-400' :
                                'bg-red-900/30 text-red-400'
                              }`}>
                                {problem.difficulty}
                              </span>
                              <span className="text-xs text-gray-400">{problem.tags}</span>
                            </div>
                          </div>
                          {isSelected ? (
                            <span className="text-green-400 text-sm">Added</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAddProblem(problem)}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm transition"
                            >
                              Add
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Selected Problems List */}
            {selectedProblems.length === 0 ? (
              <div className="text-center py-8 text-gray-400 border border-dashed border-gray-700 rounded-lg">
                <div className="text-4xl mb-2">📚</div>
                <p>No problems added yet</p>
                <p className="text-sm mt-1">Click "Add Problem" to select problems for this contest</p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedProblems.map((problem, index) => (
                  <div
                    key={problem._id}
                    className="flex items-center justify-between bg-gray-900/50 rounded-lg p-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400 text-sm w-6">{String.fromCharCode(65 + index)}.</span>
                      <span className="font-medium">{problem.title}</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        problem.difficulty === 'easy' ? 'bg-green-900/30 text-green-400' :
                        problem.difficulty === 'medium' ? 'bg-yellow-900/30 text-yellow-400' :
                        'bg-red-900/30 text-red-400'
                      }`}>
                        {problem.difficulty}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveProblem(problem._id)}
                      className="text-red-400 hover:text-red-300 transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Settings */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-6">Contest Settings</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-400 mb-2">Maximum Participants</label>
                <input
                  type="number"
                  name="maxParticipants"
                  value={formData.maxParticipants}
                  onChange={handleInputChange}
                  min="1"
                  max="1000"
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                />
              </div>
              
              <div>
                <label className="block text-gray-400 mb-2">Scoring System</label>
                <select
                  name="scoring"
                  value={formData.scoring}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                >
                  <option value="standard">Standard</option>
                  <option value="acm">ACM</option>
                  <option value="icpc">ICPC</option>
                </select>
              </div>
              
              <div>
                <label className="block text-gray-400 mb-2">Penalty per Wrong Submission</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    name="penalty"
                    value={formData.penalty}
                    onChange={handleInputChange}
                    min="0"
                    max="30"
                    className="w-24 px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                  />
                  <span className="text-gray-400">minutes</span>
                </div>
              </div>
            </div>

            {/* Visibility Settings */}
            <div className="mt-6 border-t border-gray-700 pt-6">
              <h3 className="text-lg font-semibold mb-4">Visibility Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-center gap-3 text-gray-300">
                  <input
                    type="checkbox"
                    name="showParticipants"
                    checked={formData.showParticipants}
                    onChange={handleInputChange}
                    className="w-4 h-4 rounded bg-gray-900 border-gray-700 text-blue-600"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Show Participants
                    </div>
                    <p className="text-xs text-gray-500">Display participant list to everyone</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 text-gray-300">
                  <input
                    type="checkbox"
                    name="showStandings"
                    checked={formData.showStandings}
                    onChange={handleInputChange}
                    className="w-4 h-4 rounded bg-gray-900 border-gray-700 text-blue-600"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4" />
                      Show Standings
                    </div>
                    <p className="text-xs text-gray-500">Display real-time standings</p>
                  </div>
                </label>
              </div>
            </div>
            
            <div className="mt-4">
              <label className="block text-gray-400 mb-2">Rules</label>
              <textarea
                name="rules"
                value={formData.rules}
                onChange={handleInputChange}
                rows="3"
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white resize-vertical"
              />
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4">Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-400">Title</p>
                <p className="font-medium truncate">{formData.title || 'Not set'}</p>
              </div>
              <div>
                <p className="text-gray-400">Problems</p>
                <p className="font-medium">{formData.problems.length}</p>
              </div>
              <div>
                <p className="text-gray-400">Duration</p>
                <p className="font-medium">{formData.duration} minutes</p>
              </div>
              <div>
                <p className="text-gray-400">Participants</p>
                <p className="font-medium">{formData.maxParticipants}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate('/contests')}
              className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg transition disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Creating...
                </>
              ) : (
                'Create Contest'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateContest;