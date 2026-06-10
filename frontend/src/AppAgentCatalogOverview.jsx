import React from 'react'
import './AppAgentCatalogOverview.css'

const CONCEPTS = [
  {
    icon: '🔧',
    title: 'Tools',
    desc: 'Python functions decorated with @agentc_tool. The catalog indexes their name, description, input schema, and source location. Agents discover tools at runtime via catalog.find() — no hardcoded imports.',
    code: `@agentc_tool
def rag_search(query: str) -> list[dict]:
    """Search MDN documentation for content
    relevant to the query."""
    embedding = get_embedding(query)
    return get_relevant_documents(embedding)`,
  },
  {
    icon: '📋',
    title: 'Prompts',
    desc: 'YAML manifests that bind a system prompt to a set of tools. Each agent node loads its prompt and tools from the catalog by name — swapping a prompt or adding a tool requires no code change.',
    code: `# agents/prompts/math_agent.yaml
record_kind: prompt
name: math_agent
description: Handles arithmetic requests.
content:
  agent_instructions: >
    Use tools to evaluate calculations.
    Never compute in your head.
tools:
  - name: add
  - name: subtract
  - name: multiply
  - name: divide
  - name: evaluate_expression`,
  },
  {
    icon: '🔍',
    title: 'Discovery',
    desc: 'catalog.find() returns tools or prompts matching a query at runtime. The ReActAgent uses this to bind tools to the LangGraph node — the agent graph never imports tool functions directly.',
    code: `# Agent node discovers its tools at runtime
class MathAgent(agentc_langgraph.agent.ReActAgent):
    def __init__(self, catalog, span):
        super().__init__(
            chat_model=get_llm(),
            catalog=catalog,
            span=span,
            prompt_name="math_agent",
            # tools loaded from catalog by prompt
        )`,
  },
  {
    icon: '📊',
    title: 'Activity Logging',
    desc: 'Every agent invocation is wrapped in an agentc Span. Tool calls, completions, route decisions, and intermediate thoughts are logged to Couchbase automatically — queryable as structured documents.',
    code: `# graph.py — wrap graph in agentc Span
class AgentGraph(agentc_langgraph.graph.GraphRunnable):
    async def acompile(self):
        # catalog + span injected into every node
        builder.add_node("math_agent",
            functools.partial(math_agent_node,
                catalog=self.catalog,
                span=self.span))`,
  },
]

const AGENTS = [
  {
    name: 'router',
    icon: '🔀',
    desc: 'Classifies every message and routes to the right agent. Uses structured LLM output to decide: direct answer, math, RAG, or FAQ search.',
    tools: [],
    prompt: null,
  },
  {
    name: 'math_agent',
    icon: '🔢',
    desc: 'Handles arithmetic and expression evaluation using a LangGraph ReAct loop.',
    tools: ['add', 'subtract', 'multiply', 'divide', 'evaluate_expression'],
    prompt: 'math_agent.yaml',
  },
  {
    name: 'rag_agent',
    icon: '🔍',
    desc: 'Answers web development questions by searching MDN documentation via vector similarity.',
    tools: ['rag_search'],
    prompt: 'rag_agent.yaml',
  },
  {
    name: 'faq_search_agent',
    icon: '📄',
    desc: 'Searches a specific FAQ collection using hybrid vector + FTS search.',
    tools: ['hybrid_faq_search'],
    prompt: 'faq_search_agent.yaml',
  },
]

const FLOW_STEPS = [
  { icon: '1', label: 'Index', desc: 'agentc index backend/agents/ — scans @agentc_tool decorators and YAML prompts, stores metadata in Couchbase' },
  { icon: '2', label: 'Publish', desc: 'agentc publish — makes the indexed version available to running agents' },
  { icon: '3', label: 'Discover', desc: 'catalog.find() at runtime — agents load tools and prompts by name, not by import' },
  { icon: '4', label: 'Execute', desc: 'ReActAgent runs the LangGraph loop — tool calls and completions logged to Span' },
  { icon: '5', label: 'Query', desc: 'Activity logs stored in Couchbase — queryable with SQL++ for debugging and auditing' },
]

