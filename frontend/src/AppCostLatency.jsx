import React, { useState, useEffect } from 'react'
import './App.css'
import './AppCostLatency.css'

const ALL_MODELS = [
  'gpt-4o-mini', 'gpt-4o', 'gpt-4', 'gpt-3.5-turbo',
  'claude-3-5-sonnet', 'claude-3-haiku', 'llama-3.1-70b', 'llama-3.1-8b',
]
const DEFAULT_MODELS = new Set(['gpt-4o-mini', 'gpt-4o'])

const EXAMPLES = [
  'Explain recursion in one paragraph',
  'What is the capital of France?',
  'Write a haiku about databases',
]

function Bar({ value, max, color }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="cl-bar-wrap">
      <div className="cl-bar" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

export default function AppCostLatency() {
  const [message, setMessage] = useState('')
  const [selectedModels, setSelectedModels] = useState(DEFAULT_MODELS)
  const [results, setResults] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const h = (e) => setMessage(e.detail)
    window.addEventListener('infopanel:question', h)
    return () => window.removeEventListener('infopanel:question', h)
  }, [])

  const toggleModel = (m) => {
    setSelectedModels(prev => {
      const next = new Set(prev)
      if (next.has(m) && next.size > 1) next.delete(m)
      else if (next.size < 4) next.add(m)
      return next
    })
  }

  const run = async (override) => {
    const msg = override ?? message
    if (!msg.trim()) return
    if (override) setMessage(override)
    setIsLoading(true)
    setError(null)
    setResults(null)
    try {
      const res = await fetch('/api/cost-latency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, models: [...selectedModels] }),
      })
      if (!res.ok) throw new Error('Request failed')
      setResults((await res.json()).results)
    } catch {
      setError('Request failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const maxLatency = results ? Math.max(...results.map(r => r.latency_s)) : 1
  const maxCost    = results ? Math.max(...results.map(r => r.cost_usd), 0.000001) : 1

  return (
    <div className="app cl-app">
      <div className="cl-controls">
        <div className="cl-query-row">
          <input
            className="cl-input"
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && run()}
            placeholder="Ask anything — results show cost and latency per model…"
          />
          <button className="cl-run-btn" onClick={() => run()} disabled={isLoading || !message.trim()}>
            {isLoading ? 'Running…' : `Run ${selectedModels.size} models →`}
          </button>
        </div>

        <div className="cl-model-toggles">
          <span className="toggles-label">Models (max 4):</span>
          {ALL_MODELS.map(m => {
            const active = selectedModels.has(m)
            const disabled = !active && selectedModels.size >= 4
            return (
              <button
                key={m}
                className={`cl-model-toggle ${active ? 'cl-model-toggle--active' : ''}`}
                onClick={() => toggleModel(m)}
                disabled={disabled}
              >
                {m}
              </button>
            )
          })}
        </div>

        <div className="cl-examples">
          {EXAMPLES.map((ex, i) => (
            <button key={i} className="example-btn" onClick={() => run(ex)}>{ex}</button>
          ))}
        </div>
      </div>

      {error && <div className="cl-error">{error}</div>}
      {isLoading && <div className="cl-loading">Running {selectedModels.size} models in parallel…</div>}

      {results && (
        <div className="cl-results">
          <table className="cl-table">
            <thead>
              <tr>
                <th>Model</th>
                <th>Latency</th>
                <th></th>
                <th>Cost (USD)</th>
                <th></th>
                <th>In tokens</th>
                <th>Out tokens</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i} className={r.error ? 'cl-row--error' : ''}>
                  <td className="cl-model-name">{r.model}</td>
                  <td className="cl-metric">{r.latency_s}s</td>
                  <td className="cl-bar-cell"><Bar value={r.latency_s} max={maxLatency} color="#00A3E0" /></td>
                  <td className="cl-metric">${r.cost_usd.toFixed(6)}</td>
                  <td className="cl-bar-cell"><Bar value={r.cost_usd} max={maxCost} color="#f59e0b" /></td>
                  <td className="cl-metric">{r.input_tokens}</td>
                  <td className="cl-metric">{r.output_tokens}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="cl-responses">
            {results.filter(r => !r.error).map((r, i) => (
              <div key={i} className="cl-response-card">
                <div className="cl-response-header">
                  <span className="cl-response-model">{r.model}</span>
                  <span className="cl-response-meta">{r.latency_s}s · ${r.cost_usd.toFixed(6)}</span>
                </div>
                <p className="cl-response-text">{r.response}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {!results && !isLoading && (
        <div className="cl-placeholder">
          Run the same prompt across multiple models to compare latency and cost.
          Prices are approximate mid-2025 list rates per 1M tokens.
        </div>
      )}
    </div>
  )
}
