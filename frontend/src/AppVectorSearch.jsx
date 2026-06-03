import React, { useState } from 'react'
import './App.css'
import './AppVectorSearch.css'
import { useInfoPanelQuestion } from './hooks/useInfoPanelQuestion'

const EXAMPLES = [
  'What is an API?',
  'How does DNS work?',
  'What is a closure in JavaScript?',
  'Explain HTTP caching headers',
]

const FTS_COLOR  = '#00A3E0'
const GSI_COLOR  = '#6366f1'

function ScoreBar({ score, max, color }) {
  const pct = max > 0 ? Math.min((score / max) * 100, 100) : 0
  return (
    <div className="vs-bar-wrap">
      <div className="vs-bar" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

function ResultCard({ result, rank, color, scoreLabel }) {
  return (
    <div className="vs-result-card">
      <div className="vs-result-header">
        <span className="vs-result-rank" style={{ background: color }}>#{rank}</span>
        <span className="vs-result-score" style={{ color }}>
          {scoreLabel}: <strong>{result.score}</strong>
        </span>
        <span className="vs-result-id" title={result.id}>{result.id.slice(0, 12)}…</span>
      </div>
      <div className="vs-result-filepath">{result.filepath || '—'}</div>
      <div className="vs-result-content">{result.content}</div>
    </div>
  )
}

function Column({ data, color, label, scoreLabel, scoreNote }) {
  const maxScore = data?.results?.length
    ? Math.max(...data.results.map(r => r.score))
    : 1

  return (
    <div className="vs-column">
      <div className="vs-column-header" style={{ borderColor: color }}>
        <span className="vs-column-label" style={{ color }}>{label}</span>
        <span className="vs-column-meta">
          {data?.latency_ms != null ? `${data.latency_ms} ms` : '—'}
        </span>
      </div>

      <div className="vs-column-pills">
        <span className="vs-pill">Index: {data?.index_service ?? '—'}</span>
        <span className="vs-pill">Requires: {data?.requires ?? '—'}</span>
        <span className="vs-pill vs-pill--score">{data?.score_semantics ?? '—'}</span>
      </div>

      {data?.error ? (
        <div className="vs-column-error">{data.error}</div>
      ) : (
        <div className="vs-column-results">
          {(data?.results ?? []).map((r, i) => (
            <div key={r.id} className="vs-result-wrap">
              <ResultCard result={r} rank={i + 1} color={color} scoreLabel={scoreLabel} />
              <ScoreBar score={r.score} max={maxScore} color={color} />
            </div>
          ))}
          {!data?.results?.length && (
            <div className="vs-column-empty">No results</div>
          )}
        </div>
      )}
    </div>
  )
}

export default function AppVectorSearch() {
  const [query, setQuery]     = useState('')
  const [limit, setLimit]     = useState(4)
  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  useInfoPanelQuestion(setQuery)

  const run = async (overrideQuery) => {
    const q = overrideQuery ?? query
    if (!q.trim()) return
    if (overrideQuery) setQuery(overrideQuery)
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/vector-search-compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, limit }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setResult(await res.json())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app vs-app">
      {/* Controls */}
      <div className="vs-controls">
        <div className="vs-query-row">
          <input
            className="vs-query-input"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && run()}
            placeholder="Enter a search query…"
          />
          <select
            className="vs-limit-select"
            value={limit}
            onChange={e => setLimit(Number(e.target.value))}
          >
            {[2, 4, 6, 8].map(n => (
              <option key={n} value={n}>Top {n}</option>
            ))}
          </select>
          <button
            className="vs-run-btn"
            onClick={() => run()}
            disabled={loading || !query.trim()}
          >
            {loading ? 'Searching…' : 'Search →'}
          </button>
        </div>

        <div className="vs-examples">
          {EXAMPLES.map((ex, i) => (
            <button key={i} className="example-btn" onClick={() => run(ex)}>{ex}</button>
          ))}
        </div>
      </div>

      {error && <div className="vs-error">{error}</div>}

      {/* Results */}
      {result ? (
        <div className="vs-body">
          {/* Latency comparison bar */}
          <div className="vs-latency-bar">
            <span className="vs-latency-label">Latency</span>
            <div className="vs-latency-tracks">
              {[
                { key: 'fts', label: 'FTS', color: FTS_COLOR, ms: result.fts.latency_ms },
                { key: 'gsi', label: 'GSI', color: GSI_COLOR, ms: result.gsi.latency_ms },
              ].map(({ key, label, color, ms }) => {
                const maxMs = Math.max(result.fts.latency_ms, result.gsi.latency_ms, 1)
                return (
                  <div key={key} className="vs-latency-track">
                    <span className="vs-latency-track-label" style={{ color }}>{label}</span>
                    <div className="vs-latency-track-bar-wrap">
                      <div className="vs-latency-track-bar" style={{ width: `${(ms / maxMs) * 100}%`, background: color }} />
                    </div>
                    <span className="vs-latency-track-ms">{ms} ms</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Side-by-side columns */}
          <div className="vs-columns">
            <Column
              data={result.fts}
              color={FTS_COLOR}
              label="FTS Vector Search"
              scoreLabel="similarity"
              scoreNote="Higher = more similar"
            />
            <Column
              data={result.gsi}
              color={GSI_COLOR}
              label="GSI Vector Search"
              scoreLabel="L2 distance"
              scoreNote="Lower = more similar"
            />
          </div>
        </div>
      ) : !loading && (
        <div className="vs-placeholder">
          <p>Run the same vector query against both search approaches simultaneously.</p>
          <ul>
            <li><strong style={{ color: FTS_COLOR }}>FTS</strong> — uses the Couchbase Search Service. Available since 7.0. Scores are similarity values (higher = better match).</li>
            <li><strong style={{ color: GSI_COLOR }}>GSI</strong> — uses the Index Service with SQL++ <code>ANN_DISTANCE()</code>. Requires 7.6.4+. Scores are L2 distances (lower = better match).</li>
          </ul>
        </div>
      )}
    </div>
  )
}
