'use client';

import React, { useState, useEffect, useRef } from 'react';
import ReactCrop, { type Crop, type PercentCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { idbSet, idbGet } from '@/lib/storage';

function useDraggable(storageKey: string, getDefault: (el: HTMLDivElement) => { x: number; y: number }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) { try { setPos(JSON.parse(saved)); return; } catch { } }
    if (containerRef.current) setPos(getDefault(containerRef.current));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!pos) return;
    localStorage.setItem(storageKey, JSON.stringify(pos));
  }, [pos, storageKey]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const el = containerRef.current;
      setPos({
        x: Math.max(0, Math.min(e.clientX - offset.current.x, window.innerWidth - (el?.offsetWidth ?? 0))),
        y: Math.max(0, Math.min(e.clientY - offset.current.y, window.innerHeight - (el?.offsetHeight ?? 0))),
      });
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    let node = e.target as HTMLElement | null;
    while (node && node !== e.currentTarget) {
      if (node.tagName === 'BUTTON' || node.tagName === 'INPUT' || node.tagName === 'LABEL') return;
      node = node.parentElement;
    }
    if (!pos) return;
    offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    dragging.current = true;
    e.preventDefault();
  };

  const style: React.CSSProperties = pos ? { left: pos.x, top: pos.y } : { visibility: 'hidden' };
  return { containerRef, onMouseDown, style };
}

