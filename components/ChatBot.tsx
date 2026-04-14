'use client'

import { DefaultChatTransport } from 'ai'
import { useChat } from '@ai-sdk/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { idbGet } from '@/lib/storage'

async function extractPdfText(buffer: ArrayBuffer): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString()

  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
  const pages = await Promise.all(
    Array.from({ length: pdf.numPages }, (_, i) =>
      pdf.getPage(i + 1).then((p) =>
        p.getTextContent().then((tc) =>
          tc.items
            .map((item) => ('str' in item ? item.str : ''))
            .join(' ')
        )
      )
    )
  )
  return pages.join('\n').slice(0, 80_000)
}

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false)
  const [pdfContext, setPdfContext] = useState<string>('')
  const [extracting, setExtracting] = useState(false)
  const [input, setInput] = useState('')
  const pdfContextRef = useRef('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Hydrate isOpen from localStorage after mount
  useEffect(() => {
    setIsOpen(localStorage.getItem('chatbot-open') === 'true')
  }, [])

  // Keep ref in sync for use inside transport closure
  useEffect(() => {
    pdfContextRef.current = pdfContext
  }, [pdfContext])

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        prepareSendMessagesRequest: async ({ body, messages, id, trigger, messageId }) => ({
          body: { ...body, id, messages, trigger, messageId, pdfContext: pdfContextRef.current },
        }),
      }),
    []
  )

  const { messages, sendMessage, status } = useChat({ transport })
  const isLoading = status === 'streaming' || status === 'submitted'

  // Load PDF from IndexedDB and extract text
  useEffect(() => {
    async function loadPdf() {
      const buffer = await idbGet<ArrayBuffer>('pdf-file')
      if (!buffer) return
      setExtracting(true)
      try {
        const text = await extractPdfText(buffer)
        setPdfContext(text)
      } catch (e) {
        console.error('PDF extraction failed', e)
      } finally {
        setExtracting(false)
      }
    }
    loadPdf()
    window.addEventListener('pdf-uploaded', loadPdf)
    return () => window.removeEventListener('pdf-uploaded', loadPdf)
  }, [])

  // Persist open state
  useEffect(() => {
    localStorage.setItem('chatbot-open', String(isOpen))
  }, [isOpen])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when opened
  useEffect(() => {
    if (isOpen) inputRef.current?.focus()
  }, [isOpen])

  const hasPdf = pdfContext.length > 0
  const canSend = hasPdf && !isLoading && !extracting

  function submit() {
    const text = input.trim()
    if (!text || !canSend) return
    setInput('')
    sendMessage({ text })
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {isOpen && (
        <div className="flex flex-col w-80 h-[440px] rounded-2xl bg-white/70 border border-gray-100/80 shadow-[0_8px_30px_rgb(0,0,0,0.08)] backdrop-blur-sm overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 shrink-0">
            <span className="text-xs font-semibold text-gray-500 tracking-wide uppercase">
              Pattern Assistant
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="w-5 h-5 flex items-center justify-center rounded-md text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Close chat"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M1 1L9 9M9 1L1 9" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
            {messages.length === 0 && (
              <div className="text-gray-400 text-xs text-center mt-8 leading-relaxed">
                {extracting
                  ? 'Reading pattern…'
                  : hasPdf
                  ? 'Ask anything about your pattern.'
                  : 'Upload a PDF to start chatting.'}
              </div>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-gray-800 text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {m.parts
                    .filter((p) => p.type === 'text')
                    .map((p) => ('text' in p ? p.text : ''))
                    .join('')}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-400 rounded-xl px-3 py-2 text-xs">
                  …
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="flex items-end gap-2 px-3 py-2.5 border-t border-gray-100 shrink-0">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={
                extracting
                  ? 'Reading pattern…'
                  : hasPdf
                  ? 'Ask about the pattern…'
                  : 'Upload a PDF first'
              }
              disabled={!canSend}
              rows={1}
              className="flex-1 resize-none bg-gray-50 text-gray-800 text-xs rounded-xl px-3 py-2 outline-none border border-gray-200 focus:border-gray-300 placeholder:text-gray-300 disabled:opacity-50 max-h-20 overflow-y-auto transition-colors"
            />
            <button
              onClick={submit}
              disabled={!canSend || !input.trim()}
              className="w-7 h-7 flex items-center justify-center rounded-xl bg-gray-800 text-white hover:bg-gray-700 disabled:opacity-25 disabled:cursor-not-allowed transition-colors shrink-0"
              aria-label="Send"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 8V2M2 5l3-3 3 3" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Toggle button — matches the panel collapse buttons */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/70 border border-gray-100/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-sm text-gray-500 hover:text-gray-800 hover:bg-gray-50 text-xs font-medium transition-colors"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          {isOpen
            ? <path d="M1 3l4 4 4-4" />
            : <path d="M1 7l4-4 4 4" />}
        </svg>
        Pattern Assistant
      </button>
    </div>
  )
}
