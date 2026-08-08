import React, { useState, useEffect } from 'react'
import './App.css'
import './AppTemperature.css'
import { useInfoPanelQuestion } from './hooks/useInfoPanelQuestion'

const TEMPS = [0.0, 0.5, 1.0, 1.5]

const TEMP_META = {
  0.0: { label: 'Deterministic', desc: 'Always the same answer', color: '#0369a1' },
  0.5: { label: 'Balanced',      desc: 'Slight variation',       color: '#0891b2' },
  1.0: { label: 'Creative',      desc: 'Noticeable variation',   color: '#d97706' },
  1.5: { label: 'Chaotic',       desc: 'High randomness',        color: '#dc2626' },
}

const EXAMPLES = [
  'Write a one-sentence tagline for a coffee shop',
  'Give me a word that means happy',
  'Suggest a name for a pet cat',
  'What is 2 + 2?',
]

export default function AppTemperature() {
  const [message, setMessage] = useState('')
  useInfoPanelQuestion(setMessage)
  const [selectedTemps, setSelectedTemps] = useState(new Set(TEMPS))
  const [results, setResults] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const h = (e) => setMessage(e.detail)
    window.addEventListener('infopanel:question', h)
    return () => window.removeEventListener('infopanel:question', h)
  }, [])

  const run = async (override) => {
    const msg = override ?? message
    if (!msg.trim()) return
    if (override) setMessage(override)
    setIsLoading(true)
    setError(null)
    setResults(null)
    try {
      const res = await fetch('/api/temperature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, temperatures: [...selectedTemps].sort() }),
      })
      if (!res.ok) throw new Error('Request failed')
      setResults((await res.json()).results)
    } catch {
      setError('Request failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleTemp = (t) => {
    setSelectedTemps(prev => {
      const next = new Set(prev)
      if (next.has(t) && next.size > 1) next.delete(t)
      else next.add(t)
      return next
    })
  }

  return (
    <div className="app temperature-app">
      <div className="temp-controls">
        <div className="temp-query-row">
          <input
            className="temp-input"
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && run()}
            placeholder="Ask anything — try creative prompts for best effect…"
          />
          <button className="temp-run-btn" onClick={() => run()} disabled={isLoading || !message.trim()}>
            {isLoading ? 'Running…' : `Run →`}
          </button>
        </div>

        <div className="temp-toggles">
          <span className="toggles-label">Temperatures:</span>
          {TEMPS.map(t => {
            const meta = TEMP_META[t]
            const active = selectedTemps.has(t)
            return (
              <button
                key={t}
                className={`temp-toggle ${active ? 'temp-toggle--active' : ''}`}
                style={active ? { borderColor: meta.color, color: meta.color } : {}}
                onClick={() => toggleTemp(t)}
              >
                {t} — {meta.label}
              </button>
            )
          })}
        </div>

        <div className="temp-examples">
          {EXAMPLES.map((ex, i) => (
            <button key={i} className="example-btn" onClick={() => run(ex)}>{ex}</button>
          ))}
        </div>
      </div>

      {error && <div className="temp-error">{error}</div>}
      {isLoading && <div className="temp-loading">Running {selectedTemps.size} parallel calls…</div>}

      {results && (
        <div className="temp-results" style={{ '--cols': Math.min(results.length, 4) }}>
          {results.map((r, i) => {
            const meta = TEMP_META[r.temperature] || { label: String(r.temperature), color: '#6b7280', desc: '' }
            return (
              <div key={i} className="temp-card" style={{ '--card-color': meta.color }}>
                <div className="temp-card-header">
                  <span className="temp-badge" style={{ color: meta.color }}>
                    temp = {r.temperature}
                  </span>
                  <span className="temp-card-label">{meta.label}</span>
                  <span className="temp-card-tokens">{r.tokens} tokens</span>
                </div>
                <p className="temp-card-response">{r.response}</p>
                <div className="temp-card-desc">{meta.desc}</div>
              </div>
            )
          })}
        </div>
      )}

      {!results && !isLoading && (
        <div className="temp-placeholder">
          Run the same prompt at different temperatures to see how randomness affects output.
          Temperature 0 is deterministic — you'll get the same answer every time.
        </div>
      )}
    </div>
  )
}
