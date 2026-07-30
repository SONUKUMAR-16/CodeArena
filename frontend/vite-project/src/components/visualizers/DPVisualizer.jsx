// src/components/visualizers/DPVisualizer.jsx
import { useState, useRef, useEffect, useCallback, useMemo } from "react";

const PLAY_INTERVAL_MS = 1000;

function buildFibonacciFrames(n = 10) {
  const dp = new Array(n + 1).fill(null);
  const frames = [];
  const snap = (current, note) => frames.push({ type: "dp-array", dp: [...dp], current, note });
  
  dp[0] = 0;
  snap(0, "fib(0) = 0 (base case)");
  if (n >= 1) { dp[1] = 1; snap(1, "fib(1) = 1 (base case)"); }
  for (let i = 2; i <= n; i++) {
    dp[i] = dp[i - 1] + dp[i - 2];
    snap(i, `fib(${i}) = fib(${i-1}) + fib(${i-2}) = ${dp[i-1]} + ${dp[i-2]} = ${dp[i]}`);
  }
  snap(null, `✅ fib(${n}) = ${dp[n]}`);
  return frames;
}

function buildKnapsackFrames() {
  const items = [
    { name: "A", w: 2, v: 3 },
    { name: "B", w: 3, v: 4 },
    { name: "C", w: 4, v: 5 },
    { name: "D", w: 5, v: 6 },
  ];
  const W = 8;
  const dp = Array.from({ length: items.length + 1 }, () => new Array(W + 1).fill(0));
  const frames = [];
  const snap = (row, col, note) => frames.push({ 
    type: "dp-table", dp: dp.map(r => [...r]), row, col, note, items, capacity: W 
  });
  
  snap(0, 0, "Initialize DP table with 0s");
  for (let i = 1; i <= items.length; i++) {
    const { name, w, v } = items[i - 1];
    for (let c = 0; c <= W; c++) {
      if (w > c) {
        dp[i][c] = dp[i - 1][c];
        snap(i, c, `${name} (weight ${w}) doesn't fit in ${c} → carry over ${dp[i-1][c]}`);
      } else {
        const withItem = v + dp[i - 1][c - w];
        const without = dp[i - 1][c];
        dp[i][c] = Math.max(withItem, without);
        snap(i, c, `${name}: take (${v}+${dp[i-1][c-w]}=${withItem}) vs skip (${without}) → ${dp[i][c]}`);
      }
    }
  }
  snap(items.length, W, `✅ Best value: ${dp[items.length][W]}`);
  return frames;
}

function buildLCSFrames() {
  const str1 = "ABCBDAB";
  const str2 = "BDCABA";
  const dp = Array.from({ length: str1.length + 1 }, () => new Array(str2.length + 1).fill(0));
  const frames = [];
  const snap = (i, j, note) => frames.push({ 
    type: "dp-lcs", dp: dp.map(r => [...r]), i, j, note, str1, str2 
  });
  
  for (let i = 1; i <= str1.length; i++) {
    for (let j = 1; j <= str2.length; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
        snap(i, j, `Match: ${str1[i-1]} = ${str2[j-1]} → ${dp[i][j]}`);
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        snap(i, j, `No match → max(${dp[i-1][j]}, ${dp[i][j-1]}) = ${dp[i][j]}`);
      }
    }
  }
  snap(str1.length, str2.length, `✅ LCS Length: ${dp[str1.length][str2.length]}`);
  return frames;
}

function TableView({ frame }) {
  if (frame.type === "dp-array") {
    return (
      <div className="flex gap-2 flex-wrap p-4 bg-gray-900/50 rounded-xl">
        {frame.dp.map((val, i) => (
          <div key={i} className={`p-3 rounded-lg text-center min-w-[50px] ${
            i === frame.current ? "bg-yellow-600" : val !== null ? "bg-green-900/50" : "bg-gray-800"
          }`}>
            <div className="text-xs text-gray-400">{i}</div>
            <div className="text-lg font-bold">{val === null ? "-" : val}</div>
          </div>
        ))}
      </div>
    );
  }

  if (frame.type === "dp-table") {
    return (
      <div className="overflow-x-auto p-4 bg-gray-900/50 rounded-xl">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="p-2 text-left text-gray-400">Items</th>
              {Array.from({ length: frame.capacity + 1 }, (_, i) => (
                <th key={i} className="p-2 text-center text-gray-400">{i}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {frame.dp.map((row, i) => (
              <tr key={i}>
                <td className="p-2 text-gray-400 font-medium">
                  {i === 0 ? "0" : frame.items[i-1]?.name}
                </td>
                {row.map((val, j) => (
                  <td key={j} className={`p-2 text-center ${
                    i === frame.row && j === frame.col ? "bg-yellow-600/50 font-bold" : ""
                  }`}>
                    {val}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (frame.type === "dp-lcs") {
    return (
      <div className="overflow-x-auto p-4 bg-gray-900/50 rounded-xl">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="p-2 text-gray-400"></th>
              <th className="p-2 text-gray-400"></th>
              {frame.str2.split('').map((c, i) => (
                <th key={i} className="p-2 text-center text-gray-400">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {frame.dp.map((row, i) => (
              <tr key={i}>
                <td className="p-2 text-gray-400 font-medium">
                  {i === 0 ? "" : frame.str1[i-1]}
                </td>
                {row.map((val, j) => (
                  <td key={j} className={`p-2 text-center ${
                    i === frame.i && j === frame.j ? "bg-yellow-600/50 font-bold" : ""
                  }`}>
                    {val}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return null;
}

export default function DPVisualizer() {
  const [algo, setAlgo] = useState("fibonacci");
  const [n, setN] = useState(10);
  const frames = useMemo(() => {
    if (algo === "fibonacci") return buildFibonacciFrames(n);
    if (algo === "knapsack") return buildKnapsackFrames();
    if (algo === "lcs") return buildLCSFrames();
    return [];
  }, [algo, n]);
  
  const [frameIdx, setFrameIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => { setFrameIdx(0); setPlaying(false); }, [algo, n]);

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

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        <select
          value={algo}
          onChange={(e) => setAlgo(e.target.value)}
          className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm"
        >
          <option value="fibonacci">Fibonacci (DP)</option>
          <option value="knapsack">0/1 Knapsack</option>
          <option value="lcs">Longest Common Subsequence</option>
        </select>
        {algo === "fibonacci" && (
          <input
            type="number"
            value={n}
            onChange={(e) => setN(Math.max(1, Number(e.target.value)))}
            className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm w-20"
            min="1"
            max="20"
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

      <TableView frame={frame} />

      <p className="text-gray-400 text-sm mt-3">{frame.note}</p>
      <p className="text-gray-500 text-xs mt-1">Step {frameIdx + 1} of {frames.length}</p>
    </div>
  );
}