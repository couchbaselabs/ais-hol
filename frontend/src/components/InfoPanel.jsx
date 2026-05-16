import React, { useState } from 'react'
import './InfoPanel.css'

const TAB_INFO = {
  chat: {
    title: 'Simple Chat',
    subtitle: 'Direct LLM completion — stateless, no memory, no retrieval',
    color: '#4f46e5',
    icon: '💬',
    what: 'Every message is sent to the LLM as a standalone request. The model has no knowledge of previous turns and no access to external data. This is the baseline — the simplest possible AI integration.',
    how: [
      'User message → POST /api/chat',
      'OpenAI chat completion (single-turn)',
      'Response returned as JSON',
    ],
    limitations: [
      'No memory — each message is completely independent',
      'Identical questions always hit the LLM, costing tokens every time',
      'Answers limited to the model\'s training data cutoff',
      'Cannot answer questions about your own documents',
    ],
    stack: ['OpenAI GPT', 'FastAPI'],
    questions: [
      'What is JavaScript?',
      'Explain the difference between null and undefined',
      'What does Array.map() do?',
    ],
  },
  cached: {
    title: 'Simple Chat + Semantic Cache',
    subtitle: 'Adds a vector-similarity cache in Couchbase to avoid redundant LLM calls',
    color: '#d97706',
    icon: '⚡',
    what: 'Before calling the LLM, the query is embedded and compared against previously cached responses using ANN vector search. If a semantically similar question was already answered with the same LLM configuration, the cached response is returned instantly — no LLM call needed. The ⚡ cache hit / 🔄 generated badge on each response shows which path was taken.',
    how: [
      'User message → embedding (OpenAI)',
      'ANN vector search on semantic_cache collection (Couchbase SQL++ GSI)',
      'Cache hit: return stored response immediately (no LLM call)',
      'Cache miss: call LLM → store response + embedding in cache',
      'Cache keyed on: embedding similarity + LLM signature (model, temp, max_tokens, system prompt)',
    ],
    limitations: [
      'Still no memory — each conversation turn is independent',
      'Cache can return stale answers if the underlying data changes',
      'Similarity threshold is a trade-off: too tight = few hits, too loose = wrong answers',
    ],
    stack: ['OpenAI GPT + Embeddings', 'Couchbase SQL++ ANN vector search', 'Semantic cache (MD5 LLM signature)'],
    questions: [
      'What is JavaScript? (ask twice to see a cache hit)',
      'Explain closures in JavaScript',
      'What is a Promise?',
    ],
  },
  history: {
    title: 'Simple Chat + Cache + Memory',
    subtitle: 'Adds Couchbase KV conversation history so the model remembers prior turns',
    color: '#059669',
    icon: '🧠',
    what: 'Each message is stored in a Couchbase conversations collection keyed by session ID. Before calling the LLM, the full conversation history is fetched and formatted into the prompt, giving the model context of what was said earlier. The semantic cache still applies — a cache hit skips both history lookup and the LLM call.',
    how: [
      'User message → embedding → cache check',
      'Cache miss: fetch conversation history from Couchbase KV (N1QL)',
      'Format history into prompt context',
      'LLM call with history-enriched prompt',
      'Store user message + assistant response in Couchbase',
      'Store response in semantic cache',
    ],
    limitations: [
      'History grows unbounded — long sessions inflate the prompt and cost',
      'No summarization yet — the full raw history is sent each turn',
      'Cache hits skip history, so a cached response may ignore recent context',
    ],
    stack: ['OpenAI GPT + Embeddings', 'Couchbase KV (conversation history)', 'Couchbase SQL++ N1QL', 'Semantic cache'],
    questions: [
      'My name is Alex. Remember that.',
      'What is my name? (tests memory)',
      'What did I just tell you?',
    ],
  },
  rag: {
    title: 'Simple Chat + Cache + Memory + RAG',
    subtitle: 'Adds vector retrieval over MDN docs and Capella AI summarization',
    color: '#0891b2',
    icon: '🔍',
    what: 'The full pipeline: the query is embedded, relevant MDN documentation chunks are retrieved via ANN vector search, and the conversation history is summarized using Capella\'s built-in ai_summary() SQL++ function (summarization runs inside the database). All of this is injected into the prompt before streaming the LLM response token-by-token.',
    how: [
      'User query → embedding → cache check',
      'Cache miss: store user message in Couchbase',
      'Summarize conversation history via Capella ai_summary() SQL++ function',
      'ANN vector search on MDN documentation collection',
      'Inject summary + top-k doc chunks into prompt',
      'LLM streams response token-by-token',
      'Store assistant response + cache the result',
    ],
    limitations: [
      'Retrieval quality depends on the indexed corpus (MDN docs only)',
      'ai_summary() requires the query_external_access role on Capella',
      'Streaming + caching means the full response must complete before caching',
      'Cache hits bypass retrieval — stale if docs are updated',
    ],
    stack: ['OpenAI GPT + Embeddings', 'Couchbase SQL++ ANN vector search (MDN docs)', 'Couchbase KV (conversation history)', 'Capella AI ai_summary() SQL++ function', 'Semantic cache', 'Streaming (SSE)'],
    questions: [
      'How does the CSS box model work?',
      'What is the difference between let, const, and var?',
      'Explain the Fetch API and how to handle errors',
      'What are Web Workers used for?',
    ],
  },
  agent: {
    title: 'Multi-Agent',
    subtitle: 'LangGraph router → Math / RAG / FAQ / Direct agents, with memory and reasoning trace',
    color: '#7c3aed',
    icon: '🤖',
    what: 'A router LLM classifies each message into one of four routes and dispatches to the right agent. Every agent runs a ReAct (Reason + Act) loop, calling tools and reasoning until it has a confident answer. Conversation history is stored in Couchbase so agents remember prior turns. The full reasoning trace — routing decision, tool calls, tool results — is shown inline under each response.',
    how: [
      'Load conversation history from Couchbase KV (session memory)',
      'User message → LangGraph StateGraph entry point: router',
      'Router classifies: direct / math / rag / faq',
      'direct → LLM answers immediately, no agent',
      'math → ReAct agent with arithmetic tools (add, subtract, multiply, divide, evaluate_expression)',
      'rag → ReAct agent calls rag_search tool (ANN vector search on MDN docs)',
      'faq → vector search on faq_catalog to find matching collection → ReAct agent with hybrid_faq_search',
      'Store user + assistant messages in Couchbase',
      'Return answer + routing metadata + full trace_steps to UI',
    ],
    limitations: [
      'Router can misclassify ambiguous queries (e.g. "what is pi?" → direct vs. math)',
      'FAQ search requires pre-indexed collections in Couchbase',
      'RAG agent only covers MDN Web Docs — not general knowledge',
      'No semantic cache — every turn hits the LLM at least once',
      'ReAct loops add latency proportional to the number of tool calls',
    ],
    stack: [
      'LangGraph StateGraph',
      'OpenAI GPT (router + all agents)',
      'Couchbase ANN vector search (MDN docs)',
      'Couchbase hybrid search — vector + FTS (FAQ)',
      'Couchbase KV (conversation memory)',
      'Couchbase Agent Catalog (agentc) — observability',
      'ReAct agent pattern',
    ],
    questions: [
      'What is 1337 multiplied by 42?',
      'Calculate sqrt(144) + 10',
      'How does the CSS flexbox model work?',
      'What is the vacation policy?',
      'My name is Alex — what is my name? (tests memory)',
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
