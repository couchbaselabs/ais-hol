import React, { useState, useEffect } from 'react'
import './App.css'
import './AppChatPrompt.css'

/**
 * Prompt Engineering tab — same question, multiple system prompts, side by side.
 *
 * The user picks which presets to run, asks a question, and sees how
 * dramatically the wording of the system prompt changes the response.
 */

const PRESET_META = {
  terse:           { label: 'Terse',            color: '#4f46e5', bg: '#ede9fe', desc: 'One sentence, no preamble' },
  verbose:         { label: 'Verbose',           color: '#0891b2', bg: '#e0f2fe', desc: 'Step-by-step with examples' },
  chain_of_thought:{ label: 'Chain of Thought',  color: '#d97706', bg: '#fef3c7', desc: 'Show reasoning before answer' },
  eli5:            { label: 'ELI5',              color: '#059669', bg: '#d1fae5', desc: 'Explain like I\'m 5' },
  socratic:        { label: 'Socratic',          color: '#7c3aed', bg: '#ede9fe', desc: 'Guide with questions, don\'t answer' },
  few_shot:        { label: 'Few-shot',          color: '#be185d', bg: '#fce7f3', desc: 'Examples in the prompt shape the style' },
}

const ALL_PRESETS = Object.keys(PRESET_META)
const DEFAULT_PRESETS = ['terse', 'verbose', 'chain_of_thought']

const EXAMPLES = [
  'What is recursion?',
  'How does HTTPS work?',
  'What is a database index?',
  'Explain closures in JavaScript',
]

function PresetCard({ result }) {
  const meta = PRESET_META[result.preset] || { label: result.preset, color: '#6b7280', bg: '#f9fafb' }
  const [showPrompt, setShowPrompt] = useState(false)

  return (
    <div className="preset-card" style={{ '--accent': meta.color, '--accent-bg': meta.bg }}>
      <div className="preset-card-header">
        <span className="preset-badge" style={{ background: meta.bg, color: meta.color }}>
          {meta.label}
        </span>
        <span className="preset-desc">{meta.desc}</span>
        <span className="preset-tokens">{result.tokens} tokens</span>
      </div>

      <p className="preset-response">{result.response}</p>

      <button className="show-prompt-btn" onClick={() => setShowPrompt(v => !v)}>
        {showPrompt ? '▲ Hide system prompt' : '▼ Show system prompt'}
      </button>
      {showPrompt && (
        <pre className="preset-system-prompt">{result.system_prompt}</pre>
      )}
    </div>
  )
}

function AppChatPrompt() {
  const [question, setQuestion] = useState('')
  useEffect(() => {
    const h = (e) => setQuestion(e.detail)
    window.addEventListener('infopanel:question', h)
    return () => window.removeEventListener('infopanel:question', h)
  }, [])
  const [selectedPresets, setSelectedPresets] = useState(new Set(DEFAULT_PRESETS))
  const [results, setResults] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const togglePreset = (p) => {
    setSelectedPresets(prev => {
      const next = new Set(prev)
      if (next.has(p)) {
        if (next.size > 1) next.delete(p) // keep at least one
      } else {
        next.add(p)
      }
      return next
    })
  }

  const run = async (q) => {
    const text = q || question
    if (!text.trim()) return
    setQuestion(text)
    setIsLoading(true)
    setError(null)
    setResults(null)

    try {
      const response = await fetch('/api/chat-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, presets: [...selectedPresets] }),
      })
      if (!response.ok) throw new Error('Request failed')
      const data = await response.json()
      setResults(data.results)
    } catch {
      setError('Request failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="app prompt-app">
      {/* Controls */}
      <div className="prompt-controls">
        <div className="prompt-query-row">
          <input
            className="prompt-input"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && run()}
            placeholder="Ask any question…"
          />
          <button
            className="prompt-run-btn"
            onClick={() => run()}
            disabled={isLoading || !question.trim() || selectedPresets.size === 0}
          >
            {isLoading ? 'Running…' : `Run ${selectedPresets.size} prompt${selectedPresets.size !== 1 ? 's' : ''} →`}
          </button>
        </div>

        {/* Preset toggles */}
        <div className="preset-toggles">
          <span className="toggles-label">Presets:</span>
          {ALL_PRESETS.map(p => {
            const meta = PRESET_META[p]
            const active = selectedPresets.has(p)
            return (
              <button
                key={p}
                className={`preset-toggle ${active ? 'preset-toggle--active' : ''}`}
                style={active ? { background: meta.bg, color: meta.color, borderColor: meta.color } : {}}
                onClick={() => togglePreset(p)}
              >
                {meta.label}
              </button>
            )
          })}
        </div>

        {/* Examples */}
        <div className="prompt-examples">
          {EXAMPLES.map((ex, i) => (
            <button key={i} className="example-btn" onClick={() => run(ex)}>{ex}</button>
          ))}
        </div>
      </div>

      {error && <div className="prompt-error">{error}</div>}

      {/* Results grid */}
      {isLoading && (
        <div className="prompt-loading">
          Running {selectedPresets.size} parallel LLM calls…
        </div>
      )}

      {results && (
        <div
          className="prompt-results"
          style={{ '--cols': Math.min(results.length, 3) }}
        >
          {results.map((r, i) => <PresetCard key={i} result={r} />)}
        </div>
      )}

      {!results && !isLoading && (
        <div className="prompt-placeholder">
          Select presets, ask a question, and see how the system prompt changes the answer.
        </div>
      )}
    </div>
  )
}

export default AppChatPrompt
