import React from 'react';
import { BarChart2, GitCommit, GitBranch, Database, Code } from 'lucide-react';

export default function Navbar({ activeCategory, setActiveCategory, activeAlgorithm, setActiveAlgorithm }) {
  const categories = [
    { id: 'Sorting', name: 'Sorting', icon: BarChart2, defaultAlg: 'quickSort' },
    { id: 'Graph', name: 'Graph Pathfinding', icon: GitCommit, defaultAlg: 'dijkstra' },
    { id: 'Tree', name: 'Binary Trees', icon: GitBranch, defaultAlg: 'bstInsert' },
    { id: 'Data Structures', name: 'Memory & Pointer Structures', icon: Database, defaultAlg: 'linkedListOps' }
  ];

  return (
    <header className="navbar-container">
      <div className="navbar-brand">
        <div className="brand-icon">
          <Code className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h1 className="brand-title">
            DSA <span className="brand-highlight">C++</span> Studio
          </h1>
          <p className="brand-subtitle">Interactive Algorithm & Pointer Visualizer</p>
        </div>
      </div>

      <nav className="navbar-tabs">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCategory(cat.id);
                setActiveAlgorithm(cat.defaultAlg);
              }}
              className={`nav-tab-btn ${isActive ? 'active' : ''}`}
            >
              <Icon className="w-4 h-4 mr-1.5 opacity-80" />
              <span>{cat.name}</span>
            </button>
          );
        })}
      </nav>

      <div className="navbar-badge">
        <span className="w-2 h-2 rounded-full bg-emerald-400 mr-2 animate-pulse" />
        <span className="text-xs font-medium text-emerald-300">Native C++ Traces</span>
      </div>
    </header>
  );
}
