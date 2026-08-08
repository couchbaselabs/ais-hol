import React, { useState } from 'react'
import './App.css'
import './AppContextWindow.css'

const MODELS = ['gpt-4o-mini', 'gpt-4o', 'gpt-4', 'gpt-3.5-turbo', 'claude-3-5-sonnet', 'llama-3.1-70b']
const ROLE_COLORS = { system: '#7c3aed', user: '#0891b2', assistant: '#059669' }

const PRESETS = [
  {
    label: 'Short conversation',
    messages: [
      { role: 'system',    content: 'You are a helpful assistant.' },
      { role: 'user',      content: 'What is JavaScript?' },
      { role: 'assistant', content: 'JavaScript is a high-level programming language used to make web pages interactive.' },
      { role: 'user',      content: 'How does it differ from Python?' },
    ],
  },
  {
    label: 'Long system prompt',
    messages: [
      { role: 'system', content: 'You are an expert software engineer with 20 years of experience. You always write clean, well-documented code. You follow SOLID principles, prefer composition over inheritance, and write tests for all your code. When answering questions, you provide concrete examples and explain the trade-offs of different approaches. You are familiar with all major programming languages and frameworks.' },
      { role: 'user',   content: 'How do I implement a binary search tree?' },
    ],
  },
]

export default function AppContextWindow() {
  const [model, setModel] = useState('gpt-4o-mini')
  const [messages, setMessages] = useState([
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user',   content: '' },
  ])
  const [result, setResult] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const analyse = async (overrideMsgs) => {
    const msgs = overrideMsgs ?? messages
    setIsLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/context-window', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: msgs, model }),
      })
      if (!res.ok) throw new Error('Request failed')
      setResult(await res.json())
    } catch {
      setError('Request failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const updateMsg = (i, field, val) => {
    setMessages(prev => prev.map((m, idx) => idx === i ? { ...m, [field]: val } : m))
    setResult(null)
  }

  const addMsg = () => setMessages(prev => [...prev, { role: 'user', content: '' }])
  const removeMsg = (i) => setMessages(prev => prev.filter((_, idx) => idx !== i))

  const loadPreset = (preset) => {
    setMessages(preset.messages)
    setResult(null)
    analyse(preset.messages)
  }

  const pctUsed = result ? result.pct_used : 0
  const barColor = pctUsed > 90 ? '#dc2626' : pctUsed > 70 ? '#d97706' : '#00A3E0'

  return (
    <div className="app ctx-app">
      <div className="ctx-controls">
        <div className="ctx-top-row">
          <select className="ctx-model-select" value={model} onChange={e => { setModel(e.target.value); setResult(null) }}>
            {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <button className="ctx-run-btn" onClick={() => analyse()} disabled={isLoading}>
            {isLoading ? 'Counting…' : 'Count tokens →'}
          </button>
        </div>
        <div className="ctx-presets">
          <span className="toggles-label">Load preset:</span>
          {PRESETS.map((p, i) => (
            <button key={i} className="example-btn" onClick={() => loadPreset(p)}>{p.label}</button>
          ))}
        </div>
      </div>

      <div className="ctx-body">
        <div className="ctx-messages-panel">
          {messages.map((msg, i) => (
            <div key={i} className="ctx-msg" style={{ '--role-color': ROLE_COLORS[msg.role] || '#6b7280' }}>
              <div className="ctx-msg-header">
                <select
                  className="ctx-role-select"
                  value={msg.role}
                  onChange={e => updateMsg(i, 'role', e.target.value)}
                >
                  <option value="system">system</option>
                  <option value="user">user</option>
                  <option value="assistant">assistant</option>
                </select>
                {messages.length > 1 && (
                  <button className="ctx-remove-btn" onClick={() => removeMsg(i)}>✕</button>
                )}
              </div>
              <textarea
                className="ctx-msg-textarea"
                value={msg.content}
                onChange={e => updateMsg(i, 'content', e.target.value)}
                rows={3}
                placeholder={`${msg.role} message…`}
              />
            </div>
          ))}
          <button className="ctx-add-btn" onClick={addMsg}>+ Add message</button>
        </div>

        <div className="ctx-results-panel">
          {error && <div className="ctx-error">{error}</div>}

          {result && (
            <>
              <div className="ctx-summary">
                <div className="ctx-summary-row">
                  <span className="ctx-stat-label">Model</span>
                  <span className="ctx-stat-value">{result.model}</span>
                </div>
                <div className="ctx-summary-row">
                  <span className="ctx-stat-label">Context limit</span>
                  <span className="ctx-stat-value">{result.limit.toLocaleString()} tokens</span>
                </div>
                <div className="ctx-summary-row">
                  <span className="ctx-stat-label">Used</span>
                  <span className="ctx-stat-value" style={{ color: barColor }}>
                    {result.total_tokens.toLocaleString()} tokens ({result.pct_used}%)
                  </span>
                </div>
                <div className="ctx-summary-row">
                  <span className="ctx-stat-label">Remaining</span>
                  <span className="ctx-stat-value">{result.remaining.toLocaleString()} tokens</span>
                </div>
              </div>

              <div className="ctx-bar-wrap">
                <div className="ctx-bar" style={{ width: `${Math.min(pctUsed, 100)}%`, background: barColor }} />
              </div>

              <div className="ctx-msg-breakdown">
                {result.messages.map((m, i) => (
                  <div key={i} className="ctx-breakdown-row" style={{ '--role-color': ROLE_COLORS[m.role] || '#6b7280' }}>
                    <span className="ctx-breakdown-role">{m.role}</span>
                    <span className="ctx-breakdown-preview">{m.content_preview}{m.content_preview.length >= 120 ? '…' : ''}</span>
                    <span className="ctx-breakdown-tokens">{m.tokens} tok</span>
                    <span className="ctx-breakdown-pct">{m.pct}%</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {!result && !isLoading && (
            <div className="ctx-placeholder">
              Edit the messages on the left, then click "Count tokens" to see how much of the context window they consume.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
