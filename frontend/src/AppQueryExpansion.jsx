import React, { useState, useEffect } from 'react'
import './App.css'
import './AppQueryExpansion.css'
import { useInfoPanelQuestion } from './hooks/useInfoPanelQuestion'

const EXAMPLES = [
  'How does CSS flexbox work?',
  'What is event delegation in JavaScript?',
  'How do I handle errors in async functions?',
  'What is the difference between null and undefined?',
]

export default function AppQueryExpansion() {
  const [query, setQuery] = useState('')
  useInfoPanelQuestion(setQuery)
  const [result, setResult] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const h = (e) => setQuery(e.detail)
    window.addEventListener('infopanel:question', h)
    return () => window.removeEventListener('infopanel:question', h)
  }, [])

  const run = async (override) => {
    const q = override ?? query
    if (!q.trim()) return
    if (override) setQuery(override)
    setIsLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/query-expansion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, n_expansions: 4 }),
      })
      if (!res.ok) throw new Error('Request failed')
      setResult(await res.json())
    } catch {
      setError('Request failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="app qe-app">
      <div className="qe-controls">
        <div className="qe-query-row">
          <input
            className="qe-input"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && run()}
            placeholder="Enter a search query to expand…"
          />
          <button className="qe-run-btn" onClick={() => run()} disabled={isLoading || !query.trim()}>
            {isLoading ? 'Expanding…' : 'Expand →'}
          </button>
        </div>
        <div className="qe-examples">
          {EXAMPLES.map((ex, i) => (
            <button key={i} className="example-btn" onClick={() => run(ex)}>{ex}</button>
          ))}
        </div>
      </div>

      {error && <div className="qe-error">{error}</div>}
      {isLoading && (
        <div className="qe-loading">
          Generating expansions, embedding all queries, retrieving docs for each…
        </div>
      )}

      {result && (
        <div className="qe-result">
          {/* Queries */}
          <div className="qe-section">
            <h3 className="qe-section-heading">Queries ({result.all_queries.length})</h3>
            <div className="qe-queries">
              {result.all_queries.map((q, i) => (
                <div key={i} className={`qe-query-chip ${i === 0 ? 'qe-query-chip--original' : ''}`}>
                  {i === 0 && <span className="qe-original-badge">original</span>}
                  {q}
                </div>
              ))}
            </div>
          </div>

          {/* Docs */}
          <div className="qe-section">
            <h3 className="qe-section-heading">
              Merged results — {result.total_unique_docs} unique docs
              <span className="qe-section-sub">deduplicated across all {result.all_queries.length} queries</span>
            </h3>
            <div className="qe-docs">
              {result.docs.map((doc, i) => (
                <div key={i} className="qe-doc">
                  <div className="qe-doc-header">
                    <span className="qe-doc-rank">#{i + 1}</span>
                    <span className="qe-doc-path">{doc.filepath || doc.id}</span>
                    <span className="qe-doc-score">score {doc.score?.toFixed(3)}</span>
                    <span className="qe-doc-matched">via: {doc.matched_query}</span>
                  </div>
                  <p className="qe-doc-content">{doc.content?.slice(0, 200)}…</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!result && !isLoading && (
        <div className="qe-placeholder">
          Query expansion generates multiple phrasings of your question, retrieves docs for each,
          then merges and deduplicates the results — improving recall over a single query.
        </div>
      )}
    </div>
  )
}
