import React, { useState, useEffect } from 'react'
import './App.css'
import './AppChatEvaluate.css'
import { useInfoPanelQuestion } from './hooks/useInfoPanelQuestion'

/**
 * LLM-as-Judge tab — generate a RAG answer then score it automatically.
 *
 * Shows the retrieved docs, the generated answer, and three evaluation
 * scores (faithfulness, relevance, completeness) with reasoning.
 */

const SCORE_META = {
  faithfulness:  { label: 'Faithfulness',  desc: 'Every claim supported by docs', color: '#6366f1' },
  relevance:     { label: 'Relevance',      desc: 'Answer addresses the question',  color: '#0891b2' },
  completeness:  { label: 'Completeness',   desc: 'All key aspects covered',        color: '#059669' },
}

const EXAMPLES = [
  'What is Couchbase Vector Search?',
  'How do I store embeddings in Couchbase?',
  'What is the difference between L2 and cosine distance?',
  'How does Capella AI Services extend vector search?',
]

function ScoreGauge({ value, color }) {
  const pct = ((value - 1) / 4) * 100  // 1–5 → 0–100%
  const label = ['', 'Poor', 'Weak', 'Fair', 'Good', 'Excellent'][value] || '?'
  return (
    <div className="gauge-wrap">
      <div className="gauge-track">
        <div className="gauge-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="gauge-value" style={{ color }}>{value}/5</span>
      <span className="gauge-label">{label}</span>
    </div>
  )
}

function EvalCard({ evaluation }) {
  if (!evaluation) return null
  if (evaluation.parse_error) {
    return <pre className="eval-raw">{evaluation.raw}</pre>
  }

  const dims = ['faithfulness', 'relevance', 'completeness']
  const overall = dims.reduce((s, k) => s + (evaluation[k] || 0), 0)
  const overallPct = Math.round((overall / 15) * 100)

  return (
    <div className="eval-card">
      <div className="eval-overall">
        <span className="eval-overall-label">Overall</span>
        <span className="eval-overall-score">{overall}/15</span>
        <div className="eval-overall-bar">
          <div className="eval-overall-fill" style={{ width: `${overallPct}%` }} />
        </div>
        <span className="eval-overall-pct">{overallPct}%</span>
      </div>

      {dims.map(dim => {
        const meta = SCORE_META[dim]
        return (
          <div key={dim} className="eval-dim">
            <div className="eval-dim-header">
              <span className="eval-dim-label" style={{ color: meta.color }}>{meta.label}</span>
              <span className="eval-dim-desc">{meta.desc}</span>
            </div>
            <ScoreGauge value={evaluation[dim] || 0} color={meta.color} />
          </div>
        )
      })}

      {evaluation.reasoning && (
        <div className="eval-reasoning">
          <span className="eval-reasoning-label">Judge's reasoning</span>
          <p className="eval-reasoning-text">{evaluation.reasoning}</p>
        </div>
      )}
    </div>
  )
}

function DocCard({ doc, rank }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="eval-doc-card">
      <div className="eval-doc-header" onClick={() => setExpanded(v => !v)}>
        <span className="eval-doc-rank">#{rank}</span>
        <span className="eval-doc-path">{doc.filepath?.split('/').pop() || doc.id}</span>
        <span className="eval-doc-score">{doc.score}</span>
        <span className="eval-doc-expand">{expanded ? '▲' : '▼'}</span>
      </div>
      {expanded && <p className="eval-doc-content">{doc.content?.slice(0, 400)}{doc.content?.length > 400 ? '…' : ''}</p>}
    </div>
  )
}

function AppChatEvaluate() {
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

  const run = async (q) => {
    const text = q || query
    if (!text.trim()) return
    setQuery(text)
    setIsLoading(true)
    setError(null)
    setResult(null)
    try {
      const response = await fetch('/api/chat-evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: text }),
      })
      if (!response.ok) throw new Error('Request failed')
      setResult(await response.json())
    } catch {
      setError('Request failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="app evaluate-app">
      <div className="evaluate-query-bar">
        <input
          className="evaluate-input"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && run()}
          placeholder="Ask about Couchbase vector search…"
        />
        <button className="evaluate-btn" onClick={() => run()} disabled={isLoading || !query.trim()}>
          {isLoading ? 'Evaluating…' : 'Generate & Evaluate →'}
        </button>
      </div>
      <div className="evaluate-examples">
        {EXAMPLES.map((ex, i) => (
          <button key={i} className="example-btn" onClick={() => run(ex)}>{ex}</button>
        ))}
      </div>

      {error && <div className="evaluate-error">{error}</div>}

      {result && (
        <div className="evaluate-layout">
          {/* Left: docs + answer */}
          <div className="evaluate-left">
            <div className="eval-section-heading">Retrieved documents</div>
            <div className="eval-doc-list">
              {result.docs.map((doc, i) => <DocCard key={i} doc={doc} rank={i + 1} />)}
            </div>

            <div className="eval-section-heading" style={{ marginTop: '1rem' }}>Generated answer</div>
            <div className="eval-answer-box">
              <p className="eval-answer-text">{result.answer}</p>
            </div>
          </div>

          {/* Right: evaluation */}
          <div className="evaluate-right">
            <div className="eval-section-heading">LLM-as-Judge scores</div>
            <EvalCard evaluation={result.evaluation} />
          </div>
        </div>
      )}

      {!result && !isLoading && (
        <div className="evaluate-placeholder">
          Ask a question to generate a RAG answer and automatically evaluate its quality.
        </div>
      )}
    </div>
  )
}

export default AppChatEvaluate
