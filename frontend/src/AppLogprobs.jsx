import React, { useState } from 'react'
import './App.css'
import './AppLogprobs.css'

const EXAMPLES = [
  'The capital of France is',
  'The best programming language for beginners is',
  'Water boils at',
  'The meaning of life is',
  'To reverse a list in Python you can use',
]

// Map a log-probability (≤0) to a confidence colour.
// logprob=0 → 100% → green; logprob=-5 → ~0.7% → red
function logprobToColor(lp) {
  const p = Math.exp(lp)          // 0..1
  const t = Math.pow(p, 0.4)      // gamma-compress so mid-range is visible
  const r = Math.round(220 * (1 - t))
  const g = Math.round(180 * t)
  return { color: `rgb(${r},${g},60)`, prob: p }
}

function TokenChip({ token, logprob, topLogprobs }) {
  const [open, setOpen] = useState(false)
  const { color, prob } = logprobToColor(logprob)
  const pct = (prob * 100).toFixed(1)

  return (
    <span className="lp-token-wrap">
      <span
        className={`lp-token ${open ? 'lp-token--open' : ''}`}
        style={{ background: color + '33', borderColor: color, color }}
        onClick={() => setOpen(v => !v)}
        title={`${pct}% confident`}
      >
        {token.replace(/ /g, '·')}
        <span className="lp-token-pct">{pct}%</span>
      </span>

      {open && topLogprobs && topLogprobs.length > 0 && (
        <span className="lp-alternatives">
          {topLogprobs.map((alt, i) => {
            const { color: ac, prob: ap } = logprobToColor(alt.logprob)
            return (
              <span key={i} className="lp-alt" style={{ borderColor: ac }}>
                <span className="lp-alt-token" style={{ color: ac }}>
                  {alt.token.replace(/ /g, '·')}
                </span>
                <span className="lp-alt-pct">{(ap * 100).toFixed(1)}%</span>
              </span>
            )
          })}
        </span>
      )}
    </span>
  )
}

export default function AppLogprobs() {
  const [prompt, setPrompt] = useState('')
  const [topK, setTopK] = useState(5)
  const [result, setResult] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const run = async (overridePrompt) => {
    const p = overridePrompt ?? prompt
    if (!p.trim()) return
    if (overridePrompt) setPrompt(overridePrompt)
    setIsLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/logprobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: p, top_logprobs: topK }),
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
    <div className="app lp-app">
      <div className="lp-controls">
        <div className="lp-query-row">
          <input
            className="lp-input"
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && run()}
            placeholder="Enter a prompt — the model will complete it one token at a time…"
          />
          <label className="lp-topk-label">
            Top-K
            <select
              className="lp-topk-select"
              value={topK}
              onChange={e => setTopK(Number(e.target.value))}
            >
              {[3, 5, 10, 20].map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </label>
          <button
            className="lp-run-btn"
            onClick={() => run()}
            disabled={isLoading || !prompt.trim()}
          >
            {isLoading ? 'Generating…' : 'Generate →'}
          </button>
        </div>
        <div className="lp-examples">
          {EXAMPLES.map((ex, i) => (
            <button key={i} className="example-btn" onClick={() => run(ex)}>{ex}</button>
          ))}
        </div>
      </div>

      {error && <div className="lp-error">{error}</div>}
      {isLoading && <div className="lp-loading">Generating with logprobs…</div>}

      {result && (
        <div className="lp-results">
          <div className="lp-legend">
            <span className="lp-legend-item lp-legend-high">High confidence (&gt;80%)</span>
            <span className="lp-legend-item lp-legend-mid">Medium (20–80%)</span>
            <span className="lp-legend-item lp-legend-low">Low (&lt;20%)</span>
            <span className="lp-legend-hint">Click any token to see alternatives</span>
          </div>

          <div className="lp-prompt-label">Prompt</div>
          <div className="lp-prompt-text">{result.prompt}</div>

          <div className="lp-completion-label">
            Completion
            <span className="lp-completion-meta">
              {result.tokens.length} tokens · avg confidence {result.avg_confidence}%
            </span>
          </div>
          <div className="lp-tokens">
            {result.tokens.map((t, i) => (
              <TokenChip
                key={i}
                token={t.token}
                logprob={t.logprob}
                topLogprobs={t.top_logprobs}
              />
            ))}
          </div>

          <div className="lp-entropy-row">
            <div className="lp-entropy-card">
              <div className="lp-entropy-label">Most certain token</div>
              <div className="lp-entropy-val">
                "{result.most_certain.token}" — {(Math.exp(result.most_certain.logprob) * 100).toFixed(1)}%
              </div>
            </div>
            <div className="lp-entropy-card">
              <div className="lp-entropy-label">Most uncertain token</div>
              <div className="lp-entropy-val">
                "{result.most_uncertain.token}" — {(Math.exp(result.most_uncertain.logprob) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {!result && !isLoading && (
        <div className="lp-placeholder">
          Each token in the response is colour-coded by confidence: green = the model was
          almost certain, red = it was guessing. Click any token to see what alternatives
          the model considered at that position.
        </div>
      )}
    </div>
  )
}
