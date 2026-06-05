import React, { useState } from 'react'
import './App.css'
import './AppParallel.css'
import { useInfoPanelQuestion } from './hooks/useInfoPanelQuestion'

const DEFAULT_PROMPTS = [
  'What is a REST API?',
  'Explain async/await in one sentence.',
  'What is the difference between SQL and NoSQL?',
  'What does HTTP stand for?',
]

const ACCENT = '#00A3E0'
const BAR_COLORS = ['#00A3E0', '#7c3aed', '#16a34a', '#d97706', '#dc2626',
                    '#0891b2', '#9333ea', '#15803d', '#b45309', '#b91c1c']

function TimelineBar({ result, maxMs, color, index }) {
  const pct = maxMs > 0 ? Math.min((result.latency_ms / maxMs) * 100, 100) : 0
  return (
    <div className="par-timeline-row">
      <span className="par-timeline-idx" style={{ color }}>{index + 1}</span>
      <div className="par-timeline-track">
        <div
          className="par-timeline-bar"
          style={{ width: `${pct}%`, background: color }}
          title={`${result.latency_ms} ms`}
        />
      </div>
      <span className="par-timeline-ms">{result.latency_ms} ms</span>
    </div>
  )
}

export default function AppParallel() {
  const [prompts, setPrompts]   = useState(DEFAULT_PROMPTS)
  const [result, setResult]     = useState(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)

  useInfoPanelQuestion(q => setPrompts(prev => [q, ...prev.slice(0, 3)]))

  const updatePrompt = (i, val) => {
    setPrompts(prev => prev.map((p, idx) => idx === i ? val : p))
  }

  const addPrompt = () => {
    if (prompts.length < 8) setPrompts(prev => [...prev, ''])
  }

  const removePrompt = (i) => {
    if (prompts.length > 1) setPrompts(prev => prev.filter((_, idx) => idx !== i))
  }

  const run = async () => {
    const valid = prompts.filter(p => p.trim())
    if (!valid.length) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/parallel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompts: valid }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setResult(await res.json())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const maxMs = result ? Math.max(...result.results.map(r => r.latency_ms), 1) : 1

  return (
    <div className="app par-app">
      {/* Controls */}
      <div className="par-controls">
        <div className="par-header-row">
          <span className="par-header-label">
            Prompts <span className="par-count">({prompts.length})</span>
          </span>
          <div className="par-header-actions">
            <button className="par-add-btn" onClick={addPrompt} disabled={prompts.length >= 8}>
              + Add prompt
            </button>
            <button
              className="par-run-btn"
              onClick={run}
              disabled={loading || !prompts.some(p => p.trim())}
            >
              {loading ? `Running ${prompts.filter(p=>p.trim()).length} in parallel…` : 'Run all →'}
            </button>
          </div>
        </div>

        <div className="par-prompts-grid">
          {prompts.map((p, i) => (
            <div key={i} className="par-prompt-row">
              <span className="par-prompt-num" style={{ color: BAR_COLORS[i % BAR_COLORS.length] }}>
                {i + 1}
              </span>
              <input
                className="par-prompt-input"
                value={p}
                onChange={e => updatePrompt(i, e.target.value)}
                onKeyDown={e => e.key === 'Enter' && run()}
                placeholder={`Prompt ${i + 1}…`}
              />
              <button
                className="par-remove-btn"
                onClick={() => removePrompt(i)}
                disabled={prompts.length <= 1}
                title="Remove"
              >✕</button>
            </div>
          ))}
        </div>
      </div>

      {error && <div className="par-error">{error}</div>}

      {result ? (
        <div className="par-body">
          {/* Speedup summary */}
          <div className="par-summary">
            <div className="par-summary-stat">
              <span className="par-summary-val" style={{ color: ACCENT }}>{result.wall_ms} ms</span>
              <span className="par-summary-lbl">wall-clock (parallel)</span>
            </div>
            <div className="par-summary-vs">vs</div>
            <div className="par-summary-stat">
              <span className="par-summary-val" style={{ color: '#94a3b8' }}>
                ~{result.sequential_estimate_ms} ms
              </span>
              <span className="par-summary-lbl">estimated sequential</span>
            </div>
            <div className="par-summary-speedup">
              <span className="par-speedup-badge" style={{ background: '#dcfce7', color: '#15803d' }}>
                {result.speedup}× faster
              </span>
            </div>
          </div>

          {/* Timeline */}
          <div className="par-timeline-block">
            <div className="par-section-label">Request timeline</div>
            <div className="par-timeline">
              {result.results.map((r, i) => (
                <TimelineBar
                  key={i}
                  result={r}
                  maxMs={maxMs}
                  color={BAR_COLORS[i % BAR_COLORS.length]}
                  index={i}
                />
              ))}
              {/* Wall-clock marker */}
              <div className="par-wall-marker" style={{ left: `${(result.wall_ms / maxMs) * 100}%` }}>
                <div className="par-wall-line" />
                <span className="par-wall-label">{result.wall_ms} ms total</span>
              </div>
            </div>
          </div>

          {/* Response cards */}
          <div className="par-section-label">Responses</div>
          <div className="par-cards">
            {result.results.map((r, i) => (
              <div key={i} className="par-card" style={{ borderTopColor: BAR_COLORS[i % BAR_COLORS.length] }}>
                <div className="par-card-header">
                  <span className="par-card-num" style={{ color: BAR_COLORS[i % BAR_COLORS.length] }}>
                    #{i + 1}
                  </span>
                  <span className="par-card-prompt">{r.prompt}</span>
                  <span className="par-card-meta">{r.latency_ms} ms · {r.tokens} tok</span>
                </div>
                <div className="par-card-response">{r.response}</div>
              </div>
            ))}
          </div>
        </div>
      ) : !loading && (
        <div className="par-placeholder">
          <p>
            <code>asyncio.gather()</code> fires all requests simultaneously. The total
            wall-clock time is roughly equal to the <em>slowest</em> single request —
            not the sum of all requests.
          </p>
          <ul>
            <li>Add up to 8 prompts, then click <strong>Run all</strong></li>
            <li>The timeline shows each request's latency side by side</li>
            <li>The speedup badge shows how much faster parallel is vs sequential</li>
          </ul>
        </div>
      )}
    </div>
  )
}
