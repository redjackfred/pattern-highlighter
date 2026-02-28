'use client';

import React, { useState, useEffect } from 'react';
import { idbSet, idbGet } from '@/lib/storage';

export default function PdfViewer() {
  const [pdfUrl, setPdfUrl] = useState<string>('');

  const handleFile = async (file: File) => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl(URL.createObjectURL(file));
    const buffer = await file.arrayBuffer();
    idbSet('pdf-file', buffer);
  };

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) handleFile(e.target.files[0]);
  };

  // Restore PDF from IndexedDB on mount
  useEffect(() => {
    idbGet<ArrayBuffer>('pdf-file').then(buffer => {
      if (buffer) {
        const blob = new Blob([buffer], { type: 'application/pdf' });
        setPdfUrl(URL.createObjectURL(blob));
      }
    });
  }, []);

  useEffect(() => {
    return () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); };
  }, [pdfUrl]);

  return (
    <div className="h-full bg-gray-50 flex flex-col items-center py-8 px-4 font-sans text-gray-800">

      <div className="text-center mb-10 shrink-0">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Pattern PDF</h1>
        <p className="text-gray-500 text-sm">對照你的每一個步驟</p>
      </div>

      {/* 狀態 1：還沒上傳 PDF */}
      {!pdfUrl && (
        <div className="w-full max-w-4xl bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 overflow-hidden">
          <label className="flex flex-col items-center justify-center w-full h-72 border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer bg-gray-50 hover:bg-gray-100 hover:border-gray-400 transition-all duration-300 group">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <svg className="w-12 h-12 mb-4 text-gray-400 group-hover:text-gray-600 transition-colors" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
              <p className="mb-2 text-lg text-gray-600"><span className="font-semibold text-black">點擊上傳織圖 PDF</span></p>
              <p className="text-sm text-gray-400">支援 .pdf 格式</p>
            </div>
            <input type="file" accept="application/pdf" onChange={onSelectFile} className="hidden" />
          </label>
        </div>
      )}

      {/* 狀態 2：已上傳 PDF */}
      {pdfUrl && (
        <div className="w-full max-w-4xl flex-1 min-h-0 bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 overflow-hidden flex flex-col gap-6">

          {/* 頂部控制列 */}
          <div className="flex flex-wrap items-center justify-between bg-gray-50 py-1 px-4 rounded-2xl shrink-0">
            <span className="text-sm font-medium text-gray-500">Pattern PDF</span>
            <label className="cursor-pointer px-4 py-1 text-sm font-medium text-gray-400 hover:text-black hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              換一個 PDF
              <input type="file" accept="application/pdf" onChange={onSelectFile} className="hidden" />
            </label>
          </div>

          {/* PDF 檢視區 */}
          <div className="flex-1 min-h-0 bg-gray-50 border border-gray-100 rounded-2xl overflow-hidden">
            <iframe
              src={`${pdfUrl}#toolbar=0&navpanes=0`}
              className="w-full h-full border-0"
              title="Pattern PDF"
            />
          </div>

        </div>
      )}

    </div>
  );
}
