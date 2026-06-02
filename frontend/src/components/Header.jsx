import React from 'react'
import './Header.css'

const PIPELINE_TABS = [
  { id: 'chat',    label: '💬 Simple Chat' },
  { id: 'stream',  label: '🌊 Streaming' },
  { id: 'cached',  label: '⚡ + Cache' },
  { id: 'history', label: '🧠 + Memory' },
  { id: 'rag',     label: '🔍 + RAG' },
  { id: 'agent',   label: '🤖 Multi-Agent' },
]

const CONCEPT_TABS = [
  { id: 'structured',        label: '🧩 Structured Output' },
  { id: 'rerank',            label: '📊 Reranking' },
  { id: 'prompt',            label: '✏️ Prompt Engineering' },
  { id: 'embeddings',        label: '🔢 Embeddings' },
  { id: 'hyde',              label: '💡 HyDE' },
  { id: 'evaluate',          label: '⚖️ LLM-as-Judge' },
  { id: 'summarise',         label: '📄 Summarisation' },
  { id: 'tokens',            label: '🔤 Token Counter' },
]

const VOICE_TABS = [
  { id: 'voice-wasm',   label: '🎤 Voice (WASM)' },
  { id: 'voice-server', label: '🎤 Voice (Server)' },
]

const LLM_TABS = [
  { id: 'temperature',       label: '🌡️ Temperature' },
  { id: 'tool-calling',      label: '🔧 Tool Calling' },
  { id: 'context-window',    label: '📐 Context Window' },
  { id: 'query-expansion',   label: '🔀 Query Expansion' },
  { id: 'cost-latency',      label: '💰 Cost & Latency' },
  { id: 'guardrails',        label: '🛡️ Guardrails' },
]

const CAPELLA_TABS = [
  { id: 'capella-summarise', label: '🗄️ AI Summarisation' },
  { id: 'capella-sentiment', label: '🗄️ AI Sentiment' },
]

const Header = ({ activeTab, onTabChange, action }) => {
  return (
    <header className="header">
      <div className="header-top">
        <div className="header-title">
          <h1>AI Services Demo</h1>
          <p>Couchbase · OpenAI · LangGraph</p>
        </div>
        {action && <div className="header-action">{action}</div>}
      </div>
      {onTabChange && (
        <div className="header-tab-rows">
          <div className="tab-row">
            <span className="tab-row-label">Pipeline</span>
            <nav className="header-tabs">
              {PIPELINE_TABS.map(t => (
                <button
                  key={t.id}
                  className={`tab-btn ${activeTab === t.id ? 'tab-btn--active' : ''}`}
                  onClick={() => onTabChange(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </nav>
          </div>
          <div className="tab-row">
            <span className="tab-row-label">Concepts</span>
            <nav className="header-tabs">
              {CONCEPT_TABS.map(t => (
                <button
                  key={t.id}
                  className={`tab-btn ${activeTab === t.id ? 'tab-btn--active' : ''}`}
                  onClick={() => onTabChange(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </nav>
          </div>
          <div className="tab-row">
            <span className="tab-row-label">Voice</span>
            <nav className="header-tabs">
              {VOICE_TABS.map(t => (
                <button
                  key={t.id}
                  className={`tab-btn ${activeTab === t.id ? 'tab-btn--active' : ''}`}
                  onClick={() => onTabChange(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </nav>
          </div>
          <div className="tab-row">
            <span className="tab-row-label">LLM Deep Dives</span>
            <nav className="header-tabs">
              {LLM_TABS.map(t => (
                <button
                  key={t.id}
                  className={`tab-btn ${activeTab === t.id ? 'tab-btn--active' : ''}`}
                  onClick={() => onTabChange(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </nav>
          </div>
          <div className="tab-row">
            <span className="tab-row-label">Capella AI Functions</span>
            <nav className="header-tabs">
              {CAPELLA_TABS.map(t => (
                <button
                  key={t.id}
                  className={`tab-btn tab-btn--capella ${activeTab === t.id ? 'tab-btn--active' : ''}`}
                  onClick={() => onTabChange(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}
    </header>
  )
}

export default Header
