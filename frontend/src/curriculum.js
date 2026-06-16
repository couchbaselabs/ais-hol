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
      { id: 'parallel',       label: '⚡ Parallel Requests' },
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
      { id: 'output-format',    label: '🖨️ Output Format' },
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
      { id: 'rerank',              label: '📈 Reranking' },
      { id: 'hyde',               label: '💡 HyDE' },
      { id: 'query-expansion',    label: '🔀 Query Expansion' },
      { id: 'vector-search',      label: '🔍 FTS vs GSI' },
      { id: 'metadata-filtering', label: '🏷️ Metadata Filtering' },
      { id: 'multi-vector',       label: '🧩 Multi-Vector' },
    ],
  },
  {
    id: 'capabilities',
    title: 'LLM Capabilities',
    icon: '🚀',
    level: 'intermediate',
    tabs: [
      { id: 'vision',            label: '🖼️ Vision' },
      { id: 'image-generation',  label: '🎨 Image Generation' },
      { id: 'moderation',        label: '🛡️ Moderation' },
      { id: 'tool-calling',      label: '🔧 Tool Calling' },
      { id: 'model-comparison',  label: '📊 Model Comparison' },
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
    id: 'production-patterns',
    title: 'Production Patterns',
    icon: '⚙️',
    level: 'advanced',
    tabs: [
      { id: 'retry',         label: '🔁 Retry & Fallback' },
      { id: 'token-budget',  label: '🪙 Token Budget' },
      { id: 'observability', label: '🔭 Observability' },
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
    id: 'capella-ai-functions',
    title: 'Capella AI Functions',
    icon: '🗄️',
    level: 'advanced',
    tabs: [
      { id: 'capella-intro',          label: '🗄️ Introduction' },
      { id: 'capella-service',        label: '🗄️ AI Data Plane' },
      { id: 'capella-summarise',      label: '🗄️ AI Summarisation' },
      { id: 'capella-sentiment',      label: '🗄️ AI Sentiment' },
      { id: 'capella-classification', label: '🗄️ AI Classification' },
      { id: 'capella-extraction',     label: '🗄️ AI Extraction' },
      { id: 'capella-translation',    label: '🗄️ AI Translation' },
      { id: 'capella-masking',        label: '🗄️ AI Masking' },
      { id: 'capella-similarity',     label: '🗄️ AI Similarity' },
      { id: 'capella-completion',     label: '🗄️ AI Completion' },
      { id: 'capella-grammar',        label: '🗄️ AI Grammar' },
    ],
  },
  {
    id: 'capella-models',
    title: 'Capella Models',
    icon: '🤖',
    level: 'advanced',
    tabs: [
      { id: 'capella-model-guardrails',  label: '🛡️ Guardrails' },
      { id: 'capella-model-cache',       label: '⚡ Semantic Cache' },
      { id: 'capella-model-providers',   label: '🔀 Model Providers' },
      { id: 'capella-model-ratelimit',   label: '🚦 Rate Limiting' },
    ],
  },
  {
    id: 'capella-workflows',
    title: 'Capella AI Workflows',
    icon: '⚙️',
    level: 'advanced',
    tabs: [
      { id: 'capella-ingestion',      label: '⚙️ Ingestion Pipeline' },
    ],
  },
  {
    id: 'slack',
    title: 'Slack Chatbot',
    icon: '💬',
    level: 'advanced',
    tabs: [
      { id: 'slack-overview',  label: '🏗️ Architecture' },
      { id: 'slack-slash',     label: '/ Slash Command' },
      { id: 'slack-events',    label: '📡 Event Handler' },
      { id: 'slack-deploy',    label: '🚀 Deploy' },
    ],
  },
  {
    id: 'agent-catalog',
    title: 'Agent Catalog',
    icon: '🗂️',
    level: 'advanced',
    tabs: [
      { id: 'agent-catalog-overview', label: '🗂️ Overview' },
      { id: 'agent-catalog-tools',    label: '🗂️ Tool Discovery' },
      { id: 'agent-catalog-runs',     label: '🗂️ Agent Runs' },
    ],
  },
  {
    id: 'whatsapp',
    title: 'WhatsApp Bot',
    icon: '💬',
    level: 'advanced',
    tabs: [
      { id: 'whatsapp-overview', label: '🏗️ Architecture' },
      { id: 'whatsapp-webhook',  label: '🪝 Webhook' },
      { id: 'whatsapp-memory',   label: '🧠 Session Memory' },
      { id: 'whatsapp-deploy',   label: '🚀 Deploy' },
    ],
  },
  {
    id: 'telegram',
    title: 'Telegram Bot',
    icon: '✈️',
    level: 'advanced',
    tabs: [
      { id: 'telegram-overview',  label: '🏗️ Architecture' },
      { id: 'telegram-commands',  label: '⌨️ Commands' },
      { id: 'telegram-inline',    label: '🔘 Inline Mode' },
      { id: 'telegram-deploy',    label: '🚀 Deploy' },
    ],
  },
  {
    id: 'discord',
    title: 'Discord Bot',
    icon: '🎮',
    level: 'advanced',
    tabs: [
      { id: 'discord-overview',  label: '🏗️ Architecture' },
      { id: 'discord-slash',     label: '⚡ Slash Commands' },
      { id: 'discord-context',   label: '🖱️ Context Menu' },
      { id: 'discord-deploy',    label: '🚀 Deploy' },
    ],
  },
  {
    id: 'webchat',
    title: 'Web Chat Widget',
    icon: '💬',
    level: 'advanced',
    tabs: [
      { id: 'webchat-overview',  label: '🏗️ Architecture' },
      { id: 'webchat-widget',    label: '🪟 Widget' },
      { id: 'webchat-streaming', label: '📡 Streaming' },
      { id: 'webchat-deploy',    label: '🚀 Deploy' },
    ],
  },
  {
    id: 'shopify',
    title: 'Shopify Storefront Bot',
    icon: '🛍️',
    level: 'advanced',
    tabs: [
      { id: 'shopify-overview',  label: '🏗️ Architecture' },
      { id: 'shopify-catalog',   label: '📦 Catalog Ingestion' },
      { id: 'shopify-search',    label: '🔍 Product Search' },
      { id: 'shopify-deploy',    label: '🚀 Deploy' },
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
