import React, { useState } from 'react'
import './AppAiDataPlaneService.css'
import { useInfoPanelQuestion } from './hooks/useInfoPanelQuestion'
import AiDataPlaneDiyBanner from './components/AiDataPlaneDiyBanner'

const SCENARIOS = [
  {
    id: 'cache',
    label: '🗄️ Semantic Cache',
    description: 'Look up a cached answer by semantic similarity',
    inputLabel: 'Query',
    inputPlaceholder: 'How do JavaScript promises work?',
    inputField: 'text',
  },
  {
    id: 'rag',
    label: '🔍 RAG Pipeline',
    description: 'Retrieve relevant docs and generate a grounded answer',
    inputLabel: 'Question',
    inputPlaceholder: 'What is the Fetch API?',
    inputField: 'query',
  },
  {
    id: 'moderation',
    label: '🛡️ Content Moderation',
    description: 'Classify text for harmful content before processing',
    inputLabel: 'Text to moderate',
    inputPlaceholder: 'I want to learn how to build a web scraper.',
    inputField: 'text',
  },
]

function MetricBadge({ label, value, highlight }) {
  return (
    <div className={`cs-metric ${highlight ? 'cs-metric--highlight' : ''}`}>
      <span className="cs-metric-value">{value}</span>
      <span className="cs-metric-label">{label}</span>
    </div>
  )
}

function StepList({ steps }) {
  if (!steps?.length) return null
  return (
    <ol className="cs-steps">
      {steps.map((s, i) => (
        <li key={i} className={`cs-step ${s.startsWith('✓') ? 'cs-step--ok' : s.startsWith('✗') ? 'cs-step--miss' : ''}`}>
          {s}
        </li>
      ))}
    </ol>
  )
}

function ResultBox({ result }) {
  if (!result) return null
  const text = typeof result === 'string' ? result : JSON.stringify(result, null, 2)
  return (
    <pre className="cs-result">{text}</pre>
  )
}

function Column({ title, color, data, loading }) {
  return (
    <div className={`cs-column cs-column--${color}`}>
      <div className="cs-column-header">
        <span className="cs-column-title">{title}</span>
        {data && (
          <div className="cs-metrics">
            <MetricBadge label="ms" value={data.ms ?? '—'} highlight={color === 'ai_data_plane'} />
            <MetricBadge label="API calls" value={data.api_calls ?? '—'} highlight={color === 'ai_data_plane'} />
            <MetricBadge label="lines" value={data.loc ?? '—'} highlight={color === 'ai_data_plane'} />
          </div>
        )}
      </div>
      <div className="cs-column-body">
        {loading && <div className="cs-loading">Running…</div>}
        {!loading && data && (
          <>
            <StepList steps={data.steps} />
            <ResultBox result={data.result} />
          </>
        )}
        {!loading && !data && (
          <div className="cs-empty">Run a scenario to see results</div>
        )}
      </div>
    </div>
  )
}

export default function AppAiDataPlaneService() {
  const [scenarioId, setScenarioId] = useState('cache')
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  useInfoPanelQuestion('ai-data-plane-service')

  const scenario = SCENARIOS.find(s => s.id === scenarioId)

  async function run() {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const body = { scenario: scenarioId }
      body[scenario.inputField] = input || scenario.inputPlaceholder
      const res = await fetch('/api/ai-data-plane-service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(await res.text())
      setResult(await res.json())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="cs-root">
      <AiDataPlaneDiyBanner
        diyTab="cached"
        diyLabel="Semantic Cache"
        replaces="multi-step embed → search → LLM pipeline"
      />
      <div className="cs-header">
        <h2 className="cs-title">AI Data Plane — DIY vs SQL++</h2>
        <p className="cs-subtitle">
          The same task, two approaches. See how Couchbase AI Data Plane collapses
          multi-step application code into a single database query.
        </p>
      </div>

      <div className="cs-controls">
        <div className="cs-scenario-tabs">
          {SCENARIOS.map(s => (
            <button
              key={s.id}
              className={`cs-scenario-tab ${scenarioId === s.id ? 'cs-scenario-tab--active' : ''}`}
              onClick={() => { setScenarioId(s.id); setResult(null); setInput('') }}
            >
              {s.label}
            </button>
          ))}
        </div>
        <p className="cs-scenario-desc">{scenario.description}</p>
        <div className="cs-input-row">
          <input
            className="cs-input"
            type="text"
            placeholder={scenario.inputPlaceholder}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && run()}
          />
          <button className="cs-run-btn" onClick={run} disabled={loading}>
            {loading ? 'Running…' : 'Run comparison'}
          </button>
        </div>
        {error && <div className="cs-error">{error}</div>}
      </div>

      <div className="cs-columns">
        <Column
          title="🐍 DIY Python"
          color="diy"
          data={result?.diy}
          loading={loading}
        />
        <div className="cs-vs">VS</div>
        <Column
          title="🗄️ Couchbase AI Data Plane SQL++"
          color="ai_data_plane"
          data={result?.ai_data_plane}
          loading={loading}
        />
      </div>

      {result && (
        <div className="cs-summary">
          {result.ai_data_plane.ms < result.diy.ms
            ? `Couchbase AI Data Plane was ${result.diy.ms - result.ai_data_plane.ms}ms faster and used ${result.diy.api_calls - result.ai_data_plane.api_calls} fewer external API call(s).`
            : `Both approaches returned results. Couchbase AI Data Plane used ${result.diy.api_calls - result.ai_data_plane.api_calls} fewer external API call(s) and ${result.diy.loc - result.ai_data_plane.loc} fewer lines of code.`
          }
        </div>
      )}
    </div>
  )
}
