import React, { useState, useEffect } from 'react'
import './App.css'
import './AppTokenBudget.css'

const MODELS = [
  { value: 'gpt-4o',          label: 'gpt-4o',          limit: 128000 },
  { value: 'gpt-4o-mini',     label: 'gpt-4o-mini',     limit: 128000 },
  { value: 'gpt-4-turbo',     label: 'gpt-4-turbo',     limit: 128000 },
  { value: 'gpt-3.5-turbo',   label: 'gpt-3.5-turbo',   limit: 16385  },
  { value: 'gpt-4',           label: 'gpt-4',            limit: 8192   },
]

const SAMPLE_SYSTEM = `You are a helpful assistant for a software documentation site. Answer questions clearly and concisely. If you don't know the answer, say so. Always cite the relevant documentation section when possible.`

const SAMPLE_HISTORY = [
  { role: 'user',      content: 'What is the Fetch API?' },
  { role: 'assistant', content: 'The Fetch API provides a JavaScript interface for making HTTP requests. It uses Promises and is the modern replacement for XMLHttpRequest.' },
  { role: 'user',      content: 'How do I handle errors with fetch?' },
  { role: 'assistant', content: 'Use .catch() for network errors and check response.ok for HTTP errors. Note that fetch only rejects on network failure, not on 4xx/5xx responses.' },
]

const SAMPLE_RAG = `The Fetch API is built into modern browsers and provides a clean, promise-based interface for HTTP requests. Unlike XMLHttpRequest, it supports streaming responses, request/response objects, and integrates naturally with async/await syntax. The basic usage is: const response = await fetch(url, options). The options object accepts method, headers, body, mode, credentials, and cache properties.`

const COMPONENT_COLORS = {
  system_prompt:    '#00A3E0',
  history:          '#7c3aed',
  rag_context:      '#16a34a',
  response_reserve: '#d97706',
}

const COMPONENT_LABELS = {
  system_prompt:    'System prompt',
  history:          'History',
  rag_context:      'RAG context',
  response_reserve: 'Response reserve',
}

function BudgetBar({ budget, limit }) {
  const components = ['system_prompt', 'history', 'rag_context', 'response_reserve']
  const total = budget.total_used ?? 0
  return (
    <div className="tb-bar-wrap">
      <div className="tb-bar">
        {components.map(key => {
          const val = budget[key] ?? 0
          const pct = limit > 0 ? (val / limit) * 100 : 0
          return (
            <div
              key={key}
              className="tb-bar-segment"
              style={{ width: `${pct}%`, background: COMPONENT_COLORS[key] }}
              title={`${COMPONENT_LABELS[key]}: ${val} tokens`}
            />
          )
        })}
      </div>
      <div className="tb-bar-labels">
        <span className="tb-bar-used" style={{ color: budget.overflow ? '#dc2626' : '#374151' }}>
          {total.toLocaleString()} / {limit.toLocaleString()} tokens used
        </span>
        <span className="tb-bar-headroom" style={{ color: budget.overflow ? '#dc2626' : '#16a34a' }}>
          {budget.overflow
            ? `${Math.abs(budget.headroom).toLocaleString()} over limit`
            : `${budget.headroom.toLocaleString()} remaining`}
        </span>
      </div>
    </div>
  )
}

