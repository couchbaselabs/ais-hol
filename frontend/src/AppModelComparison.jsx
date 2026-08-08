import React, { useState } from 'react'
import './App.css'
import './AppModelComparison.css'
import { useInfoPanelQuestion } from './hooks/useInfoPanelQuestion'

const ALL_MODELS = [
  'gpt-4o', 'gpt-4o-mini', 'gpt-4', 'gpt-3.5-turbo',
]
const DEFAULT_MODELS = new Set(['gpt-4o', 'gpt-4o-mini'])

const EXAMPLES = [
  'Explain quantum entanglement to a 10-year-old.',
  'Write a haiku about distributed databases.',
  'What are the trade-offs between SQL and NoSQL?',
  'Give me a one-sentence summary of the French Revolution.',
]

const MODEL_COLORS = ['#6366f1', '#00A3E0', '#d97706', '#059669']

export default function AppModelComparison() {
  const [prompt, setPrompt] = useState('')
  useInfoPanelQuestion(setPrompt)
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful assistant.')
  const [selectedModels, setSelectedModels] = useState(DEFAULT_MODELS)
  const [results, setResults] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showSystem, setShowSystem] = useState(false)

  const toggleModel = (m) => {
    setSelectedModels(prev => {
      const next = new Set(prev)
      if (next.has(m) && next.size > 1) next.delete(m)
      else if (next.size < 4) next.add(m)
      return next
    })
  }

  const run = async (overridePrompt) => {
    const p = overridePrompt ?? prompt
    if (!p.trim()) return
    if (overridePrompt) setPrompt(overridePrompt)
    setIsLoading(true)
    setError(null)
    setResults(null)
    try {
      const res = await fetch('/api/model-compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: p,
          models: [...selectedModels],
          system_prompt: systemPrompt,
        }),
      })
      if (!res.ok) throw new Error('Request failed')
      setResults((await res.json()).results)
    } catch {
      setError('Request failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const maxLatency = results ? Math.max(...results.map(r => r.latency_s), 0.1) : 1
  const maxCost    = results ? Math.max(...results.map(r => r.cost_usd), 0.000001) : 1

  return (
    <div className="app mc-app">
      <div className="mc-controls">
        <div className="mc-query-row">
          <textarea
            className="mc-prompt-input"
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), run())}
            placeholder="Enter a prompt to send to all selected models…"
            rows={2}
          />
          <button
            className="mc-run-btn"
            onClick={() => run()}
            disabled={isLoading || !prompt.trim()}
          >
            {isLoading ? 'Running…' : `Run ${selectedModels.size} →`}
          </button>
        </div>

        <div className="mc-row">
          <div className="mc-model-toggles">
            <span className="toggles-label">Models:</span>
            {ALL_MODELS.map((m, i) => {
              const active = selectedModels.has(m)
              const disabled = !active && selectedModels.size >= 4
              return (
                <button
                  key={m}
                  className={`mc-model-toggle ${active ? 'mc-model-toggle--active' : ''}`}
                  style={active ? { borderColor: MODEL_COLORS[i], color: MODEL_COLORS[i] } : {}}
                  onClick={() => toggleModel(m)}
                  disabled={disabled}
                >
                  {m}
                </button>
              )
            })}
          </div>
          <button
            className="mc-system-toggle"
            onClick={() => setShowSystem(v => !v)}
          >
            {showSystem ? '▲' : '▼'} System prompt
          </button>
        </div>

        {showSystem && (
          <textarea
            className="mc-system-input"
            value={systemPrompt}
            onChange={e => setSystemPrompt(e.target.value)}
            rows={2}
            placeholder="System prompt…"
          />
        )}

        <div className="mc-examples">
          {EXAMPLES.map((ex, i) => (
            <button key={i} className="example-btn" onClick={() => run(ex)}>{ex}</button>
          ))}
        </div>
      </div>

      {error && <div className="mc-error">{error}</div>}
      {isLoading && <div className="mc-loading">Running {selectedModels.size} models in parallel…</div>}

      {results && (
        <div className="mc-results">
          {/* Metrics table */}
          <div className="mc-metrics">
            {results.map((r, i) => (
              <div key={i} className="mc-metric-card" style={{ '--card-color': MODEL_COLORS[i] }}>
                <div className="mc-metric-model">{r.model}</div>
                <div className="mc-metric-row">
                  <span className="mc-metric-label">Latency</span>
                  <span className="mc-metric-val">{r.latency_s}s</span>
                  <div className="mc-bar-wrap">
                    <div className="mc-bar" style={{ width: `${(r.latency_s / maxLatency) * 100}%`, background: MODEL_COLORS[i] }} />
                  </div>
                </div>
                <div className="mc-metric-row">
                  <span className="mc-metric-label">Cost</span>
                  <span className="mc-metric-val">${r.cost_usd.toFixed(5)}</span>
                  <div className="mc-bar-wrap">
                    <div className="mc-bar" style={{ width: `${(r.cost_usd / maxCost) * 100}%`, background: MODEL_COLORS[i] }} />
                  </div>
                </div>
                <div className="mc-metric-tokens">{r.input_tokens} in · {r.output_tokens} out tokens</div>
              </div>
            ))}
          </div>

          {/* Response cards */}
          <div className="mc-responses" style={{ '--cols': Math.min(results.length, 2) }}>
            {results.map((r, i) => (
              <div key={i} className="mc-response-card" style={{ '--card-color': MODEL_COLORS[i] }}>
                <div className="mc-response-header">
                  <span className="mc-response-model" style={{ color: MODEL_COLORS[i] }}>{r.model}</span>
                  <span className="mc-response-meta">{r.latency_s}s · ${r.cost_usd.toFixed(5)}</span>
                </div>
                {r.error
                  ? <p className="mc-response-error">{r.error}</p>
                  : <p className="mc-response-text">{r.response}</p>
                }
              </div>
            ))}
          </div>
        </div>
      )}

      {!results && !isLoading && (
        <div className="mc-placeholder">
          Send the same prompt to multiple models simultaneously. Compare response quality,
          latency, and cost side by side to choose the right model for your use case.
        </div>
      )}
    </div>
  )
}
