import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import { spring, springEntrance, fadeUp } from '../lib/motion'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

const pad = (n: number) => String(n).padStart(3, '0')

interface ChatEntry {
  id: number
  question: string
  answer: string
  pages: number[]
  error?: boolean
}

function LoadingDots() {
  return (
    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', padding: '0.5rem 0' }}>
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'var(--accent)',
          }}
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

function PageImage({ src, pageNum }: { src: string; pageNum: number }) {
  const [loaded, setLoaded] = useState(false)
  return (
    <motion.div
      className="chat-page-card"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...springEntrance }}
    >
      <div className="chat-page-label">Page {pageNum}</div>
      <img
        src={src}
        alt={`Guideline page ${pageNum}`}
        className="chat-page-img"
        style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.2s' }}
        onLoad={() => setLoaded(true)}
      />
    </motion.div>
  )
}

function ChatBubble({ entry, index }: { entry: ChatEntry; index: number }) {
  return (
    <motion.div
      className="chat-entry"
      variants={fadeUp}
      initial="initial"
      animate="animate"
      transition={{ ...springEntrance, delay: index * 0.04 }}
    >
      {/* Question */}
      <div className="chat-question">
        <span className="chat-q-label">You</span>
        <p className="chat-q-text">{entry.question}</p>
      </div>

      {/* Answer */}
      <div className={`chat-answer ${entry.error ? 'chat-answer-error' : ''}`}>
        <span className="chat-a-label">AI</span>
        <div className="chat-a-body">
          <ReactMarkdown>{entry.answer}</ReactMarkdown>
        </div>
      </div>

      {/* PDF page images */}
      {entry.pages.length > 0 && (
        <div className="chat-pages-section">
          <div className="chat-pages-title">Referenced pages ({entry.pages.length})</div>
          <div className="chat-pages-grid">
            {entry.pages.map(p => (
              <PageImage
                key={p}
                pageNum={p}
                src={`${API_BASE_URL}/images/page_${pad(p)}.png`}
              />
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}

export default function Chat() {
  const navigate = useNavigate()
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<ChatEntry[]>([])
  const nextId = useRef(0)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (history.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [history])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const q = question.trim()
    if (!q || loading) return

    setQuestion('')
    setLoading(true)

    try {
      const res = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Unknown error' }))
        throw new Error(err.detail ?? `Server error ${res.status}`)
      }

      const data = await res.json()
      setHistory(h => [
        ...h,
        {
          id: nextId.current++,
          question: q,
          answer: data.answer ?? 'No answer returned.',
          pages: Array.isArray(data.page_numbers) ? data.page_numbers : [],
        },
      ])
    } catch (err) {
      setHistory(h => [
        ...h,
        {
          id: nextId.current++,
          question: q,
          answer: `Could not get an answer. ${err instanceof Error ? err.message : 'Please check that the backend is running and try again.'}`,
          pages: [],
          error: true,
        },
      ])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent)
    }
  }

  return (
    <div className="chat-container">
      {/* Header */}
      <header className="site-header">
        <div className="header-content">
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={springEntrance}>
            <h1 className="site-title">Ask AI</h1>
            <p className="site-subtitle">Clinical decision support · Indian Adult Immunization Guidelines 2026</p>
          </motion.div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <motion.button
              className="schedule-btn"
              onClick={() => navigate('/')}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              transition={spring}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              ← Home
            </motion.button>
          </div>
        </div>
      </header>

      <main className="chat-main">
        {/* Empty state */}
        <AnimatePresence>
          {history.length === 0 && !loading && (
            <motion.div
              className="chat-empty"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ ...springEntrance, delay: 0.1 }}
            >
              <div className="chat-empty-icon">✦</div>
              <p className="chat-empty-title">Ask a clinical question</p>
              <p className="chat-empty-sub">
                Describe your patient — age, conditions, risk factors.<br />
                The AI will recommend vaccines based on the 2026 guidelines.
              </p>
              <div className="chat-example-chips">
                {[
                  'Patient is 65 and diabetic — which vaccines?',
                  'Pregnant woman, 28 weeks — what is safe?',
                  'HIV positive adult — vaccination schedule?',
                  'Healthcare worker — which vaccines are mandatory?',
                ].map(ex => (
                  <motion.button
                    key={ex}
                    className="chat-example-chip"
                    onClick={() => setQuestion(ex)}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    transition={spring}
                  >
                    {ex}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Conversation history */}
        <div className="chat-history">
          {history.map((entry, i) => (
            <ChatBubble key={entry.id} entry={entry} index={i} />
          ))}

          {/* Loading indicator */}
          <AnimatePresence>
            {loading && (
              <motion.div
                className="chat-loading"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={springEntrance}
              >
                <span className="chat-a-label">AI</span>
                <LoadingDots />
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={bottomRef} />
        </div>

        {/* Input form */}
        <motion.form
          className="chat-form"
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springEntrance, delay: 0.15 }}
        >
          <textarea
            ref={inputRef}
            className="chat-input"
            placeholder="Ask about a patient (e.g. Patient is 65 and diabetic, which vaccines?)"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            disabled={loading}
          />
          <motion.button
            type="submit"
            className="chat-submit-btn"
            disabled={!question.trim() || loading}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            transition={spring}
          >
            {loading ? 'Asking…' : 'Ask'}
          </motion.button>
        </motion.form>
        <p className="chat-hint">Press Enter to submit · Shift+Enter for new line</p>
      </main>
    </div>
  )
}
