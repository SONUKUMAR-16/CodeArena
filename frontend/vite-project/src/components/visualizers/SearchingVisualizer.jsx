// src/components/visualizers/SearchingVisualizer.jsx
import { useState, useRef, useEffect, useCallback } from "react";

const PLAY_INTERVAL_MS = 800;

function generateSortedArray() {
  return Array.from({ length: 15 }, () => Math.floor(Math.random() * 90) + 10).sort((a, b) => a - b);
}

function buildFrames(arr, target, algo) {
  const frames = [];
  const a = arr.slice();
  
  if (algo === "linear") {
    for (let i = 0; i < a.length; i++) {
      frames.push({ arr: a, current: i, found: false, note: `Checking index ${i}: ${a[i]}` });
      if (a[i] === target) {
        frames.push({ arr: a, current: i, found: true, note: `✅ Found ${target} at index ${i}!` });
        return frames;
      }
    }
    frames.push({ arr: a, current: -1, found: false, note: `❌ ${target} not found in array` });
  } else if (algo === "binary") {
    let left = 0, right = a.length - 1;
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      frames.push({ arr: a, left, right, mid, found: false, note: `Checking middle: ${a[mid]}` });
      if (a[mid] === target) {
        frames.push({ arr: a, left, right, mid, found: true, note: `✅ Found ${target} at index ${mid}!` });
        return frames;
      }
      if (a[mid] < target) {
        frames.push({ arr: a, left: mid + 1, right, mid, found: false, note: `${target} > ${a[mid]}, search right half` });
        left = mid + 1;
      } else {
        frames.push({ arr: a, left, right: mid - 1, mid, found: false, note: `${target} < ${a[mid]}, search left half` });
        right = mid - 1;
      }
    }
    frames.push({ arr: a, left, right, mid: -1, found: false, note: `❌ ${target} not found in array` });
  }
  return frames;
}

export default function SearchingVisualizer() {
  const [arr, setArr] = useState(generateSortedArray);
  const [target, setTarget] = useState(50);
  const [algo, setAlgo] = useState("linear");
  const [frames, setFrames] = useState([]);
  const [frameIdx, setFrameIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef(null);

  const generateNew = () => {
    const newArr = generateSortedArray();
    setArr(newArr);
    const newFrames = buildFrames(newArr, target, algo);
    setFrames(newFrames);
    setFrameIdx(0);
    setPlaying(false);
  };

  useEffect(() => {
    const newFrames = buildFrames(arr, target, algo);
    setFrames(newFrames);
    setFrameIdx(0);
    setPlaying(false);
  }, [algo, arr, target]);

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

  const frame = frames[frameIdx] || { arr, current: -1, found: false, note: "Ready" };
  const max = Math.max(...arr, 1);

  const getColor = (idx) => {
    if (frame.found && idx === frame.current) return "bg-green-500";
    if (frame.current === idx) return "bg-yellow-500";
    if (frame.left !== undefined && idx >= frame.left && idx <= frame.right) return "bg-blue-900/50";
    if (frame.mid === idx && !frame.found) return "bg-yellow-500/50";
    return "bg-blue-500";
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        <select
          value={algo}
          onChange={(e) => setAlgo(e.target.value)}
          className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm"
        >
          <option value="linear">Linear Search</option>
          <option value="binary">Binary Search</option>
        </select>
        <input
          type="number"
          value={target}
          onChange={(e) => setTarget(Number(e.target.value))}
          className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm w-24"
          placeholder="Target"
        />
        <button
          onClick={generateNew}
          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm transition"
        >
          🔄 New Array
        </button>
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

      <div className="flex items-end gap-1 h-64 bg-gray-900/50 rounded-xl p-4">
        {frame.arr.map((v, idx) => (
          <div key={idx} className="flex-1 flex flex-col items-center gap-1">
            <div className="text-xs text-gray-400">{v}</div>
            <div 
              className={`w-full rounded-t transition-all duration-300 ${getColor(idx)}`}
              style={{ height: `${(v / max) * 180}px` }}
            />
            {frame.mid === idx && (
              <div className="text-xs text-yellow-400">←</div>
            )}
          </div>
        ))}
      </div>

      <p className="text-gray-400 text-sm mt-3">{frame.note}</p>
      <p className="text-gray-500 text-xs mt-1">Step {frameIdx + 1} of {frames.length}</p>
    </div>
  );
}