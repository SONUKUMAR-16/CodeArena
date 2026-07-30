// src/components/visualizers/TreeVisualizer.jsx
import { useState, useRef, useEffect, useCallback } from "react";

const PLAY_INTERVAL_MS = 1000;

// Binary Tree Node
class TreeNode {
  constructor(val) {
    this.val = val;
    this.left = null;
    this.right = null;
  }
}

// Sample BST
function buildBST() {
  const root = new TreeNode(50);
  root.left = new TreeNode(30);
  root.right = new TreeNode(70);
  root.left.left = new TreeNode(20);
  root.left.right = new TreeNode(40);
  root.right.left = new TreeNode(60);
  root.right.right = new TreeNode(80);
  root.left.left.left = new TreeNode(10);
  root.right.right.right = new TreeNode(90);
  return root;
}

// Get tree nodes with positions
function getTreePositions(root) {
  const positions = [];
  const levels = {};
  
  function traverse(node, x, y, level) {
    if (!node) return;
    positions.push({ val: node.val, x, y });
    if (!levels[level]) levels[level] = [];
    levels[level].push(node.val);
    const offset = 60 / (level + 1);
    traverse(node.left, x - offset, y + 60, level + 1);
    traverse(node.right, x + offset, y + 60, level + 1);
  }
  traverse(root, 200, 40, 0);
  return { positions, levels };
}

function buildFrames(root, algo, target = null) {
  const frames = [];
  const visited = [];
  
  function snap(current, note, highlight = null) {
    frames.push({ 
      type: "tree", 
      current: current || null, 
      visited: [...visited], 
      highlight: highlight || null,
      note 
    });
  }

  if (algo === "inorder") {
    function inorder(node) {
      if (!node) return;
      inorder(node.left);
      visited.push(node.val);
      snap(node.val, `Visiting ${node.val} (Inorder)`);
      inorder(node.right);
    }
    snap(null, "Start Inorder Traversal");
    inorder(root);
    snap(null, "✅ Inorder Complete!");
  } else if (algo === "preorder") {
    function preorder(node) {
      if (!node) return;
      visited.push(node.val);
      snap(node.val, `Visiting ${node.val} (Preorder)`);
      preorder(node.left);
      preorder(node.right);
    }
    snap(null, "Start Preorder Traversal");
    preorder(root);
    snap(null, "✅ Preorder Complete!");
  } else if (algo === "postorder") {
    function postorder(node) {
      if (!node) return;
      postorder(node.left);
      postorder(node.right);
      visited.push(node.val);
      snap(node.val, `Visiting ${node.val} (Postorder)`);
    }
    snap(null, "Start Postorder Traversal");
    postorder(root);
    snap(null, "✅ Postorder Complete!");
  } else if (algo === "levelorder") {
    const queue = [root];
    snap(null, "Start Level Order Traversal");
    while (queue.length) {
      const node = queue.shift();
      if (node) {
        visited.push(node.val);
        snap(node.val, `Visiting ${node.val}`);
        if (node.left) queue.push(node.left);
        if (node.right) queue.push(node.right);
      }
    }
    snap(null, "✅ Level Order Complete!");
  } else if (algo === "bst_search") {
    function search(node, target) {
      if (!node) {
        snap(null, `❌ ${target} not found in BST`);
        return;
      }
      snap(node.val, `Checking ${node.val}`);
      if (node.val === target) {
        snap(node.val, `✅ Found ${target}!`, node.val);
        return;
      }
      if (target < node.val) {
        snap(node.val, `${target} < ${node.val}, go left`);
        search(node.left, target);
      } else {
        snap(node.val, `${target} > ${node.val}, go right`);
        search(node.right, target);
      }
    }
    snap(null, `Search BST for ${target}`);
    search(root, target);
  }
  return frames;
}

export default function TreeVisualizer() {
  const [root] = useState(buildBST);
  const [algo, setAlgo] = useState("inorder");
  const [target, setTarget] = useState(40);
  const [frames, setFrames] = useState([]);
  const [frameIdx, setFrameIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    const newFrames = buildFrames(root, algo, target);
    setFrames(newFrames);
    setFrameIdx(0);
    setPlaying(false);
  }, [algo, root, target]);

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

  const frame = frames[frameIdx] || { note: "Ready" };
  const positions = getTreePositions(root);

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        <select
          value={algo}
          onChange={(e) => setAlgo(e.target.value)}
          className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm"
        >
          <option value="inorder">Inorder Traversal</option>
          <option value="preorder">Preorder Traversal</option>
          <option value="postorder">Postorder Traversal</option>
          <option value="levelorder">Level Order Traversal</option>
          <option value="bst_search">BST Search</option>
        </select>
        {algo === "bst_search" && (
          <input
            type="number"
            value={target}
            onChange={(e) => setTarget(Number(e.target.value))}
            className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm w-24"
            placeholder="Search"
          />
        )}
        <button
          onClick={() => setPlaying(!playing)}
          className="px-3 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-white text-sm transition"
        >
          {playing ? "⏸ Pause" : "▶ Play"}
        </button>
        <button
          onClick={() => { setPlaying(false); step(); }}
          className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white text-sm transition"
        >
          ⏭ Next
        </button>
        <button
          onClick={() => { setPlaying(false); setFrameIdx(0); }}
          className="px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white text-sm transition"
        >
          🔄 Restart
        </button>
      </div>

      <svg viewBox="0 0 400 300" className="w-full h-64 bg-gray-900/50 rounded-xl">
        {/* Draw edges */}
        {positions.positions.map((p, i) => {
          // Find children positions
          const children = positions.positions.filter((_, j) => {
            if (j <= i) return false;
            const dist = Math.abs(p.x - positions.positions[j].x);
            return dist < 80 && positions.positions[j].y > p.y && positions.positions[j].y - p.y < 80;
          });
          return children.map(c => (
            <line key={`edge-${i}-${c}`} x1={p.x} y1={p.y+15} x2={c.x} y2={c.y-15} stroke="#444" strokeWidth="2" />
          ));
        })}
        {/* Draw nodes */}
        {positions.positions.map((p) => {
          let fill = "#2a2a3e";
          let stroke = "#555";
          const isVisited = frame.visited?.includes(p.val);
          const isCurrent = frame.current === p.val;
          const isHighlight = frame.highlight === p.val;
          
          if (isHighlight) { fill = "#4CAF50"; stroke = "#4CAF50"; }
          else if (isCurrent) { fill = "#FFC107"; stroke = "#FFC107"; }
          else if (isVisited) { fill = "#1a3a1a"; stroke = "#4CAF50"; }
          
          return (
            <g key={p.val}>
              <circle cx={p.x} cy={p.y} r="18" fill={fill} stroke={stroke} strokeWidth="2" />
              <text x={p.x} y={p.y+5} className="fill-white text-sm font-bold text-center">{p.val}</text>
            </g>
          );
        })}
      </svg>

      <p className="text-gray-400 text-sm mt-3">{frame.note}</p>
      <p className="text-gray-500 text-xs mt-1">Step {frameIdx + 1} of {frames.length}</p>
    </div>
  );
}