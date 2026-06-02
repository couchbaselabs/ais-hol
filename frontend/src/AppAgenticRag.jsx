import React, { useState } from 'react'
import './App.css'
import './AppAgenticRag.css'

const EXAMPLES = [
  'What are the main features of Couchbase Capella?',
  'How does vector search work in a database?',
  'What is the difference between RAG and fine-tuning?',
  'Explain how Couchbase handles high availability.',
]

const STEP_ICONS = { decide: '🤔', retrieve: '🔍', answer: '💬' }

export default function AppAgenticRag() {
  const [question, setQuestion] = useState('')
  const [maxIterations, setMaxIterations] = useState(3)
  const [result, setResult] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const run = async (overrideQuestion) => {
    const q = overrideQuestion ?? question
    if (!q.trim()) return
    if (overrideQuestion) setQuestion(overrideQuestion)
    setIsLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/agentic-rag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, max_iterations: maxIterations }),
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
    <div className="app arag-app">
      <div className="arag-controls">
        <div className="arag-query-row">
          <input
            className="arag-input"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && run()}
            placeholder="Ask a question — the agent decides how many retrieval steps to take…"
          />
          <div className="arag-iter-control">
            <span className="arag-iter-label">Max iterations</span>
            <select
              className="arag-iter-select"
              value={maxIterations}
              onChange={e => setMaxIterations(Number(e.target.value))}
            >
              {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <button
            className="arag-run-btn"
            onClick={() => run()}
            disabled={isLoading || !question.trim()}
          >
            {isLoading ? 'Running…' : 'Ask →'}
          </button>
        </div>
        <div className="arag-examples">
          {EXAMPLES.map((ex, i) => (
            <button key={i} className="example-btn" onClick={() => run(ex)}>{ex}</button>
          ))}
        </div>
      </div>

      {error && <div className="arag-error">{error}</div>}

      {isLoading && (
        <div className="arag-loading">
          Agent is reasoning and retrieving — this may take a few seconds…
        </div>
      )}

      {result && (
        <div className="arag-results">
          {/* Trace */}
          <div className="arag-trace">
            <div className="arag-trace-heading">
              Agent trace
              <span className="arag-trace-badge">
                {result.iterations} retrieval{result.iterations !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="arag-steps">
              {result.steps.map((step, i) => (
                <div key={i} className={`arag-step arag-step--${step.type}`}>
                  <div className="arag-step-icon">{STEP_ICONS[step.type] || '•'}</div>
                  <div className="arag-step-body">
                    {step.type === 'decide' && (
                      <>
                        <span className="arag-step-label">
                          Iteration {step.iteration} — decided to{' '}
                          <strong>{step.action === 'answer' ? 'answer' : 'retrieve more'}</strong>
                        </span>
                        <p className="arag-step-reason">{step.reason}</p>
                        {step.action === 'retrieve' && step.query && (
                          <span className="arag-step-query">Query: "{step.query}"</span>
                        )}
                      </>
                    )}
                    {step.type === 'retrieve' && (
                      <>
                        <span className="arag-step-label">
                          Retrieved {step.docs_found} document{step.docs_found !== 1 ? 's' : ''}
                        </span>
                        <span className="arag-step-query">"{step.query}"</span>
                      </>
                    )}
                    {step.type === 'answer' && (
                      <span className="arag-step-label">Generated final answer</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Final answer */}
          <div className="arag-answer">
            <div className="arag-answer-label">Final answer</div>
            <p className="arag-answer-text">{result.answer}</p>
            <div className="arag-answer-meta">{result.tokens} tokens</div>
          </div>
        </div>
      )}

      {!result && !isLoading && (
        <div className="arag-placeholder">
          Unlike standard RAG (one retrieval → one answer), the agent decides after each
          retrieval whether it has enough context to answer or needs to search again with
          a refined query. Watch the trace to see its reasoning.
        </div>
      )}
    </div>
  )
}
