import React, { useState } from 'react'
import './App.css'
import './CapellaTab.css'
import CapellaTab from './CapellaTab'
import { useInfoPanelQuestion } from './hooks/useInfoPanelQuestion'
import CapellaDiyBanner from './components/CapellaDiyBanner'

const EXAMPLES = [
  'John Smith met with Apple CEO Tim Cook in San Francisco on March 15, 2024.',
  'The contract was signed by Maria Garcia from Acme Corp in New York last Tuesday.',
  'Dr. Emily Chen presented her research at MIT on January 10th.',
]

const LABEL_COLORS = { person: '#7c3aed', location: '#16a34a', organization: '#d97706', date: '#00A3E0', email: '#dc2626', phone: '#0891b2' }
const DEFAULT_LABELS = ['person', 'location', 'organization', 'date']

export default function AppCapellaExtraction() {
  const [text, setText]     = useState('')
  const [labels, setLabels] = useState(DEFAULT_LABELS)
  const [newLabel, setNew]  = useState('')

  useInfoPanelQuestion(setText)

  const addLabel = () => {
    const l = newLabel.trim().toLowerCase()
    if (l && !labels.includes(l) && labels.length < 8) { setLabels(p => [...p, l]); setNew('') }
  }
  const removeLabel = (l) => setLabels(p => p.filter(x => x !== l))

  const renderControls = (run, loading, examples) => (
    <div className="cap-controls">
      <div className="cap-row">
        <textarea className="cap-textarea" rows={2} value={text}
          onChange={e => setText(e.target.value)} placeholder="Enter text to extract entities from…" />
        <button className="cap-run-btn" disabled={loading || !text.trim()}
          onClick={() => run({ text, labels })}>
          {loading ? 'Extracting…' : 'Extract →'}
        </button>
      </div>
      <div className="cap-option-label">Entity types</div>
      <div className="cap-tags">
        {labels.map(l => {
          const color = LABEL_COLORS[l] ?? '#64748b'
          return (
            <span key={l} className="cap-tag" style={{ borderColor: color, color, background: `${color}12` }}>
              {l}<button className="cap-tag-remove" onClick={() => removeLabel(l)}>✕</button>
            </span>
          )
        })}
        <input className="cap-tag-input" value={newLabel} placeholder="+ add type"
          onChange={e => setNew(e.target.value)} onKeyDown={e => e.key === 'Enter' && addLabel()} />
      </div>
      <div className="cap-examples">
        {examples.map((ex, i) => <button key={i} className="example-btn" onClick={() => { setText(ex); run({ text: ex, labels }) }}>{ex}</button>)}
      </div>
    </div>
  )

  const renderResult = (result) => (
    <div className="cap-result-card">
      <div className="cap-result-label">Extracted entities ({result.entities?.length ?? 0})</div>
      <div className="cap-entities" style={{ marginTop: '0.5rem' }}>
        {(result.entities ?? []).map((e, i) => {
          const color = LABEL_COLORS[e.label] ?? '#64748b'
          return (
            <span key={i} className="cap-entity-chip" style={{ background: `${color}15`, border: `1px solid ${color}40` }}>
              <span className="cap-entity-label" style={{ color }}>{e.label}</span>
              <span style={{ color: '#1e293b' }}>{e.text}</span>
            </span>
          )
        })}
        {(!result.entities || result.entities.length === 0) && (
          <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>No entities found</span>
        )}
      </div>
    </div>
  )

  return (
    <div className="app">
      <CapellaTab endpoint="/api/capella-extraction" buildBody={() => ({ text, labels })}
        renderControls={renderControls} renderResult={renderResult} examples={EXAMPLES}
        banner={<CapellaDiyBanner diyTab="structured" diyLabel="Structured Output" replaces="LLM call with JSON schema prompt + manual parse" />}
        placeholder={<div className="cap-placeholder"><p><code>ai_extraction()</code> finds named entities in text — persons, locations, organisations, dates, and any custom type you define.</p></div>} />
    </div>
  )
}
