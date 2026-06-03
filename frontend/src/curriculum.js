/**
 * Curriculum definition — ordered modules from basic to advanced.
 *
 * Each module has:
 *   id       — unique key
 *   title    — short module name shown in sidebar
 *   icon     — emoji shown when sidebar is collapsed
 *   level    — 'beginner' | 'intermediate' | 'advanced'
 *   tabs     — ordered list of { id, label } matching Shell tab IDs
 *
 * The order of modules and tabs within modules defines the intended
 * learning path. Students can navigate freely but the sidebar makes
 * the intended sequence obvious.
 */

export const MODULES = [
  {
    id: 'foundations',
    title: 'Foundations',
    icon: '🧱',
    level: 'beginner',
    tabs: [
      { id: 'chat',           label: '💬 Simple Chat' },
      { id: 'tokens',         label: '🔤 Tokenisation' },
      { id: 'logprobs',       label: '🎲 Token Probabilities' },
      { id: 'temperature',    label: '🌡️ Temperature' },
      { id: 'context-window', label: '📐 Context Window' },
    ],
  },
  {
    id: 'prompting',
    title: 'Prompting',
    icon: '✏️',
    level: 'beginner',
    tabs: [
      { id: 'prompt',           label: '✏️ Prompt Engineering' },
      { id: 'few-shot',         label: '🎯 Few-Shot' },
      { id: 'chain-of-thought', label: '🔗 Chain-of-Thought' },
      { id: 'personas',         label: '🎭 Personas' },
      { id: 'prompt-injection', label: '💉 Prompt Injection' },
    ],
  },
  {
    id: 'pipeline',
    title: 'Building a Pipeline',
    icon: '🔧',
    level: 'intermediate',
    tabs: [
      { id: 'stream',     label: '🌊 Streaming' },
      { id: 'cached',     label: '⚡ Semantic Cache' },
      { id: 'history',    label: '🕐 Conversation Memory' },
      { id: 'structured', label: '🧩 Structured Output' },
      { id: 'summarise',  label: '📄 Summarisation' },
    ],
  },
  {
    id: 'rag',
    title: 'Retrieval-Augmented Generation',
    icon: '🔍',
    level: 'intermediate',
    tabs: [
      { id: 'embeddings',      label: '🔢 Embeddings' },
      { id: 'chunking',        label: '✂️ Chunking' },
      { id: 'ingestion',       label: '📥 Ingestion' },
      { id: 'rag',             label: '🔍 RAG Pipeline' },
      { id: 'rerank',          label: '📈 Reranking' },
      { id: 'hyde',            label: '💡 HyDE' },
      { id: 'query-expansion', label: '🔀 Query Expansion' },
      { id: 'vector-search',   label: '🔍 FTS vs GSI' },
    ],
  },
  {
    id: 'capabilities',
    title: 'LLM Capabilities',
    icon: '🚀',
    level: 'intermediate',
    tabs: [
      { id: 'vision',           label: '🖼️ Vision' },
      { id: 'tool-calling',     label: '🔧 Tool Calling' },
      { id: 'model-comparison', label: '📊 Model Comparison' },
    ],
  },
  {
    id: 'advanced',
    title: 'Advanced Patterns',
    icon: '⚡',
    level: 'advanced',
    tabs: [
      { id: 'agentic-rag',  label: '🔄 Agentic RAG' },
      { id: 'agent',        label: '🤖 Multi-Agent' },
      { id: 'evaluate',     label: '🏅 LLM-as-Judge' },
      { id: 'hallucination',label: '🔎 Hallucination Detection' },
    ],
  },
  {
    id: 'production',
    title: 'Production',
    icon: '🛡️',
    level: 'advanced',
    tabs: [
      { id: 'cost-latency', label: '💰 Cost & Latency' },
      { id: 'guardrails',   label: '🛡️ Guardrails' },
    ],
  },
  {
    id: 'voice',
    title: 'Voice',
    icon: '🎤',
    level: 'advanced',
    tabs: [
      { id: 'voice-wasm',   label: '🎤 Voice (WASM)' },
      { id: 'voice-server', label: '🎤 Voice (Server)' },
    ],
  },
  {
    id: 'capella',
    title: 'Capella AI Functions',
    icon: '🗄️',
    level: 'advanced',
    tabs: [
      { id: 'capella-summarise', label: '🗄️ AI Summarisation' },
      { id: 'capella-sentiment', label: '🗄️ AI Sentiment' },
    ],
  },
]

export const LEVEL_META = {
  beginner:     { label: 'Beginner',     color: '#16a34a', bg: '#dcfce7' },
  intermediate: { label: 'Intermediate', color: '#d97706', bg: '#fef3c7' },
  advanced:     { label: 'Advanced',     color: '#7c3aed', bg: '#ede9fe' },
}

// Flat ordered list of all tab IDs in curriculum order — used for prev/next
export const ORDERED_TAB_IDS = MODULES.flatMap(m => m.tabs.map(t => t.id))

// Lookup: tabId → { module, tab, moduleIndex, tabIndex }
export const TAB_INDEX = {}
MODULES.forEach((mod, mi) => {
  mod.tabs.forEach((tab, ti) => {
    TAB_INDEX[tab.id] = { module: mod, tab, moduleIndex: mi, tabIndex: ti }
  })
})
