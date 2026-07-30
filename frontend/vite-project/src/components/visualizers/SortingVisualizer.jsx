// src/components/visualizers/SortingVisualizer.jsx
import { useState, useRef, useEffect, useCallback } from "react";

const ALGORITHMS = {
  bubble: "Bubble Sort",
  selection: "Selection Sort",
  insertion: "Insertion Sort",
  merge: "Merge Sort",
  quick: "Quick Sort",
  heap: "Heap Sort",
  shell: "Shell Sort",
};

const N = 10;
const PLAY_INTERVAL_MS = 800;

function randomArray() {
  return Array.from({ length: N }, () => Math.floor(Math.random() * 90) + 10);
}

function buildFrames(startArray, algo) {
  const a = startArray.slice();
  const frames = [];
  const sorted = [];

  const snap = (compare = [], swap = [], note = "") => {
    frames.push({
      arr: a.slice(),
      compare,
      swap,
      sorted: sorted.slice(),
      note,
    });
  };

  if (algo === "bubble") {
    for (let i = 0; i < a.length; i++) {
      for (let j = 0; j < a.length - i - 1; j++) {
        snap([j, j + 1], [], `Comparing ${a[j]} and ${a[j + 1]}`);
        if (a[j] > a[j + 1]) {
          [a[j], a[j + 1]] = [a[j + 1], a[j]];
          snap([], [j, j + 1], `Swapping ${a[j + 1]} and ${a[j]}`);
        }
      }
      sorted.unshift(a.length - i - 1);
    }
    sorted.length = 0;
    for (let k = 0; k < a.length; k++) sorted.push(k);
    snap([], [], "✅ Sorted!");
  } else if (algo === "selection") {
    for (let i = 0; i < a.length; i++) {
      let min = i;
      for (let j = i + 1; j < a.length; j++) {
        snap([min, j], [], `Finding minimum: comparing ${a[min]} and ${a[j]}`);
        if (a[j] < a[min]) min = j;
      }
      if (min !== i) {
        [a[i], a[min]] = [a[min], a[i]];
        snap([], [i, min], `Swapping ${a[i]} with minimum ${a[min]}`);
      }
      sorted.push(i);
    }
    snap([], [], "✅ Sorted!");
  } else if (algo === "insertion") {
    sorted.push(0);
    for (let i = 1; i < a.length; i++) {
      let j = i;
      while (j > 0 && a[j - 1] > a[j]) {
        snap([j - 1, j], [], `Comparing ${a[j - 1]} and ${a[j]}`);
        [a[j - 1], a[j]] = [a[j], a[j - 1]];
        snap([], [j - 1, j], `Moving ${a[j]} left`);
        j--;
      }
      sorted.length = 0;
      for (let k = 0; k <= i; k++) sorted.push(k);
    }
    snap([], [], "✅ Sorted!");
  } else if (algo === "merge") {
    function mergeSort(lo, hi) {
      if (hi - lo <= 1) return;
      const mid = (lo + hi) >> 1;
      mergeSort(lo, mid);
      mergeSort(mid, hi);
      const left = a.slice(lo, mid);
      const right = a.slice(mid, hi);
      let i = 0, j = 0, k = lo;
      while (i < left.length && j < right.length) {
        snap([lo + i, mid + j], [], `Comparing ${left[i]} and ${right[j]}`);
        if (left[i] <= right[j]) { a[k] = left[i]; i++; } else { a[k] = right[j]; j++; }
        snap([], [k], `Placing ${a[k]}`);
        k++;
      }
      while (i < left.length) { a[k] = left[i]; snap([], [k], `Placing ${a[k]}`); i++; k++; }
      while (j < right.length) { a[k] = right[j]; snap([], [k], `Placing ${a[k]}`); j++; k++; }
    }
    mergeSort(0, a.length);
    for (let k = 0; k < a.length; k++) sorted.push(k);
    snap([], [], "✅ Sorted!");
  } else if (algo === "quick") {
    function partition(lo, hi) {
      const pivot = a[hi];
      let i = lo;
      for (let j = lo; j < hi; j++) {
        snap([j, hi], [], `Comparing ${a[j]} to pivot ${pivot}`);
        if (a[j] < pivot) {
          [a[i], a[j]] = [a[j], a[i]];
          snap([], [i, j], `Swapping ${a[i]} and ${a[j]}`);
          i++;
        }
      }
      [a[i], a[hi]] = [a[hi], a[i]];
      snap([], [i, hi], `Placing pivot ${a[i]}`);
      return i;
    }
    function quickSort(lo, hi) {
      if (lo >= hi) {
        if (lo === hi) sorted.push(lo);
        return;
      }
      const p = partition(lo, hi);
      sorted.push(p);
      quickSort(lo, p - 1);
      quickSort(p + 1, hi);
    }
    quickSort(0, a.length - 1);
    snap([], [], "✅ Sorted!");
    frames[frames.length - 1].sorted = Array.from({ length: a.length }, (_, k) => k);
  } else if (algo === "heap") {
    const heapify = (n, i) => {
      let largest = i;
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      if (l < n) snap([l, largest], [], `Comparing left child ${a[l]} with parent ${a[largest]}`);
      if (l < n && a[l] > a[largest]) largest = l;
      if (r < n) snap([r, largest], [], `Comparing right child ${a[r]} with largest ${a[largest]}`);
      if (r < n && a[r] > a[largest]) largest = r;
      if (largest !== i) {
        [a[i], a[largest]] = [a[largest], a[i]];
        snap([], [i, largest], `Swapping ${a[i]} and ${a[largest]}`);
        heapify(n, largest);
      }
    };
    for (let i = Math.floor(a.length / 2) - 1; i >= 0; i--) {
      heapify(a.length, i);
    }
    for (let i = a.length - 1; i > 0; i--) {
      [a[0], a[i]] = [a[i], a[0]];
      snap([], [0, i], `Moving max ${a[i]} to end`);
      sorted.unshift(i);
      heapify(i, 0);
    }
    sorted.length = 0;
    for (let k = 0; k < a.length; k++) sorted.push(k);
    snap([], [], "✅ Sorted!");
  } else if (algo === "shell") {
    for (let gap = Math.floor(a.length / 2); gap > 0; gap = Math.floor(gap / 2)) {
      for (let i = gap; i < a.length; i++) {
        const temp = a[i];
        let j = i;
        while (j >= gap && a[j - gap] > temp) {
          snap([j - gap, j], [], `Comparing ${a[j - gap]} and ${temp}`);
          a[j] = a[j - gap];
          j -= gap;
        }
        a[j] = temp;
        snap([], [j], `Placing ${temp}`);
      }
    }
    for (let k = 0; k < a.length; k++) sorted.push(k);
    snap([], [], "✅ Sorted!");
  }

  return frames;
}

