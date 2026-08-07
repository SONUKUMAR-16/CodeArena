import React from 'react';
import { ArrowRight } from 'lucide-react';

export default function VisualizerCanvas({
  activeCategory,
  activeAlgorithm,
  stepData,
  arrayData,
  graphData,
  treeData,
  listData
}) {
  // 1. SORTING VISUALIZER RENDERER
  if (activeCategory === 'Sorting') {
    const currentArray = stepData?.array || arrayData || [];
    const maxVal = Math.max(...currentArray, 100);
    const activeIndices = stepData?.indices || [];
    const stepType = stepData?.type || 'default';

    return (
      <div className="canvas-container sorting-canvas">
        <div className="bars-wrapper">
          {currentArray.map((val, idx) => {
            const isCompared = stepType === 'compare' && activeIndices.includes(idx);
            const isSwapped = stepType === 'swap' && activeIndices.includes(idx);
            const isPivot = stepType === 'pivot' && activeIndices.includes(idx);
            const isOverwrite = stepType === 'overwrite' && activeIndices.includes(idx);
            const isSorted = stepType === 'sorted_all' || (stepType === 'sorted' && activeIndices.includes(idx));

            let barClass = 'bar-default';
            if (isSwapped) barClass = 'bar-swapped';
            else if (isCompared) barClass = 'bar-compared';
            else if (isPivot) barClass = 'bar-pivot';
            else if (isOverwrite) barClass = 'bar-overwrite';
            else if (isSorted) barClass = 'bar-sorted';

            const heightPct = Math.max((val / maxVal) * 85, 8);

            return (
              <div key={idx} className="bar-column">
                <span className="bar-val font-mono">{val}</span>
                <div
                  className={`bar-element ${barClass}`}
                  style={{ height: `${heightPct}%` }}
                >
                  <div className="bar-shine" />
                </div>
                <span className="bar-index font-mono">{idx}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 2. GRAPH PATHFINDING VISUALIZER (PROPORTIONAL TREE-LIKE HIERARCHY)
  if (activeCategory === 'Graph') {
    const nodeCoords = [
      { id: 0, x: 300, y: 45, label: '0 (Start)' },
      { id: 1, x: 170, y: 125, label: '1' },
      { id: 2, x: 430, y: 125, label: '2' },
      { id: 3, x: 110, y: 215, label: '3' },
      { id: 4, x: 300, y: 215, label: '4' },
      { id: 5, x: 490, y: 215, label: '5' },
      { id: 6, x: 300, y: 295, label: '6 (Target)' }
    ];

    const edges = graphData?.edges || [
      { from: 0, to: 1, weight: 4 },
      { from: 0, to: 2, weight: 2 },
      { from: 1, to: 2, weight: 1 },
      { from: 1, to: 3, weight: 5 },
      { from: 2, to: 3, weight: 8 },
      { from: 2, to: 4, weight: 10 },
      { from: 3, to: 4, weight: 2 },
      { from: 3, to: 5, weight: 6 },
      { from: 4, to: 6, weight: 3 },
      { from: 5, to: 6, weight: 1 }
    ];

    const visitedNodes = stepData?.visitedNodes || [];
    const pathNodes = stepData?.pathNodes || [];
    const currentNode = stepData?.currentNode;
    const distances = stepData?.distances || {};

    return (
      <div className="canvas-container graph-canvas">
        <svg className="graph-svg" viewBox="0 0 600 330" preserveAspectRatio="xMidYMid meet">
          {/* Draw Edges */}
          {edges.map((e, idx) => {
            const source = nodeCoords[e.from];
            const target = nodeCoords[e.to];
            const isPathEdge =
              pathNodes.includes(e.from) &&
              pathNodes.includes(e.to) &&
              Math.abs(pathNodes.indexOf(e.from) - pathNodes.indexOf(e.to)) === 1;

            const isExploredEdge =
              (visitedNodes.includes(e.from) && visitedNodes.includes(e.to));

            let strokeColor = 'rgba(148, 163, 184, 0.3)';
            let strokeWidth = 2.5;
            if (isPathEdge) {
              strokeColor = '#10b981';
              strokeWidth = 4.5;
            } else if (isExploredEdge) {
              strokeColor = 'rgba(56, 189, 248, 0.7)';
              strokeWidth = 3;
            }

            const midX = (source.x + target.x) / 2;
            const midY = (source.y + target.y) / 2;

            return (
              <g key={idx}>
                <line
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  strokeDasharray={isPathEdge ? '0' : '4 2'}
                />
                <circle cx={midX} cy={midY} r="12" fill="#0f172a" stroke="#475569" strokeWidth="1.5" />
                <text
                  x={midX}
                  y={midY + 4}
                  textAnchor="middle"
                  fill="#fbbf24"
                  fontSize="11"
                  className="font-mono font-extrabold"
                >
                  {e.weight}
                </text>
              </g>
            );
          })}

          {/* Draw Graph Nodes */}
          {nodeCoords.map((n) => {
            const isCurrent = currentNode === n.id;
            const isVisited = visitedNodes.includes(n.id);
            const isPath = pathNodes.includes(n.id);
            const dist = distances[n.id] !== undefined ? distances[n.id] : '∞';

            let nodeFill = '#1e293b';
            let nodeStroke = '#64748b';
            if (isPath) {
              nodeFill = '#047857';
              nodeStroke = '#10b981';
            } else if (isCurrent) {
              nodeFill = '#be123c';
              nodeStroke = '#fb7185';
            } else if (isVisited) {
              nodeFill = '#0369a1';
              nodeStroke = '#38bdf8';
            }

            return (
              <g key={n.id} className="graph-node-group">
                {/* Distance Badge Above Node */}
                <rect
                  x={n.x - 22}
                  y={n.y - 42}
                  width="44"
                  height="16"
                  rx="4"
                  fill="#090b10"
                  stroke={isCurrent ? '#f43f5e' : isPath ? '#10b981' : '#38bdf8'}
                  strokeWidth="1.5"
                />
                <text
                  x={n.x}
                  y={n.y - 30}
                  textAnchor="middle"
                  fill={isPath ? '#34d399' : '#38bdf8'}
                  fontSize="10"
                  className="font-mono font-extrabold"
                >
                  d:{dist}
                </text>

                {/* Circle Node */}
                <circle
                  cx={n.x}
                  cy={n.y}
                  r="24"
                  fill={nodeFill}
                  stroke={nodeStroke}
                  strokeWidth={isCurrent || isPath ? '3.5' : '2.5'}
                  className={`transition-all duration-300 ${isCurrent ? 'animate-pulse' : ''}`}
                />
                {/* Bold Node ID */}
                <text
                  x={n.x}
                  y={n.y + 5}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="15"
                  className="font-mono font-black"
                >
                  {n.id}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  // 3. TREE STRUCTURE VISUALIZER
  if (activeCategory === 'Tree') {
    const currentNodeVal = stepData?.currentNode;
    const visitedNodes = stepData?.visitedNodes || [];

    const treeStructure = [
      { id: 50, x: 300, y: 45, left: 30, right: 70 },
      { id: 30, x: 170, y: 130, left: 20, right: 40 },
      { id: 70, x: 430, y: 130, left: 60, right: 80 },
      { id: 20, x: 100, y: 215, left: null, right: null },
      { id: 40, x: 240, y: 215, left: null, right: null },
      { id: 60, x: 360, y: 215, left: null, right: null },
      { id: 80, x: 500, y: 215, left: null, right: null }
    ];

    return (
      <div className="canvas-container tree-canvas">
        <svg className="tree-svg" viewBox="0 0 600 260" preserveAspectRatio="xMidYMid meet">
          {/* Tree Branches */}
          {treeStructure.map((node) => {
            const leftChild = treeStructure.find((n) => n.id === node.left);
            const rightChild = treeStructure.find((n) => n.id === node.right);
            return (
              <g key={`branch-${node.id}`}>
                {leftChild && (
                  <line
                    x1={node.x}
                    y1={node.y}
                    x2={leftChild.x}
                    y2={leftChild.y}
                    stroke="#475569"
                    strokeWidth="2.5"
                  />
                )}
                {rightChild && (
                  <line
                    x1={node.x}
                    y1={node.y}
                    x2={rightChild.x}
                    y2={rightChild.y}
                    stroke="#475569"
                    strokeWidth="2.5"
                  />
                )}
              </g>
            );
          })}

          {/* Tree Nodes */}
          {treeStructure.map((node) => {
            const isCurrent = currentNodeVal === node.id;
            const isVisited = visitedNodes.includes(node.id);

            let fill = '#1e293b';
            let stroke = '#64748b';
            if (isCurrent) {
              fill = '#581c87';
              stroke = '#a855f7';
            } else if (isVisited) {
              fill = '#065f46';
              stroke = '#34d399';
            }

            return (
              <g key={`node-${node.id}`}>
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="24"
                  fill={fill}
                  stroke={stroke}
                  strokeWidth="3"
                  className={isCurrent ? 'animate-pulse' : ''}
                />
                <text
                  x={node.x}
                  y={node.y + 5}
                  textAnchor="middle"
                  fill="#f8fafc"
                  fontSize="15"
                  className="font-mono font-black"
                >
                  {node.id}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  // 4. LINKED LIST / STACK / QUEUE VISUALIZER
  if (activeCategory === 'Data Structures') {
    const list = stepData?.list || stepData?.items || [10, 20, 30, 40];
    const highlightIdx = stepData?.highlightIndex;
    const activeVal = stepData?.activeValue;

    return (
      <div className="canvas-container list-canvas">
        <div className="memory-blocks-wrapper">
          {list.map((val, idx) => {
            const isHighlight = highlightIdx === idx || activeVal === val;
            const address = `0x7f${(100 + idx * 8).toString(16)}`;

            return (
              <React.Fragment key={idx}>
                <div className={`memory-block ${isHighlight ? 'active-memory' : ''}`}>
                  <div className="memory-header">
                    <span className="text-[10px] font-mono text-slate-400">Node [{idx}]</span>
                    <span className="text-[10px] font-mono text-cyan-400">{address}</span>
                  </div>
                  <div className="memory-value font-mono">{val}</div>
                  <div className="memory-footer">
                    {idx === 0 && <span className="badge-pointer head-pointer">HEAD</span>}
                    {idx === list.length - 1 && (
                      <span className="badge-pointer tail-pointer">TAIL</span>
                    )}
                    {idx > 0 && idx < list.length - 1 && (
                      <span className="text-[9px] font-mono text-slate-500">next &rarr;</span>
                    )}
                  </div>
                </div>

                {idx < list.length - 1 && (
                  <div className="pointer-arrow">
                    <ArrowRight className="w-5 h-5 text-cyan-400 animate-pulse" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
}
