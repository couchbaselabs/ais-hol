import React, { useState } from 'react'
import './App.css'
import './AppMultiVector.css'
import { useInfoPanelQuestion } from './hooks/useInfoPanelQuestion'

const EXAMPLES = [
  'How do I make HTTP requests?',
  'What is a Promise?',
  'How does fetch() handle errors?',
  'What are the response methods?',
]

const PARENT_COLOR  = '#7c3aed'
const CHILD_COLOR   = '#00A3E0'
const MATCH_COLOR   = '#16a34a'

export default function AppMultiVector() {
  const [query, setQuery]           = useState('')
  const [parentSize, setParentSize] = useState(200)
  const [childSize, setChildSize]   = useState(50)
  const [result, setResult]         = useState(null)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(null)
  const [activeParent, setActiveParent] = useState(null)

  useInfoPanelQuestion(setQuery)

  const run = async (overrideQuery) => {
    const q = overrideQuery ?? query
    if (!q.trim()) return
    if (overrideQuery) setQuery(overrideQuery)
    setLoading(true)
    setError(null)
    setResult(null)
    setActiveParent(null)
    try {
      const res = await fetch('/api/multi-vector-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, parent_size: parentSize, child_size: childSize }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setResult(data)
      // Highlight the first retrieved parent by default
      if (data.retrieved_parents?.length) setActiveParent(data.retrieved_parents[0].id)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // Sets of IDs for highlight logic
  const topChildIds   = new Set(result?.top_children?.map(c => c.id) ?? [])
  const retrievedParentIds = new Set(result?.retrieved_parents?.map(p => p.id) ?? [])

  return (
    <div className="app mv-app">
      {/* Controls */}
      <div className="mv-controls">
        <div className="mv-query-row">
          <input
            className="mv-input"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && run()}
            placeholder="Enter a search query…"
          />
          <button
            className="mv-run-btn"
            onClick={() => run()}
            disabled={loading || !query.trim()}
          >
            {loading ? 'Searching…' : 'Search →'}
          </button>
        </div>

        <div className="mv-params-row">
          <label className="mv-param-label">
            Parent chunk
            <select className="mv-param-select" value={parentSize}
              onChange={e => setParentSize(Number(e.target.value))}>
              {[100, 150, 200, 300].map(n => (
                <option key={n} value={n}>{n} words</option>
              ))}
            </select>
          </label>
          <label className="mv-param-label">
            Child chunk
            <select className="mv-param-select" value={childSize}
              onChange={e => setChildSize(Number(e.target.value))}>
              {[25, 50, 75, 100].map(n => (
                <option key={n} value={n}>{n} words</option>
              ))}
            </select>
          </label>
          <div className="mv-ratio-pill">
            ratio {parentSize}/{childSize} = {(parentSize / childSize).toFixed(1)}×
          </div>
        </div>

        <div className="mv-examples">
          {EXAMPLES.map((ex, i) => (
            <button key={i} className="example-btn" onClick={() => run(ex)}>{ex}</button>
          ))}
        </div>
      </div>

      {error && <div className="mv-error">{error}</div>}

      {result ? (
        <div className="mv-body">
          {/* Stats strip */}
          <div className="mv-stats">
            <div className="mv-stat">
              <span className="mv-stat-val" style={{ color: PARENT_COLOR }}>
                {result.corpus_stats.parent_count}
              </span>
              <span className="mv-stat-lbl">parents</span>
            </div>
            <div className="mv-stat-sep">→</div>
            <div className="mv-stat">
              <span className="mv-stat-val" style={{ color: CHILD_COLOR }}>
                {result.corpus_stats.child_count}
              </span>
              <span className="mv-stat-lbl">children</span>
            </div>
            <div className="mv-stat-sep">→</div>
            <div className="mv-stat">
              <span className="mv-stat-val" style={{ color: MATCH_COLOR }}>
                {result.top_children.length}
              </span>
              <span className="mv-stat-lbl">matched children</span>
            </div>
            <div className="mv-stat-sep">→</div>
            <div className="mv-stat">
              <span className="mv-stat-val" style={{ color: PARENT_COLOR }}>
                {result.retrieved_parents.length}
              </span>
              <span className="mv-stat-lbl">returned parents</span>
            </div>
            <div className="mv-stat-embed">
              embedded in {result.corpus_stats.embed_ms} ms
            </div>
          </div>

          {/* Three-column layout */}
          <div className="mv-columns">
            {/* Col 1: Parents */}
            <div className="mv-col">
              <div className="mv-col-header" style={{ borderColor: PARENT_COLOR }}>
                <span style={{ color: PARENT_COLOR }}>Parent chunks</span>
                <span className="mv-col-meta">{parentSize} words each</span>
              </div>
              <div className="mv-col-body">
                {result.parents.map(p => {
                  const isRetrieved = retrievedParentIds.has(p.id)
                  const isActive = activeParent === p.id
                  return (
                    <div
                      key={p.id}
                      className={`mv-parent-card ${isRetrieved ? 'mv-parent-card--retrieved' : ''} ${isActive ? 'mv-parent-card--active' : ''}`}
                      onClick={() => setActiveParent(isActive ? null : p.id)}
                    >
                      <div className="mv-card-header">
                        <span className="mv-card-id" style={{ color: PARENT_COLOR }}>{p.id}</span>
                        {isRetrieved && (
                          <span className="mv-badge mv-badge--returned">returned</span>
                        )}
                        <span className="mv-card-words">{p.word_count}w</span>
                      </div>
                      <div className="mv-card-content">{p.content}</div>
                      <div className="mv-card-children-ids">
                        {p.child_ids.map(cid => (
                          <span
                            key={cid}
                            className={`mv-child-ref ${topChildIds.has(cid) ? 'mv-child-ref--matched' : ''}`}
                          >
                            {cid.split('-child-')[1] !== undefined ? `child-${cid.split('-child-')[1]}` : cid}
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Col 2: Children */}
            <div className="mv-col">
              <div className="mv-col-header" style={{ borderColor: CHILD_COLOR }}>
                <span style={{ color: CHILD_COLOR }}>Child chunks</span>
                <span className="mv-col-meta">{childSize} words each · embedded for retrieval</span>
              </div>
              <div className="mv-col-body">
                {result.children.map(c => {
                  const isMatch = topChildIds.has(c.id)
                  const isFromActive = activeParent && c.parent_id === activeParent
                  return (
                    <div
                      key={c.id}
                      className={`mv-child-card ${isMatch ? 'mv-child-card--match' : ''} ${isFromActive ? 'mv-child-card--active-parent' : ''}`}
                    >
                      <div className="mv-card-header">
                        <span className="mv-card-id" style={{ color: isMatch ? MATCH_COLOR : CHILD_COLOR }}>
                          {c.id}
                        </span>
                        {isMatch && (
                          <span className="mv-badge mv-badge--match">
                            #{result.top_children.findIndex(t => t.id === c.id) + 1} match
                          </span>
                        )}
                        <span className="mv-card-score" style={{ color: isMatch ? MATCH_COLOR : '#94a3b8' }}>
                          {c.score > 0 ? c.score.toFixed(3) : '—'}
                        </span>
                      </div>
                      <div className="mv-card-content">{c.content}</div>
                      <div className="mv-card-parent-ref">
                        ↑ <span style={{ color: PARENT_COLOR }}>{c.parent_id}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Col 3: Retrieved parents (context returned to LLM) */}
            <div className="mv-col">
              <div className="mv-col-header" style={{ borderColor: MATCH_COLOR }}>
                <span style={{ color: MATCH_COLOR }}>Context returned to LLM</span>
                <span className="mv-col-meta">parent chunks of matched children</span>
              </div>
              <div className="mv-col-body">
                {result.retrieved_parents.length === 0 ? (
                  <div className="mv-col-empty">No results yet</div>
                ) : (
                  result.retrieved_parents.map((p, i) => (
                    <div key={p.id} className="mv-retrieved-card">
                      <div className="mv-card-header">
                        <span className="mv-retrieved-rank" style={{ background: MATCH_COLOR }}>
                          #{i + 1}
                        </span>
                        <span className="mv-card-id" style={{ color: PARENT_COLOR }}>{p.id}</span>
                        <span className="mv-card-words">{p.word_count}w</span>
                      </div>
                      <div className="mv-card-content mv-card-content--full">{p.content}</div>
                      <div className="mv-retrieved-matched-children">
                        Matched via:{' '}
                        {result.top_children
                          .filter(c => c.parent_id === p.id)
                          .map(c => (
                            <span key={c.id} className="mv-matched-child-chip">
                              {c.id.split('-child-')[1] !== undefined
                                ? `child-${c.id.split('-child-')[1]}`
                                : c.id}
                              {' '}({c.score.toFixed(3)})
                            </span>
                          ))}
                      </div>
                    </div>
                  ))
                )}

                {/* Key insight callout */}
                <div className="mv-insight">
                  <strong>Key insight:</strong> the child chunk matched the query precisely,
                  but the LLM receives the full parent chunk — giving it the surrounding
                  context needed to answer well.
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : !loading && (
        <div className="mv-placeholder">
          <p>
            Parent-child chunking solves the chunk-size dilemma: small chunks give precise
            retrieval, large chunks give rich context. Embed the small child chunks, but
            return the large parent chunk to the LLM.
          </p>
          <ul>
            <li><strong style={{ color: PARENT_COLOR }}>Parents</strong> — large chunks (200 words) stored as context</li>
            <li><strong style={{ color: CHILD_COLOR }}>Children</strong> — small chunks (50 words) embedded for retrieval</li>
            <li><strong style={{ color: MATCH_COLOR }}>Result</strong> — matched children → their parent returned to the LLM</li>
          </ul>
          <p>Try adjusting the parent/child size ratio to see how it affects the structure.</p>
        </div>
      )}
    </div>
  )
}
