import React from 'react';
import { Palette } from 'lucide-react';

export default function Legend({ activeCategory }) {
  const sortingLegends = [
    { label: 'Unsorted', color: 'bg-slate-700 border-slate-500' },
    { label: 'Comparing', color: 'bg-amber-500 border-amber-300' },
    { label: 'Swapping', color: 'bg-rose-500 border-rose-300' },
    { label: 'Pivot / Min', color: 'bg-purple-500 border-purple-300' },
    { label: 'Sorted', color: 'bg-emerald-500 border-emerald-300' }
  ];

  const graphLegends = [
    { label: 'Unvisited', color: 'bg-slate-800 border-slate-600' },
    { label: 'Visited', color: 'bg-sky-600 border-sky-400' },
    { label: 'Current Node', color: 'bg-rose-600 border-rose-400' },
    { label: 'Shortest Path', color: 'bg-emerald-600 border-emerald-400' }
  ];

  const treeLegends = [
    { label: 'Default Node', color: 'bg-slate-800 border-slate-600' },
    { label: 'Inspecting', color: 'bg-purple-700 border-purple-400' },
    { label: 'Visited / Traverse', color: 'bg-emerald-700 border-emerald-400' }
  ];

  const listLegends = [
    { label: 'Memory Block', color: 'bg-slate-800 border-slate-600' },
    { label: 'Active Pointer', color: 'bg-cyan-700 border-cyan-400' },
    { label: 'Head / Tail', color: 'bg-indigo-700 border-indigo-400' }
  ];

  let currentLegends = sortingLegends;
  if (activeCategory === 'Graph') currentLegends = graphLegends;
  if (activeCategory === 'Tree') currentLegends = treeLegends;
  if (activeCategory === 'Data Structures') currentLegends = listLegends;

  return (
    <div className="legend-container flex-wrap">
      <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mr-3">
        <Palette className="w-3.5 h-3.5 text-cyan-400" />
        <span>Legend:</span>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        {currentLegends.map((item, idx) => (
          <div key={idx} className="flex items-center gap-1.5 text-xs text-slate-300">
            <span className={`w-2.5 h-2.5 rounded-full border ${item.color}`} />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
