import React, { useState } from 'react'
import './App.css'
import './CapellaTab.css'
import CapellaTab from './CapellaTab'
import { useInfoPanelQuestion } from './hooks/useInfoPanelQuestion'

const PRESETS = [
  { label: 'Product description', system: 'You are a product copywriter. Write a compelling 2-sentence product description.', user: 'A wireless ergonomic keyboard with backlit keys and 6-month battery life.' },
  { label: 'Q&A over document', system: 'Answer the question based only on the provided context. Be concise.', user: 'Context: The Fetch API uses Promises and replaces XMLHttpRequest.\n\nQuestion: What does the Fetch API replace?' },
  { label: 'Summarise in one line', system: 'Summarise the following text in exactly one sentence.', user: 'The Couchbase Capella AI Functions allow developers to run LLM-powered operations directly inside SQL++ queries, eliminating the need to extract data to an application layer for AI processing.' },
]

export default function AppCapellaCompletion() {
  const [system, setSystem] = useState(PRESETS[0].system)
  const [user, setUser]     = useState(PRESETS[0].user)

  useInfoPanelQuestion(setUser)

  const renderControls = (run, loading) => (
    <div className="cap-controls">
      <div className="cap-option-label">Preset examples</div>
      <div className="cap-examples">
        {PRESETS.map((p, i) => (
          <button key={i} className="example-btn" onClick={() => { setSystem(p.system); setUser(p.user) }}>{p.label}</button>
        ))}
      </div>
      <div className="cap-option-label">System prompt</div>
      <textarea className="cap-textarea" rows={2} value={system} onChange={e => setSystem(e.target.value)} />
      <div className="cap-option-label">User prompt</div>
      <div className="cap-row">
        <textarea className="cap-textarea" rows={3} value={user} onChange={e => setUser(e.target.value)} placeholder="Enter your prompt…" />
        <button className="cap-run-btn" disabled={loading || !user.trim()}
          onClick={() => run({ system_prompt: system, user_prompt: user })}>
          {loading ? 'Running…' : 'Run →'}
        </button>
      </div>
    </div>
  )

  const renderResult = (result) => (
    <div className="cap-result-card">
      <div className="cap-result-label">Completion</div>
      <div className="cap-result-text">{result.completion}</div>
    </div>
  )

  return (
    <div className="app">
      <CapellaTab endpoint="/api/capella-completion" buildBody={() => ({ system_prompt: system, user_prompt: user })}
        renderControls={renderControls} renderResult={renderResult} examples={[]}
        placeholder={<div className="cap-placeholder"><p><code>ai_completion()</code> is the escape hatch — run any custom system+user prompt from inside SQL++. Use it for tasks not covered by the other AI Functions.</p></div>} />
    </div>
  )
}
