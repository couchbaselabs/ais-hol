import React, { useState, useEffect } from 'react'
import './App.css'
import './AppToolCalling.css'
import { useInfoPanelQuestion } from './hooks/useInfoPanelQuestion'

const EXAMPLES = [
  "What's the weather like in Paris?",
  'What is 1337 multiplied by 42?',
  'Search the docs for vector search',
  'What is the capital of France?',
]

const TOOL_ICONS = { get_weather: '🌤', calculate: '🧮', search_docs: '🔍' }

export default function AppToolCalling() {
  const [message, setMessage] = useState('')
  useInfoPanelQuestion(setMessage)
  const [result, setResult] = useState(null)
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
    setResult(null)
    try {
      const res = await fetch('/api/tool-calling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
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
    <div className="app tool-app">
      <div className="tool-controls">
        <div className="tool-query-row">
          <input
            className="tool-input"
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && run()}
            placeholder="Ask something that needs a tool — weather, maths, or doc search…"
          />
          <button className="tool-run-btn" onClick={() => run()} disabled={isLoading || !message.trim()}>
            {isLoading ? 'Running…' : 'Send →'}
          </button>
        </div>
        <div className="tool-examples">
          {EXAMPLES.map((ex, i) => (
            <button key={i} className="example-btn" onClick={() => run(ex)}>{ex}</button>
          ))}
        </div>
        <div className="tool-available">
          <span className="tool-available-label">Available tools:</span>
          {Object.entries(TOOL_ICONS).map(([name, icon]) => (
            <span key={name} className="tool-chip">{icon} {name}</span>
          ))}
        </div>
      </div>

      {error && <div className="tool-error">{error}</div>}
      {isLoading && <div className="tool-loading">LLM is deciding which tool to call…</div>}

      {result && (
        <div className="tool-result">
          {result.tool_used ? (
            <>
              <div className="tool-pipeline">
                {result.steps.map((step, i) => (
                  <div key={i} className="tool-step">
                    <span className="tool-step-num">{i + 1}</span>
                    <span className="tool-step-text">{step}</span>
                  </div>
                ))}
              </div>

              <div className="tool-cards">
                <div className="tool-card tool-card--call">
                  <div className="tool-card-heading">
                    {TOOL_ICONS[result.tool_used] || '🔧'} Tool called
                  </div>
                  <div className="tool-card-name">{result.tool_used}</div>
                  <pre className="tool-card-args">{JSON.stringify(result.tool_args, null, 2)}</pre>
                </div>

                <div className="tool-card tool-card--result">
                  <div className="tool-card-heading">📤 Tool result</div>
                  <p className="tool-card-content">{result.tool_result}</p>
                </div>

                <div className="tool-card tool-card--answer">
                  <div className="tool-card-heading">💬 Final answer</div>
                  <p className="tool-card-content">{result.final_answer}</p>
                </div>
              </div>
            </>
          ) : (
            <div className="tool-direct">
              <div className="tool-card-heading">💬 Direct answer (no tool needed)</div>
              <p className="tool-card-content">{result.final_answer}</p>
            </div>
          )}
        </div>
      )}

      {!result && !isLoading && (
        <div className="tool-placeholder">
          The LLM will decide whether to call a tool or answer directly.
          Try asking about weather, maths, or documentation — then try a general question to see the difference.
        </div>
      )}
    </div>
  )
}
