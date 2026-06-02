import React, { useState, useEffect } from 'react'
import './App.css'
import './AppChatRerank.css'
import { useInfoPanelQuestion } from './hooks/useInfoPanelQuestion'

/**
 * Reranking tab — shows the two-stage retrieval pipeline side by side.
 *
 * Left column: all candidates from ANN vector search (Stage 1).
 * Right column: top-k after LLM reranking (Stage 2) + final answer.
 * Documents that were dropped by reranking are greyed out on the left.
 */

function ScoreBar({ score, max = 10, color = '#6366f1' }) {
  const pct = Math.min(100, Math.round((score / max) * 100))
  return (
    <div className="score-bar-wrap">
      <div className="score-bar" style={{ width: `${pct}%`, background: color }} />
      <span className="score-bar-label">{score}</span>
    </div>
  )
}

function DocCard({ doc, stage }) {
  const [expanded, setExpanded] = useState(false)
  const isDropped = stage === 'pre' && doc.selected === false

  return (
    <div className={`doc-card ${isDropped ? 'doc-card--dropped' : ''} ${doc.selected && stage === 'pre' ? 'doc-card--selected' : ''}`}>
      <div className="doc-card-header" onClick={() => setExpanded(v => !v)}>
        <span className="doc-filepath">{doc.filepath?.split('/').pop() || doc.id}</span>
        <span className="doc-expand">{expanded ? '▲' : '▼'}</span>
      </div>

      <div className="doc-scores">
        {doc.vector_score != null && (
          <div className="doc-score-row">
            <span className="score-label">Vector dist</span>
            <span className="score-value mono">{doc.vector_score}</span>
          </div>
        )}
        {doc.rerank_score != null && (
          <div className="doc-score-row">
            <span className="score-label">Rerank score</span>
            <ScoreBar score={doc.rerank_score} color={isDropped ? '#d1d5db' : '#6366f1'} />
          </div>
        )}
      </div>

      {expanded && (
        <p className="doc-content">{doc.content?.slice(0, 400)}{doc.content?.length > 400 ? '…' : ''}</p>
      )}

      {isDropped && <span className="dropped-badge">dropped by reranker</span>}
      {doc.selected && stage === 'pre' && <span className="kept-badge">kept ✓</span>}
    </div>
  )
}

const EXAMPLES = [
  'How does the CSS box model work?',
  'What is the difference between let and const?',
  'Explain the Fetch API',
  'What are Web Workers?',
]

function AppChatRerank() {
  const [query, setQuery] = useState('')
  useInfoPanelQuestion(setQuery)
  useEffect(() => {
    const h = (e) => setQuery(e.detail)
    window.addEventListener('infopanel:question', h)
    return () => window.removeEventListener('infopanel:question', h)
  }, [])
  const [result, setResult] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const search = async (q) => {
    const text = q || query
    if (!text.trim()) return
    setQuery(text)
    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/chat-rerank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: text }),
      })
      if (!response.ok) throw new Error('Request failed')
      setResult(await response.json())
    } catch {
      setError('Search failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="app rerank-app">
      {/* Query bar */}
      <div className="rerank-query-bar">
        <input
          className="rerank-input"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
          placeholder="Ask a web development question…"
        />
        <button className="rerank-btn" onClick={() => search()} disabled={isLoading || !query.trim()}>
          {isLoading ? 'Searching…' : 'Search →'}
        </button>
      </div>

      {/* Examples */}
      <div className="rerank-examples">
        {EXAMPLES.map((ex, i) => (
          <button key={i} className="example-btn" onClick={() => search(ex)}>{ex}</button>
        ))}
      </div>

      {error && <div className="rerank-error">{error}</div>}

      {result && (
        <div className="rerank-layout">
          {/* Stage 1 */}
          <div className="rerank-col">
            <div className="col-heading">
              <span className="col-stage">Stage 1</span>
              <span className="col-title">ANN vector search — {result.pre_rerank.length} candidates</span>
            </div>
            <div className="doc-list">
              {result.pre_rerank.map((doc, i) => (
                <DocCard key={i} doc={doc} stage="pre" />
              ))}
            </div>
          </div>

          {/* Arrow */}
          <div className="rerank-arrow">→</div>

          {/* Stage 2 */}
          <div className="rerank-col">
            <div className="col-heading">
              <span className="col-stage">Stage 2</span>
              <span className="col-title">LLM reranked — top {result.post_rerank.length}</span>
            </div>
            <div className="doc-list">
              {result.post_rerank.map((doc, i) => (
                <DocCard key={i} doc={doc} stage="post" />
              ))}
            </div>

            {/* Answer */}
            {result.answer && (
              <div className="rerank-answer">
                <span className="answer-label">Answer</span>
                <p className="answer-text">{result.answer}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {!result && !isLoading && (
        <div className="rerank-placeholder">
          Results will appear here. Stage 1 shows all retrieved candidates; Stage 2 shows what the reranker kept.
        </div>
      )}
    </div>
  )
}

export default AppChatRerank
