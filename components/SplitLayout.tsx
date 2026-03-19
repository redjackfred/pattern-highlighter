'use client';

import { useState, useEffect, useRef } from 'react';
import PdfViewer from './PdfViewer';
import PatternHighlighter from './PatternHighlighter';

type ViewMode = 'default' | 'pdf-collapsed' | 'pattern-collapsed';

export default function SplitLayout() {
  const [viewMode, setViewMode] = useState<ViewMode>('default');
  // cycle: default(0) → pdf-collapsed(1) → default(2) → pattern-collapsed(3) → repeat
  const cycleStep = useRef(0);
  const cycle: ViewMode[] = ['default', 'pdf-collapsed', 'default', 'pattern-collapsed'];

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON') return;
      if (e.key === 'Enter') {
        e.preventDefault();
        cycleStep.current = (cycleStep.current + 1) % cycle.length;
        setViewMode(cycle[cycleStep.current]);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const pdfWidth = viewMode === 'pdf-collapsed' ? 'w-0' : viewMode === 'pattern-collapsed' ? 'w-full' : 'w-1/2';
  const patternWidth = viewMode === 'pattern-collapsed' ? 'w-0' : viewMode === 'pdf-collapsed' ? 'w-full' : 'w-1/2';
  const buttonLeft = viewMode === 'pdf-collapsed' ? '8px' : viewMode === 'pattern-collapsed' ? 'calc(100% - 28px)' : 'calc(50% - 10px)';

  return (
    <div className="flex h-screen overflow-hidden">

      {/* Left: PDF viewer */}
      <div className={`h-full overflow-hidden border-r border-gray-200 transition-[width] duration-300 ease-in-out ${pdfWidth}`}>
        <PdfViewer />
      </div>

      {/* Right: Pattern Highlighter */}
      <div className={`h-full overflow-hidden transition-[width] duration-300 ease-in-out ${patternWidth}`}>
        <PatternHighlighter />
      </div>

      {/* Buttons — ride the boundary between panels */}
      <div
        className="fixed top-1/2 -translate-y-1/2 z-50 flex flex-col gap-1"
        style={{
          left: buttonLeft,
          transition: 'left 300ms ease-in-out',
        }}
      >
        {/* Top: collapse/expand PDF viewer — hidden when pattern is collapsed */}
        {viewMode !== 'pattern-collapsed' && (
          <button
            tabIndex={-1} onMouseDown={(e) => e.preventDefault()}
            onClick={() => setViewMode((m) => m === 'pdf-collapsed' ? 'default' : 'pdf-collapsed')}
            aria-label={viewMode === 'pdf-collapsed' ? 'Expand PDF viewer' : 'Collapse PDF viewer'}
            className="w-5 h-12 flex items-center justify-center bg-white border border-gray-200 rounded-lg text-gray-400 hover:text-gray-800 hover:bg-gray-50 shadow-[0_2px_8px_rgb(0,0,0,0.06)] transition-colors"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {viewMode === 'pdf-collapsed' ? (
                <polyline points="3,1 7,5 3,9" />
              ) : (
                <polyline points="7,1 3,5 7,9" />
              )}
            </svg>
          </button>
        )}

        {/* Bottom: collapse/expand Pattern Highlighter — hidden when pdf is collapsed */}
        {viewMode !== 'pdf-collapsed' && (
          <button
            tabIndex={-1} onMouseDown={(e) => e.preventDefault()}
            onClick={() => setViewMode((m) => m === 'pattern-collapsed' ? 'default' : 'pattern-collapsed')}
            aria-label={viewMode === 'pattern-collapsed' ? 'Expand pattern highlighter' : 'Collapse pattern highlighter'}
            className="w-5 h-12 flex items-center justify-center bg-white border border-gray-200 rounded-lg text-gray-400 hover:text-gray-800 hover:bg-gray-50 shadow-[0_2px_8px_rgb(0,0,0,0.06)] transition-colors"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {viewMode === 'pattern-collapsed' ? (
                <polyline points="7,1 3,5 7,9" />
              ) : (
                <polyline points="3,1 7,5 3,9" />
              )}
            </svg>
          </button>
        )}
      </div>

    </div>
  );
}
