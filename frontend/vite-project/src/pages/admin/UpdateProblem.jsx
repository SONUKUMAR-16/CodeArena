// src/pages/admin/UpdateProblem.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axiosclient from '../../utilis/axiosclient';

function UpdateProblem() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [problem, setProblem] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    difficulty: 'medium',
    tags: 'array',
    visibletestcases: [{ input: '', output: '', explanation: '' }],
    hiddentestcases: [{ input: '', output: '' }],
    startcode: [
      { language: 'javascript', initialcode: '' },
      { language: 'java', initialcode: '' },
      { language: 'c++', initialcode: '' }
    ],
    referencesolution: []
  });

  // Language options with enabled/disabled state
  const [enabledLanguages, setEnabledLanguages] = useState({
    javascript: false,
    java: false,
    'c++': false
  });

  // Check if user is admin
  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
    }
  }, [user, navigate]);

  // Fetch problem data
  useEffect(() => {
    const fetchProblem = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch full problem details (admin only endpoint)
        const response = await axiosclient.get(`/problem/admin/getfullproblem/${id}`);
        
        if (!response.data) {
          throw new Error('Problem not found');
        }
        
        const problemData = response.data;
        setProblem(problemData);
        
        // Initialize enabled languages based on existing reference solutions
        const initialEnabledLanguages = {
          javascript: false,
          java: false,
          'c++': false
        };
        
        // Filter existing reference solutions
        const existingReferences = problemData.referencesolution || [];
        const filteredReferences = existingReferences.filter(
          sol => sol.completecode && sol.completecode.trim() !== ''
        );
        
        filteredReferences.forEach(sol => {
          initialEnabledLanguages[sol.language] = true;
        });
        
        setEnabledLanguages(initialEnabledLanguages);
        
        // Initialize form data
        setFormData({
          title: problemData.title || '',
          description: problemData.description || '',
          difficulty: problemData.difficulty || 'medium',
          tags: problemData.tags || 'array',
          visibletestcases: problemData.visibletestcases || [{ input: '', output: '', explanation: '' }],
          hiddentestcases: problemData.hiddentestcases || [{ input: '', output: '' }],
          startcode: problemData.startcode || [
            { language: 'javascript', initialcode: '' },
            { language: 'java', initialcode: '' },
            { language: 'c++', initialcode: '' }
          ],
          referencesolution: filteredReferences.length > 0 ? filteredReferences : [
            { language: 'javascript', completecode: '' },
            { language: 'java', completecode: '' },
            { language: 'c++', completecode: '' }
          ]
        });
        
      } catch (err) {
        console.error('Error fetching problem:', err);
        const errorMsg = err.response?.data || err.message || 'Failed to fetch problem details';
        setError(`Error: ${errorMsg}. Make sure you have admin privileges.`);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchProblem();
    }
  }, [id]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTestCaseChange = (index, field, value, type = 'visible') => {
    setFormData(prev => {
      const testCases = [...prev[`${type}testcases`]];
      testCases[index] = { ...testCases[index], [field]: value };
      return { ...prev, [`${type}testcases`]: testCases };
    });
  };

  const addTestCase = (type = 'visible') => {
    setFormData(prev => ({
      ...prev,
      [`${type}testcases`]: [
        ...prev[`${type}testcases`],
        type === 'visible' 
          ? { input: '', output: '', explanation: '' }
          : { input: '', output: '' }
      ]
    }));
  };

  const removeTestCase = (index, type = 'visible') => {
    if (window.confirm('Are you sure you want to remove this test case?')) {
      setFormData(prev => ({
        ...prev,
        [`${type}testcases`]: prev[`${type}testcases`].filter((_, i) => i !== index)
      }));
    }
  };

  const handleCodeChange = (index, field, value, type = 'startcode') => {
    setFormData(prev => {
      const codes = [...prev[type]];
      codes[index] = { ...codes[index], [field]: value };
      return { ...prev, [type]: codes };
    });
  };

  const handleReferenceSolutionChange = (language, value) => {
    setFormData(prev => {
      // Check if solution already exists
      const existingIndex = prev.referencesolution.findIndex(sol => sol.language === language);
      
      if (existingIndex >= 0) {
        // Update existing solution
        const updatedSolutions = [...prev.referencesolution];
        updatedSolutions[existingIndex] = { ...updatedSolutions[existingIndex], completecode: value };
        return { ...prev, referencesolution: updatedSolutions };
      } else {
        // Add new solution
        return {
          ...prev,
          referencesolution: [
            ...prev.referencesolution,
            { language, completecode: value }
          ]
        };
      }
    });
  };

  const toggleLanguageReference = (language) => {
    setEnabledLanguages(prev => ({
      ...prev,
      [language]: !prev[language]
    }));

    // If disabling, clear the code
    if (enabledLanguages[language]) {
      handleReferenceSolutionChange(language, '');
    }
  };

  const getLanguageName = (language) => {
    switch (language) {
      case 'javascript': return 'JavaScript';
      case 'java': return 'Java';
      case 'c++': return 'C++';
      default: return language;
    }
  };

  const validateForm = () => {
    // Check basic required fields
    if (!formData.title.trim()) {
      setError('Title is required');
      return false;
    }
    if (!formData.description.trim()) {
      setError('Description is required');
      return false;
    }
    if (formData.visibletestcases.length === 0) {
      setError('At least one visible test case is required');
      return false;
    }
    if (formData.hiddentestcases.length === 0) {
      setError('At least one hidden test case is required');
      return false;
    }
    
    // Validate test cases
    for (const tc of formData.visibletestcases) {
      if (!tc.input.trim() || !tc.output.trim()) {
        setError('All test cases must have input and output');
        return false;
      }
    }
    
    for (const tc of formData.hiddentestcases) {
      if (!tc.input.trim() || !tc.output.trim()) {
        setError('All hidden test cases must have input and output');
        return false;
      }
    }

    // Check if at least one reference solution is provided
    const hasReferenceSolution = formData.referencesolution.some(
      solution => solution.completecode && solution.completecode.trim() !== ''
    );
    
    if (!hasReferenceSolution) {
      setError('At least one reference solution is required');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Filter out empty reference solutions
    const filteredReferenceSolutions = formData.referencesolution.filter(
      solution => solution.completecode && solution.completecode.trim() !== ''
    );

    const submissionData = {
      ...formData,
      referencesolution: filteredReferenceSolutions
    };

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await axiosclient.patch(`/problem/update/${id}`, submissionData);
      setSuccess('Problem updated successfully!');
      setTimeout(() => {
        navigate('/admin');
      }, 2000);
    } catch (err) {
      const errorData = err.response?.data;
      if (typeof errorData === 'string') {
        setError(errorData);
      } else if (errorData?.error) {
        setError(`${errorData.error}\n${errorData.details || ''}`);
      } else {
        setError('Failed to update problem. Please check your data.');
      }
      console.error('Error updating problem:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel? Unsaved changes will be lost.')) {
      navigate('/admin');
    }
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all changes?')) {
      // Reload the form with original problem data
      if (problem) {
        setFormData({
          title: problem.title || '',
          description: problem.description || '',
          difficulty: problem.difficulty || 'medium',
          tags: problem.tags || 'array',
          visibletestcases: problem.visibletestcases || [{ input: '', output: '', explanation: '' }],
          hiddentestcases: problem.hiddentestcases || [{ input: '', output: '' }],
          startcode: problem.startcode || [
            { language: 'javascript', initialcode: '' },
            { language: 'java', initialcode: '' },
            { language: 'c++', initialcode: '' }
          ],
          referencesolution: (problem.referencesolution || []).filter(
            sol => sol.completecode && sol.completecode.trim() !== ''
          )
        });
        
        // Reset enabled languages
        const initialEnabledLanguages = {
          javascript: false,
          java: false,
          'c++': false
        };
        
        (problem.referencesolution || []).forEach(sol => {
          if (sol.completecode && sol.completecode.trim() !== '') {
            initialEnabledLanguages[sol.language] = true;
          }
        });
        
        setEnabledLanguages(initialEnabledLanguages);
        setError(null);
        setSuccess(null);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
            <p className="text-lg">Loading problem data...</p>
            <p className="text-gray-400 text-sm mt-2">ID: {id?.substring(0, 12)}...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !problem) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white p-8">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => navigate('/admin')}
            className="mb-6 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition flex items-center"
          >
            ← Back to Admin Dashboard
          </button>
          
          <div className="bg-red-900/30 border border-red-700 rounded-xl p-6">
            <div className="flex items-start mb-4">
              <div className="text-3xl mr-3">❌</div>
              <div>
                <h2 className="text-xl font-bold mb-2">Problem Not Found</h2>
                <p className="text-gray-300">{error}</p>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-gray-800/50 rounded-lg">
              <h3 className="font-medium mb-2 text-gray-400">Troubleshooting:</h3>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Verify the problem ID: {id}</li>
                <li>• Make sure you have admin privileges</li>
                <li>• Check if the problem exists in the database</li>
                <li>• Try refreshing the page</li>
              </ul>
            </div>
            
            <div className="mt-6 flex gap-4">
              <button
                onClick={() => navigate('/admin')}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
              >
                Back to Admin Dashboard
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <button
                  onClick={() => navigate('/admin')}
                  className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded-lg transition flex items-center"
                >
                  ← Back
                </button>
                <h1 className="text-4xl font-bold">Update Problem</h1>
              </div>
              <p className="text-gray-400 mt-2">Editing: <span className="text-white font-medium">{formData.title}</span></p>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <span className="px-3 py-1 bg-gray-800 rounded-full text-sm font-mono">
                  ID: {id?.substring(0, 8)}...
                </span>
                <span className={`px-3 py-1 rounded-full text-sm ${
                  formData.difficulty === 'easy' ? 'bg-green-900/30 text-green-400 border border-green-700' :
                  formData.difficulty === 'medium' ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-700' :
                  'bg-red-900/30 text-red-400 border border-red-700'
                }`}>
                  {formData.difficulty}
                </span>
                <span className="px-3 py-1 bg-blue-900/30 text-blue-400 border border-blue-700 rounded-full text-sm">
                  {formData.tags}
                </span>
              </div>
            </div>
            
            <div className="text-right">
              <p className="text-gray-400 text-sm">Last Updated</p>
              <p className="text-sm">
                {problem?.updatedAt ? new Date(problem.updatedAt).toLocaleDateString() : 'Unknown'}
              </p>
            </div>
          </div>
        </header>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-6 bg-red-900/30 border border-red-700 rounded-xl p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="text-red-400 font-semibold mb-2">Error</h3>
                <div className="bg-black/50 p-3 rounded-lg font-mono text-sm whitespace-pre-wrap">
                  {error}
                </div>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-300 ml-4"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-900/30 border border-green-700 rounded-xl p-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-green-400 font-semibold">Success!</h3>
                <p className="text-gray-300">{success}</p>
                <p className="text-sm text-gray-400 mt-1">Redirecting to admin dashboard...</p>
              </div>
              <button
                onClick={() => setSuccess(null)}
                className="text-green-400 hover:text-green-300"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <h2 className="text-2xl font-semibold mb-6">Basic Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-400 mb-2">Problem Title *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Enter problem title"
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 mb-2">Difficulty *</label>
                  <select
                    name="difficulty"
                    value={formData.difficulty}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-gray-400 mb-2">Tag *</label>
                  <select
                    name="tags"
                    value={formData.tags}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                  >
                    <option value="array">Array</option>
                    <option value="linkedList">Linked List</option>
                    <option value="graph">Graph</option>
                    <option value="dp">Dynamic Programming</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="mt-6">
              <label className="block text-gray-400 mb-2">Problem Description *</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe the problem in detail"
                rows="8"
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white resize-vertical"
                required
              />
            </div>
          </div>

          {/* Visible Test Cases */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold">
                Visible Test Cases ({formData.visibletestcases.length})
              </h2>
              <button
                type="button"
                onClick={() => addTestCase('visible')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition flex items-center gap-2"
              >
                <span>+</span> Add Test Case
              </button>
            </div>
            
            <p className="text-gray-400 mb-4">
              These test cases will be visible to users when they run their code.
            </p>
            
            <div className="space-y-4">
              {formData.visibletestcases.map((testCase, index) => (
                <div key={index} className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-medium">Test Case {index + 1}</h3>
                      {testCase.explanation && (
                        <span className="px-2 py-1 bg-blue-900/30 text-blue-400 text-xs rounded">
                          Has explanation
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => removeTestCase(index, 'visible')}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-gray-400 mb-2">Input *</label>
                      <textarea
                        value={testCase.input}
                        onChange={(e) => handleTestCaseChange(index, 'input', e.target.value, 'visible')}
                        rows="3"
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white font-mono text-sm"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-gray-400 mb-2">Expected Output *</label>
                      <textarea
                        value={testCase.output}
                        onChange={(e) => handleTestCaseChange(index, 'output', e.target.value, 'visible')}
                        rows="3"
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white font-mono text-sm"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-gray-400 mb-2">Explanation</label>
                      <textarea
                        value={testCase.explanation}
                        onChange={(e) => handleTestCaseChange(index, 'explanation', e.target.value, 'visible')}
                        placeholder="Optional: Explain why this output is expected"
                        rows="3"
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Hidden Test Cases */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold">
                Hidden Test Cases ({formData.hiddentestcases.length})
              </h2>
              <button
                type="button"
                onClick={() => addTestCase('hidden')}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition flex items-center gap-2"
              >
                <span>+</span> Add Hidden Case
              </button>
            </div>
            
            <p className="text-gray-400 mb-4">
              These test cases are used for final submission grading and are not visible to users.
            </p>
            
            <div className="space-y-4">
              {formData.hiddentestcases.map((testCase, index) => (
                <div key={index} className="bg-gray-900/50 border border-purple-700 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">Hidden Test Case {index + 1}</h3>
                    <button
                      type="button"
                      onClick={() => removeTestCase(index, 'hidden')}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
                    >
                      Remove
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-400 mb-2">Input *</label>
                      <textarea
                        value={testCase.input}
                        onChange={(e) => handleTestCaseChange(index, 'input', e.target.value, 'hidden')}
                        rows="3"
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white font-mono text-sm"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-gray-400 mb-2">Expected Output *</label>
                      <textarea
                        value={testCase.output}
                        onChange={(e) => handleTestCaseChange(index, 'output', e.target.value, 'hidden')}
                        rows="3"
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white font-mono text-sm"
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Starter Code */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <h2 className="text-2xl font-semibold mb-6">Starter Code</h2>
            <p className="text-gray-400 mb-4">
              This code will be shown to users when they start solving the problem.
            </p>
            
            <div className="space-y-6">
              {formData.startcode.map((code, index) => (
                <div key={index} className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                  <div className="mb-4">
                    <label className="block text-gray-400 mb-2">
                      {getLanguageName(code.language)} Starter Code
                    </label>
                    <textarea
                      value={code.initialcode}
                      onChange={(e) => handleCodeChange(index, 'initialcode', e.target.value, 'startcode')}
                      rows="8"
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white font-mono text-sm"
                      required
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Reference Solution */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold">Reference Solutions</h2>
              <div className="text-sm text-gray-400">
                {Object.values(enabledLanguages).filter(Boolean).length} language(s) enabled
              </div>
            </div>
            
            <div className="mb-6 bg-blue-900/20 border border-blue-700 rounded-lg p-4">
              <h4 className="text-blue-400 font-medium mb-2">Important Notes:</h4>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Reference solutions are optional for each language</li>
                <li>• You must provide at least one reference solution</li>
                <li>• Each solution will be tested against all test cases during update</li>
                <li>• Solutions must pass all test cases to update the problem</li>
              </ul>
            </div>

            {/* Language Selection Toggle */}
            <div className="mb-6">
              <label className="block text-gray-400 mb-3">Select languages for reference solutions:</label>
              <div className="flex flex-wrap gap-3">
                {['javascript', 'java', 'c++'].map(lang => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => toggleLanguageReference(lang)}
                    className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
                      enabledLanguages[lang]
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    }`}
                  >
                    {getLanguageName(lang)}
                    {enabledLanguages[lang] ? (
                      <>
                        <span className="text-xs">✓</span>
                        <span className="text-xs bg-green-800 px-2 py-1 rounded">
                          Enabled
                        </span>
                      </>
                    ) : (
                      <span className="text-xs">+ Add</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Reference Solution Editors */}
            <div className="space-y-6">
              {formData.referencesolution
                .filter(solution => enabledLanguages[solution.language])
                .map((solution, index) => {
                  const solutionData = solution.completecode || '';
                  return (
                    <div key={index} className="bg-gray-900/50 border border-blue-700 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-4">
                        <label className="text-lg font-medium text-blue-400">
                          {getLanguageName(solution.language)} Reference Solution *
                        </label>
                        <button
                          type="button"
                          onClick={() => toggleLanguageReference(solution.language)}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
                        >
                          Remove Solution
                        </button>
                      </div>
                      <textarea
                        value={solutionData}
                        onChange={(e) => handleReferenceSolutionChange(solution.language, e.target.value)}
                        rows="10"
                        placeholder={`Enter ${getLanguageName(solution.language)} reference solution that passes all test cases`}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white font-mono text-sm"
                        required={enabledLanguages[solution.language]}
                      />
                      <div className="mt-2 text-sm text-gray-500">
                        <p>This solution must pass all {formData.visibletestcases.length + formData.hiddentestcases.length} test cases.</p>
                      </div>
                    </div>
                  );
                })}
              
              {/* Empty state */}
              {Object.values(enabledLanguages).every(lang => !lang) && (
                <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-6 text-center">
                  <div className="text-4xl mb-4">📝</div>
                  <h3 className="text-xl font-medium mb-2">No reference solutions selected</h3>
                  <p className="text-gray-400 mb-4">
                    Click on the language buttons above to add reference solutions.
                  </p>
                  <p className="text-sm text-yellow-400">
                    At least one reference solution is required to update a problem.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-between items-center">
            <div className="flex gap-4">
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
              >
                Reset Changes
              </button>
            </div>
            
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => window.open(`/problem/${id}`, '_blank')}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
              >
                Preview Problem
              </button>
              
              <button
                type="submit"
                disabled={submitting || Object.values(enabledLanguages).every(lang => !lang)}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2"></span>
                    Updating...
                  </>
                ) : (
                  'Update Problem'
                )}
              </button>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-4">
            <h4 className="font-medium mb-3">Update Summary:</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-400">Problem Title</p>
                <p className="font-medium truncate">{formData.title || 'Not set'}</p>
              </div>
              <div>
                <p className="text-gray-400">Test Cases</p>
                <p className="font-medium">
                  {formData.visibletestcases.length} visible + {formData.hiddentestcases.length} hidden
                </p>
              </div>
              <div>
                <p className="text-gray-400">Reference Solutions</p>
                <p className="font-medium">
                  {Object.values(enabledLanguages).filter(Boolean).length} language(s)
                </p>
              </div>
              <div>
                <p className="text-gray-400">Total Changes</p>
                <p className="font-medium">
                  {problem ? 'Editing existing problem' : 'New problem'}
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default UpdateProblem;