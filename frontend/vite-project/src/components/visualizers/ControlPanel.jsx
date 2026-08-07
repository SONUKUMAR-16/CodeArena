import React, { useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, RotateCcw, Shuffle, Sliders, Edit3, Check } from 'lucide-react';

export default function ControlPanel({
  activeCategory,
  activeAlgorithm,
  setActiveAlgorithm,
  isPlaying,
  setIsPlaying,
  currentStep,
  totalSteps,
  onStepForward,
  onStepBackward,
  onReset,
  speed,
  setSpeed,
  arraySize,
  setArraySize,
  onRandomize,
  onCustomInputSubmit,
  algorithmsList
}) {
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customInputText, setCustomInputText] = useState('45, 12, 89, 34, 67, 23, 90, 11');

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    const nums = customInputText
      .split(',')
      .map((s) => parseInt(s.trim()))
      .filter((n) => !isNaN(n));
    if (nums.length > 0) {
      onCustomInputSubmit(nums);
      setShowCustomModal(false);
    }
  };

  return (
    <div className="control-panel flex-wrap gap-4 items-center justify-between">
      {/* 1. Algorithm Selector */}
      <div className="ctrl-group">
        <label className="ctrl-label">Select Algorithm</label>
        <select
          value={activeAlgorithm}
          onChange={(e) => setActiveAlgorithm(e.target.value)}
          className="ctrl-select font-medium text-slate-100"
        >
          {algorithmsList.map((alg) => (
            <option key={alg.id} value={alg.id}>
              {alg.name}
            </option>
          ))}
        </select>
      </div>

      {/* 2. Primary Playback Action Controls */}
      <div className="ctrl-group playback-btns flex items-center gap-2">
        <button
          onClick={onReset}
          className="btn-icon text-xs gap-1.5 px-3 py-1.5"
          title="Restart from Step 1"
        >
          <RotateCcw className="w-4 h-4 text-slate-300" />
          <span className="hidden sm:inline">Reset</span>
        </button>

        <button
          onClick={onStepBackward}
          disabled={currentStep <= 0}
          className="btn-icon text-xs gap-1.5 px-3 py-1.5"
          title="Previous Step"
        >
          <SkipBack className="w-4 h-4 text-slate-300" />
          <span className="hidden sm:inline">Back</span>
        </button>

        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className={`btn-play ${isPlaying ? 'pause' : 'play'} px-4 py-2 text-sm font-semibold`}
          title={isPlaying ? 'Pause Animation' : 'Start Playback'}
        >
          {isPlaying ? (
            <>
              <Pause className="w-4 h-4 fill-current" />
              <span>Pause</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current ml-0.5" />
              <span>Play</span>
            </>
          )}
        </button>

        <button
          onClick={onStepForward}
          disabled={currentStep >= totalSteps - 1}
          className="btn-icon text-xs gap-1.5 px-3 py-1.5"
          title="Next Step"
        >
          <span className="hidden sm:inline">Next</span>
          <SkipForward className="w-4 h-4 text-slate-300" />
        </button>
      </div>

      {/* 3. Step Progress Tracker */}
      <div className="ctrl-group progress-group min-w-[140px]">
        <div className="flex justify-between items-center text-xs font-semibold text-slate-300 mb-1">
          <span>Step Progress</span>
          <span className="font-mono text-cyan-400">
            {totalSteps > 0 ? Math.min(currentStep + 1, totalSteps) : 0} / {totalSteps}
          </span>
        </div>
        <div className="step-bar-outer">
          <div
            className="step-bar-inner"
            style={{ width: `${totalSteps > 0 ? ((currentStep + 1) / totalSteps) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* 4. Speed & Size Adjustments */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="ctrl-group">
          <div className="flex justify-between items-center mb-1">
            <label className="ctrl-label flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              Speed
            </label>
            <span className="text-xs font-mono text-cyan-300">{speed}ms</span>
          </div>
          <input
            type="range"
            min="30"
            max="800"
            step="20"
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="ctrl-slider w-24"
          />
        </div>

        {/* Array Size & Custom Input (Sorting Only) */}
        {activeCategory === 'Sorting' && (
          <>
            <div className="ctrl-group">
              <div className="flex justify-between items-center mb-1">
                <label className="ctrl-label">Size</label>
                <span className="text-xs font-mono text-slate-300">{arraySize}</span>
              </div>
              <input
                type="range"
                min="5"
                max="35"
                value={arraySize}
                onChange={(e) => setArraySize(Number(e.target.value))}
                className="ctrl-slider w-20"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={onRandomize}
                className="btn-secondary"
                title="Generate New Random Numbers"
              >
                <Shuffle className="w-3.5 h-3.5 mr-1" />
                Shuffle
              </button>
              <button
                onClick={() => setShowCustomModal(true)}
                className="btn-secondary"
                title="Provide Custom Array Values"
              >
                <Edit3 className="w-3.5 h-3.5 mr-1" />
                Custom
              </button>
            </div>
          </>
        )}
      </div>

      {/* Custom Input Modal */}
      {showCustomModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="text-sm font-semibold text-cyan-300 mb-2">Custom Array Input</h3>
            <p className="text-xs text-slate-400 mb-3">
              Enter comma-separated integers (e.g. 45, 12, 89, 34, 67):
            </p>
            <form onSubmit={handleCustomSubmit}>
              <input
                type="text"
                value={customInputText}
                onChange={(e) => setCustomInputText(e.target.value)}
                className="modal-input"
                placeholder="45, 12, 89, 34..."
              />
              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="btn-cancel"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-confirm">
                  <Check className="w-3.5 h-3.5 mr-1" /> Apply
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
