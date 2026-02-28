'use client';

import { useState } from 'react';
import PdfViewer from './PdfViewer';
import PatternHighlighter from './PatternHighlighter';

export default function SplitLayout() {
  const [open, setOpen] = useState(true);

  return (
    <div className="flex h-screen overflow-hidden">

      {/* Left: PDF viewer */}
      <div
        className={`h-full overflow-hidden border-r border-gray-200 transition-[width] duration-300 ease-in-out ${
          open ? 'w-1/2' : 'w-full'
        }`}
      >
        <PdfViewer />
      </div>

      {/* Right: Pattern Highlighter */}
      <div
        className={`h-full overflow-hidden transition-[width] duration-300 ease-in-out ${
          open ? 'w-1/2' : 'w-0'
        }`}
      >
        <PatternHighlighter />
      </div>

      {/* Toggle tab — rides the boundary between the two panels */}
      <button
        tabIndex={-1} onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Collapse pattern highlighter' : 'Expand pattern highlighter'}
        style={{
          right: open ? 'calc(50% - 10px)' : '8px',
          transition: 'right 300ms ease-in-out, color 150ms, background-color 150ms',
        }}
        className="fixed top-1/2 -translate-y-1/2 z-50 w-5 h-12 flex items-center justify-center bg-white border border-gray-200 rounded-lg text-gray-400 hover:text-gray-800 hover:bg-gray-50 shadow-[0_2px_8px_rgb(0,0,0,0.06)]"
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {open ? (
            <polyline points="3,1 7,5 3,9" />
          ) : (
            <polyline points="7,1 3,5 7,9" />
          )}
        </svg>
      </button>

    </div>
  );
}
