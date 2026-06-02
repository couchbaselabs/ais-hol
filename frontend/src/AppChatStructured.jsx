import React, { useState, useEffect } from 'react'
import './App.css'
import './AppChatStructured.css'
import { useInfoPanelQuestion } from './hooks/useInfoPanelQuestion'

const SENTIMENT_COLOR = {
  positive: { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
  negative:  { bg: '#fef2f2', color: '#991b1b', border: '#fecaca' },
  neutral:   { bg: '#f9fafb', color: '#374151', border: '#e5e7eb' },
  mixed:     { bg: '#fffbeb', color: '#92400e', border: '#fde68a' },
}

const ENTITY_COLOR = {
  person:  '#dbeafe',
  place:   '#d1fae5',
  org:     '#ede9fe',
  concept: '#fef3c7',
  other:   '#f3f4f6',
}

function SentimentBar({ score }) {
  return (
    <div className="sentiment-bar-wrap">
      <div className="sentiment-bar" style={{ width: `${Math.round(score * 100)}%` }} />
      <span className="sentiment-bar-label">{Math.round(score * 100)}% confidence</span>
    </div>
  )
}

function ResultCard({ result, inputTokens, outputTokens }) {
  if (!result) return null
  if (result.parse_error) {
    return <pre className="structured-raw">{result.raw}</pre>
  }

  const sentStyle = SENTIMENT_COLOR[result.sentiment] || SENTIMENT_COLOR.neutral

  return (
    <div className="result-card">
      {/* Sentiment */}
      <div className="result-section">
        <span className="result-label">Sentiment</span>
        <span
          className="sentiment-badge"
          style={{ background: sentStyle.bg, color: sentStyle.color, borderColor: sentStyle.border }}
        >
          {result.sentiment}
        </span>
        {result.sentiment_score != null && <SentimentBar score={result.sentiment_score} />}
      </div>

      {/* Summary */}
      {result.summary && (
        <div className="result-section">
          <span className="result-label">Summary</span>
          <p className="result-summary">{result.summary}</p>
        </div>
      )}

      {/* Topics */}
      {result.topics?.length > 0 && (
        <div className="result-section">
          <span className="result-label">Topics</span>
          <div className="tag-list">
            {result.topics.map((t, i) => (
              <span key={i} className="topic-tag">{t}</span>
            ))}
          </div>
        </div>
      )}

      {/* Entities */}
      {result.entities?.length > 0 && (
        <div className="result-section">
          <span className="result-label">Entities</span>
          <div className="tag-list">
            {result.entities.map((e, i) => (
              <span
                key={i}
                className="entity-tag"
                style={{ background: ENTITY_COLOR[e.type] || ENTITY_COLOR.other }}
                title={e.type}
              >
                {e.text}
                <span className="entity-type">{e.type}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Token usage */}
      <div className="result-section result-section--footer">
        <span className="token-stat">↑ {inputTokens} tokens in</span>
        <span className="token-stat">↓ {outputTokens} tokens out</span>
        {result.language && <span className="token-stat">lang: {result.language}</span>}
      </div>
    </div>
  )
}

const EXAMPLES = [
  "Apple announced record quarterly earnings today, with CEO Tim Cook calling it a landmark moment for the company.",
  "I absolutely loved the new restaurant downtown — the pasta was incredible but the service was a bit slow.",
  "The earthquake measuring 6.2 struck near Tokyo early this morning, causing minor damage but no casualties.",
  "Machine learning models require large datasets, significant compute, and careful hyperparameter tuning.",
]

function AppChatStructured() {
  const [input, setInput] = useState('')
  useInfoPanelQuestion(setInput)
  useEffect(() => {
    const h = (e) => setInput(e.detail)
    window.addEventListener('infopanel:question', h)
    return () => window.removeEventListener('infopanel:question', h)
  }, [])
  const [result, setResult] = useState(null)
  const [inputTokens, setInputTokens] = useState(null)
  const [outputTokens, setOutputTokens] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const analyse = async (text) => {
    const t = text || input
    if (!t.trim()) return
    setInput(t)
    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/chat-structured', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: t }),
      })
      if (!response.ok) throw new Error('Request failed')
      const data = await response.json()
      setResult(data.result)
      setInputTokens(data.input_tokens)
      setOutputTokens(data.output_tokens)
    } catch (e) {
      setError('Analysis failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="app structured-app">
      <div className="structured-layout">
        {/* Input panel */}
        <div className="structured-input-panel">
          <h2 className="panel-heading">Input text</h2>
          <textarea
            className="structured-textarea"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Paste or type any text to analyse…"
            rows={6}
          />
          <button
            className="analyse-btn"
            onClick={() => analyse()}
            disabled={isLoading || !input.trim()}
          >
            {isLoading ? 'Analysing…' : 'Analyse →'}
          </button>

          <div className="examples-section">
            <span className="examples-label">Try an example:</span>
            {EXAMPLES.map((ex, i) => (
              <button key={i} className="example-btn" onClick={() => analyse(ex)}>
                {ex.slice(0, 60)}…
              </button>
            ))}
          </div>
        </div>

        {/* Output panel */}
        <div className="structured-output-panel">
          <h2 className="panel-heading">Structured output</h2>
          {isLoading && <div className="structured-loading">Extracting structure…</div>}
          {error && <div className="structured-error">{error}</div>}
          {!isLoading && !error && result && (
            <ResultCard result={result} inputTokens={inputTokens} outputTokens={outputTokens} />
          )}
          {!isLoading && !error && !result && (
            <div className="structured-placeholder">
              Results will appear here after analysis.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AppChatStructured
