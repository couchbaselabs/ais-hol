/**
 * Shared layout component for all Capella AI Function tabs.
 *
 * Props:
 *   endpoint      – POST endpoint path, e.g. "/api/capella-classification"
 *   buildBody     – fn(inputs) → request body object
 *   renderResult  – fn(result) → JSX
 *   renderControls– fn(inputs, setInputs) → JSX (inputs above the run button)
 *   examples      – string[] shown as example-btn chips
 *   placeholder   – JSX shown before first run
 *   onQuestion    – optional setter for the primary text input (for InfoPanel)
 */
import React, { useState } from 'react'
import './CapellaTab.css'

const CB_ACCENT = '#00A3E0'

export default function CapellaTab({
  endpoint,
  buildBody,
  renderResult,
  renderControls,
  examples = [],
  placeholder,
  onQuestion,
  banner,
}) {
  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const run = async (body) => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail ?? `HTTP ${res.status}`)
      }
      setResult(await res.json())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="cap-tab">
      {banner}
      {renderControls(run, loading, examples, onQuestion)}
      {error && <div className="cap-error">{error}</div>}
      {result ? (
        <div className="cap-result-area">
          {renderResult(result)}
          {result.sql && (
            <div className="cap-sql-block">
              <div className="cap-sql-label">SQL++ equivalent</div>
              <pre className="cap-sql-code">{result.sql}</pre>
            </div>
          )}
          {result.source && (
            <div className="cap-source">
              source: <code>{result.source}</code>
            </div>
          )}
        </div>
      ) : !loading && placeholder}
    </div>
  )
}