export default function AppTokenBudget() {
  const [model, setModel]           = useState('gpt-4o')
  const [systemPrompt, setSystem]   = useState(SAMPLE_SYSTEM)
  const [historyTurns, setTurns]    = useState(2)
  const [ragContext, setRag]        = useState(SAMPLE_RAG)
  const [reserve, setReserve]       = useState(500)
  const [result, setResult]         = useState(null)
  const [loading, setLoading]       = useState(false)

  const selectedModel = MODELS.find(m => m.value === model) ?? MODELS[0]

  const run = async () => {
    setLoading(true)
    const history = SAMPLE_HISTORY.slice(0, historyTurns * 2)
    try {
      const res = await fetch('/api/token-budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          system_prompt: systemPrompt,
          history,
          rag_context: ragContext,
          response_reserve: reserve,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setResult(await res.json())
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // Auto-run on any change
  useEffect(() => { run() }, [model, systemPrompt, historyTurns, ragContext, reserve])

  const budget = result?.budget ?? {}
  const limit  = result?.limit ?? selectedModel.limit

  return (
    <div className="app tb-app">
      <div className="tb-layout">
        {/* Left: controls */}
        <div className="tb-controls">
          <div className="tb-section-label">Model</div>
          <select className="tb-select" value={model} onChange={e => setModel(e.target.value)}>
            {MODELS.map(m => (
              <option key={m.value} value={m.value}>{m.label} ({m.limit.toLocaleString()} tok)</option>
            ))}
          </select>

          <div className="tb-section-label">System prompt</div>
          <textarea
            className="tb-textarea"
            value={systemPrompt}
            onChange={e => setSystem(e.target.value)}
            rows={4}
          />

          <div className="tb-section-label">
            History turns
            <span className="tb-param-val">{historyTurns} turns ({historyTurns * 2} messages)</span>
          </div>
          <input type="range" min={0} max={2} step={1} value={historyTurns}
            onChange={e => setTurns(Number(e.target.value))}
            className="tb-slider" />

          <div className="tb-section-label">RAG context</div>
          <textarea
            className="tb-textarea"
            value={ragContext}
            onChange={e => setRag(e.target.value)}
            rows={3}
          />

          <div className="tb-section-label">
            Response reserve
            <span className="tb-param-val">{reserve} tokens</span>
          </div>
          <input type="range" min={100} max={4000} step={100} value={reserve}
            onChange={e => setReserve(Number(e.target.value))}
            className="tb-slider" />
        </div>

        {/* Right: budget breakdown */}
        <div className="tb-breakdown">
          {result ? (
            <>
              <BudgetBar budget={budget} limit={limit} />

              {result.overflow && (
                <div className="tb-overflow-banner">
                  ⚠️ Over budget by {Math.abs(budget.headroom).toLocaleString()} tokens
                </div>
              )}

              <div className="tb-components">
                {Object.entries(COMPONENT_LABELS).map(([key, label]) => {
                  const val = budget[key] ?? 0
                  const pct = limit > 0 ? ((val / limit) * 100).toFixed(1) : 0
                  return (
                    <div key={key} className="tb-component-row">
                      <div className="tb-component-dot" style={{ background: COMPONENT_COLORS[key] }} />
                      <span className="tb-component-label">{label}</span>
                      <div className="tb-component-bar-wrap">
                        <div className="tb-component-bar"
                          style={{ width: `${pct}%`, background: COMPONENT_COLORS[key] }} />
                      </div>
                      <span className="tb-component-val">{val.toLocaleString()}</span>
                      <span className="tb-component-pct">{pct}%</span>
                    </div>
                  )
                })}
                <div className="tb-total-row">
                  <span className="tb-total-label">Total</span>
                  <span className="tb-total-val"
                    style={{ color: result.overflow ? '#dc2626' : '#374151' }}>
                    {(budget.total_used ?? 0).toLocaleString()}
                  </span>
                  <span className="tb-total-limit">/ {limit.toLocaleString()}</span>
                </div>
              </div>

              {result.suggestions?.length > 0 && (
                <div className="tb-suggestions">
                  <div className="tb-suggestions-label">Suggestions</div>
                  {result.suggestions.map((s, i) => (
                    <div key={i} className="tb-suggestion">💡 {s}</div>
                  ))}
                </div>
              )}

              <div className="tb-legend">
                {Object.entries(COMPONENT_LABELS).map(([key, label]) => (
                  <div key={key} className="tb-legend-item">
                    <div className="tb-legend-dot" style={{ background: COMPONENT_COLORS[key] }} />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="tb-loading">Counting tokens…</div>
          )}
        </div>
      </div>
    </div>
  )
}
