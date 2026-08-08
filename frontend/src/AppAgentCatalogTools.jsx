import React, { useState, useEffect } from 'react'
import './AppAgentCatalogTools.css'

const AGENT_COLORS = {
  math_agent:       { bg: '#fff7ed', border: '#fed7aa', text: '#c2410c' },
  rag_agent:        { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8' },
  faq_search_agent: { bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d' },
}

function ToolCard({ tool, selected, onClick }) {
  const colors = AGENT_COLORS[tool.agent] || { bg: '#f8f9fa', border: '#dee2e6', text: '#495057' }
  return (
    <button
      className={`act-tool-card ${selected ? 'act-tool-card--selected' : ''}`}
      onClick={onClick}
      style={selected ? { borderColor: colors.border, background: colors.bg } : {}}
    >
      <div className="act-tool-card-header">
        <code className="act-tool-name">{tool.name}</code>
        <span className="act-tool-kind act-tool-kind--tool">tool</span>
      </div>
      <div className="act-tool-desc">{tool.description}</div>
      <div className="act-tool-agent" style={{ color: colors.text }}>
        {tool.agent}
      </div>
    </button>
  )
}

function PromptCard({ prompt, selected, onClick }) {
  return (
    <button
      className={`act-tool-card ${selected ? 'act-tool-card--selected act-tool-card--prompt' : ''}`}
      onClick={onClick}
    >
      <div className="act-tool-card-header">
        <code className="act-tool-name">{prompt.name}</code>
        <span className="act-tool-kind act-tool-kind--prompt">prompt</span>
      </div>
      <div className="act-tool-desc">{prompt.description}</div>
      <div className="act-tool-source">{prompt.source}</div>
    </button>
  )
}

function DetailPanel({ item, type }) {
  if (!item) return (
    <div className="act-detail-empty">
      Select a tool or prompt to see its schema and source details.
    </div>
  )

  if (type === 'tool') {
    return (
      <div className="act-detail">
        <div className="act-detail-title">
          <code>{item.name}</code>
          <span className="act-tool-kind act-tool-kind--tool">tool</span>
        </div>
        <p className="act-detail-desc">{item.description}</p>

        <div className="act-detail-section">Input schema</div>
        <div className="act-schema">
          {Object.entries(item.input_schema).map(([k, v]) => (
            <div key={k} className="act-schema-row">
              <code className="act-schema-key">{k}</code>
              <span className="act-schema-type">{v}</span>
            </div>
          ))}
        </div>

        <div className="act-detail-section">Output</div>
        <code className="act-schema-type act-schema-type--output">{item.output}</code>

        <div className="act-detail-section">Source</div>
        <code className="act-detail-source">{item.source}</code>

        <div className="act-detail-section">Used by agent</div>
        <span className="act-detail-agent">{item.agent}</span>

        <div className="act-detail-section">How it's discovered</div>
        <pre className="act-detail-code">{`# Agent loads this tool at runtime — no import needed
tools = catalog.find(
    name="${item.name}",
    kind="tool",
)
# Returns the decorated function with its schema`}</pre>
      </div>
    )
  }

  // prompt
  return (
    <div className="act-detail">
      <div className="act-detail-title">
        <code>{item.name}</code>
        <span className="act-tool-kind act-tool-kind--prompt">prompt</span>
      </div>
      <p className="act-detail-desc">{item.description}</p>

      <div className="act-detail-section">Bound tools</div>
      <div className="act-tool-chips">
        {item.tools.map(t => (
          <span key={t} className="act-tool-chip">{t}</span>
        ))}
      </div>

      <div className="act-detail-section">Source</div>
      <code className="act-detail-source">{item.source}</code>

      <div className="act-detail-section">How it's loaded</div>
      <pre className="act-detail-code">{`# ReActAgent loads prompt + tools from catalog
class ${item.name.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join('')}(agentc_langgraph.agent.ReActAgent):
    def __init__(self, catalog, span):
        super().__init__(
            chat_model=get_llm(),
            catalog=catalog,
            span=span,
            prompt_name="${item.name}",
            # tools bound automatically from YAML
        )`}</pre>
    </div>
  )
}

export default function AppAgentCatalogTools() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(null)
  const [selectedType, setSelectedType] = useState(null)
  const [filter, setFilter] = useState('all') // 'all' | 'tool' | 'prompt'

  useEffect(() => {
    fetch('/api/agent-catalog/tools')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  const tools   = data?.tools   || []
  const prompts = data?.prompts || []

  const filteredTools   = filter === 'prompt' ? [] : tools
  const filteredPrompts = filter === 'tool'   ? [] : prompts

  return (
    <div className="act-root">
      {/* Header */}
      <div className="act-header">
        <div className="act-header-left">
          <div className="act-header-title">Tool Discovery</div>
          {data && (
            <div className="act-header-stats">
              <span className="act-stat-chip">{data.total_tools} tools</span>
              <span className="act-stat-chip">{data.total_prompts} prompts</span>
              <span className={`act-stat-chip ${data.catalog_connected ? 'act-stat-chip--ok' : 'act-stat-chip--mock'}`}>
                {data.catalog_connected ? '● catalog connected' : '○ mock data'}
              </span>
            </div>
          )}
        </div>
        <div className="act-filter-tabs">
          {['all', 'tool', 'prompt'].map(f => (
            <button
              key={f}
              className={`act-filter-btn ${filter === f ? 'act-filter-btn--active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : f === 'tool' ? 'Tools' : 'Prompts'}
            </button>
          ))}
        </div>
      </div>

      <div className="act-body">
        {/* Left: catalog list */}
        <div className="act-list">
          {loading && <div className="act-loading">Loading catalog…</div>}
          {error && <div className="act-error">{error}</div>}

          {!loading && !error && (
            <>
              {filteredTools.length > 0 && (
                <>
                  <div className="act-list-section">Tools ({filteredTools.length})</div>
                  {filteredTools.map(t => (
                    <ToolCard
                      key={t.name}
                      tool={t}
                      selected={selected?.name === t.name && selectedType === 'tool'}
                      onClick={() => { setSelected(t); setSelectedType('tool') }}
                    />
                  ))}
                </>
              )}
              {filteredPrompts.length > 0 && (
                <>
                  <div className="act-list-section">Prompts ({filteredPrompts.length})</div>
                  {filteredPrompts.map(p => (
                    <PromptCard
                      key={p.name}
                      prompt={p}
                      selected={selected?.name === p.name && selectedType === 'prompt'}
                      onClick={() => { setSelected(p); setSelectedType('prompt') }}
                    />
                  ))}
                </>
              )}
            </>
          )}
        </div>

        {/* Right: detail */}
        <div className="act-detail-panel">
          <DetailPanel item={selected} type={selectedType} />
        </div>
      </div>
    </div>
  )
}
