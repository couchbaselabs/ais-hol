import React, { useState } from 'react'
import { useInfoPanelQuestion } from './hooks/useInfoPanelQuestion'
import './AppAgentMemory.css'

const AM_COLOR = '#00A3E0'   // Couchbase teal
const AM_BG    = '#f0f9ff'
const AM_BORDER = '#bae6fd'

// ── Shared sub-components ────────────────────────────────────────────────────

function ArchDiagram() {
  const steps = [
    { icon: '🤖', label: 'Agent', desc: 'Runs a task, needs to recall past context' },
    { icon: '📡', label: 'SDK', desc: 'AgentMemoryClient — thin HTTP wrapper' },
    { icon: '🧠', label: 'Memory Server', desc: 'Couchbase Agent Memory API (agentmem)' },
    { icon: '🗄️', label: 'Couchbase', desc: 'Vector + KV storage for memory blocks' },
    { icon: '🔍', label: 'Search', desc: 'Semantic search returns ranked MemoryBlocks' },
  ]
  return (
    <div className="am-arch">
      {steps.map((s, i) => (
        <React.Fragment key={i}>
          <div className="am-arch-step">
            <div className="am-arch-icon">{s.icon}</div>
            <div className="am-arch-label">{s.label}</div>
            <div className="am-arch-desc">{s.desc}</div>
          </div>
          {i < steps.length - 1 && <div className="am-arch-arrow">→</div>}
        </React.Fragment>
      ))}
    </div>
  )
}

