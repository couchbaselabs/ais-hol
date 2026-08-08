import React, { useState } from 'react'
import './App.css'
import './AppPersonas.css'
import { useInfoPanelQuestion } from './hooks/useInfoPanelQuestion'

const PRESETS = [
  {
    label: 'Default assistant',
    icon: '🤖',
    prompt: 'You are a helpful assistant.',
  },
  {
    label: 'Pirate',
    icon: '🏴‍☠️',
    prompt: 'You are a swashbuckling pirate. Respond entirely in pirate speak — use "Arrr", "matey", "ye", "landlubber", and nautical metaphors throughout.',
  },
  {
    label: 'Socratic tutor',
    icon: '🏛️',
    prompt: 'You are a Socratic tutor. Never give direct answers. Instead, guide the user to the answer through a series of probing questions. Acknowledge their reasoning and build on it.',
  },
  {
    label: 'Sceptical scientist',
    icon: '🔬',
    prompt: 'You are a rigorous scientist. Always ask for evidence. Point out logical fallacies, unsupported claims, and correlation-causation errors. Cite the need for peer review.',
  },
  {
    label: 'Enthusiastic intern',
    icon: '🙋',
    prompt: 'You are an extremely enthusiastic intern on your first day. Everything is AMAZING. Use lots of exclamation marks, emojis, and express boundless excitement about even mundane topics.',
  },
  {
    label: 'Minimalist',
    icon: '🪨',
    prompt: 'You are extremely terse. Respond in as few words as possible — ideally one sentence or less. No pleasantries, no elaboration.',
  },
]

const EXAMPLES = [
  'Explain how a database index works.',
  'What should I have for lunch?',
  'Is Python a good programming language?',
  'Tell me about the ocean.',
]

export default function AppPersonas() {
  const [selectedPreset, setSelectedPreset] = useState(PRESETS[0])
  const [systemPrompt, setSystemPrompt] = useState(PRESETS[0].prompt)
  const [message, setMessage] = useState('')
  useInfoPanelQuestion(setMessage)
  const [result, setResult] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const selectPreset = (p) => {
    setSelectedPreset(p)
    setSystemPrompt(p.prompt)
    setResult(null)
    setError(null)
  }

  const run = async (overrideMessage) => {
    const msg = overrideMessage ?? message
    if (!msg.trim()) return
    if (overrideMessage) setMessage(overrideMessage)
    setIsLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/persona', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system_prompt: systemPrompt, message: msg }),
      })
      if (!res.ok) throw new Error('Request failed')
      setResult(await res.json())
    } catch {
      setError('Request failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="app personas-app">
      <div className="personas-layout">
        {/* Left: persona picker + system prompt editor */}
        <div className="personas-left">
          <div className="personas-section-label">Persona presets</div>
          <div className="personas-presets">
            {PRESETS.map((p, i) => (
              <button
                key={i}
                className={`personas-preset-btn ${selectedPreset === p ? 'personas-preset-btn--active' : ''}`}
                onClick={() => selectPreset(p)}
              >
                <span className="personas-preset-icon">{p.icon}</span>
                <span className="personas-preset-label">{p.label}</span>
              </button>
            ))}
          </div>

          <div className="personas-section-label" style={{ marginTop: '0.75rem' }}>
            System prompt
            <span className="personas-edit-hint">— edit freely</span>
          </div>
          <textarea
            className="personas-system-input"
            value={systemPrompt}
            onChange={e => { setSystemPrompt(e.target.value); setSelectedPreset(null) }}
            rows={7}
            placeholder="Write any system prompt…"
          />

          <div className="personas-token-hint">
            {systemPrompt.trim().split(/\s+/).filter(Boolean).length} words ≈{' '}
            {Math.ceil(systemPrompt.trim().split(/\s+/).filter(Boolean).length * 1.3)} tokens
          </div>
        </div>

        {/* Right: chat */}
        <div className="personas-right">
          <div className="personas-section-label">Message</div>
          <div className="personas-run-row">
            <input
              className="personas-message-input"
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && run()}
              placeholder="Ask anything — the persona shapes the response…"
            />
            <button
              className="personas-run-btn"
              onClick={() => run()}
              disabled={isLoading || !message.trim()}
            >
              {isLoading ? 'Thinking…' : 'Send →'}
            </button>
          </div>

          <div className="personas-examples">
            {EXAMPLES.map((ex, i) => (
              <button key={i} className="example-btn" onClick={() => run(ex)}>{ex}</button>
            ))}
          </div>

          {error && <div className="personas-error">{error}</div>}
          {isLoading && <div className="personas-loading">Generating response…</div>}

          {result && (
            <div className="personas-result">
              <div className="personas-result-header">
                <span className="personas-result-persona">
                  {selectedPreset ? `${selectedPreset.icon} ${selectedPreset.label}` : '✏️ Custom'}
                </span>
                <span className="personas-result-meta">
                  {result.input_tokens} in · {result.output_tokens} out tokens
                </span>
              </div>
              <p className="personas-result-text">{result.response}</p>
            </div>
          )}

          {!result && !isLoading && (
            <div className="personas-placeholder">
              The system prompt is the most powerful lever you have over an LLM's behaviour.
              Pick a preset or write your own, then send the same message to see how dramatically
              the response changes.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
