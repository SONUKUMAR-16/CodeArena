import React, { useState } from 'react';
import { Terminal, Copy, Check } from 'lucide-react';

export default function CodeViewer({ snippetData, activeLine }) {
  const [copied, setCopied] = useState(false);

  if (!snippetData) return null;

  const lines = snippetData.code.split('\n');

  const handleCopy = () => {
    navigator.clipboard.writeText(snippetData.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="code-viewer-container">
      <div className="code-viewer-header">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span className="font-mono text-xs text-slate-200 font-semibold">
            {snippetData.name} (C++ Source)
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="btn-copy"
          title="Copy C++ Source Code"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400 mr-1" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 mr-1" />
              <span>Copy C++</span>
            </>
          )}
        </button>
      </div>

      <div className="code-body font-mono text-xs">
        {lines.map((lineText, idx) => {
          const lineNumber = idx + 1;
          const isHighlighted = activeLine === lineNumber;

          return (
            <div
              key={idx}
              className={`code-line ${isHighlighted ? 'active-code-line' : ''}`}
            >
              <span className="line-num">{lineNumber}</span>
              <span className="line-content">{lineText || ' '}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