function ConceptGrid({ concepts }) {
  return (
    <div className="am-concepts">
      {concepts.map((c, i) => (
        <div key={i} className="am-concept-card">
          <div className="am-concept-icon">{c.icon}</div>
          <div>
            <div className="am-concept-title">{c.title}</div>
            <div className="am-concept-desc">{c.desc}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

function CodePane({ children }) {
  return <pre className="am-code">{children}</pre>
}

const DEMO_EXAMPLES = [
  'What is Couchbase Vector Search?',
  'How does semantic search work?',
  'What is a vector embedding?',
]

function LiveDemo() {
  const [input, setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState(null)
  const [error, setError]     = useState(null)

  useInfoPanelQuestion(setInput)

  async function run(q) {
    const question = q || input.trim()
    if (!question) return
    setLoading(true); setError(null); setResult(null)
    try {
      const res = await fetch('/api/agent-memory-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, user_id: 'hol_demo', session_id: 'hol_session' }),
      })
      if (!res.ok) throw new Error(await res.text())
      setResult(await res.json())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="am-right" style={{ position: 'sticky', top: 0 }}>
      <div className="am-demo-header" style={{ background: AM_COLOR }}>🧠 Live demo</div>
      <div className="am-demo-body">
        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem' }}>
          <input
            style={{ flex: 1, padding: '0.4rem 0.6rem', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: '0.82rem', outline: 'none' }}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && run()}
            placeholder="Ask a question…"
          />
          <button
            style={{ background: AM_COLOR, color: '#fff', border: 'none', borderRadius: 6, padding: '0.4rem 0.8rem', fontSize: '0.82rem', cursor: 'pointer', fontWeight: 600 }}
            onClick={() => run()}
            disabled={loading || !input.trim()}
          >{loading ? '…' : 'Ask'}</button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '0.75rem' }}>
          {DEMO_EXAMPLES.map((ex, i) => (
            <button key={i}
              style={{ fontSize: '0.7rem', background: '#f0f9ff', color: AM_COLOR, border: `1px solid ${AM_BORDER}`, borderRadius: 6, padding: '0.2rem 0.5rem', cursor: 'pointer' }}
              onClick={() => { setInput(ex); run(ex) }}
            >{ex}</button>
          ))}
        </div>

        {loading && <div style={{ fontSize: '0.8rem', color: '#64748b', textAlign: 'center', padding: '1rem' }}>Searching memory + RAG…</div>}
        {error   && <div style={{ fontSize: '0.8rem', color: '#dc2626', background: '#fef2f2', borderRadius: 6, padding: '0.5rem 0.75rem' }}>{error}</div>}

        {result && (
          <div>
            {!result.live && (
              <div style={{ fontSize: '0.7rem', background: '#fef9c3', color: '#854d0e', borderRadius: 6, padding: '0.35rem 0.6rem', marginBottom: '0.5rem' }}>
                ⚠️ Mock mode — set <code>AGENTMEMORY_BASE_URL</code> for live memory
              </div>
            )}
            {result.memory_blocks?.length > 0 && (
              <div style={{ marginBottom: '0.6rem' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginBottom: '0.3rem' }}>
                  RETRIEVED MEMORY ({result.memory_count} blocks)
                </div>
                {result.memory_blocks.map((b, i) => (
                  <div key={i} className="am-search-result">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.15rem' }}>
                      <span className={`am-block-badge am-block-badge--${b.type}`}>{b.type}</span>
                      {b.rel_score != null && <span style={{ fontSize: '0.68rem', color: AM_COLOR, fontWeight: 700 }}>{b.rel_score.toFixed(2)}</span>}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#334155' }}>{b.content}</div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ background: '#f0f9ff', border: `1px solid ${AM_BORDER}`, borderRadius: 8, padding: '0.65rem 0.75rem' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: AM_COLOR, marginBottom: '0.3rem' }}>ANSWER</div>
              <div style={{ fontSize: '0.82rem', color: '#1e293b', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{result.answer}</div>
            </div>
            {result.sources?.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.4rem' }}>
                {result.sources.map((s, i) => (
                  <span key={i} style={{ fontSize: '0.65rem', background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 4, padding: '0.1rem 0.4rem', fontFamily: 'monospace' }}>
                    {s.filepath?.split('/').pop() || s.id}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
        {!result && !loading && !error && (
          <div style={{ fontSize: '0.78rem', color: '#94a3b8', textAlign: 'center', padding: '1.5rem 0' }}>
            Ask a question to see memory retrieval + RAG in action
          </div>
        )}
      </div>
    </div>
  )
}

function FlowSteps({ steps }) {
  return (
    <div className="am-flow">
      {steps.map(([n, d], i) => (
        <div key={i} className="am-flow-step">
          <span className="am-flow-num">{i + 1}</span>
          <div><strong>{n}</strong> — {d}</div>
        </div>
      ))}
    </div>
  )
}

// ── Tab: Overview ────────────────────────────────────────────────────────────

function OverviewTab() {
  const concepts = [
    { icon: '🧠', title: 'Memory Blocks', desc: 'The atomic unit of memory. Each block holds either a ChatMessage (user + assistant turn) or a Fact (extracted string). Blocks are embedded and stored in Couchbase.' },
    { icon: '👤', title: 'Users & Sessions', desc: 'Memory is scoped to a user → session hierarchy. A user can have many sessions. Search defaults to the current session but can span all sessions.' },
    { icon: '🔍', title: 'Semantic Search', desc: 'search_memory() embeds the query and runs vector search over memory blocks. Returns ranked MemoryBlock objects with rel_score.' },
    { icon: '📋', title: 'Facts vs Messages', desc: 'Facts are extracted strings ("User prefers dark roast"). Messages are raw conversation turns. Both are searchable. Facts are more token-efficient for long-term memory.' },
    { icon: '⚡', title: 'Async Processing', desc: 'add_memory() accepts async_processing=True to queue blocks for background embedding. Use async_processing=False when you need blocks immediately searchable.' },
    { icon: '🔑', title: 'Annotations & TTL', desc: 'Tag blocks with arbitrary key-value annotations for filtered retrieval. Set blocks_ttl on a session to auto-expire memory after N seconds.' },
  ]

  return (
    <div className="am-root">
      <div className="am-hero" style={{ background: AM_BG, borderColor: AM_BORDER }}>
        <div className="am-hero-icon">🧠</div>
        <div>
          <h1 className="am-hero-title" style={{ color: AM_COLOR }}>Couchbase Agent Memory SDK</h1>
          <p className="am-hero-sub">A persistent, searchable memory layer for AI agents — backed by Couchbase vector search</p>
        </div>
      </div>

      <section className="am-section">
        <h2 className="am-section-title" style={{ color: AM_COLOR }}>How it fits together</h2>
        <ArchDiagram />
      </section>

      <section className="am-section">
        <h2 className="am-section-title" style={{ color: AM_COLOR }}>Key concepts</h2>
        <ConceptGrid concepts={concepts} />
      </section>

      <section className="am-section">
        <h2 className="am-section-title" style={{ color: AM_COLOR }}>What you'll build</h2>
        <div className="am-build-list">
          {[
            ['Persistent session memory', 'Store every conversation turn as a MemoryBlock so agents can recall past interactions across restarts'],
            ['Fact extraction', 'Distil long conversations into compact facts that survive session boundaries and are cheaper to retrieve'],
            ['Cross-session search', 'Query all memory blocks for a user — not just the current session — to build agents with long-term recall'],
          ].map(([title, desc], i) => (
            <div key={i} className="am-build-item">
              <span className="am-build-num" style={{ background: AM_COLOR }}>{i + 1}</span>
              <div><strong>{title}</strong> — {desc}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

// ── Tab: Sessions & Memory ───────────────────────────────────────────────────

function SessionsTab() {
  return (
    <div className="am-root">
      <div className="am-split">
        <div className="am-left">
          <h2 style={{ color: AM_COLOR }}>Users, Sessions & Memory Blocks</h2>
          <p>The SDK uses a resource hierarchy: <strong>Client → User → Session → MemoryBlock</strong>. Each level returns a resource object you can chain further operations on.</p>

          <FlowSteps steps={[
            ['Create user', 'client.create_user(user_id, name) — idempotent, returns UserResource'],
            ['Create session', 'user.create_session(session_id) — scopes all memory to this session'],
            ['Add memory', 'session.add_memory(messages=[…]) or session.add_memory(facts=[…])'],
            ['End session', 'session.end() — marks end_time, memory blocks remain searchable'],
          ]} />

          <h3 style={{ color: AM_COLOR, marginTop: '1.5rem' }}>Adding messages</h3>
          <CodePane>{`from agentmemory import AgentMemoryClient, ChatMessage

with AgentMemoryClient(base_url="http://localhost:8080") as client:
    user    = client.create_user("user_42", "Alice")
    session = user.create_session("session_001")

    # Store a conversation turn
    session.add_memory(
        messages=[ChatMessage(
            user_content="What is vector search?",
            assistant_content="Vector search finds semantically similar "
                              "documents using embedding distance.",
        )],
        async_processing=False,  # block until indexed
    )

    # Store extracted facts (more token-efficient)
    session.add_memory(
        facts=["User is learning about vector databases",
               "User prefers concise technical explanations"],
        annotations={"source": "preference_extraction"},
    )`}</CodePane>

          <h3 style={{ color: AM_COLOR, marginTop: '1.5rem' }}>Listing & updating</h3>
          <CodePane>{`# List all memory blocks in a session (paginated)
memories = session.list_memories(limit=50, order_by="created_at")
print(f"{memories.count} of {memories.total} blocks")

# Update a block (e.g. correct an extracted fact)
session.update_memory(
    block_id=memories.memory_blocks[0].block_id,
    fact="User is an expert in vector databases",
)

# Delete specific blocks
session.delete_memory(block_ids=[block_id])`}</CodePane>
        </div>

        <div className="am-right">
          <div className="am-demo-header" style={{ background: AM_COLOR }}>
            🧠 Memory block anatomy
          </div>
          <div className="am-demo-body">
            <div className="am-block-card">
              <div className="am-block-badge am-block-badge--message">message</div>
              <div className="am-block-field"><span>user</span> What is vector search?</div>
              <div className="am-block-field"><span>assistant</span> Vector search finds semantically similar documents…</div>
              <div className="am-block-meta">session_001 · ready · rel_score: 0.94</div>
            </div>
            <div className="am-block-card" style={{ marginTop: '0.75rem' }}>
              <div className="am-block-badge am-block-badge--fact">fact</div>
              <div className="am-block-field"><span>fact</span> User is learning about vector databases</div>
              <div className="am-block-meta">session_001 · ready · annotations: source=preference_extraction</div>
            </div>
            <div className="am-block-card" style={{ marginTop: '0.75rem' }}>
              <div className="am-block-badge am-block-badge--fact">fact</div>
              <div className="am-block-field"><span>fact</span> User prefers concise technical explanations</div>
              <div className="am-block-meta">session_001 · ready · annotations: source=preference_extraction</div>
            </div>
            <div style={{ marginTop: '1rem', fontSize: '0.78rem', color: '#64748b', lineHeight: 1.6 }}>
              <strong>MemoryBlock fields</strong>
              <ul style={{ margin: '0.4rem 0 0 1rem', padding: 0 }}>
                <li><code>block_id</code> — unique identifier</li>
                <li><code>message</code> — ChatMessage (user + assistant)</li>
                <li><code>fact</code> — extracted string</li>
                <li><code>status</code> — processing | ready | extraction_failed</li>
                <li><code>rel_score</code> — relevance score from search</li>
                <li><code>annotations</code> — arbitrary key-value tags</li>
                <li><code>contexts</code> — important context strings extracted by LLM</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Tab: Search ──────────────────────────────────────────────────────────────

function SearchTab() {
  return (
    <div className="am-root">
      <div className="am-split">
        <div className="am-left">
          <h2 style={{ color: AM_COLOR }}>Semantic Memory Search</h2>
          <p><code>search_memory()</code> embeds the query and runs vector search over all memory blocks in scope. By default it searches only the current session — pass <code>filters={`{"session_ids": "all"}`}</code> to search across every session for the user.</p>

          <FlowSteps steps={[
            ['Embed query', 'Memory server embeds the query string using the configured embedding model'],
            ['Vector search', 'Couchbase FTS vector index finds nearest memory blocks by cosine similarity'],
            ['Filter', 'Optional filters: session_ids, time range, annotations, block_ids'],
            ['Return', 'Ranked MemoryBlock list with rel_score — inject into LLM prompt'],
          ]} />

          <h3 style={{ color: AM_COLOR, marginTop: '1.5rem' }}>Current session search</h3>
          <CodePane>{`# Default: search only the current session
results = session.search_memory(
    query="What does the user know about databases?",
    filters={"relevant_k": 5},
)
for block in results.memory_blocks:
    if block.fact:
        print(f"[{block.rel_score:.2f}] {block.fact}")
    elif block.message:
        print(f"[{block.rel_score:.2f}] {block.message.user_content}")`}</CodePane>

          <h3 style={{ color: AM_COLOR, marginTop: '1.5rem' }}>Cross-session search</h3>
          <CodePane>{`# Search ALL sessions for this user
results = session.search_memory(
    query="user preferences and past decisions",
    filters={
        "session_ids": "all",   # span all sessions
        "relevant_k": 10,
        "annotations": {"source": "preference_extraction"},
    },
)
print(f"Found {results.count} blocks across all sessions")`}</CodePane>

          <h3 style={{ color: AM_COLOR, marginTop: '1.5rem' }}>Inject into LLM prompt</h3>
          <CodePane>{`async def answer_with_memory(user_id, session_id, question):
    session = client.get_user(user_id).get_session(session_id)

    # Retrieve relevant memory
    mem = session.search_memory(
        query=question,
        filters={"session_ids": "all", "relevant_k": 5},
    )
    memory_context = "\\n".join(
        block.fact or block.message.user_content
        for block in mem.memory_blocks
    )

    # Inject into system prompt
    system = (
        "You are a helpful assistant.\\n\\n"
        f"Relevant memory about this user:\\n{memory_context}"
    )
    response = await llm.chat(system=system, user=question)

    # Store the new turn
    session.add_memory(messages=[ChatMessage(
        user_content=question,
        assistant_content=response,
    )])
    return response`}</CodePane>
        </div>

        <LiveDemo />
      </div>
    </div>
  )
}

// ── Tab: Integration ─────────────────────────────────────────────────────────

function IntegrationTab() {
  const [activeStep, setActiveStep] = useState(0)

  const steps = [
    {
      icon: '🚀', title: 'Install & connect',
      content: (
        <div>
          <p>Install the SDK from source and connect to a running Agent Memory server:</p>
          <CodePane>{`# Install from the local SDK directory
pip install -e agentmemory/agentmemory-sdk-main

# Or from GitHub
pip install git+https://github.com/couchbaselabs/agentmem-sdk.git`}</CodePane>
          <CodePane>{`from agentmemory import AgentMemoryClient

# Sync client (use as context manager or call .close())
client = AgentMemoryClient(
    base_url="http://localhost:8080",
    timeout=30.0,
    verify=False,   # set True + path for production TLS
)

# Async client for FastAPI / async agents
from agentmemory import AsyncAgentMemoryClient

async with AsyncAgentMemoryClient(
    base_url="http://localhost:8080"
) as client:
    health = await client.health_ping()
    print(health.overall_status.value)  # "healthy"`}</CodePane>
        </div>
      ),
    },
    {
      icon: '🔧', title: 'Add to a FastAPI agent',
      content: (
        <div>
          <p>Wrap your existing RAG endpoint to persist and retrieve memory per user:</p>
          <CodePane>{`from agentmemory import AsyncAgentMemoryClient, ChatMessage
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()
mem_client = AsyncAgentMemoryClient(base_url="http://localhost:8080")

class AgentRequest(BaseModel):
    user_id: str
    session_id: str
    question: str

@app.post("/api/agent-chat")
async def agent_chat(req: AgentRequest):
    user    = await mem_client.create_user(req.user_id, req.user_id)
    session = await user.create_session(req.session_id)

    # 1. Retrieve relevant past memory
    mem = await session.search_memory(
        query=req.question,
        filters={"session_ids": "all", "relevant_k": 5},
    )
    memory_ctx = "\\n".join(
        b.fact or b.message.user_content
        for b in mem.memory_blocks
    )

    # 2. RAG + LLM with memory context
    docs    = await vector_search(req.question)
    answer  = await llm_with_context(req.question, docs, memory_ctx)

    # 3. Persist the new turn
    await session.add_memory(messages=[ChatMessage(
        user_content=req.question,
        assistant_content=answer,
    )])
    return {"answer": answer}`}</CodePane>
        </div>
      ),
    },
    {
      icon: '🌍', title: 'Environment variables',
      content: (
        <div>
          <p>The Agent Memory server needs its own Couchbase connection and model config:</p>
          <CodePane>{`# Agent Memory server config (agentmem)
COUCHBASE_CONNECTION_STRING=couchbases://your-cluster
COUCHBASE_USERNAME=Administrator
COUCHBASE_PASSWORD=...
COUCHBASE_BUCKET=agent_memory

# Embedding model (used by the server for indexing + search)
EMBEDDING_MODEL=text-embedding-3-small
OPENAI_API_KEY=sk-...

# LLM for fact extraction
LLM_MODEL=gpt-4o-mini
LLM_API_KEY=sk-...

# SDK — just needs the server URL
AGENTMEMORY_BASE_URL=http://localhost:8080

# Optional: JWT token if OIDC is enabled on the server
AGENTMEMORY_JWT_TOKEN=eyJ...`}</CodePane>
        </div>
      ),
    },
    {
      icon: '⚡', title: 'Async & error handling',
      content: (
        <div>
          <p>Use the async client in async contexts. Handle <code>NotFoundError</code> and <code>ConflictError</code> for idempotent user/session creation:</p>
          <CodePane>{`from agentmemory import (
    AsyncAgentMemoryClient,
    NotFoundError,
    ConflictError,
)

async def get_or_create_session(client, user_id, session_id):
    """Idempotent: create user+session or reuse existing."""
    try:
        user = await client.create_user(user_id, user_id)
    except ConflictError:
        user = await client.get_user(user_id)

    try:
        session = await user.create_session(session_id)
    except ConflictError:
        session = await user.get_session(session_id)

    return session

# Disable SDK logging in production
from agentmemory import disable_logging
disable_logging()`}</CodePane>
          <p style={{ marginTop: '0.75rem', fontSize: '0.82rem', color: '#64748b' }}>
            ⚠️ The Agent Memory server must be running and reachable before the SDK can be used. See the <a href="https://github.com/couchbaselabs/agentmem" target="_blank" rel="noopener noreferrer" style={{ color: AM_COLOR }}>agentmem server repo</a> for setup instructions.
          </p>
        </div>
      ),
    },
  ]

  return (
    <div className="am-root">
      <h2 style={{ color: AM_COLOR, marginBottom: '0.25rem' }}>Integrating the SDK</h2>
      <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.88rem' }}>
        Install, connect, and wire Agent Memory into a FastAPI agent in four steps.
      </p>
      <div className="am-deploy-split">
        <div className="am-deploy-nav">
          {steps.map((s, i) => (
            <button
              key={i}
              className={`am-deploy-btn${activeStep === i ? ' am-deploy-btn--active' : ''}`}
              style={activeStep === i ? { borderColor: AM_COLOR, background: AM_BG } : {}}
              onClick={() => setActiveStep(i)}
            >
              <span className="am-deploy-num" style={{ background: AM_COLOR }}>{i + 1}</span>
              <span className="am-deploy-icon">{s.icon}</span>
              <span className="am-deploy-label">{s.title}</span>
            </button>
          ))}
        </div>
        <div className="am-deploy-content">
          <div className="am-deploy-step-header">
            <span>{steps[activeStep].icon}</span>
            <h3>{steps[activeStep].title}</h3>
          </div>
          <div>{steps[activeStep].content}</div>
          <div className="am-deploy-nav-btns">
            {activeStep > 0 && (
              <button className="am-deploy-prev" onClick={() => setActiveStep(i => i - 1)}>← Previous</button>
            )}
            {activeStep < steps.length - 1 && (
              <button className="am-deploy-next" style={{ background: AM_COLOR }} onClick={() => setActiveStep(i => i + 1)}>Next →</button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Tab: Comparison ──────────────────────────────────────────────────────────

const SCRATCH_STORE = `# conversation_service.py  (already in this repo)
import threading, time
from datetime import datetime, timezone, timedelta
from couchbase.cluster import Cluster
from couchbase.options import ClusterOptions, QueryOptions
from couchbase.auth import PasswordAuthenticator

_cluster = None
_cluster_lock = threading.Lock()
_last_connect_attempt = 0.0
_RECONNECT_COOLDOWN = 30.0

def _get_cluster():
    global _cluster, _last_connect_attempt
    with _cluster_lock:
        if _cluster is not None:
            try: _cluster.ping(); return _cluster
            except Exception: _cluster = None
        now = time.monotonic()
        if now - _last_connect_attempt < _RECONNECT_COOLDOWN:
            raise RuntimeError("Couchbase unavailable.")
        _last_connect_attempt = now
        conn_str = os.environ["COUCHBASE_CONNECTION_STRING"]
        auth = PasswordAuthenticator(
            os.environ["COUCHBASE_USERNAME"],
            os.environ["COUCHBASE_PASSWORD"])
        cluster = Cluster(conn_str, ClusterOptions(auth))
        cluster.wait_until_ready(timeout=timedelta(seconds=15))
        _cluster = cluster
        return _cluster

async def add_message(session_id, content, role):
    cluster = _get_cluster()
    collection = (cluster.bucket(BUCKET)
                         .scope(SCOPE)
                         .collection(COLLECTION))
    doc = {
        "session_id": session_id,
        "role": role,
        "content": content,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "type": "chat_message",
    }
    key = f"{session_id}_{int(datetime.now().timestamp()*1000)}_{role}"
    collection.insert(key, doc)

async def get_conversation_history(session_id, limit=10):
    cluster = _get_cluster()
    sql = f"""
        SELECT role, content, timestamp
        FROM \`{BUCKET}\`.\`{SCOPE}\`.\`{COLLECTION}\`
        WHERE session_id = $session_id
          AND type = "chat_message"
        ORDER BY timestamp DESC LIMIT 20
    """
    rows = list(cluster.query(
        sql, QueryOptions(named_parameters={"session_id": session_id})
    ).rows())
    rows.reverse()
    return rows

# Usage in endpoint:
history = await get_conversation_history(session_id)
formatted = "\\n".join(
    f"{'User' if m['role']=='user' else 'Assistant'}: {m['content']}"
    for m in history
)
# ... build prompt with formatted history ...
await add_message(session_id, question, "user")
await add_message(session_id, answer, "assistant")`

const SDK_STORE = `from agentmemory import AsyncAgentMemoryClient, ChatMessage

client = AsyncAgentMemoryClient(base_url=AGENTMEMORY_URL)

# Usage in endpoint:
user    = await client.create_user(user_id, user_id)
session = await user.create_session(session_id)

# Retrieve relevant memory (semantic, not just last N turns)
mem = await session.search_memory(
    query=question,
    filters={"session_ids": "all", "relevant_k": 5},
)
memory_ctx = "\\n".join(
    b.fact or b.message.user_content
    for b in mem.memory_blocks
)
# ... build prompt with memory_ctx ...

# Persist the new turn
await session.add_memory(messages=[ChatMessage(
    user_content=question,
    assistant_content=answer,
)])`

const SCRATCH_SEARCH = `# No semantic search — only chronological retrieval.
# To find relevant past turns you must:
# 1. Fetch ALL history (expensive for long sessions)
# 2. Embed each turn yourself
# 3. Run your own vector search query
# 4. Manage the vector index schema manually

# What this codebase actually does:
history = await get_conversation_history(session_id, limit=10)
# → last 10 turns, regardless of relevance
# → no cross-session recall
# → no fact extraction`

const SDK_SEARCH = `# Semantic search built-in — server handles embedding + indexing
results = await session.search_memory(
    query="What does the user prefer?",
    filters={
        "session_ids": "all",   # cross-session recall
        "relevant_k": 5,
        "annotations": {"source": "preferences"},
    },
)
# → ranked by cosine similarity (rel_score)
# → spans all sessions for the user
# → facts and messages searchable together
# → no index management needed`

const ROWS = [
  {
    aspect: 'Connection setup',
    scratch: '~40 lines: cluster connect, ping, reconnect cooldown, lock, env vars',
    sdk: '1 line: AsyncAgentMemoryClient(base_url=…)',
    winner: 'sdk',
  },
  {
    aspect: 'Store a turn',
    scratch: 'Manual key generation, doc schema, collection.insert()',
    sdk: 'session.add_memory(messages=[ChatMessage(…)])',
    winner: 'sdk',
  },
  {
    aspect: 'Retrieve history',
    scratch: 'SQL++ query, ORDER BY timestamp, reverse rows, format manually',
    sdk: 'session.search_memory(query=…) — semantic, ranked, cross-session',
    winner: 'sdk',
  },
  {
    aspect: 'Semantic relevance',
    scratch: 'Not supported — last N turns only, no embedding or ranking',
    sdk: 'Built-in: server embeds query, returns blocks by cosine similarity',
    winner: 'sdk',
  },
  {
    aspect: 'Cross-session recall',
    scratch: 'Not supported — session_id is a hard filter in the SQL++ query',
    sdk: 'filters={"session_ids": "all"} — one argument',
    winner: 'sdk',
  },
  {
    aspect: 'Fact extraction',
    scratch: 'Not supported — raw messages only',
    sdk: 'session.add_memory(facts=[…]) — compact, token-efficient long-term memory',
    winner: 'sdk',
  },
  {
    aspect: 'TTL / expiry',
    scratch: 'Not implemented — documents accumulate indefinitely',
    sdk: 'blocks_ttl on session creation — auto-expiry built in',
    winner: 'sdk',
  },
  {
    aspect: 'Error handling',
    scratch: 'Manual try/except around every Couchbase call, reconnect logic',
    sdk: 'SDK raises typed exceptions (NotFoundError, ConflictError)',
    winner: 'sdk',
  },
  {
    aspect: 'Lines of code (store + retrieve)',
    scratch: '~80 lines across conversation_service.py',
    sdk: '~10 lines',
    winner: 'sdk',
  },
  {
    aspect: 'Control / customisation',
    scratch: 'Full — own schema, own index, own query logic',
    sdk: 'Limited to SDK API surface; server config controls embedding model',
    winner: 'scratch',
  },
  {
    aspect: 'Dependency',
    scratch: 'Only couchbase-python-client — already a project dependency',
    sdk: 'Requires a running agentmem server (separate process)',
    winner: 'scratch',
  },
]

function ComparisonTab() {
  const [view, setView] = useState('table') // 'table' | 'code-store' | 'code-search'

  return (
    <div className="am-root">
      <div className="am-hero" style={{ background: AM_BG, borderColor: AM_BORDER }}>
        <div className="am-hero-icon">⚖️</div>
        <div>
          <h1 className="am-hero-title" style={{ color: AM_COLOR }}>From Scratch vs Agent Memory SDK</h1>
          <p className="am-hero-sub">Both approaches use Couchbase. The SDK trades flexibility for dramatically less boilerplate — and adds semantic search that the manual approach doesn't have at all.</p>
        </div>
      </div>

      {/* View toggle */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        {[
          { id: 'table',       label: '📊 Feature comparison' },
          { id: 'code-store',  label: '💾 Store a turn' },
          { id: 'code-search', label: '🔍 Retrieve memory' },
        ].map(v => (
          <button key={v.id}
            onClick={() => setView(v.id)}
            style={{
              padding: '0.35rem 0.85rem',
              borderRadius: 6,
              border: `1px solid ${view === v.id ? AM_COLOR : '#e2e8f0'}`,
              background: view === v.id ? AM_BG : '#fff',
              color: view === v.id ? AM_COLOR : '#475569',
              fontWeight: view === v.id ? 700 : 400,
              fontSize: '0.8rem',
              cursor: 'pointer',
            }}
          >{v.label}</button>
        ))}
      </div>

      {/* Table view */}
      {view === 'table' && (
        <div style={{ overflowX: 'auto' }}>
          <table className="am-compare-table">
            <thead>
              <tr>
                <th>Aspect</th>
                <th>From scratch (this repo)</th>
                <th>Agent Memory SDK</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r, i) => (
                <tr key={i}>
                  <td className="am-compare-aspect">{r.aspect}</td>
                  <td className={r.winner === 'scratch' ? 'am-compare-win' : 'am-compare-lose'}>
                    {r.winner === 'scratch' && <span className="am-compare-badge am-compare-badge--win">✓</span>}
                    {r.scratch}
                  </td>
                  <td className={r.winner === 'sdk' ? 'am-compare-win' : 'am-compare-lose'}>
                    {r.winner === 'sdk' && <span className="am-compare-badge am-compare-badge--win">✓</span>}
                    {r.sdk}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.75rem' }}>
            ✓ = better choice for that aspect. The SDK wins on speed and capability; scratch wins when you need full control or can't run a separate server.
          </p>
        </div>
      )}

      {/* Code: store a turn */}
      {view === 'code-store' && (
        <div className="am-compare-code-split">
          <div>
            <div className="am-compare-code-header am-compare-code-header--scratch">
              🔧 From scratch — conversation_service.py
              <span className="am-compare-loc">~80 lines</span>
            </div>
            <CodePane>{SCRATCH_STORE}</CodePane>
          </div>
          <div>
            <div className="am-compare-code-header am-compare-code-header--sdk">
              ⚡ Agent Memory SDK
              <span className="am-compare-loc">~10 lines</span>
            </div>
            <CodePane>{SDK_STORE}</CodePane>
            <div className="am-compare-callout">
              The SDK handles connection pooling, reconnect logic, key generation, document schema, and collection routing internally.
            </div>
          </div>
        </div>
      )}

      {/* Code: retrieve memory */}
      {view === 'code-search' && (
        <div className="am-compare-code-split">
          <div>
            <div className="am-compare-code-header am-compare-code-header--scratch">
              🔧 From scratch — chronological only
            </div>
            <CodePane>{SCRATCH_SEARCH}</CodePane>
            <div className="am-compare-callout am-compare-callout--warn">
              The manual approach retrieves the last N turns by timestamp. There is no semantic ranking, no cross-session recall, and no fact extraction — adding those would require building a separate vector pipeline.
            </div>
          </div>
          <div>
            <div className="am-compare-code-header am-compare-code-header--sdk">
              ⚡ Agent Memory SDK — semantic search
            </div>
            <CodePane>{SDK_SEARCH}</CodePane>
            <div className="am-compare-callout">
              The server embeds the query, runs vector search over all memory blocks, and returns results ranked by cosine similarity — across sessions, with annotation filters, in one call.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Shell exports ────────────────────────────────────────────────────────────

export function AppAgentMemoryOverview()    { return <OverviewTab /> }
export function AppAgentMemorySessions()    { return <SessionsTab /> }
export function AppAgentMemorySearch()      { return <SearchTab /> }
export function AppAgentMemoryIntegration() { return <IntegrationTab /> }
export function AppAgentMemoryComparison()  { return <ComparisonTab /> }
