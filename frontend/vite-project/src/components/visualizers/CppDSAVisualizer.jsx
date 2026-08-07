import React, { useState, useEffect, useRef } from 'react';
import Navbar from './Navbar';
import ControlPanel from './ControlPanel';
import VisualizerCanvas from './VisualizerCanvas';
import CodeViewer from './CodeViewer';
import InfoPanel from './InfoPanel';
import Legend from './Legend';

import { cppCodeSnippets } from '../../data/cppCodeSnippets';
import { generateSortingSteps } from '../../engines/sortingEngine';
import { generateGraphSteps } from '../../engines/graphEngine';
import { generateTreeSteps } from '../../engines/treeEngine';
import { generateLinkedListSteps, generateStackQueueSteps } from '../../engines/linkedListEngine';

export default function CppDSAVisualizer() {
  const [activeCategory, setActiveCategory] = useState('Graph');
  const [activeAlgorithm, setActiveAlgorithm] = useState('dijkstra');

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [speed, setSpeed] = useState(250);
  const [arraySize, setArraySize] = useState(15);
  const [arrayData, setArrayData] = useState([45, 12, 89, 34, 67, 23, 90, 11, 55, 78, 33, 99, 14, 62, 29]);

  const [steps, setSteps] = useState([]);
  const [graphData, setGraphData] = useState(null);
  const timerRef = useRef(null);

  // Algorithms list by category
  const algorithmsByCategory = {
    Sorting: [
      { id: 'quickSort', name: 'Quick Sort' },
      { id: 'mergeSort', name: 'Merge Sort' },
      { id: 'heapSort', name: 'Heap Sort' },
      { id: 'bubbleSort', name: 'Bubble Sort' },
      { id: 'selectionSort', name: 'Selection Sort' },
      { id: 'insertionSort', name: 'Insertion Sort' }
    ],
    Graph: [
      { id: 'dijkstra', name: "Dijkstra's Shortest Path" },
      { id: 'bfs', name: 'Breadth-First Search (BFS)' },
      { id: 'dfs', name: 'Depth-First Search (DFS)' }
    ],
    Tree: [
      { id: 'bstInsert', name: 'BST Node Insertion' },
      { id: 'bstTraversals', name: 'Tree Traversals (Inorder)' }
    ],
    'Data Structures': [
      { id: 'linkedListOps', name: 'Singly Linked List' },
      { id: 'stackQueueOps', name: 'Stack & Queue Operations' }
    ]
  };

  // Re-generate step trace whenever algorithm, array, or category changes
  useEffect(() => {
    setIsPlaying(false);
    setCurrentStep(0);

    if (activeCategory === 'Sorting') {
      const generated = generateSortingSteps(activeAlgorithm, arrayData);
      setSteps(generated);
    } else if (activeCategory === 'Graph') {
      const { steps: gSteps, edges } = generateGraphSteps(activeAlgorithm);
      setSteps(gSteps);
      setGraphData({ edges });
    } else if (activeCategory === 'Tree') {
      const { steps: tSteps } = generateTreeSteps(activeAlgorithm);
      setSteps(tSteps);
    } else if (activeCategory === 'Data Structures') {
      if (activeAlgorithm === 'linkedListOps') {
        const lSteps = generateLinkedListSteps('insertTail');
        setSteps(lSteps);
      } else {
        const sSteps = generateStackQueueSteps('pushStack');
        setSteps(sSteps);
      }
    }
  }, [activeCategory, activeAlgorithm, arrayData]);

  // Handle Playback Interval
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= steps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, speed);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isPlaying, speed, steps]);

  // Generate new random array for sorting
  const handleRandomize = () => {
    const newArr = Array.from({ length: arraySize }, () =>
      Math.floor(Math.random() * 90) + 10
    );
    setArrayData(newArr);
  };

  // Update array size slider
  const handleSizeChange = (newSize) => {
    setArraySize(newSize);
    const newArr = Array.from({ length: newSize }, () =>
      Math.floor(Math.random() * 90) + 10
    );
    setArrayData(newArr);
  };

  const currentStepData = steps[currentStep] || null;
  const currentSnippet = cppCodeSnippets[activeAlgorithm] || cppCodeSnippets.quickSort;
  const activeLine = currentStepData?.lineHighlight || 1;

  return (
    <div className="dsa-app-layout flex flex-col rounded-xl overflow-hidden border border-gray-700 bg-[#0f1117] w-full">
      {/* Top Navigation */}
      <Navbar
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        activeAlgorithm={activeAlgorithm}
        setActiveAlgorithm={setActiveAlgorithm}
      />

      {/* Control Panel */}
      <ControlPanel
        activeCategory={activeCategory}
        activeAlgorithm={activeAlgorithm}
        setActiveAlgorithm={setActiveAlgorithm}
        isPlaying={isPlaying}
        setIsPlaying={setIsPlaying}
        currentStep={currentStep}
        totalSteps={steps.length}
        onStepForward={() => setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1))}
        onStepBackward={() => setCurrentStep((prev) => Math.max(prev - 1, 0))}
        onReset={() => {
          setIsPlaying(false);
          setCurrentStep(0);
        }}
        speed={speed}
        setSpeed={setSpeed}
        arraySize={arraySize}
        setArraySize={handleSizeChange}
        onRandomize={handleRandomize}
        onCustomInputSubmit={(nums) => setArrayData(nums)}
        algorithmsList={algorithmsByCategory[activeCategory] || []}
      />

      {/* Main Workspace Split - Large Canvas (Left) & Compact Code Snippet (Right) */}
      <main className="main-content flex-1 p-4 min-h-[580px] w-full">
        {/* Left Visualizer Canvas (Wide & Prominent Display) */}
        <section className="visualizer-section">
          <VisualizerCanvas
            activeCategory={activeCategory}
            activeAlgorithm={activeAlgorithm}
            stepData={currentStepData}
            arrayData={arrayData}
            graphData={graphData}
          />
          <Legend activeCategory={activeCategory} />
        </section>

        {/* Right Code Viewer & Info Panel (Reduced Width: Max 420px) */}
        <section className="side-section">
          <CodeViewer snippetData={currentSnippet} activeLine={activeLine} />
          <InfoPanel snippetData={currentSnippet} currentStepData={currentStepData} />
        </section>
      </main>
    </div>
  );
}
