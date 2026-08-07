// src/pages/Visualizer.jsx
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import CppDSAVisualizer from '../components/visualizers/CppDSAVisualizer';

function Visualizer() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header Navigation */}
        <div className="flex items-center justify-between bg-gray-800/40 p-3 rounded-xl border border-gray-700/50">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg transition flex items-center gap-2 text-sm font-medium"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                C++ DSA Interactive Visualizer
              </h1>
            </div>
          </div>
        </div>

        {/* C++ DSA Visualizer Suite */}
        <CppDSAVisualizer />
      </div>
    </div>
  );
}

export default Visualizer;