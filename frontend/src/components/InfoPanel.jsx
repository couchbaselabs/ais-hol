import React, { useState } from 'react'
import './InfoPanel.css'

const TAB_INFO = {
  chat: {
    title: 'Simple Chat',
    subtitle: 'Direct LLM completion — no memory, no context',
    color: '#4f46e5',
    icon: '💬',
    what: 'Every message is sent to the LLM as a standalone request. The model has no knowledge of previous turns and no access to external data.',
    how: [
      'User message → FastAPI /api/chat',
      'OpenAI chat completion (single-turn)',
      'Response returned as JSON',
    ],
    limitations: [
      'No conversation memory — each message is independent',
      'Answers are limited to the model\'s training data',
      'Cannot answer questions about your own documents',
    ],
    stack: ['OpenAI GPT', 'FastAPI'],
    questions: [
      'What is JavaScript?',
      'Explain the difference between null and undefined',
      'What does the Array.map() method do?',
    ],
  },
  rag: {
    title: 'RAG Chat',
    subtitle: 'Retrieval-Augmented Generation with conversation history & semantic cache',
    color: '#0891b2',
    icon: '🔍',
    what: 'Before calling the LLM, the query is embedded and used to retrieve the most relevant document chunks from Couchbase. Those chunks are injected into the prompt as context. Conversation history is stored in Couchbase KV and summarized using Capella AI SQL++ functions. A semantic cache avoids redundant LLM calls for similar questions.',
    how: [
      'User query → embedding (OpenAI)',
      'ANN vector search on MDN docs (Couchbase SQL++ GSI index)',
      'Top-k chunks injected into system prompt',
      'Conversation history fetched from Couchbase KV',
      'Semantic cache checked — hit returns cached answer instantly',
      'LLM streams response token-by-token',
      'Response cached for future similar queries',
    ],
    limitations: [
      'Quality depends on the indexed document corpus',
      'Retrieval is semantic, not exact — may miss niche details',
      'Cache hits bypass the LLM entirely (fast, but stale if docs change)',
    ],
    stack: ['OpenAI GPT + Embeddings', 'Couchbase SQL++ ANN vector search', 'Couchbase KV (conversation history)', 'Capella AI ai_summary()', 'Semantic cache (vector similarity)'],
    questions: [
      'How does the CSS box model work?',
      'What is the difference between let, const, and var?',
      'Explain the Fetch API',
      'What are Web Workers?',
    ],
  },
  agent: {
    title: 'Multi-Agent Chat',
    subtitle: 'LangGraph router dispatching to specialised ReAct agents',
    color: '#7c3aed',
    icon: '🤖',
    what: 'A router LLM classifies the intent of each message and dispatches it to the most appropriate agent: a math agent for calculations, an FAQ search agent for policy/product questions, or a direct LLM response for general queries. Each agent uses the ReAct (Reason + Act) loop and is instrumented via Couchbase Agent Catalog for full observability.',
    how: [
      'User message → LangGraph StateGraph',
      'Router agent classifies intent: direct / math / faq',
      'Math agent: ReAct loop with add, subtract, multiply, divide, evaluate tools',
      'FAQ agent: hybrid vector + FTS search across Couchbase collections',
      'Agent Catalog (agentc) logs spans to Couchbase for observability',
      'Response + routing metadata returned to UI',
    ],
    limitations: [
      'Router classification can misfire on ambiguous queries',
      'FAQ search requires pre-indexed collections in Couchbase',
      'Multi-hop reasoning adds latency vs. single-turn chat',
    ],
    stack: ['LangGraph StateGraph', 'OpenAI GPT (router + agents)', 'Couchbase hybrid search (vector + FTS)', 'Couchbase Agent Catalog (agentc)', 'ReAct agent pattern'],
    questions: [
      'What is 1337 multiplied by 42?',
      'Calculate (15 + 7) * 3 - 10 / 2',
      'What is the vacation policy?',
      'Tell me about the product warranty',
    ],
  },
}

export default function InfoPanel({ tab }) {
  const [open, setOpen] = useState(true)
  const info = TAB_INFO[tab]
  if (!info) return null

  return (
    <aside className={`info-panel ${open ? 'info-panel--open' : 'info-panel--collapsed'}`}>
      <button
        className="info-panel__toggle"
        onClick={() => setOpen(v => !v)}
        title={open ? 'Hide info' : 'Show info'}
        style={{ '--accent': info.color }}
      >
        {open ? '◀' : '▶'}
      </button>

      {open && (
        <div className="info-panel__body">
          <div className="info-panel__header" style={{ '--accent': info.color }}>
            <span className="info-panel__icon">{info.icon}</span>
            <div>
              <h2 className="info-panel__title">{info.title}</h2>
              <p className="info-panel__subtitle">{info.subtitle}</p>
            </div>
          </div>

          <section className="info-section">
            <h3 className="info-section__heading">How it works</h3>
            <p className="info-section__text">{info.what}</p>
          </section>

          <section className="info-section">
            <h3 className="info-section__heading">Request flow</h3>
            <ol className="info-section__steps">
              {info.how.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </section>

          <section className="info-section">
            <h3 className="info-section__heading">Stack</h3>
            <ul className="info-section__tags">
              {info.stack.map((s, i) => (
                <li key={i} className="tag" style={{ '--accent': info.color }}>{s}</li>
              ))}
            </ul>
          </section>

          <section className="info-section">
            <h3 className="info-section__heading">Limitations</h3>
            <ul className="info-section__list info-section__list--warn">
              {info.limitations.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
          </section>

          <section className="info-section">
            <h3 className="info-section__heading">Try these questions</h3>
            <ul className="info-section__suggestions">
              {info.questions.map((q, i) => (
                <li key={i} className="suggestion">{q}</li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </aside>
  )
}
