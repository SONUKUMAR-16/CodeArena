// src/pages/Visualizer.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, BarChart3, GitBranch, Network, 
  Binary, Hash, PieChart, Layers, Code2,
  Workflow, Cpu, Brain, TrendingUp, Search
} from 'lucide-react';
import SortingVisualizer from '../components/visualizers/SortingVisualizer';
import GraphVisualizer from '../components/visualizers/GraphVisualizer';
import DPVisualizer from '../components/visualizers/DPVisualizer';
import TreeVisualizer from '../components/visualizers/TreeVisualizer';
import SearchingVisualizer from '../components/visualizers/SearchingVisualizer';

function Visualizer() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('sorting');

  const categories = [
    { id: 'sorting', label: 'Sorting', icon: <BarChart3 className="w-4 h-4" />, description: 'Bubble, Merge, Quick Sort' },
    { id: 'searching', label: 'Searching', icon: <Search className="w-4 h-4" />, description: 'Linear, Binary Search' },
    { id: 'graph', label: 'Graph Algorithms', icon: <GitBranch className="w-4 h-4" />, description: 'BFS, DFS, Dijkstra' },
    { id: 'tree', label: 'Tree Algorithms', icon: <Network className="w-4 h-4" />, description: 'BST, Traversals' },
    { id: 'dp', label: 'Dynamic Programming', icon: <Brain className="w-4 h-4" />, description: 'Fibonacci, Knapsack' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Algorithm Visualizer
              </h1>
              <p className="text-gray-400 text-sm">Step through algorithms in real-time</p>
            </div>
          </div>
        </div>

        {/* Category Navigation */}
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-lg transition flex items-center gap-2 text-sm ${
                activeCategory === cat.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              {cat.icon}
              {cat.label}
            </button>
          ))}
        </div>

        {/* Visualizer Content */}
        <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-4 md:p-6">
          {activeCategory === 'sorting' && <SortingVisualizer />}
          {activeCategory === 'searching' && <SearchingVisualizer />}
          {activeCategory === 'graph' && <GraphVisualizer />}
          {activeCategory === 'tree' && <TreeVisualizer />}
          {activeCategory === 'dp' && <DPVisualizer />}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-gray-500 text-sm">
          <p>Use Play, Next Step, and Restart to explore each algorithm step by step.</p>
        </div>
      </div>
    </div>
  );
}

export default Visualizer;