export default function SortingVisualizer() {
  const [algo, setAlgo] = useState("bubble");
  const [baseArray, setBaseArray] = useState(randomArray);
  const [frames, setFrames] = useState(() => buildFrames(baseArray, "bubble"));
  const [frameIdx, setFrameIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    setFrames(buildFrames(baseArray, algo));
    setFrameIdx(0);
    setPlaying(false);
  }, [algo, baseArray]);

  const step = useCallback(() => {
    setFrameIdx((idx) => {
      if (idx < frames.length - 1) return idx + 1;
      setPlaying(false);
      return idx;
    });
  }, [frames.length]);

  useEffect(() => {
    if (playing) {
      timerRef.current = setInterval(step, PLAY_INTERVAL_MS);
      return () => clearInterval(timerRef.current);
    }
    clearInterval(timerRef.current);
  }, [playing, step]);

  const frame = frames[frameIdx] || { arr: baseArray, compare: [], swap: [], sorted: [], note: "" };
  const max = Math.max(...frame.arr, 1);

  const barColor = (idx) => {
    if (frame.sorted.includes(idx)) return "bg-green-500";
    if (frame.swap.includes(idx)) return "bg-red-500";
    if (frame.compare.includes(idx)) return "bg-yellow-500";
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
          {Object.entries(ALGORITHMS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <button
          onClick={() => setBaseArray(randomArray())}
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
              className={`w-full rounded-t transition-all duration-300 ${barColor(idx)}`}
              style={{ height: `${(v / max) * 180}px` }}
            />
          </div>
        ))}
      </div>

      <p className="text-gray-400 text-sm mt-3">{frame.note}</p>
      <p className="text-gray-500 text-xs mt-1">Step {frameIdx + 1} of {frames.length}</p>
    </div>
  );
}