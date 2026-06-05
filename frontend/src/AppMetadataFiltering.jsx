import React, { useState } from 'react'
import './App.css'
import './AppMetadataFiltering.css'
import { useInfoPanelQuestion } from './hooks/useInfoPanelQuestion'

const EXAMPLES = [
  'How do I make HTTP requests?',
  'What is a Promise?',
  'How does the box model work?',
  'Explain event listeners',
]

const CATEGORIES = [
  { value: '',           label: 'All categories' },
  { value: 'api',        label: '🌐 Web API' },
  { value: 'javascript', label: '📜 JavaScript' },
  { value: 'css',        label: '🎨 CSS' },
  { value: 'html',       label: '🏗️ HTML' },
]

const ACCENT = '#00A3E0'
const FILTERED_COLOR = '#16a34a'
const EXCLUDED_COLOR = '#dc2626'

function DocCard({ doc, variant }) {
  const borderColor = variant === 'filtered' ? FILTERED_COLOR
    : variant === 'excluded' ? EXCLUDED_COLOR
    : '#e5e7eb'
  return (
    <div className="mf-doc-card" style={{ borderLeftColor: borderColor }}>
      <div className="mf-doc-header">
        <span className="mf-doc-score" style={{ color: ACCENT }}>
          score: <strong>{doc.score}</strong>
        </span>
        <span className="mf-doc-filepath">{doc.filepath || doc.id}</span>
      </div>
      {doc.content && (
        <div className="mf-doc-content">{doc.content}</div>
      )}
    </div>
  )
}

export default function AppMetadataFiltering() {
  const [query, setQuery]       = useState('')
  const [category, setCategory] = useState('')
  const [result, setResult]     = useState(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)

  useInfoPanelQuestion(setQuery)

  const run = async (overrideQuery) => {
    const q = overrideQuery ?? query
    if (!q.trim()) return
    if (overrideQuery) setQuery(overrideQuery)
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/metadata-filter-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, category, limit: 6 }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setResult(await res.json())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const hasFilter = category !== ''
  const filteredCount  = result?.filtered?.total_matched ?? 0
  const excludedCount  = result?.filtered?.total_excluded ?? 0
  const candidateCount = result?.unfiltered?.total_candidates ?? 0

  return (
    <div className="app mf-app">
      {/* Controls */}
      <div className="mf-controls">
        <div className="mf-query-row">
          <input
            className="mf-input"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && run()}
            placeholder="Enter a search query…"
          />
          <select
            className="mf-select"
            value={category}
            onChange={e => setCategory(e.target.value)}
          >
            {CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <button
            className="mf-run-btn"
            onClick={() => run()}
            disabled={loading || !query.trim()}
          >
            {loading ? 'Searching…' : 'Search →'}
          </button>
        </div>
        <div className="mf-examples">
          {EXAMPLES.map((ex, i) => (
            <button key={i} className="example-btn" onClick={() => run(ex)}>{ex}</button>
          ))}
        </div>
        {hasFilter && (
          <div className="mf-filter-badge">
            Filtering by category: <strong>{category}</strong>
            <button className="mf-clear-filter" onClick={() => setCategory('')}>✕ clear</button>
          </div>
        )}
      </div>

      {error && <div className="mf-error">{error}</div>}

      {result ? (
        <div className="mf-body">
          {/* Stats bar */}
          <div className="mf-stats-bar">
            <div className="mf-stat">
              <span className="mf-stat-value">{candidateCount}</span>
              <span className="mf-stat-label">candidates retrieved</span>
            </div>
            <div className="mf-stat-arrow">→</div>
            <div className="mf-stat">
              <span className="mf-stat-value" style={{ color: FILTERED_COLOR }}>{filteredCount}</span>
              <span className="mf-stat-label">passed filter</span>
            </div>
            <div className="mf-stat-arrow">+</div>
            <div className="mf-stat">
              <span className="mf-stat-value" style={{ color: EXCLUDED_COLOR }}>{excludedCount}</span>
              <span className="mf-stat-label">excluded</span>
            </div>
          </div>

          {/* Two-column layout */}
          <div className="mf-columns">
            {/* Left: unfiltered baseline */}
            <div className="mf-column">
              <div className="mf-column-header" style={{ borderColor: ACCENT }}>
                <span className="mf-column-title" style={{ color: ACCENT }}>
                  Unfiltered results
                </span>
                <span className="mf-column-meta">{result.unfiltered.latency_ms} ms</span>
              </div>
              {result.unfiltered.error && (
                <div className="mf-column-note mf-column-note--warn">
                  {result.unfiltered.error}
                </div>
              )}
              <div className="mf-column-body">
                {result.unfiltered.results.map(doc => (
                  <DocCard key={doc.id} doc={doc} variant="unfiltered" />
                ))}
              </div>
            </div>

            {/* Right: filtered results */}
            <div className="mf-column">
              <div className="mf-column-header" style={{ borderColor: FILTERED_COLOR }}>
                <span className="mf-column-title" style={{ color: FILTERED_COLOR }}>
                  {hasFilter ? `Filtered: ${category}` : 'No filter applied'}
                </span>
                <span className="mf-column-meta">
                  {filteredCount}/{candidateCount} matched
                </span>
              </div>
              {!hasFilter && (
                <div className="mf-column-note">
                  Select a category above to see metadata filtering in action.
                </div>
              )}
              <div className="mf-column-body">
                {result.filtered.results.map(doc => (
                  <DocCard key={doc.id} doc={doc} variant="filtered" />
                ))}
                {excludedCount > 0 && (
                  <div className="mf-excluded-section">
                    <div className="mf-excluded-label">
                      {excludedCount} result{excludedCount !== 1 ? 's' : ''} excluded by filter:
                    </div>
                    {result.filtered.excluded_previews.map(doc => (
                      <div key={doc.id} className="mf-excluded-item">
                        <span className="mf-excluded-icon">✕</span>
                        <span className="mf-excluded-path">{doc.filepath || doc.id}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SQL++ equivalent */}
          <div className="mf-sql-block">
            <div className="mf-sql-label">SQL++ equivalent (pre-filter)</div>
            <pre className="mf-sql-code">{result.sql_example}</pre>
          </div>
        </div>
      ) : !loading && (
        <div className="mf-placeholder">
          <p>
            Real-world RAG almost always filters by metadata alongside vector similarity.
            Select a category filter above, then run a query to see which documents are
            included and which are excluded.
          </p>
          <ul>
            <li><strong>Unfiltered</strong> — pure vector similarity, all categories</li>
            <li><strong>Filtered</strong> — same query, only documents matching the selected category</li>
            <li>The SQL++ panel shows how to do this as a pre-filter in a single query</li>
          </ul>
        </div>
      )}
    </div>
  )
}
