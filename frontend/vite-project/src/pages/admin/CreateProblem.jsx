// src/pages/admin/CreateProblem.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axiosclient from '../../utilis/axiosclient';

function CreateProblem() {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    difficulty: 'medium',
    tags: 'array',
    visibletestcases: [{ input: '', output: '', explanation: '' }],
    hiddentestcases: [{ input: '', output: '' }],
    startcode: [
      { language: 'javascript', initialcode: 'function solution(input) {\n  // Write your code here\n  return input;\n}' },
      { language: 'java', initialcode: 'import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        // Write your code here\n    }\n}' },
      { language: 'c++', initialcode: '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your code here\n    return 0;\n}' }
    ],
    referencesolution: [
      { language: 'javascript', completecode: '' },
      { language: 'java', completecode: '' },
      { language: 'c++', completecode: '' }
    ]
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
    setFormData(prev => ({
      ...prev,
      referencesolution: prev.referencesolution.map(solution =>
        solution.language === language
          ? { ...solution, completecode: value }
          : solution
      )
    }));
  };

  const toggleLanguageReference = (language) => {
    setEnabledLanguages(prev => ({
      ...prev,
      [language]: !prev[language]
    }));

    // If disabling, clear the code
    if (enabledLanguages[language]) {
      handleReferenceSolutionChange(language, '');
    } else {
      // If enabling, add a template
      const template = getLanguageTemplate(language);
      handleReferenceSolutionChange(language, template);
    }
  };

  const getLanguageTemplate = (language) => {
    const templates = {
      'javascript': 'function solution(input) {\n  // Reference solution\n  return input;\n}',
      'java': 'import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        // Reference solution\n    }\n}',
      'c++': '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Reference solution\n    return 0;\n}'
    };
    return templates[language] || '';
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
      solution => solution.completecode.trim() !== ''
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
      solution => solution.completecode.trim() !== ''
    );

    const submissionData = {
      ...formData,
      referencesolution: filteredReferenceSolutions
    };

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await axiosclient.post('/problem/create', submissionData);
      setSuccess('Problem created successfully!');
      setTimeout(() => {
        navigate('/admin');
      }, 2000);
    } catch (err) {
      // Parse the error message
      const errorData = err.response?.data;
      if (typeof errorData === 'string') {
        setError(errorData);
      } else if (errorData?.error) {
        setError(`${errorData.error}\n${errorData.details || ''}`);
      } else {
        setError('Failed to create problem. Please check your data.');
      }
      console.error('Error creating problem:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset the form? All data will be lost.')) {
      setFormData({
        title: '',
        description: '',
        difficulty: 'medium',
        tags: 'array',
        visibletestcases: [{ input: '', output: '', explanation: '' }],
        hiddentestcases: [{ input: '', output: '' }],
        startcode: [
          { language: 'javascript', initialcode: 'function solution(input) {\n  // Write your code here\n  return input;\n}' },
          { language: 'java', initialcode: 'import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        // Write your code here\n    }\n}' },
          { language: 'c++', initialcode: '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your code here\n    return 0;\n}' }
        ],
        referencesolution: [
          { language: 'javascript', completecode: '' },
          { language: 'java', completecode: '' },
          { language: 'c++', completecode: '' }
        ]
      });
      setEnabledLanguages({
        javascript: false,
        java: false,
        'c++': false
      });
    }
  };

  // Get language display name
  const getLanguageName = (lang) => {
    switch (lang) {
      case 'javascript': return 'JavaScript';
      case 'java': return 'Java';
      case 'c++': return 'C++';
      default: return lang;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold">Create New Problem</h1>
              <p className="text-gray-400 mt-2">Design a new coding challenge for users</p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => navigate('/admin')}
                className="px-6 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </header>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-6 bg-red-900/30 border border-red-700 rounded-xl p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="text-red-400 font-semibold mb-2">Validation Error</h3>
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
            
            {/* Troubleshooting tips */}
            <div className="mt-4 p-3 bg-yellow-900/30 border border-yellow-700 rounded-lg">
              <h4 className="text-yellow-400 font-medium mb-2">Tips:</h4>
              <ul className="text-yellow-300 text-sm space-y-1">
                <li>• Reference solution is optional for each language</li>
                <li>• Provide at least one reference solution</li>
                <li>• Make sure reference solution passes all test cases</li>
              </ul>
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
                placeholder="Describe the problem in detail. Include constraints, examples, and requirements."
                rows="6"
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white resize-vertical"
                required
              />
            </div>
          </div>

          {/* Visible Test Cases */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold">Visible Test Cases</h2>
              <button
                type="button"
                onClick={() => addTestCase('visible')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
              >
                + Add Test Case
              </button>
            </div>
            
            <p className="text-gray-400 mb-4">
              These test cases will be visible to users when they run their code.
            </p>
            
            <div className="space-y-4">
              {formData.visibletestcases.map((testCase, index) => (
                <div key={index} className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">Test Case {index + 1}</h3>
                    {formData.visibletestcases.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTestCase(index, 'visible')}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-gray-400 mb-2">Input *</label>
                      <textarea
                        value={testCase.input}
                        onChange={(e) => handleTestCaseChange(index, 'input', e.target.value, 'visible')}
                        placeholder="Test input"
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
                        placeholder="Expected output"
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
                        placeholder="Explain why this output is expected"
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
              <h2 className="text-2xl font-semibold">Hidden Test Cases</h2>
              <button
                type="button"
                onClick={() => addTestCase('hidden')}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition"
              >
                + Add Hidden Case
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
                    {formData.hiddentestcases.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTestCase(index, 'hidden')}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-400 mb-2">Input *</label>
                      <textarea
                        value={testCase.input}
                        onChange={(e) => handleTestCaseChange(index, 'input', e.target.value, 'hidden')}
                        placeholder="Hidden test input"
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
                        placeholder="Expected output"
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
                <li>• Each enabled solution will be tested against all test cases</li>
                <li>• Solutions must pass all test cases to create the problem</li>
                <li>• Users can submit solutions in any supported language</li>
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
                    className={`px-4 py-2 rounded-lg transition ${
                      enabledLanguages[lang]
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    }`}
                  >
                    {getLanguageName(lang)}
                    {enabledLanguages[lang] ? ' ✓' : ' + Add'}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Reference Solution Editors */}
            <div className="space-y-6">
              {formData.referencesolution
                .filter(solution => enabledLanguages[solution.language])
                .map((solution, index) => (
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
                      value={solution.completecode}
                      onChange={(e) => handleReferenceSolutionChange(solution.language, e.target.value)}
                      rows="10"
                      placeholder={`Enter ${getLanguageName(solution.language)} reference solution that passes all test cases`}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white font-mono text-sm"
                      required
                    />
                    <div className="mt-2 text-sm text-gray-500">
                      <p>This solution must pass all {formData.visibletestcases.length + formData.hiddentestcases.length} test cases.</p>
                    </div>
                  </div>
                ))}
              
              {/* Empty state */}
              {Object.values(enabledLanguages).every(lang => !lang) && (
                <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-6 text-center">
                  <div className="text-4xl mb-4">📝</div>
                  <h3 className="text-xl font-medium mb-2">No reference solutions selected</h3>
                  <p className="text-gray-400 mb-4">
                    Click on the language buttons above to add reference solutions.
                  </p>
                  <p className="text-sm text-yellow-400">
                    At least one reference solution is required to create a problem.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={handleReset}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
            >
              Reset Form
            </button>
            
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => navigate('/admin')}
                className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
              >
                Cancel
              </button>
              
              <button
                type="submit"
                disabled={loading || Object.values(enabledLanguages).every(lang => !lang)}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Problem'}
              </button>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-4">
            <h4 className="font-medium mb-2">Problem Summary:</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-400">Title</p>
                <p className="font-medium truncate">{formData.title || 'Not set'}</p>
              </div>
              <div>
                <p className="text-gray-400">Difficulty</p>
                <p className="font-medium">{formData.difficulty}</p>
              </div>
              <div>
                <p className="text-gray-400">Test Cases</p>
                <p className="font-medium">{formData.visibletestcases.length} visible + {formData.hiddentestcases.length} hidden</p>
              </div>
              <div>
                <p className="text-gray-400">Reference Solutions</p>
                <p className="font-medium">{Object.values(enabledLanguages).filter(Boolean).length} language(s)</p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateProblem;