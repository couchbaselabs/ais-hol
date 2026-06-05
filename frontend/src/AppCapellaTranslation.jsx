import React, { useState } from 'react'
import './App.css'
import './CapellaTab.css'
import CapellaTab from './CapellaTab'
import { useInfoPanelQuestion } from './hooks/useInfoPanelQuestion'

const EXAMPLES = [
  'The quick brown fox jumps over the lazy dog.',
  'Hello, how can I help you today?',
  'Please review the attached document and provide feedback.',
]

const LANGUAGES = ['French','Spanish','German','Italian','Portuguese','Japanese','Chinese','Arabic','Hindi','Korean','Dutch','Polish']

export default function AppCapellaTranslation() {
  const [text, setText]   = useState('')
  const [lang, setLang]   = useState('French')

  useInfoPanelQuestion(setText)

  const renderControls = (run, loading, examples) => (
    <div className="cap-controls">
      <div className="cap-row">
        <textarea className="cap-textarea" rows={2} value={text}
          onChange={e => setText(e.target.value)} placeholder="Enter text to translate…" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <select className="cap-select" value={lang} onChange={e => setLang(e.target.value)}>
            {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <button className="cap-run-btn" disabled={loading || !text.trim()}
            onClick={() => run({ text, to_language: lang })}>
            {loading ? 'Translating…' : 'Translate →'}
          </button>
        </div>
      </div>
      <div className="cap-examples">
        {examples.map((ex, i) => <button key={i} className="example-btn" onClick={() => { setText(ex); run({ text: ex, to_language: lang }) }}>{ex}</button>)}
      </div>
    </div>
  )

  const renderResult = (result) => (
    <div className="cap-diff">
      <div className="cap-diff-panel">
        <div className="cap-diff-header">Original</div>
        <div className="cap-diff-body">{result.original ?? text}</div>
      </div>
      <div className="cap-diff-panel" style={{ borderTop: '3px solid #00A3E0' }}>
        <div className="cap-diff-header" style={{ color: '#00A3E0' }}>{result.to_language}</div>
        <div className="cap-diff-body">{result.translation}</div>
      </div>
    </div>
  )

  return (
    <div className="app">
      <CapellaTab endpoint="/api/capella-translation" buildBody={() => ({ text, to_language: lang })}
        renderControls={renderControls} renderResult={renderResult} examples={EXAMPLES}
        placeholder={<div className="cap-placeholder"><p><code>ai_translation()</code> translates text to any target language from inside a SQL++ query — no application-side translation library needed.</p></div>} />
    </div>
  )
}
