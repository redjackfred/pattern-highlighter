'use client';

import React, { useState, useEffect, useRef } from 'react';
import ReactCrop, { type Crop, type PercentCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

export default function PatternHighlighter() {
  const [imgSrc, setImgSrc] = useState<string>('');
  const [totalRows, setTotalRows] = useState<number | ''>(15);
  const [currentRow, setCurrentRow] = useState<number>(1);
  const [isHighlightMode, setIsHighlightMode] = useState<boolean>(false);

  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PercentCrop | null>(null);

  const imageRef = useRef<HTMLImageElement>(null);

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

  // 3. 處理鍵盤上下鍵 (只有在高亮模式才啟用)
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
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 font-sans text-gray-800">

      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Pattern Highlighter</h1>
        <p className="text-gray-500 text-sm">專注於你的每一段編織</p>
      </div>

      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 overflow-hidden">

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
          <div className="flex flex-col gap-6">

            {/* 頂部極簡控制列 */}
            <div className="flex flex-wrap items-center justify-between bg-gray-50 p-4 rounded-2xl">

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
            <div className="w-full flex justify-center bg-gray-50 border border-gray-100 rounded-2xl overflow-hidden p-4">

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
                    style={{ maxHeight: '70vh', width: 'auto' }}
                    className="block max-w-full object-contain"
                  />
                </ReactCrop>
              ) : (
                // 【關鍵 3】這裡的外層容器也必須是 inline-flex
                <div className="relative inline-flex">
                  <img
                    src={imgSrc}
                    alt="Pattern"
                    style={{ maxHeight: '70vh', width: 'auto' }}
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
    </div>
  );
}
