import React from 'react';
import { Info, Gauge, HardDrive, Activity } from 'lucide-react';

export default function InfoPanel({ snippetData, currentStepData }) {
  if (!snippetData) return null;

  const { timeComplexity, spaceComplexity, name } = snippetData;
  const description = currentStepData?.description || 'Press Play or Next to step through the C++ algorithm trace.';

  return (
    <div className="info-panel-container">
      {/* Active Step Action Banner - Highest Priority for Readability */}
      <div className="step-description-box border-l-4 border-l-cyan-400 bg-slate-900/90 p-3.5 rounded-lg shadow-sm">
        <div className="flex items-center text-xs font-bold text-cyan-400 uppercase tracking-wide mb-1.5">
          <Activity className="w-4 h-4 mr-1.5 animate-pulse text-cyan-400" />
          Step Action & Trace Log
        </div>
        <p className="font-mono text-sm text-slate-100 font-semibold leading-relaxed">
          {description}
        </p>
      </div>

      {/* Complexity Cards */}
      <div className="complexity-grid">
        <div className="complexity-card flex flex-col justify-between">
          <div className="flex items-center text-slate-400 text-xs font-semibold mb-1">
            <Gauge className="w-4 h-4 mr-1.5 text-emerald-400" />
            Time Complexity
          </div>
          <div className="font-mono text-sm text-slate-100 font-bold">
            Average: <span className="text-emerald-400">{timeComplexity.average}</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
            Worst: {timeComplexity.worst} | Best: {timeComplexity.best}
          </div>
        </div>

        <div className="complexity-card flex flex-col justify-between">
          <div className="flex items-center text-slate-400 text-xs font-semibold mb-1">
            <HardDrive className="w-4 h-4 mr-1.5 text-purple-400" />
            Space Complexity
          </div>
          <div className="font-mono text-sm text-purple-300 font-bold">
            {spaceComplexity}
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
            Auxiliary Memory
          </div>
        </div>
      </div>
    </div>
  );
}