export default function PatternHighlighter() {
  const [imgSrc, setImgSrc] = useState<string>('');
  const [totalRows, setTotalRows] = useState<number | ''>(15);
  const [currentRow, setCurrentRow] = useState<number>(1);
  const [isHighlightMode, setIsHighlightMode] = useState<boolean>(false);

  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PercentCrop | null>(null);
  const [pugCount, setPugCount] = useState<number>(0);

  const [pomodoroTotal, setPomodoroTotal] = useState(25 * 60);
  const [pomodoroSecs, setPomodoroSecs] = useState(25 * 60);
  const [pomodoroRunning, setPomodoroRunning] = useState(false);
  const [pomodoroFinished, setPomodoroFinished] = useState(false);
  const pomodoroTotalRef = useRef(25 * 60);
  const timerFinishedRef = useRef(false);

  const imageRef = useRef<HTMLImageElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const pugDrag = useDraggable('ph-pug-pos', (el) => ({ x: 24, y: window.innerHeight - el.offsetHeight - 24 }));
  const pomodoroDrag = useDraggable('ph-pomodoro-pos', (el) => ({ x: window.innerWidth - el.offsetWidth - 24, y: window.innerHeight - el.offsetHeight - 24 }));

  // 統一處理圖片檔案的邏輯 (重置所有狀態)
  const handleImageFile = (file: File) => {
    setCrop(undefined);
    setCompletedCrop(null);
    setIsHighlightMode(false);
    setCurrentRow(1); // 換新圖時，行數重置回 1

    const reader = new FileReader();
    reader.addEventListener('load', () => setImgSrc(reader.result?.toString() || ''));
    reader.readAsDataURL(file);
  };

  // 1. 處理 Input 點擊上傳
  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleImageFile(e.target.files[0]);
    }
  };

  // 2. 處理全域「貼上 (Paste)」截圖
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            handleImageFile(file);
            e.preventDefault(); // 阻止預設貼上行為
          }
          break; // 抓到第一張圖就跳出迴圈
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // 3. 處理左右鍵：pug 計數器 (永遠啟用，input 聚焦時跳過)
  useEffect(() => {
    const handlePugKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setPugCount((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setPugCount((prev) => prev + 1);
      }
    };
    window.addEventListener('keydown', handlePugKey, { passive: false });
    return () => window.removeEventListener('keydown', handlePugKey);
  }, []);

  // 5. 番茄鐘：Space 鍵切換 (input/button 聚焦時跳過)
  useEffect(() => {
    const handleSpace = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON') return;
      if (e.key === ' ') {
        e.preventDefault();
        setPomodoroRunning((r) => !r);
      }
    };
    window.addEventListener('keydown', handleSpace);
    return () => window.removeEventListener('keydown', handleSpace);
  }, []);

  // 5. 番茄鐘：同步 ref，避免 interval 內 stale closure
  useEffect(() => { pomodoroTotalRef.current = pomodoroTotal; }, [pomodoroTotal]);

  // 6. 番茄鐘：倒數計時
  useEffect(() => {
    if (!pomodoroRunning) return;
    const id = setInterval(() => {
      setPomodoroSecs((s) => {
        if (s <= 1) {
          timerFinishedRef.current = true;
          setPomodoroRunning(false);
          return pomodoroTotalRef.current;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [pomodoroRunning]);

  // 7. 番茄鐘：偵測自然結束，觸發動畫
  useEffect(() => {
    if (!pomodoroRunning && timerFinishedRef.current) {
      timerFinishedRef.current = false;

      // 全螢幕完成動畫
      setPomodoroFinished(true);

      // 播放音效，與動畫同步（15 秒），淡入淡出
      const TOTAL = 15000;
      const FADE = 1500;
      const audio = new Audio('/2026-02-28%2010-11-49.mp3');
      audioRef.current = audio;
      audio.volume = 0;
      audio.play().catch(() => { });

      const start = Date.now();
      const fadeInterval = setInterval(() => {
        const elapsed = Date.now() - start;
        if (elapsed < FADE) {
          audio.volume = elapsed / FADE;
        } else if (elapsed > TOTAL - FADE) {
          audio.volume = Math.max(0, (TOTAL - elapsed) / FADE);
        } else {
          audio.volume = 1;
        }
      }, 50);

      const t = setTimeout(() => {
        setPomodoroFinished(false);
        clearInterval(fadeInterval);
        audio.pause();
        audio.currentTime = 0;
      }, TOTAL);
      return () => {
        clearTimeout(t);
        clearInterval(fadeInterval);
        audio.pause();
      };
    }
  }, [pomodoroRunning]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // 6. 處理鍵盤上下鍵 (只有在高亮模式才啟用)
  useEffect(() => {
    if (!isHighlightMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setCurrentRow((prev) => Math.min(prev + 1, Number(totalRows) || 1));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setCurrentRow((prev) => Math.max(prev - 1, 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isHighlightMode, totalRows]);

  // ── Persistence ──────────────────────────────────────────────────────────

  // Load all persisted state on mount (defined before save effects so it runs first)
  useEffect(() => {
    const rows = localStorage.getItem('ph-totalRows');
    const row = localStorage.getItem('ph-currentRow');
    const cropStr = localStorage.getItem('ph-completedCrop');
    const mode = localStorage.getItem('ph-isHighlightMode');

    if (rows) setTotalRows(Number(rows));
    if (row) setCurrentRow(Number(row));
    if (cropStr) {
      try {
        const c = JSON.parse(cropStr) as PercentCrop;
        setCompletedCrop(c);
        setCrop(c);
      } catch { }
    }

    idbGet<string>('pattern-image').then(dataUrl => {
      if (dataUrl) {
        setImgSrc(dataUrl);
        if (mode === 'true' && cropStr) setIsHighlightMode(true);
      }
    });
  }, []);

  // Save state whenever it changes
  useEffect(() => { if (imgSrc) idbSet('pattern-image', imgSrc); }, [imgSrc]);
  useEffect(() => { if (totalRows !== '') localStorage.setItem('ph-totalRows', String(totalRows)); }, [totalRows]);
  useEffect(() => { localStorage.setItem('ph-currentRow', String(currentRow)); }, [currentRow]);
  useEffect(() => {
    if (completedCrop) localStorage.setItem('ph-completedCrop', JSON.stringify(completedCrop));
    else localStorage.removeItem('ph-completedCrop');
  }, [completedCrop]);
  useEffect(() => { localStorage.setItem('ph-isHighlightMode', String(isHighlightMode)); }, [isHighlightMode]);

  // ─────────────────────────────────────────────────────────────────────────

  const getHighlightStyle = () => {
    if (!completedCrop) return {};
    const safeTotalRows = Number(totalRows) || 1;
    const rowIndexFromTop = safeTotalRows - currentRow;
    const rowHeightPercent = completedCrop.height / safeTotalRows;
    const topPosition = completedCrop.y + rowIndexFromTop * rowHeightPercent;

    return {
      top: `${topPosition}%`,
      left: `${completedCrop.x}%`,
      width: `${completedCrop.width}%`,
      height: `${rowHeightPercent}%`,
    };
  };

  return (
    <div className="h-full overflow-hidden bg-gray-50 flex flex-col items-center py-4 px-4 font-sans text-gray-800">

      <div className="text-center mb-4 shrink-0">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Pattern Highlighter</h1>
        <p className="text-gray-500 text-sm">專注於你的每一段編織</p>
      </div>

      <div className="w-full max-w-6xl flex-1 min-h-0 bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 overflow-hidden flex flex-col">

        {/* 狀態 1：還沒上傳圖片 */}
        {!imgSrc && (
          <label className="flex flex-col items-center justify-center w-full h-72 border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer bg-gray-50 hover:bg-gray-100 hover:border-gray-400 transition-all duration-300 group relative">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <svg className="w-12 h-12 mb-4 text-gray-400 group-hover:text-gray-600 transition-colors" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2" />
              </svg>
              <p className="mb-2 text-lg text-gray-600"><span className="font-semibold text-black">點擊上傳織圖</span></p>
              <p className="text-sm text-gray-400 font-mono mt-1 bg-gray-200/50 px-2 py-1 rounded">或直接 Ctrl+V / Cmd+V 貼上截圖</p>
            </div>
            <input type="file" accept="image/*" onChange={onSelectFile} className="hidden" />
          </label>
        )}

        {/* 狀態 2 & 3：已上傳圖片 */}
        {imgSrc && (
          <div className="flex-1 min-h-0 flex flex-col gap-4">

            {/* 頂部極簡控制列 */}
            <div className="flex flex-wrap items-center justify-between bg-gray-50 py-2 px-4 rounded-2xl shrink-0">

              {/* 左側操作區 */}
              <div className="flex items-center gap-6">
                {!isHighlightMode ? (
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-500">輸入圖表總段數</span>
                    <input
                      type="number"
                      value={totalRows}
                      onChange={(e) => setTotalRows(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-20 text-center text-lg font-bold border-b-2 border-gray-300 bg-transparent py-1 focus:border-black focus:outline-none transition-colors"
                      min="1"
                    />
                  </div>
                ) : (
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium text-gray-500">目前段數</span>
                    <span className="text-3xl font-bold">{currentRow}</span>
                    <span className="text-sm text-gray-400">/ {totalRows}</span>
                  </div>
                )}
              </div>

              {/* 右側：切換狀態與上傳新圖 */}
              <div className="flex items-center gap-4">
                {/* 常駐的「更換圖片」按鈕 */}
                <label className="cursor-pointer px-4 py-2 text-sm font-medium text-gray-400 hover:text-black hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                  換一張圖
                  <input type="file" accept="image/*" onChange={onSelectFile} className="hidden" />
                </label>

                {isHighlightMode ? (
                  <>
                    <span className="text-xs text-gray-400 mr-2 hidden sm:inline-block">使用 ↑ ↓ 切換</span>
                    <button
                      tabIndex={-1} onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setIsHighlightMode(false);
                        setCurrentRow(1); // 新增這行：每次重新框選時，強制將進度重置回第 1 段（最底端）
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-black hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      重新框選
                    </button>
                  </>
                ) : (
                  <button
                    tabIndex={-1} onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setIsHighlightMode(true)}
                    disabled={!completedCrop?.width || totalRows === '' || totalRows < 1}
                    className="px-6 py-2 text-sm font-medium text-white bg-black rounded-xl hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    開始編織
                  </button>
                )}
              </div>
            </div>

            {/* 織圖顯示區塊 */}
            <div className="w-full flex-1 min-h-0 flex justify-center items-center bg-gray-50 border border-gray-100 rounded-2xl overflow-hidden p-3">

              {!isHighlightMode ? (
                // 【關鍵 1】給 ReactCrop 加上 !inline-flex 確保它的外框行為跟普通的 div 一致
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  onComplete={(_, percentCrop) => setCompletedCrop(percentCrop)}
                  className="!inline-flex"
                >
                  <img
                    ref={imageRef}
                    src={imgSrc}
                    alt="Pattern"
                    // 【關鍵 2】用 inline style 強制綁定高度，加上 block 消滅所有預設縫隙
                    style={{ maxHeight: 'calc(100vh - 260px)', width: 'auto' }}
                    className="block max-w-full object-contain"
                  />
                </ReactCrop>
              ) : (
                // 【關鍵 3】這裡的外層容器也必須是 inline-flex
                <div className="relative inline-flex">
                  <img
                    src={imgSrc}
                    alt="Pattern"
                    style={{ maxHeight: 'calc(100vh - 260px)', width: 'auto' }}
                    className="block max-w-full object-contain"
                  />

                  {/* 高亮遮罩 */}
                  <div
                    className="absolute bg-yellow-300/40 border-y-[3px] border-yellow-400/80 shadow-[0_0_20px_rgba(250,204,21,0.3)] transition-all duration-300 ease-out pointer-events-none mix-blend-multiply"
                    style={getHighlightStyle()}
                  />
                </div>
              )}

            </div>
          </div>
        )}
      </div>

      {/* 🐾 Pug Counter */}
      <div ref={pugDrag.containerRef} className="fixed z-50 select-none cursor-grab [&_button]:cursor-pointer" style={pugDrag.style} onMouseDown={pugDrag.onMouseDown}>
        <div className="flex flex-col items-center gap-2 px-6 py-5 rounded-2xl bg-white/70 border border-gray-100/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-sm">

          {/* Pug favicon */}
          <img src="/LovelyPug.JPG" alt="pug" width={54} height={54} className="object-contain rounded-full" />

          {/* counter */}
          <div className="text-5xl font-black leading-none tracking-tight text-gray-800">
            {pugCount}
          </div>

          {/* key hint */}
          <div className="text-[11px] font-mono tracking-[0.15em] leading-none text-gray-400">
            ◀ ▶
          </div>
        </div>
      </div>

      {/* 🍅 Tomato Clock */}
      <div ref={pomodoroDrag.containerRef} className="fixed z-50 select-none cursor-grab [&_button]:cursor-pointer" style={pomodoroDrag.style} onMouseDown={pomodoroDrag.onMouseDown}>
        <div className="flex flex-col items-center gap-2 px-6 py-5 rounded-2xl bg-white/70 border border-gray-100/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-sm">

          {/* Tomato SVG */}
          <svg width="54" height="54" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* body */}
            <circle cx="22" cy="27" r="15" fill="#ef4444" />
            {/* shine */}
            <ellipse cx="16" cy="21" rx="4.5" ry="3" fill="white" opacity="0.22" transform="rotate(-20 16 21)" />
            {/* stem */}
            <path d="M22 8 C21.5 10 22.5 13 22 16" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            {/* left leaf */}
            <path d="M22 13 C19 9 13 10 13 14 C16 13 20 14 22 13Z" fill="#16a34a" />
            {/* right leaf */}
            <path d="M22 13 C25 9 31 10 31 14 C28 13 24 14 22 13Z" fill="#16a34a" />
          </svg>

          {/* time display — click to toggle */}
          <div
            className={`text-4xl font-black leading-none tracking-tight font-mono transition-colors duration-300 cursor-pointer ${pomodoroRunning ? 'text-red-500' : 'text-gray-800'
              }`}
            onClick={() => setPomodoroRunning((r) => !r)}
          >
            {formatTime(pomodoroSecs)}
          </div>

          {/* controls row */}
          <div className="flex items-center gap-2">
            {/* − minute */}
            <button
              tabIndex={-1} onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                const next = Math.max(60, pomodoroTotal - 60);
                setPomodoroTotal(next);
                setPomodoroSecs(next);
              }}
              disabled={pomodoroRunning}
              className="w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-800 hover:bg-gray-100 disabled:opacity-25 disabled:cursor-not-allowed transition-colors text-base leading-none"
            >
              −
            </button>

            <span className="text-[10px] font-mono text-gray-300">min</span>

            {/* + minute */}
            <button
              tabIndex={-1} onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                const next = Math.min(99 * 60, pomodoroTotal + 60);
                setPomodoroTotal(next);
                setPomodoroSecs(next);
              }}
              disabled={pomodoroRunning}
              className="w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-800 hover:bg-gray-100 disabled:opacity-25 disabled:cursor-not-allowed transition-colors text-base leading-none"
            >
              +
            </button>

            <div className="w-px h-3 bg-gray-200 mx-1" />

            {/* ↺ reset */}
            <button
              tabIndex={-1} onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setPomodoroRunning(false);
                setPomodoroSecs(pomodoroTotal);
              }}
              className="w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-800 hover:bg-gray-100 transition-colors"
              aria-label="Reset timer"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 6A4 4 0 1 1 7.5 2.3" />
                <polyline points="7.5,1 7.5,3 9.5,3" />
              </svg>
            </button>
          </div>

          {/* start / pause button */}
          <button
            tabIndex={-1} onMouseDown={(e) => e.preventDefault()}
            onClick={() => setPomodoroRunning((r) => !r)}
            className="w-full py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 transition-colors flex items-center justify-center gap-1.5 text-sm font-medium"
          >
            <span className="text-xs">{pomodoroRunning ? '▐▌' : '▶'}</span>
            <span>{pomodoroRunning ? 'Pause' : 'Start'}</span>
          </button>

        </div>
      </div>

      {/* 🍅 Timer-up full-screen overlay */}
      {pomodoroFinished && (
        <div className="fixed inset-0 z-[200] pointer-events-none flex items-center justify-center animate-timer-finish">
          <div
            className="absolute inset-0"
            style={{ background: 'radial-gradient(ellipse at center, rgba(255,251,235,0.82) 0%, rgba(255,251,235,0.38) 48%, transparent 72%)' }}
          />
          <div className="relative flex flex-col items-center gap-4 animate-timer-pop">
            <span className="text-7xl leading-none drop-shadow-sm">🍅</span>
            <span className="text-lg font-medium tracking-[0.35em] text-stone-400 uppercase">Time&apos;s up</span>
            <span className="text-sm tracking-wider text-stone-300">Take a gentle breath</span>
          </div>
        </div>
      )}


    </div>
  );
}
