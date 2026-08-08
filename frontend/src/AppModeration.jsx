import React, { useState } from 'react'
import './App.css'
import './AppModeration.css'
import { useInfoPanelQuestion } from './hooks/useInfoPanelQuestion'

const EXAMPLES = [
  'I love sunny days at the beach.',
  'How do I bake a chocolate cake?',
  'I want to hurt someone who wronged me.',
  'This product is absolutely terrible and I hate it.',
]

const ACCENT = '#00A3E0'

// Category display names and groupings
const CATEGORY_GROUPS = [
  {
    label: 'Hate',
    keys: ['hate', 'hate/threatening'],
  },
  {
    label: 'Harassment',
    keys: ['harassment', 'harassment/threatening'],
  },
  {
    label: 'Self-harm',
    keys: ['self-harm', 'self-harm/intent', 'self-harm/instructions'],
  },
  {
    label: 'Sexual',
    keys: ['sexual', 'sexual/minors'],
  },
  {
    label: 'Violence',
    keys: ['violence', 'violence/graphic'],
  },
]

function ScoreBar({ score, flagged }) {
  const pct = Math.min(score * 100, 100)
  const color = flagged ? '#dc2626' : score > 0.3 ? '#d97706' : '#16a34a'
  return (
    <div className="mod-score-bar-wrap">
      <div className="mod-score-bar" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

function ModerationPanel({ data, label, color }) {
  if (!data) return null
  const { flagged, categories, category_scores, mock } = data

  return (
    <div className="mod-panel" style={{ borderTopColor: color }}>
      <div className="mod-panel-header">
        <span className="mod-panel-label" style={{ color }}>{label}</span>
        <span className={`mod-verdict ${flagged ? 'mod-verdict--flagged' : 'mod-verdict--safe'}`}>
          {flagged ? '🚫 Flagged' : '✅ Safe'}
        </span>
        {mock && <span className="mod-mock-badge">mock</span>}
      </div>

      <div className="mod-categories">
        {CATEGORY_GROUPS.map(group => (
          <div key={group.label} className="mod-group">
            <div className="mod-group-label">{group.label}</div>
            {group.keys.map(key => {
              const score = category_scores?.[key] ?? 0
              const isFlagged = categories?.[key] ?? false
              return (
                <div key={key} className={`mod-cat-row ${isFlagged ? 'mod-cat-row--flagged' : ''}`}>
                  <span className="mod-cat-name">{key}</span>
                  <ScoreBar score={score} flagged={isFlagged} />
                  <span className="mod-cat-score" style={{ color: isFlagged ? '#dc2626' : '#94a3b8' }}>
                    {score.toFixed(3)}
                  </span>
                  {isFlagged && <span className="mod-cat-flag">⚑</span>}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

function LLMPanel({ data, error }) {
  if (error) return (
    <div className="mod-panel mod-panel--llm" style={{ borderTopColor: '#94a3b8' }}>
      <div className="mod-panel-header">
        <span className="mod-panel-label" style={{ color: '#94a3b8' }}>LLM Classifier</span>
      </div>
      <div className="mod-llm-error">{error}</div>
    </div>
  )
  if (!data) return null

  const verdictColor = data.verdict === 'safe' ? '#16a34a'
    : data.verdict === 'borderline' ? '#d97706' : '#dc2626'

  return (
    <div className="mod-panel mod-panel--llm" style={{ borderTopColor: verdictColor }}>
      <div className="mod-panel-header">
        <span className="mod-panel-label" style={{ color: verdictColor }}>LLM Classifier</span>
        <span className={`mod-verdict mod-verdict--${data.verdict}`}>
          {data.verdict === 'safe' ? '✅' : data.verdict === 'borderline' ? '⚠️' : '🚫'} {data.verdict}
        </span>
        {data.tokens && <span className="mod-tokens">{data.tokens} tok</span>}
      </div>
      <div className="mod-llm-body">
        {data.categories?.length > 0 && (
          <div className="mod-llm-cats">
            {data.categories.map(c => (
              <span key={c} className="mod-llm-cat-chip">{c}</span>
            ))}
          </div>
        )}
        {data.reason && (
          <div className="mod-llm-reason">{data.reason}</div>
        )}
        <div className="mod-llm-confidence">
          Confidence: <strong>{Math.round((data.confidence ?? 0) * 100)}%</strong>
        </div>
      </div>
    </div>
  )
}

export default function AppModeration() {
  const [text, setText]     = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState(null)

  useInfoPanelQuestion(setText)

  const run = async (overrideText) => {
    const t = overrideText ?? text
    if (!t.trim()) return
    if (overrideText) setText(overrideText)
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/moderation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: t }),
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
    <div className="app mod-app">
      {/* Controls */}
      <div className="mod-controls">
        <div className="mod-input-row">
          <textarea
            className="mod-textarea"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Enter text to classify…"
            rows={2}
          />
          <button
            className="mod-run-btn"
            onClick={() => run()}
            disabled={loading || !text.trim()}
          >
            {loading ? 'Classifying…' : 'Classify →'}
          </button>
        </div>
        <div className="mod-examples">
          {EXAMPLES.map((ex, i) => (
            <button key={i} className="example-btn" onClick={() => run(ex)}>{ex}</button>
          ))}
        </div>
      </div>

      {error && <div className="mod-error">{error}</div>}

      {result ? (
        <div className="mod-body">
          <div className="mod-columns">
            <ModerationPanel
              data={result.moderation}
              label="OpenAI Moderation API"
              color={ACCENT}
            />
            <LLMPanel
              data={result.llm_classifier}
              error={result.llm_error}
            />
          </div>

          <div className="mod-comparison-note">
            <strong>Moderation API</strong> — free, ~100 ms, 11 fixed categories, English-optimised.{' '}
            <strong>LLM classifier</strong> — costs tokens, ~500 ms, fully customisable categories and reasoning.
          </div>
        </div>
      ) : !loading && (
        <div className="mod-placeholder">
          <p>
            The OpenAI Moderation API is a free, purpose-built safety classifier.
            It returns scores for 11 harm categories and is ~10× faster than using
            an LLM as a classifier.
          </p>
          <ul>
            <li>Try safe text — all scores should be near 0</li>
            <li>Try borderline text — see which categories activate</li>
            <li>Compare the Moderation API verdict with the LLM classifier</li>
          </ul>
        </div>
      )}
    </div>
  )
}
