import React, { useState } from 'react'
import './App.css'
import './AiDataPlaneTab.css'
import AiDataPlaneTab from './AiDataPlaneTab'
import { useInfoPanelQuestion } from './hooks/useInfoPanelQuestion'
import AiDataPlaneDiyBanner from './components/AiDataPlaneDiyBanner'

const EXAMPLES = [
  'their going to the store tomorrow',
  'i has been working here since 3 years',
  'The team have finish the project yesterday and we was very happy',
  'she dont know nothing about it',
]

// Simple diff: highlight words that changed
function DiffText({ original, corrected }) {
  const origWords = original.split(/\s+/)
  const corrWords = corrected.split(/\s+/)
  const maxLen = Math.max(origWords.length, corrWords.length)
  return (
    <span>
      {corrWords.map((word, i) => {
        const changed = word.toLowerCase().replace(/[.,!?]/g, '') !== (origWords[i] ?? '').toLowerCase().replace(/[.,!?]/g, '')
        return (
          <span key={i}>
            {i > 0 && ' '}
            <span style={changed ? { background: '#dcfce7', color: '#15803d', borderRadius: '3px', padding: '0 2px', fontWeight: 600 } : {}}>
              {word}
            </span>
          </span>
        )
      })}
    </span>
  )
}

export default function AppAiDataPlaneGrammar() {
  const [text, setText] = useState('')

  useInfoPanelQuestion(setText)

  const renderControls = (run, loading, examples) => (
    <div className="cap-controls">
      <div className="cap-row">
        <textarea className="cap-textarea" rows={2} value={text}
          onChange={e => setText(e.target.value)} placeholder="Enter text with grammar errors…" />
        <button className="cap-run-btn" disabled={loading || !text.trim()}
          onClick={() => run({ text })}>
          {loading ? 'Correcting…' : 'Correct →'}
        </button>
      </div>
      <div className="cap-examples">
        {examples.map((ex, i) => <button key={i} className="example-btn" onClick={() => { setText(ex); run({ text: ex }) }}>{ex}</button>)}
      </div>
    </div>
  )

  const renderResult = (result) => (
    <div className="cap-diff">
      <div className="cap-diff-panel">
        <div className="cap-diff-header">Original</div>
        <div className="cap-diff-body" style={{ color: '#dc2626' }}>{result.original}</div>
      </div>
      <div className="cap-diff-panel" style={{ borderTop: '3px solid #16a34a' }}>
        <div className="cap-diff-header" style={{ color: '#16a34a' }}>Corrected</div>
        <div className="cap-diff-body">
          <DiffText original={result.original} corrected={result.corrected} />
        </div>
      </div>
    </div>
  )

  return (
    <div className="app">
      <AiDataPlaneTab endpoint="/api/ai-data-plane-grammar" buildBody={() => ({ text })}
        renderControls={renderControls} renderResult={renderResult} examples={EXAMPLES}
        banner={<AiDataPlaneDiyBanner diyTab={null} diyLabel={null} replaces="LLM call with grammar correction prompt" />}
        placeholder={<div className="cap-placeholder"><p><code>ai_corrected_grammar()</code> fixes grammar errors in text from inside SQL++. Useful for cleaning user-generated content before storage or display. Corrections are highlighted in green.</p></div>} />
    </div>
  )
}
