import React, { useState } from 'react'
import './App.css'
import './AppHallucination.css'

const EXAMPLES_NO_CONTEXT = [
  'What is the capital of Australia?',
  'Who invented the telephone?',
  'When was the Eiffel Tower built?',
  'What is the boiling point of water on Mars?',
]

const EXAMPLES_WITH_CONTEXT = [
  {
    label: 'Correct context',
    question: 'What year was Couchbase founded?',
    context: 'Couchbase was founded in 2011 through the merger of CouchOne and Membase. It is headquartered in Santa Clara, California.',
  },
  {
    label: 'Misleading context',
    question: 'What is the speed of light?',
    context: 'According to recent experiments, the speed of light has been measured at approximately 200,000 km/s in a vacuum.',
  },
  {
    label: 'Irrelevant context',
    question: 'Who wrote Hamlet?',
    context: 'The Amazon rainforest covers approximately 5.5 million square kilometres and is home to 10% of all species on Earth.',
  },
]

const VERDICT_STYLES = {
  grounded:      { bg: '#f0fdf4', border: '#bbf7d0', color: '#166534', icon: '✅' },
  hallucinated:  { bg: '#fef2f2', border: '#fecaca', color: '#991b1b', icon: '❌' },
  uncertain:     { bg: '#fffbeb', border: '#fde68a', color: '#92400e', icon: '⚠️' },
}

export default function AppHallucination() {
  const [question, setQuestion] = useState('')
  const [context, setContext] = useState('')
  const [useContext, setUseContext] = useState(false)
  const [result, setResult] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const run = async (overrides = {}) => {
    const q = overrides.question ?? question
    const ctx = overrides.context ?? (useContext ? context : '')
    if (!q.trim()) return
    if (overrides.question) setQuestion(overrides.question)
    if (overrides.context !== undefined) { setContext(overrides.context); setUseContext(true) }
    setIsLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/hallucination', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, context: ctx }),
      })
      if (!res.ok) throw new Error('Request failed')
      setResult(await res.json())
    } catch {
      setError('Request failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const verdict = result ? (VERDICT_STYLES[result.verdict] || VERDICT_STYLES.uncertain) : null

  return (
    <div className="app hall-app">
      <div className="hall-layout">
        {/* Left: input */}
        <div className="hall-left">
          <div className="hall-section">
            <div className="hall-section-label">Question</div>
            <input
              className="hall-question-input"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && run()}
              placeholder="Ask a factual question…"
            />
            <div className="hall-examples">
              {EXAMPLES_NO_CONTEXT.map((ex, i) => (
                <button key={i} className="example-btn" onClick={() => { setUseContext(false); run({ question: ex, context: '' }) }}>{ex}</button>
              ))}
            </div>
          </div>

          <div className="hall-section">
            <div className="hall-context-toggle">
              <label className="hall-toggle-label">
                <input
                  type="checkbox"
                  checked={useContext}
                  onChange={e => setUseContext(e.target.checked)}
                />
                <span>Provide grounding context</span>
              </label>
              <span className="hall-toggle-hint">
                {useContext ? 'LLM must answer from context only' : 'LLM answers from training data'}
              </span>
            </div>

            {useContext && (
              <textarea
                className="hall-context-input"
                value={context}
                onChange={e => setContext(e.target.value)}
                rows={5}
                placeholder="Paste a document, article excerpt, or any grounding text…"
              />
            )}

            {useContext && (
              <div className="hall-context-examples">
                <span className="hall-context-examples-label">Try:</span>
                {EXAMPLES_WITH_CONTEXT.map((ex, i) => (
                  <button
                    key={i}
                    className="example-btn"
                    onClick={() => run({ question: ex.question, context: ex.context })}
                  >
                    {ex.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            className="hall-run-btn"
            onClick={() => run()}
            disabled={isLoading || !question.trim()}
          >
            {isLoading ? 'Checking…' : 'Generate & verify →'}
          </button>
        </div>

        {/* Right: results */}
        <div className="hall-right">
          {error && <div className="hall-error">{error}</div>}

          {isLoading && (
            <div className="hall-loading">
              <div className="hall-loading-step hall-loading-step--active">Step 1: Generating answer…</div>
              <div className="hall-loading-step">Step 2: Fact-checking answer…</div>
            </div>
          )}

          {result && (
            <>
              {/* Answer */}
              <div className="hall-card">
                <div className="hall-card-label">Generated answer</div>
                <p className="hall-card-text">{result.answer}</p>
                <div className="hall-card-meta">{result.answer_tokens} tokens</div>
              </div>

              {/* Verdict */}
              <div
                className="hall-verdict"
                style={{ background: verdict.bg, borderColor: verdict.border }}
              >
                <div className="hall-verdict-header">
                  <span className="hall-verdict-icon">{verdict.icon}</span>
                  <span className="hall-verdict-label" style={{ color: verdict.color }}>
                    {result.verdict.charAt(0).toUpperCase() + result.verdict.slice(1)}
                  </span>
                  <span className="hall-verdict-conf">
                    {Math.round(result.confidence * 100)}% confidence
                  </span>
                </div>
                <p className="hall-verdict-explanation">{result.explanation}</p>

                {result.issues && result.issues.length > 0 && (
                  <div className="hall-issues">
                    <div className="hall-issues-label">Issues found:</div>
                    <ul className="hall-issues-list">
                      {result.issues.map((issue, i) => (
                        <li key={i}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="hall-meta">
                Fact-check used {result.check_tokens} tokens
                {result.question && <> · Question: <em>{result.question}</em></>}
              </div>
            </>
          )}

          {!result && !isLoading && (
            <div className="hall-placeholder">
              The LLM generates an answer, then a second LLM call fact-checks it.
              Try questions the model might hallucinate on, or provide misleading context
              to see how grounding affects accuracy.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
