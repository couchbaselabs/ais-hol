import React, { useState } from 'react'
import './App.css'
import './CapellaTab.css'
import CapellaTab from './CapellaTab'
import { useInfoPanelQuestion } from './hooks/useInfoPanelQuestion'
import CapellaDiyBanner from './components/CapellaDiyBanner'

const EXAMPLE_PAIRS = [
  ['The cat sat on the mat.', 'A feline rested on the rug.'],
  ['How do I reset my password?', 'I forgot my login credentials.'],
  ['The weather is sunny today.', 'JavaScript is a programming language.'],
]

export default function AppCapellaSimilarity() {
  const [text1, setText1] = useState('')
  const [text2, setText2] = useState('')

  useInfoPanelQuestion(setText1)

  const renderControls = (run, loading, examples) => (
    <div className="cap-controls">
      <div className="cap-row">
        <textarea className="cap-textarea" rows={2} value={text1}
          onChange={e => setText1(e.target.value)} placeholder="First text…" />
      </div>
      <div className="cap-row">
        <textarea className="cap-textarea" rows={2} value={text2}
          onChange={e => setText2(e.target.value)} placeholder="Second text…" />
        <button className="cap-run-btn" disabled={loading || !text1.trim() || !text2.trim()}
          onClick={() => run({ text1, text2 })}>
          {loading ? 'Comparing…' : 'Compare →'}
        </button>
      </div>
      <div className="cap-examples">
        {EXAMPLE_PAIRS.map(([a, b], i) => (
          <button key={i} className="example-btn" onClick={() => { setText1(a); setText2(b); run({ text1: a, text2: b }) }}>
            Example {i + 1}
          </button>
        ))}
      </div>
    </div>
  )

  const renderResult = (result) => {
    const sim = result.similarity ?? 0
    const cos = result.cosine
    const simColor = sim > 0.7 ? '#16a34a' : sim > 0.4 ? '#d97706' : '#dc2626'
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        <div className="cap-result-card" style={{ borderLeftColor: simColor }}>
          <div className="cap-result-label">ai_similarity() score</div>
          <div className="cap-score-wrap">
            <div className="cap-score-track">
              <div className="cap-score-fill" style={{ width: `${sim * 100}%`, background: simColor }} />
            </div>
            <span className="cap-score-num" style={{ color: simColor }}>{sim.toFixed(3)}</span>
          </div>
        </div>
        {cos !== null && cos !== undefined && (
          <div className="cap-result-card" style={{ borderLeftColor: '#7c3aed' }}>
            <div className="cap-result-label">Embedding cosine similarity (for comparison)</div>
            <div className="cap-score-wrap">
              <div className="cap-score-track">
                <div className="cap-score-fill" style={{ width: `${cos * 100}%`, background: '#7c3aed' }} />
              </div>
              <span className="cap-score-num" style={{ color: '#7c3aed' }}>{cos.toFixed(3)}</span>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="app">
      <CapellaTab endpoint="/api/capella-similarity" buildBody={() => ({ text1, text2 })}
        renderControls={renderControls} renderResult={renderResult} examples={[]}
        banner={<CapellaDiyBanner diyTab="cached" diyLabel="Semantic Cache" replaces="embed query → ANN search → threshold check" />}
        placeholder={<div className="cap-placeholder"><p><code>ai_similarity()</code> scores semantic similarity between two texts (0–1) from inside SQL++. Compare it with embedding cosine similarity to see how they differ.</p></div>} />
    </div>
  )
}