export default function AppAgentCatalogOverview() {
  return (
    <div className="aco-root">

      {/* Hero */}
      <div className="aco-hero">
        <div className="aco-hero-text">
          <h1 className="aco-hero-title">Couchbase Agent Catalog</h1>
          <p className="aco-hero-lead">
            The Agent Catalog is a versioned registry for AI tools and agent prompts,
            stored in Couchbase. Agents discover their tools at runtime via{' '}
            <code>catalog.find()</code> — no hardcoded imports, no redeployment to
            swap a tool or update a prompt. Every invocation is logged as a structured
            document, queryable with SQL++.
          </p>
        </div>
        <div className="aco-hero-badge">
          <span className="aco-hero-badge-icon">🗄️</span>
          <span className="aco-hero-badge-text">agentc</span>
          <span className="aco-hero-badge-sub">stored in Couchbase</span>
        </div>
      </div>

      {/* Workflow */}
      <section className="aco-section">
        <h2 className="aco-section-title">Lifecycle</h2>
        <div className="aco-flow">
          {FLOW_STEPS.map((s, i) => (
            <React.Fragment key={i}>
              <div className="aco-flow-step">
                <div className="aco-flow-num">{s.icon}</div>
                <div className="aco-flow-label">{s.label}</div>
                <div className="aco-flow-desc">{s.desc}</div>
              </div>
              {i < FLOW_STEPS.length - 1 && <div className="aco-flow-arrow">→</div>}
            </React.Fragment>
          ))}
        </div>
      </section>

      {/* Core concepts */}
      <section className="aco-section">
        <h2 className="aco-section-title">Core concepts</h2>
        <div className="aco-concepts">
          {CONCEPTS.map((c, i) => (
            <div key={i} className="aco-concept">
              <div className="aco-concept-header">
                <span className="aco-concept-icon">{c.icon}</span>
                <span className="aco-concept-title">{c.title}</span>
              </div>
              <p className="aco-concept-desc">{c.desc}</p>
              <pre className="aco-concept-code">{c.code}</pre>
            </div>
          ))}
        </div>
      </section>

      {/* Agent graph */}
      <section className="aco-section">
        <h2 className="aco-section-title">Agents in this lab</h2>
        <div className="aco-agents">
          {AGENTS.map((a, i) => (
            <div key={i} className="aco-agent">
              <div className="aco-agent-header">
                <span className="aco-agent-icon">{a.icon}</span>
                <code className="aco-agent-name">{a.name}</code>
                {a.prompt && <span className="aco-agent-prompt">{a.prompt}</span>}
              </div>
              <p className="aco-agent-desc">{a.desc}</p>
              {a.tools.length > 0 && (
                <div className="aco-agent-tools">
                  {a.tools.map(t => <span key={t} className="aco-tool-chip">{t}</span>)}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* DIY vs Catalog */}
      <section className="aco-section aco-section--last">
        <h2 className="aco-section-title">Without vs with the Agent Catalog</h2>
        <div className="aco-compare">
          <div className="aco-compare-col aco-compare-col--diy">
            <div className="aco-compare-header">🐍 Without Agent Catalog</div>
            <ul className="aco-compare-list">
              <li>Tools imported directly — changing a tool requires a code change and redeploy</li>
              <li>Prompt strings hardcoded in agent files — updating a prompt requires a redeploy</li>
              <li>No versioning — impossible to roll back a tool or prompt change</li>
              <li>No activity log — debugging requires custom logging in every agent node</li>
              <li>Tool discovery is manual — adding a new agent means updating imports everywhere</li>
            </ul>
          </div>
          <div className="aco-compare-col aco-compare-col--catalog">
            <div className="aco-compare-header">🗄️ With Agent Catalog</div>
            <ul className="aco-compare-list">
              <li>Tools discovered at runtime via <code>catalog.find()</code> — swap without redeploy</li>
              <li>Prompts stored as YAML in Couchbase — update a prompt without touching code</li>
              <li>Full version history — roll back any tool or prompt to a previous version</li>
              <li>Every invocation logged automatically — query activity with SQL++</li>
              <li>New agents register their tools once — all other agents can discover them</li>
            </ul>
          </div>
        </div>
      </section>

    </div>
  )
}
