import React, { useState, useEffect } from 'react'
import './App.css'
import './AppAiDataPlaneSentiment.css'
import { useInfoPanelQuestion } from './hooks/useInfoPanelQuestion'
import AiDataPlaneDiyBanner from './components/AiDataPlaneDiyBanner'

const SENTIMENT_STYLE = {
  positive: { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0', bar: '#22c55e' },
  negative:  { bg: '#fef2f2', color: '#991b1b', border: '#fecaca', bar: '#ef4444' },
  neutral:   { bg: '#f9fafb', color: '#374151', border: '#e5e7eb', bar: '#9ca3af' },
  mixed:     { bg: '#fffbeb', color: '#92400e', border: '#fde68a', bar: '#f59e0b' },
}

const EXAMPLES = [
  'Apple announced record quarterly earnings today, with CEO Tim Cook calling it a landmark moment for the company.',
  'I absolutely loved the new restaurant downtown — the pasta was incredible but the service was a bit slow.',
  'The earthquake measuring 6.2 struck near Tokyo early this morning, causing minor damage but no casualties.',
  'The new software update is terrible. It broke half the features and the performance is awful.',
  'Machine learning models require large datasets, significant compute, and careful hyperparameter tuning.',
]

function ScoreBar({ score, color }) {
  return (
    <div className="score-bar-wrap">
      <div
        className="score-bar"
        style={{ width: `${Math.round(score * 100)}%`, background: color }}
      />
      <span className="score-bar-label">{Math.round(score * 100)}% confidence</span>
    </div>
  )
}

export default function AppAiDataPlaneSentiment() {
  const [text, setText] = useState('')
  useInfoPanelQuestion(setText)
  useEffect(() => {
    const h = (e) => setText(e.detail)
    window.addEventListener('infopanel:question', h)
    return () => window.removeEventListener('infopanel:question', h)
  }, [])
  const [result, setResult] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const run = async (overrideText) => {
    const t = overrideText ?? text
    if (!t.trim()) return
    if (overrideText !== undefined) setText(overrideText)
    setIsLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/ai-data-plane-sentiment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: t }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Request failed')
      }
      setResult(await res.json())
    } catch (e) {
      setError(e.message || 'Request failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const style = result ? (SENTIMENT_STYLE[result.sentiment] || SENTIMENT_STYLE.neutral) : null

  return (
    <div className="app ai-data-plane-sentiment-app">
      <AiDataPlaneDiyBanner
        diyTab="moderation"
        diyLabel="Moderation"
        replaces="OpenAI moderation API call + response parsing"
      />
      <div className="ai-data-plane-layout">
        {/* Input */}
        <div className="ai-data-plane-input-panel">
          <div className="ai-data-plane-panel-header">
            <h2 className="panel-heading">Input text</h2>
          </div>
          <textarea
            className="ai-data-plane-textarea"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Paste any text to analyse sentiment using Couchbase AI Data Plane ai_sentiment()…"
            rows={7}
          />
          <div className="ai-data-plane-controls">
            <button
              className="ai-data-plane-btn ai-data-plane-btn--primary"
              onClick={() => run()}
              disabled={isLoading || !text.trim()}
            >
              {isLoading ? 'Analysing…' : 'Analyse sentiment →'}
            </button>
          </div>

          <div className="ai-data-plane-examples">
            <span className="examples-label">Try an example:</span>
            {EXAMPLES.map((ex, i) => (
              <button key={i} className="example-btn" onClick={() => run(ex)}>
                {ex.slice(0, 65)}…
              </button>
            ))}
          </div>
        </div>

        {/* Output */}
        <div className="ai-data-plane-output-panel">
          <div className="ai-data-plane-panel-header">
            <h2 className="panel-heading">Sentiment</h2>
            <span className="ai-data-plane-badge ai-data-plane-badge--db">
              Runs inside the database
            </span>
          </div>

          {isLoading && (
            <div className="ai-data-plane-loading">
              <div className="ai-data-plane-spinner" />
              Calling <code>default:ai_sentiment()</code>…
            </div>
          )}
          {error && <div className="ai-data-plane-error">{error}</div>}
          {!isLoading && !error && result && (
            <div className="ai-data-plane-result">
              <div
                className="sentiment-result-badge"
                style={{ background: style.bg, color: style.color, borderColor: style.border }}
              >
                {result.sentiment}
              </div>
              <ScoreBar score={result.sentiment_score} color={style.bar} />
              {result.explanation && (
                <p className="ai-data-plane-explanation">{result.explanation}</p>
              )}
              <div className="ai-data-plane-result-footer">
                <span className="ai-data-plane-source-badge">
                  {result.source === 'ai_data_plane_ai_sentiment'
                    ? '⚡ default:ai_sentiment()'
                    : result.source}
                </span>
              </div>
            </div>
          )}
          {!isLoading && !error && !result && (
            <div className="ai-data-plane-placeholder">
              The sentiment result will appear here. Analysis runs as a SQL++ query
              inside Couchbase — no extra LLM call and no server endpoint to deploy.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
