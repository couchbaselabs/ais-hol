import React, { useState } from 'react'
import './App.css'
import './AppOutputFormat.css'
import { useInfoPanelQuestion } from './hooks/useInfoPanelQuestion'

const EXAMPLES = [
  'Explain how HTTPS works',
  'What are the benefits of using TypeScript?',
  'How does garbage collection work?',
  'What is a database index?',
]

const FORMAT_META = {
  prose:   { label: 'Prose',          icon: '📝', color: '#00A3E0' },
  bullets: { label: 'Bullet list',    icon: '•',  color: '#7c3aed' },
  table:   { label: 'Markdown table', icon: '⊞',  color: '#16a34a' },
  json:    { label: 'JSON',           icon: '{}', color: '#d97706' },
  steps:   { label: 'Numbered steps', icon: '1.',  color: '#dc2626' },
}

const ALL_FORMATS = Object.keys(FORMAT_META)

function FormatCard({ result, isSelected, onToggle }) {
  const meta = FORMAT_META[result.format]
  const [expanded, setExpanded] = useState(true)

  return (
    <div
      className={`of-card ${isSelected ? 'of-card--selected' : ''}`}
      style={{ borderTopColor: meta.color }}
    >
      <div className="of-card-header">
        <span className="of-card-icon">{meta.icon}</span>
        <span className="of-card-label" style={{ color: meta.color }}>{meta.label}</span>
        <span className="of-card-tokens">{result.tokens} tok</span>
        <button
          className="of-card-toggle"
          onClick={() => setExpanded(v => !v)}
          title={expanded ? 'Collapse' : 'Expand'}
        >
          {expanded ? '▲' : '▼'}
        </button>
      </div>
      {expanded && (
        <>
          <div className="of-card-response">
            <pre className="of-card-pre">{result.response}</pre>
          </div>
          <details className="of-card-prompt-details">
            <summary className="of-card-prompt-summary">System prompt used</summary>
            <div className="of-card-prompt-text">{result.system_prompt}</div>
          </details>
        </>
      )}
    </div>
  )
}

export default function AppOutputFormat() {
  const [message, setMessage]         = useState('')
  const [selectedFormats, setSelected] = useState(new Set(ALL_FORMATS))
  const [result, setResult]           = useState(null)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState(null)

  useInfoPanelQuestion(setMessage)

  const toggleFormat = (fmt) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(fmt)) {
        if (next.size > 1) next.delete(fmt)
      } else {
        next.add(fmt)
      }
      return next
    })
  }

  const run = async (overrideMsg) => {
    const msg = overrideMsg ?? message
    if (!msg.trim()) return
    if (overrideMsg) setMessage(overrideMsg)
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/output-format', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, formats: [...selectedFormats] }),
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
    <div className="app of-app">
      {/* Controls */}
      <div className="of-controls">
        <div className="of-query-row">
          <input
            className="of-input"
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && run()}
            placeholder="Ask anything — see it rendered in 5 formats…"
          />
          <button
            className="of-run-btn"
            onClick={() => run()}
            disabled={loading || !message.trim()}
          >
            {loading ? 'Formatting…' : 'Run →'}
          </button>
        </div>

        <div className="of-format-toggles">
          {ALL_FORMATS.map(fmt => {
            const meta = FORMAT_META[fmt]
            const active = selectedFormats.has(fmt)
            return (
              <button
                key={fmt}
                className={`of-fmt-btn ${active ? 'of-fmt-btn--active' : ''}`}
                style={active ? { borderColor: meta.color, color: meta.color, background: `${meta.color}12` } : {}}
                onClick={() => toggleFormat(fmt)}
              >
                <span>{meta.icon}</span> {meta.label}
              </button>
            )
          })}
        </div>

        <div className="of-examples">
          {EXAMPLES.map((ex, i) => (
            <button key={i} className="example-btn" onClick={() => run(ex)}>{ex}</button>
          ))}
        </div>
      </div>

      {error && <div className="of-error">{error}</div>}

      {result ? (
        <div className="of-body">
          <div className="of-query-echo">
            Query: <em>{result.message}</em>
          </div>
          <div className="of-cards">
            {result.results.map(r => (
              <FormatCard
                key={r.format}
                result={r}
                isSelected={selectedFormats.has(r.format)}
                onToggle={() => toggleFormat(r.format)}
              />
            ))}
          </div>
        </div>
      ) : !loading && (
        <div className="of-placeholder">
          <p>
            The same content can be shaped into completely different forms purely through
            the system prompt — no post-processing needed.
          </p>
          <ul>
            {ALL_FORMATS.map(fmt => (
              <li key={fmt}>
                <strong style={{ color: FORMAT_META[fmt].color }}>
                  {FORMAT_META[fmt].icon} {FORMAT_META[fmt].label}
                </strong>
                {fmt === 'prose'   && ' — flowing sentences, no structure'}
                {fmt === 'bullets' && ' — scannable key points'}
                {fmt === 'table'   && ' — structured comparison'}
                {fmt === 'json'    && ' — machine-readable, typed fields'}
                {fmt === 'steps'   && ' — actionable numbered sequence'}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
