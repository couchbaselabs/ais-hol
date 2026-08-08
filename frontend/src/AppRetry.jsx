import React, { useState } from 'react'
import './App.css'
import './AppRetry.css'
import { useInfoPanelQuestion } from './hooks/useInfoPanelQuestion'

const EXAMPLES = [
  'What is exponential backoff?',
  'Explain circuit breakers in distributed systems',
  'What is a rate limit?',
]

const FAILURE_MODES = [
  { value: 'none',        label: 'No failure',         desc: 'Call succeeds immediately' },
  { value: 'rate_limit',  label: '429 Rate limit',      desc: 'Fails twice, then succeeds' },
  { value: 'timeout',     label: 'Timeout',             desc: 'Times out once, then succeeds' },
  { value: 'unavailable', label: '503 Unavailable',     desc: 'Fails 3 times (triggers fallback)' },
]

const STRATEGIES = [
  { value: 'none',     label: 'No retry',         desc: 'Fail immediately on first error' },
  { value: 'retry',    label: 'Retry only',        desc: 'Exponential backoff, same model' },
  { value: 'fallback', label: 'Retry + fallback',  desc: 'Retry, then switch to backup model' },
]

const OUTCOME_COLOR = {
  success:          '#16a34a',
  rate_limit_429:   '#d97706',
  timeout:          '#7c3aed',
  model_unavailable:'#dc2626',
  error:            '#dc2626',
}

const OUTCOME_LABEL = {
  success:          '✅ Success',
  rate_limit_429:   '⚠️ 429 Rate limit',
  timeout:          '⏱ Timeout',
  model_unavailable:'🚫 Unavailable',
  error:            '❌ Error',
}

function AttemptRow({ entry, index }) {
  const color = OUTCOME_COLOR[entry.outcome] ?? '#94a3b8'
  const isFallback = entry.is_fallback
  return (
    <div className={`retry-attempt ${isFallback ? 'retry-attempt--fallback' : ''}`}>
      <div className="retry-attempt-num" style={{ background: color }}>
        {isFallback ? 'FB' : `#${entry.attempt}`}
      </div>
      <div className="retry-attempt-body">
        <div className="retry-attempt-header">
          <span className="retry-attempt-model">{entry.model}</span>
          {isFallback && <span className="retry-fallback-badge">fallback model</span>}
          <span className="retry-attempt-outcome" style={{ color }}>
            {OUTCOME_LABEL[entry.outcome] ?? entry.outcome}
          </span>
          <span className="retry-attempt-ms">{entry.latency_ms} ms</span>
        </div>
        {entry.delay_before_ms > 0 && (
          <div className="retry-attempt-delay">
            ⏳ waited {entry.delay_before_ms} ms before this attempt
          </div>
        )}
        {entry.error && (
          <div className="retry-attempt-error">{entry.error}</div>
        )}
      </div>
    </div>
  )
}

export default function AppRetry() {
  const [message, setMessage]   = useState('')
  const [failMode, setFailMode] = useState('rate_limit')
  const [strategy, setStrategy] = useState('retry')
  const [result, setResult]     = useState(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)

  useInfoPanelQuestion(setMessage)

  const run = async (overrideMsg) => {
    const msg = overrideMsg ?? message
    if (!msg.trim()) return
    if (overrideMsg) setMessage(overrideMsg)
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/retry-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, simulate_failure: failMode, strategy }),
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
    <div className="app retry-app">
      <div className="retry-controls">
        <div className="retry-query-row">
          <input
            className="retry-input"
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && run()}
            placeholder="Enter a message to send…"
          />
          <button className="retry-run-btn" onClick={() => run()} disabled={loading || !message.trim()}>
            {loading ? 'Running…' : 'Run →'}
          </button>
        </div>

        <div className="retry-options">
          <div className="retry-option-group">
            <div className="retry-option-label">Simulate failure</div>
            <div className="retry-option-btns">
              {FAILURE_MODES.map(f => (
                <button
                  key={f.value}
                  className={`retry-opt-btn ${failMode === f.value ? 'retry-opt-btn--active' : ''}`}
                  onClick={() => setFailMode(f.value)}
                  title={f.desc}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div className="retry-option-group">
            <div className="retry-option-label">Strategy</div>
            <div className="retry-option-btns">
              {STRATEGIES.map(s => (
                <button
                  key={s.value}
                  className={`retry-opt-btn ${strategy === s.value ? 'retry-opt-btn--active' : ''}`}
                  onClick={() => setStrategy(s.value)}
                  title={s.desc}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="retry-examples">
          {EXAMPLES.map((ex, i) => (
            <button key={i} className="example-btn" onClick={() => run(ex)}>{ex}</button>
          ))}
        </div>
      </div>

      {error && <div className="retry-error">{error}</div>}

      {result ? (
        <div className="retry-body">
          {/* Summary */}
          <div className={`retry-summary ${result.succeeded ? 'retry-summary--ok' : 'retry-summary--fail'}`}>
            <span className="retry-summary-icon">{result.succeeded ? '✅' : '❌'}</span>
            <span className="retry-summary-text">
              {result.succeeded
                ? `Succeeded after ${result.attempt_log.length} attempt${result.attempt_log.length > 1 ? 's' : ''}${result.used_fallback ? ' (via fallback model)' : ''} — ${result.total_ms} ms total`
                : `Failed after ${result.attempt_log.length} attempt${result.attempt_log.length > 1 ? 's' : ''}`}
            </span>
          </div>

          {/* Attempt timeline */}
          <div className="retry-section-label">Attempt log</div>
          <div className="retry-attempts">
            {result.attempt_log.map((entry, i) => (
              <AttemptRow key={i} entry={entry} index={i} />
            ))}
          </div>

          {/* Response */}
          {result.response && (
            <>
              <div className="retry-section-label">Response</div>
              <div className="retry-response">{result.response}</div>
            </>
          )}
        </div>
      ) : !loading && (
        <div className="retry-placeholder">
          <p>
            Every production LLM app needs retry logic. Rate limits (429), timeouts,
            and transient errors are common — exponential backoff and model fallback
            keep your app resilient.
          </p>
          <ul>
            <li>Select a <strong>failure mode</strong> to simulate what goes wrong</li>
            <li>Select a <strong>strategy</strong> to see how the app recovers</li>
            <li>The attempt log shows each retry with its delay and outcome</li>
          </ul>
        </div>
      )}
    </div>
  )
}
