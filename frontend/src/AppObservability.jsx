import React, { useState, useEffect, useCallback } from 'react'
import './App.css'
import './AppObservability.css'
import { useInfoPanelQuestion } from './hooks/useInfoPanelQuestion'

const EXAMPLES = [
  'What is a REST API?',
  'Explain async/await briefly',
  'What is the difference between SQL and NoSQL?',
]

const ACCENT = '#00A3E0'

function TraceRow({ trace }) {
  const isError = !!trace.error
  return (
    <tr className={`obs-tr ${isError ? 'obs-tr--error' : ''}`}>
      <td className="obs-td obs-td--id">{trace.id}</td>
      <td className="obs-td obs-td--session">{trace.session_id}</td>
      <td className="obs-td obs-td--model">{trace.model}</td>
      <td className="obs-td obs-td--hash">{trace.prompt_hash}</td>
      <td className="obs-td obs-td--num">{trace.input_tokens}</td>
      <td className="obs-td obs-td--num">{trace.output_tokens}</td>
      <td className="obs-td obs-td--num">
        <span className={trace.latency_ms > 2000 ? 'obs-slow' : ''}>{trace.latency_ms}</span>
      </td>
      <td className="obs-td obs-td--cost">${trace.cost_usd?.toFixed(5)}</td>
      <td className="obs-td obs-td--status">
        {isError
          ? <span className="obs-badge obs-badge--error">error</span>
          : <span className="obs-badge obs-badge--ok">ok</span>}
      </td>
    </tr>
  )
}

export default function AppObservability() {
  const [message, setMessage]     = useState('')
  const [sessionId]               = useState(() => Math.random().toString(36).slice(2, 8))
  const [traces, setTraces]       = useState([])
  const [totals, setTotals]       = useState({ total_cost_usd: 0, total_tokens: 0, count: 0 })
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)
  const [lastResponse, setLast]   = useState(null)

  useInfoPanelQuestion(setMessage)

  const fetchTraces = useCallback(async () => {
    try {
      const res = await fetch('/api/traces')
      if (!res.ok) return
      const data = await res.json()
      setTraces(data.traces ?? [])
      setTotals({ total_cost_usd: data.total_cost_usd, total_tokens: data.total_tokens, count: data.count })
    } catch {}
  }, [])

  useEffect(() => { fetchTraces() }, [])

  const send = async (overrideMsg) => {
    const msg = overrideMsg ?? message
    if (!msg.trim()) return
    if (overrideMsg) setMessage(overrideMsg)
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/observed-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, session_id: sessionId }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setLast(data)
      await fetchTraces()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const clearTraces = async () => {
    await fetch('/api/traces', { method: 'DELETE' })
    setTraces([])
    setTotals({ total_cost_usd: 0, total_tokens: 0, count: 0 })
    setLast(null)
  }

  return (
    <div className="app obs-app">
      {/* Chat input */}
      <div className="obs-controls">
        <div className="obs-query-row">
          <input
            className="obs-input"
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Send a message — each call is traced below…"
          />
          <button className="obs-send-btn" onClick={() => send()} disabled={loading || !message.trim()}>
            {loading ? 'Sending…' : 'Send →'}
          </button>
        </div>
        <div className="obs-examples">
          {EXAMPLES.map((ex, i) => (
            <button key={i} className="example-btn" onClick={() => send(ex)}>{ex}</button>
          ))}
        </div>
        <div className="obs-session-row">
          <span className="obs-session-label">Session: <code>{sessionId}</code></span>
        </div>
      </div>

      {error && <div className="obs-error">{error}</div>}

      {lastResponse && (
        <div className="obs-last-response">
          <div className="obs-last-label">Last response</div>
          <div className="obs-last-text">{lastResponse.response}</div>
          <div className="obs-last-meta">
            {lastResponse.trace?.latency_ms} ms ·{' '}
            {lastResponse.trace?.input_tokens}+{lastResponse.trace?.output_tokens} tok ·{' '}
            ${lastResponse.trace?.cost_usd?.toFixed(5)}
          </div>
        </div>
      )}

      {/* Trace table */}
      <div className="obs-trace-section">
        <div className="obs-trace-header">
          <div className="obs-trace-title">Trace log</div>
          <div className="obs-trace-totals">
            <span className="obs-total-pill">{totals.count} calls</span>
            <span className="obs-total-pill">{totals.total_tokens.toLocaleString()} tokens</span>
            <span className="obs-total-pill obs-total-pill--cost">${totals.total_cost_usd?.toFixed(5)}</span>
          </div>
          <button className="obs-clear-btn" onClick={clearTraces}>Clear</button>
        </div>

        {traces.length === 0 ? (
          <div className="obs-empty">No traces yet — send a message above.</div>
        ) : (
          <div className="obs-table-wrap">
            <table className="obs-table">
              <thead>
                <tr>
                  <th className="obs-th">ID</th>
                  <th className="obs-th">Session</th>
                  <th className="obs-th">Model</th>
                  <th className="obs-th">Prompt hash</th>
                  <th className="obs-th obs-th--num">In tok</th>
                  <th className="obs-th obs-th--num">Out tok</th>
                  <th className="obs-th obs-th--num">ms</th>
                  <th className="obs-th obs-th--cost">Cost</th>
                  <th className="obs-th">Status</th>
                </tr>
              </thead>
              <tbody>
                {traces.map(t => <TraceRow key={t.id} trace={t} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
