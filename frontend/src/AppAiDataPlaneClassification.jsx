import React, { useState } from 'react'
import './App.css'
import './AiDataPlaneTab.css'
import AiDataPlaneTab from './AiDataPlaneTab'
import { useInfoPanelQuestion } from './hooks/useInfoPanelQuestion'
import AiDataPlaneDiyBanner from './components/AiDataPlaneDiyBanner'

const EXAMPLES = [
  'The new product launch exceeded all expectations.',
  'The service was slow and the staff were unhelpful.',
  'The package arrived on time and was well packaged.',
  'I have mixed feelings about this purchase.',
]

const ENTITY_COLORS = ['#00A3E0','#7c3aed','#16a34a','#d97706','#dc2626','#0891b2']

const DEFAULT_LABELS = ['positive', 'negative', 'neutral']

export default function AppAiDataPlaneClassification() {
  const [text, setText]     = useState('')
  const [labels, setLabels] = useState(DEFAULT_LABELS)
  const [newLabel, setNew]  = useState('')

  useInfoPanelQuestion(setText)

  const addLabel = () => {
    const l = newLabel.trim().toLowerCase()
    if (l && !labels.includes(l) && labels.length < 8) {
      setLabels(prev => [...prev, l])
      setNew('')
    }
  }

  const removeLabel = (l) => setLabels(prev => prev.filter(x => x !== l))

  const renderControls = (run, loading, examples) => (
    <div className="cap-controls">
      <div className="cap-row">
        <textarea className="cap-textarea" rows={2} value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Enter text to classify…" />
        <button className="cap-run-btn" disabled={loading || !text.trim()}
          onClick={() => run({ text, labels })}>
          {loading ? 'Classifying…' : 'Classify →'}
        </button>
      </div>
      <div className="cap-option-label">Labels</div>
      <div className="cap-tags">
        {labels.map((l, i) => (
          <span key={l} className="cap-tag" style={{ borderColor: ENTITY_COLORS[i % ENTITY_COLORS.length], color: ENTITY_COLORS[i % ENTITY_COLORS.length], background: `${ENTITY_COLORS[i % ENTITY_COLORS.length]}12` }}>
            {l}
            <button className="cap-tag-remove" onClick={() => removeLabel(l)}>✕</button>
          </span>
        ))}
        <input className="cap-tag-input" value={newLabel} placeholder="+ add label"
          onChange={e => setNew(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addLabel()} />
      </div>
      <div className="cap-examples">
        {examples.map((ex, i) => <button key={i} className="example-btn" onClick={() => { setText(ex); run({ text: ex, labels }) }}>{ex}</button>)}
      </div>
    </div>
  )

  const renderResult = (result) => {
    const idx = labels.indexOf(result.classification)
    const color = ENTITY_COLORS[idx >= 0 ? idx : 0]
    return (
      <div className="cap-result-card" style={{ borderLeftColor: color }}>
        <div className="cap-result-label">Classification</div>
        <div className="cap-result-value" style={{ color }}>{result.classification}</div>
        <div className="cap-score-wrap">
          <div className="cap-score-track">
            <div className="cap-score-fill" style={{ width: `${(result.score ?? 0) * 100}%`, background: color }} />
          </div>
          <span className="cap-score-num">{((result.score ?? 0) * 100).toFixed(1)}%</span>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <AiDataPlaneTab
        endpoint="/api/ai-data-plane-classification"
        banner={<AiDataPlaneDiyBanner diyTab="moderation" diyLabel="Moderation" replaces="LLM call + JSON parse + label validation" />}
        buildBody={() => ({ text, labels })}
        renderControls={renderControls}
        renderResult={renderResult}
        examples={EXAMPLES}
        placeholder={
          <div className="cap-placeholder">
            <p><code>ai_classification()</code> assigns text to one of your custom labels — no application code needed.</p>
            <ul>
              <li>Edit the label list to match your use case</li>
              <li>Works for sentiment, topic, intent, priority, and more</li>
            </ul>
          </div>
        }
      />
    </div>
  )
}
