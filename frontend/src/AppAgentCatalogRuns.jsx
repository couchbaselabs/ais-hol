import React, { useState, useEffect } from 'react'
import './AppAgentCatalogRuns.css'

const ROUTE_META = {
  router:           { label: 'Direct',      color: '#6c757d', bg: '#f1f3f5' },
  math_agent:       { label: 'Math',        color: '#c2410c', bg: '#fff7ed' },
  rag_agent:        { label: 'RAG',         color: '#1d4ed8', bg: '#eff6ff' },
  faq_search_agent: { label: 'FAQ Search',  color: '#15803d', bg: '#f0fdf4' },
}

const STEP_META = {
  route:       { icon: '🔀', label: 'Route decision' },
  tool_call:   { icon: '🔧', label: 'Tool call' },
  tool_result: { icon: '✓',  label: 'Tool result' },
  thought:     { icon: '💭', label: 'Thought' },
}

function RouteChip({ routedTo, missingTopic }) {
  const meta = ROUTE_META[routedTo] || ROUTE_META.router
  return (
    <span
      className="acr-route-chip"
      style={{ color: meta.color, background: meta.bg }}
    >
      {missingTopic ? '⚠️ No FAQ' : meta.label}
    </span>
  )
}

function TraceStep({ step, index }) {
  const meta = STEP_META[step.type] || { icon: '•', label: step.type }
  return (
    <div className={`acr-trace-step acr-trace-step--${step.type}`}>
      <span className="acr-trace-icon">{meta.icon}</span>
      <div className="acr-trace-body">
        <span className="acr-trace-label">{meta.label}</span>
        {step.type === 'route' && (
          <span className="acr-trace-detail">→ {step.decision}{step.collection ? ` (${step.collection})` : ''}{step.topic ? ` (${step.topic})` : ''}</span>
        )}
        {step.type === 'tool_call' && (
          <span className="acr-trace-detail">
            <code>{step.tool}</code>({Object.entries(step.input || {}).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(', ')})
          </span>
        )}
        {step.type === 'tool_result' && (
          <span className="acr-trace-detail">{step.content}</span>
        )}
        {step.type === 'thought' && (
          <span className="acr-trace-detail acr-trace-detail--thought">{step.content}</span>
        )}
      </div>
    </div>
  )
}

function RunRow({ run, selected, onClick }) {
  const ts = new Date(run.timestamp)
  const timeStr = ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return (
    <button
      className={`acr-run-row ${selected ? 'acr-run-row--selected' : ''}`}
      onClick={onClick}
    >
      <div className="acr-run-row-top">
        <RouteChip routedTo={run.routed_to} missingTopic={run.missing_topic} />
        <span className="acr-run-time">{timeStr}</span>
        {run.duration_ms && <span className="acr-run-ms">{run.duration_ms}ms</span>}
      </div>
      <div className="acr-run-message">{run.message}</div>
    </button>
  )
}

function RunDetail({ run }) {
  if (!run) return (
    <div className="acr-detail-empty">
      Select a run to see its trace, tool calls, and answer.
    </div>
  )

  const ts = new Date(run.timestamp)

  return (
    <div className="acr-detail">
      <div className="acr-detail-header">
        <RouteChip routedTo={run.routed_to} missingTopic={run.missing_topic} />
        <span className="acr-detail-ts">{ts.toLocaleString()}</span>
        {run.duration_ms && <span className="acr-run-ms">{run.duration_ms}ms</span>}
      </div>

      <div className="acr-detail-section">Message</div>
      <div className="acr-detail-message">"{run.message}"</div>

      {run.faq_collection && (
        <>
          <div className="acr-detail-section">FAQ collection</div>
          <code className="acr-detail-faq">{run.faq_collection}</code>
        </>
      )}

      {run.missing_topic && (
        <>
          <div className="acr-detail-section">Missing topic</div>
          <div className="acr-missing-topic">
            ⚠️ No FAQ found for <code>{run.missing_topic}</code> — ingest a PDF to cover this topic.
          </div>
        </>
      )}

      <div className="acr-detail-section">
        Execution trace ({run.trace_steps?.length || 0} steps)
      </div>
      <div className="acr-trace">
        {(run.trace_steps || []).map((step, i) => (
          <TraceStep key={i} step={step} index={i} />
        ))}
        {(!run.trace_steps || run.trace_steps.length === 0) && (
          <div className="acr-trace-empty">No trace steps recorded.</div>
        )}
      </div>

      <div className="acr-detail-section">Answer</div>
      <div className="acr-detail-answer">{run.answer}</div>

      <div className="acr-detail-section">Stored in Couchbase as</div>
      <pre className="acr-detail-doc">{JSON.stringify({
        type: 'agent_run',
        session_id: run.id,
        message: run.message,
        routed_to: run.routed_to,
        faq_collection: run.faq_collection || null,
        missing_topic: run.missing_topic || null,
        trace_steps: run.trace_steps,
        timestamp: run.timestamp,
      }, null, 2)}</pre>
    </div>
  )
}

export default function AppAgentCatalogRuns() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetch('/api/agent-catalog/runs')
      .then(r => r.json())
      .then(d => {
        setData(d)
        setLoading(false)
        if (d.runs?.length) setSelected(d.runs[0])
      })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  const runs = data?.runs || []
  const filtered = filter === 'all'
    ? runs
    : runs.filter(r => r.routed_to === filter || (filter === 'missing' && r.missing_topic))

  const routeCounts = runs.reduce((acc, r) => {
    const key = r.missing_topic ? 'missing' : r.routed_to
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  return (
    <div className="acr-root">
      {/* Header */}
      <div className="acr-header">
        <div className="acr-header-left">
          <div className="acr-header-title">Agent Runs</div>
          {data && (
            <div className="acr-header-stats">
              <span className="acr-stat-chip">{data.total} runs</span>
              <span className={`acr-stat-chip ${data.source === 'couchbase' ? 'acr-stat-chip--ok' : 'acr-stat-chip--mock'}`}>
                {data.source === 'couchbase' ? '● live' : '○ mock data'}
              </span>
            </div>
          )}
        </div>
        <div className="acr-filter-tabs">
          {[
            { id: 'all',              label: `All (${runs.length})` },
            { id: 'router',           label: `Direct (${routeCounts.router || 0})` },
            { id: 'math_agent',       label: `Math (${routeCounts.math_agent || 0})` },
            { id: 'rag_agent',        label: `RAG (${routeCounts.rag_agent || 0})` },
            { id: 'faq_search_agent', label: `FAQ (${routeCounts.faq_search_agent || 0})` },
            { id: 'missing',          label: `Missing (${routeCounts.missing || 0})` },
          ].map(f => (
            <button
              key={f.id}
              className={`acr-filter-btn ${filter === f.id ? 'acr-filter-btn--active' : ''}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="acr-body">
        {/* Left: run list */}
        <div className="acr-list">
          {loading && <div className="acr-loading">Loading runs…</div>}
          {error && <div className="acr-error">{error}</div>}
          {!loading && !error && filtered.length === 0 && (
            <div className="acr-loading">No runs found.</div>
          )}
          {filtered.map(run => (
            <RunRow
              key={run.id}
              run={run}
              selected={selected?.id === run.id}
              onClick={() => setSelected(run)}
            />
          ))}
        </div>

        {/* Right: detail */}
        <div className="acr-detail-panel">
          <RunDetail run={selected} />
        </div>
      </div>
    </div>
  )
}
