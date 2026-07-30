// src/components/visualizers/GraphVisualizer.jsx
import { useState, useRef, useEffect, useCallback, useMemo } from "react";

const PLAY_INTERVAL_MS = 1000;

const NODES = [
  { id: "A", x: 60, y: 150 },
  { id: "B", x: 160, y: 55 },
  { id: "C", x: 160, y: 245 },
  { id: "D", x: 270, y: 55 },
  { id: "E", x: 270, y: 245 },
  { id: "F", x: 370, y: 120 },
  { id: "G", x: 370, y: 220 },
];

const EDGES = [
  ["A", "B", 4], ["A", "C", 2], ["B", "C", 1], ["B", "D", 5],
  ["C", "D", 8], ["C", "E", 10], ["D", "E", 2], ["D", "F", 6],
  ["E", "F", 3], ["E", "G", 5], ["F", "G", 2],
];

function buildAdj() {
  const adj = {};
  NODES.forEach((n) => (adj[n.id] = []));
  EDGES.forEach(([u, v, w]) => {
    adj[u].push({ to: v, w });
    adj[v].push({ to: u, w });
  });
  return adj;
}

const ALGORITHMS = {
  bfs: "BFS (Breadth First Search)",
  dfs: "DFS (Depth First Search)",
  dijkstra: "Dijkstra's Shortest Path",
  prim: "Prim's MST",
  kruskal: "Kruskal's MST",
  topological: "Topological Sort",
};

function buildFrames(algo, start = "A") {
  const adj = buildAdj();
  const frames = [];
  
  if (algo === "bfs") {
    const visited = new Set([start]);
    const queue = [start];
    const snap = (current, note, edges = []) => frames.push({ type: "graph", visited: [...visited], current, note, edges });
    snap(start, `Start BFS at ${start}`);
    while (queue.length) {
      const u = queue.shift();
      snap(u, `Visiting ${u}`);
      for (const { to } of adj[u]) {
        if (!visited.has(to)) {
          visited.add(to);
          queue.push(to);
          snap(u, `Discovered ${to} from ${u}`, [[u, to]]);
        }
      }
    }
    snap(null, "✅ BFS Complete!");
  } else if (algo === "dfs") {
    const visited = new Set();
    const snap = (current, note, edges = []) => frames.push({ type: "graph", visited: [...visited], current, note, edges });
    function visit(u, parent) {
      visited.add(u);
      snap(u, parent ? `Visiting ${u} from ${parent}` : `Start DFS at ${u}`, parent ? [[parent, u]] : []);
      for (const { to } of adj[u]) {
        if (!visited.has(to)) visit(to, u);
      }
    }
    visit(start, null);
    snap(null, "✅ DFS Complete!");
  } else if (algo === "dijkstra") {
    const dist = {};
    NODES.forEach((n) => (dist[n.id] = Infinity));
    dist[start] = 0;
    const visited = new Set();
    const snap = (current, note, edges = []) => frames.push({ 
      type: "graph-dist", dist: { ...dist }, visited: [...visited], current, note, edges 
    });
    snap(null, `Start at ${start}`);
    while (visited.size < NODES.length) {
      let u = null, best = Infinity;
      for (const n of NODES) {
        if (!visited.has(n.id) && dist[n.id] < best) { best = dist[n.id]; u = n.id; }
      }
      if (u === null) break;
      visited.add(u);
      snap(u, `Visiting ${u} (distance ${dist[u]})`);
      for (const { to, w } of adj[u]) {
        if (!visited.has(to) && dist[u] + w < dist[to]) {
          dist[to] = dist[u] + w;
          snap(u, `Updated ${to}: ${dist[to]}`, [[u, to]]);
        }
      }
    }
    snap(null, "✅ Dijkstra Complete!");
  } else if (algo === "prim") {
    const inTree = new Set([start]);
    const mstEdges = [];
    const snap = (current, note, edge = null) => frames.push({ 
      type: "graph-mst", inTree: [...inTree], mstEdges: [...mstEdges], current, note, edge 
    });
    snap(null, `Start Prim's at ${start}`);
    while (inTree.size < NODES.length) {
      let best = null;
      for (const u of inTree) {
        for (const { to, w } of adj[u]) {
          if (!inTree.has(to) && (!best || w < best.w)) best = { u, to, w };
        }
      }
      if (!best) break;
      mstEdges.push([best.u, best.to]);
      inTree.add(best.to);
      snap(best.to, `Added ${best.u}–${best.to} (${best.w})`, [best.u, best.to]);
    }
    snap(null, "✅ Prim's Complete!");
  } else if (algo === "topological") {
    const inDegree = {};
    NODES.forEach(n => inDegree[n.id] = 0);
    EDGES.forEach(([u, v]) => inDegree[v] = (inDegree[v] || 0) + 1);
    const queue = NODES.filter(n => inDegree[n.id] === 0).map(n => n.id);
    const result = [];
    const snap = (current, note) => frames.push({ 
      type: "graph", visited: [...result], current, note, edges: [] 
    });
    snap(null, "Topological Sort");
    while (queue.length) {
      const u = queue.shift();
      result.push(u);
      snap(u, `Removing ${u}`);
      for (const { to } of adj[u]) {
        inDegree[to]--;
        if (inDegree[to] === 0) {
          queue.push(to);
          snap(u, `${to} has no dependencies, adding to queue`, [[u, to]]);
        }
      }
    }
    snap(null, "✅ Topological Sort Complete!");
  } else if (algo === "kruskal") {
    const sorted = [...EDGES].sort((a, b) => a[2] - b[2]);
    const parent = {};
    NODES.forEach((n) => (parent[n.id] = n.id));
    const find = (x) => { while (parent[x] !== x) x = parent[x]; return x; };
    const union = (a, b) => { parent[find(a)] = find(b); };
    const mstEdges = [];
    const snap = (current, note, rejected = false) => frames.push({ 
      type: "graph-mst", mstEdges: [...mstEdges], current, note, rejected 
    });
    snap(null, "Sort edges by weight");
    for (const [u, v, w] of sorted) {
      if (find(u) !== find(v)) {
        union(u, v);
        mstEdges.push([u, v]);
        snap([u, v], `Added ${u}–${v} (${w})`);
      } else {
        snap([u, v], `Skipped ${u}–${v} (${w}) (would create cycle)`, true);
      }
      if (mstEdges.length === NODES.length - 1) break;
    }
    snap(null, "✅ Kruskal's Complete!");
  }
  return frames;
}

