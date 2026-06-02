import React from 'react'
import './Header.css'

// ── Row 1: Progressive pipeline build-up ─────────────────────────────────────
const PIPELINE_TABS = [
  { id: 'chat',    label: '💬 Simple Chat' },
  { id: 'stream',  label: '🌊 Streaming' },
  { id: 'cached',  label: '⚡ + Cache' },
  { id: 'history', label: '🕐 + Memory' },
  { id: 'rag',     label: '🔍 + RAG' },
  { id: 'agent',   label: '🤖 Multi-Agent' },
]

// ── Row 2: How LLMs work — foundational mechanics ────────────────────────────
const MECHANICS_TABS = [
  { id: 'tokens',           label: '🔤 Tokenisation' },
  { id: 'logprobs',         label: '🎲 Token Probs' },
  { id: 'temperature',      label: '🌡️ Temperature' },
  { id: 'context-window',   label: '📐 Context Window' },
]

// ── Row 3: Prompting techniques ───────────────────────────────────────────────
const PROMPTING_TABS = [
  { id: 'prompt',           label: '✏️ Prompt Engineering' },
  { id: 'few-shot',         label: '🎯 Few-Shot' },
  { id: 'chain-of-thought', label: '🔗 Chain-of-Thought' },
  { id: 'personas',         label: '🎭 Personas' },
  { id: 'prompt-injection', label: '💉 Prompt Injection' },
]

// ── Row 4: RAG lifecycle ──────────────────────────────────────────────────────
const RAG_TABS = [
  { id: 'embeddings',       label: '🔢 Embeddings' },
  { id: 'chunking',         label: '✂️ Chunking' },
  { id: 'ingestion',        label: '📥 Ingestion' },
  { id: 'rerank',           label: '📈 Reranking' },
  { id: 'hyde',             label: '💡 HyDE' },
  { id: 'agentic-rag',      label: '🔄 Agentic RAG' },
]

// ── Row 5: LLM capabilities ───────────────────────────────────────────────────
const CAPABILITIES_TABS = [
  { id: 'vision',           label: '🖼️ Vision' },
  { id: 'tool-calling',     label: '🔧 Tool Calling' },
  { id: 'structured',       label: '🧩 Structured Output' },
  { id: 'summarise',        label: '📄 Summarisation' },
  { id: 'evaluate',         label: '🏅 LLM-as-Judge' },
  { id: 'model-comparison', label: '📊 Model Comparison' },
]

// ── Row 6: Production concerns ────────────────────────────────────────────────
const PRODUCTION_TABS = [
  { id: 'cost-latency',     label: '💰 Cost & Latency' },
  { id: 'guardrails',       label: '🛡️ Guardrails' },
  { id: 'hallucination',    label: '🔎 Hallucination' },
  { id: 'query-expansion',  label: '🔀 Query Expansion' },
]

// ── Row 7: Voice ──────────────────────────────────────────────────────────────
const VOICE_TABS = [
  { id: 'voice-wasm',       label: '🎤 Voice (WASM)' },
  { id: 'voice-server',     label: '🎤 Voice (Server)' },
]

// ── Row 8: Capella AI Functions ───────────────────────────────────────────────
const CAPELLA_TABS = [
  { id: 'capella-summarise', label: '🗄️ AI Summarisation' },
  { id: 'capella-sentiment', label: '🗄️ AI Sentiment' },
]

const ROWS = [
  { label: 'Pipeline',      tabs: PIPELINE_TABS,     capella: false },
  { label: 'How LLMs Work', tabs: MECHANICS_TABS,    capella: false },
  { label: 'Prompting',     tabs: PROMPTING_TABS,    capella: false },
  { label: 'RAG',           tabs: RAG_TABS,          capella: false },
  { label: 'Capabilities',  tabs: CAPABILITIES_TABS, capella: false },
  { label: 'Production',    tabs: PRODUCTION_TABS,   capella: false },
  { label: 'Voice',         tabs: VOICE_TABS,        capella: false },
  { label: 'Capella AI',    tabs: CAPELLA_TABS,      capella: true  },
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
          {ROWS.map(row => (
            <div key={row.label} className="tab-row">
              <span className="tab-row-label">{row.label}</span>
              <nav className="header-tabs">
                {row.tabs.map(t => (
                  <button
                    key={t.id}
                    className={`tab-btn${row.capella ? ' tab-btn--capella' : ''}${activeTab === t.id ? ' tab-btn--active' : ''}`}
                    onClick={() => onTabChange(t.id)}
                  >
                    {t.label}
                  </button>
                ))}
              </nav>
            </div>
          ))}
        </div>
      )}
    </header>
  )
}

export default Header
