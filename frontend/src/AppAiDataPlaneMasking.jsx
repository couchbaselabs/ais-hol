import React, { useState } from 'react'
import './App.css'
import './AiDataPlaneTab.css'
import AiDataPlaneTab from './AiDataPlaneTab'
import { useInfoPanelQuestion } from './hooks/useInfoPanelQuestion'
import AiDataPlaneDiyBanner from './components/AiDataPlaneDiyBanner'

const EXAMPLES = [
  'Contact John Smith at john.smith@example.com or call 555-867-5309.',
  'Maria Garcia from New York signed the contract on behalf of Acme Corp.',
  'Please send the invoice to 42 Oak Street, Boston, MA 02101.',
]

const ALL_LABELS = ['person','email','phone','location','organization','date','website','ip_address']
const DEFAULT_LABELS = ['person','email','phone','location']

export default function AppAiDataPlaneMasking() {
  const [text, setText]     = useState('')
  const [labels, setLabels] = useState(DEFAULT_LABELS)

  useInfoPanelQuestion(setText)

  const toggleLabel = (l) => setLabels(p => p.includes(l) ? p.filter(x => x !== l) : [...p, l])

  const renderControls = (run, loading, examples) => (
    <div className="cap-controls">
      <div className="cap-row">
        <textarea className="cap-textarea" rows={2} value={text}
          onChange={e => setText(e.target.value)} placeholder="Enter text containing PII to mask…" />
        <button className="cap-run-btn" disabled={loading || !text.trim()}
          onClick={() => run({ text, labels })}>
          {loading ? 'Masking…' : 'Mask →'}
        </button>
      </div>
      <div className="cap-option-label">Mask these types</div>
      <div className="cap-tags">
        {ALL_LABELS.map(l => (
          <button key={l} onClick={() => toggleLabel(l)}
            className="cap-tag"
            style={labels.includes(l)
              ? { background: '#fef2f2', borderColor: '#fca5a5', color: '#dc2626' }
              : { background: '#f9fafb', borderColor: '#d1d5db', color: '#94a3b8' }}>
            {l}
          </button>
        ))}
      </div>
      <div className="cap-examples">
        {examples.map((ex, i) => <button key={i} className="example-btn" onClick={() => { setText(ex); run({ text: ex, labels }) }}>{ex}</button>)}
      </div>
    </div>
  )

  const renderResult = (result) => (
    <div className="cap-diff">
      <div className="cap-diff-panel">
        <div className="cap-diff-header">Original</div>
        <div className="cap-diff-body">{result.original}</div>
      </div>
      <div className="cap-diff-panel" style={{ borderTop: '3px solid #dc2626' }}>
        <div className="cap-diff-header" style={{ color: '#dc2626' }}>Masked</div>
        <div className="cap-diff-body">{result.masked}</div>
      </div>
    </div>
  )

  return (
    <div className="app">
      <AiDataPlaneTab endpoint="/api/ai-data-plane-masking" buildBody={() => ({ text, labels })}
        renderControls={renderControls} renderResult={renderResult} examples={EXAMPLES}
        banner={<AiDataPlaneDiyBanner diyTab={null} diyLabel={null} replaces="regex + NER model + manual redaction logic" />}
        placeholder={<div className="cap-placeholder"><p><code>ai_masked()</code> replaces PII with placeholders before data leaves the database — useful for GDPR compliance and audit logging.</p></div>} />
    </div>
  )
}