function GraphView({ frame, type }) {
  const visited = frame.visited || frame.inTree || [];
  return (
    <svg viewBox="0 0 430 300" className="w-full h-64 bg-gray-900/50 rounded-xl">
      {EDGES.map(([u, v, w]) => {
        const nu = NODES.find(n => n.id === u);
        const nv = NODES.find(n => n.id === v);
        let stroke = "#444", strokeWidth = 2;
        if (type === "mst" && frame.mstEdges?.some(e => (e[0] === u && e[1] === v) || (e[0] === v && e[1] === u))) {
          stroke = "#4CAF50"; strokeWidth = 4;
        } else if (frame.edges?.some(e => (e[0] === u && e[1] === v) || (e[0] === v && e[1] === u))) {
          stroke = "#FFC107"; strokeWidth = 4;
        } else if (frame.edge && ((frame.edge[0] === u && frame.edge[1] === v) || (frame.edge[0] === v && frame.edge[1] === u))) {
          stroke = frame.rejected ? "#F44336" : "#4CAF50"; strokeWidth = 4;
        }
        return (
          <g key={u+v}>
            <line x1={nu.x} y1={nu.y} x2={nv.x} y2={nv.y} stroke={stroke} strokeWidth={strokeWidth} />
            <text x={(nu.x+nv.x)/2} y={(nu.y+nv.y)/2-4} className="fill-gray-500 text-xs">{w}</text>
          </g>
        );
      })}
      {NODES.map(n => {
        let fill = "#2a2a3e", stroke = "#555";
        if (visited.includes(n.id)) { fill = "#1a3a1a"; stroke = "#4CAF50"; }
        if (frame.current === n.id) { fill = "#3a2a1a"; stroke = "#FFC107"; }
        return (
          <g key={n.id}>
            <circle cx={n.x} cy={n.y} r="18" fill={fill} stroke={stroke} strokeWidth="2" />
            <text x={n.x} y={n.y+5} className="fill-white text-sm font-bold text-center">{n.id}</text>
            {frame.dist && (
              <text x={n.x} y={n.y+33} className="fill-gray-400 text-xs text-center">
                {frame.dist[n.id] === Infinity ? "∞" : frame.dist[n.id]}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default function GraphVisualizer() {
  const [algo, setAlgo] = useState("bfs");
  const [startNode, setStartNode] = useState("A");
  const frames = useMemo(() => buildFrames(algo, startNode), [algo, startNode]);
  const [frameIdx, setFrameIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => { setFrameIdx(0); setPlaying(false); }, [algo, startNode]);

  const step = useCallback(() => {
    setFrameIdx(idx => {
      if (idx < frames.length - 1) return idx + 1;
      setPlaying(false); return idx;
    });
  }, [frames.length]);

  useEffect(() => {
    if (playing) {
      timerRef.current = setInterval(step, PLAY_INTERVAL_MS);
      return () => clearInterval(timerRef.current);
    }
    clearInterval(timerRef.current);
  }, [playing, step]);

  const frame = frames[frameIdx] || {};

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        <select
          value={algo}
          onChange={(e) => setAlgo(e.target.value)}
          className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm"
        >
          {Object.entries(ALGORITHMS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <select
          value={startNode}
          onChange={(e) => setStartNode(e.target.value)}
          className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm"
        >
          {NODES.map(n => <option key={n.id} value={n.id}>Start: {n.id}</option>)}
        </select>
        <button onClick={() => setPlaying(!playing)} className="px-3 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-white text-sm transition">
          {playing ? "⏸ Pause" : "▶ Play"}
        </button>
        <button onClick={() => { setPlaying(false); step(); }} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white text-sm transition">
          ⏭ Next
        </button>
        <button onClick={() => { setPlaying(false); setFrameIdx(0); }} className="px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white text-sm transition">
          🔄 Restart
        </button>
      </div>

      <GraphView frame={frame} type={algo === "prim" || algo === "kruskal" ? "mst" : "graph"} />
      
      <p className="text-gray-400 text-sm mt-3">{frame.note || "Select an algorithm to begin"}</p>
      <p className="text-gray-500 text-xs mt-1">Step {frameIdx + 1} of {frames.length}</p>
    </div>
  );
}