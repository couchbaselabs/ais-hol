import React, { useState, useCallback, useEffect, useRef } from 'react'
import './App.css'
import './AppTokens.css'

/**
 * Token Counter tab — live tokenisation with tiktoken via the backend.
 *
 * Shows:
 * - Each token highlighted in the original text (colour-coded by position)
 * - Token ID, decoded text, and raw bytes per token
 * - Stats: token count, char count, chars/token ratio
 * - Context window usage bar for the selected model
 * - Estimated input cost in USD
 */

const MODELS = [
  'gpt-4o-mini',
  'gpt-4o',
  'gpt-4-turbo',
  'gpt-4',
  'gpt-3.5-turbo',
  'text-embedding-3-small',
  'text-embedding-3-large',
  'text-embedding-ada-002',
]

// 12 distinct pastel colours for token highlighting
const TOKEN_COLORS = [
  '#fde68a', '#a7f3d0', '#bfdbfe', '#fca5a5', '#ddd6fe',
  '#fed7aa', '#99f6e4', '#e9d5ff', '#fbcfe8', '#d1fae5',
  '#fef08a', '#bae6fd',
]

const EXAMPLES = [
  { label: 'Short sentence', text: 'The quick brown fox jumps over the lazy dog.' },
  { label: 'Code snippet',   text: 'async function fetchData(url) {\n  const res = await fetch(url);\n  return res.json();\n}' },
  { label: 'Mixed languages', text: 'Hello! Bonjour! こんにちは! مرحبا! 你好!' },
  { label: 'Numbers & symbols', text: 'Price: $1,234.56 — discount: 15% — total: $1,049.38' },
]

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

function StatChip({ label, value, highlight }) {
  return (
    <div className={`stat-chip-box ${highlight ? 'stat-chip-box--highlight' : ''}`}>
      <span className="stat-chip-value">{value}</span>
      <span className="stat-chip-label">{label}</span>
    </div>
  )
}

function ContextBar({ used, total }) {
  if (!total) return null
  const pct = Math.min(100, (used / total) * 100)
  const color = pct > 90 ? '#ef4444' : pct > 70 ? '#f59e0b' : '#6366f1'
  return (
    <div className="context-bar-wrap">
      <span className="context-bar-label">Context window</span>
      <div className="context-bar-track">
        <div className="context-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="context-bar-pct" style={{ color }}>
        {used.toLocaleString()} / {total.toLocaleString()} ({pct.toFixed(1)}%)
      </span>
    </div>
  )
}

function HighlightedText({ text, tokens }) {
  if (!tokens || tokens.length === 0) {
    return <span className="highlighted-text-plain">{text}</span>
  }

  // Reconstruct spans: each token maps to a slice of the original text
  // We join token texts to rebuild the string, then map positions
  const spans = tokens.map((tok, i) => ({
    text: tok.text,
    color: TOKEN_COLORS[i % TOKEN_COLORS.length],
    id: tok.id,
    index: i,
  }))

  return (
    <div className="highlighted-text">
      {spans.map((span, i) => (
        <span
          key={i}
          className="token-highlight"
          style={{ background: span.color }}
          title={`Token #${span.index + 1} · ID ${span.id}`}
        >
          {span.text}
        </span>
      ))}
    </div>
  )
}

function TokenTable({ tokens }) {
  const [showAll, setShowAll] = useState(false)
  const visible = showAll ? tokens : tokens.slice(0, 50)

  return (
    <div className="token-table-wrap">
      <table className="token-table">
        <thead>
          <tr>
            <th>#</th>
            <th>ID</th>
            <th>Text</th>
            <th>Bytes</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((tok, i) => (
            <tr key={i}>
              <td className="tok-num">{i + 1}</td>
              <td className="tok-id">{tok.id}</td>
              <td>
                <span
                  className="tok-text"
                  style={{ background: TOKEN_COLORS[i % TOKEN_COLORS.length] }}
                >
                  {tok.text === '\n' ? '↵' : tok.text === ' ' ? '·' : tok.text}
                </span>
              </td>
              <td className="tok-bytes">[{tok.bytes.join(', ')}]</td>
            </tr>
          ))}
        </tbody>
      </table>
      {tokens.length > 50 && (
        <button className="show-all-btn" onClick={() => setShowAll(v => !v)}>
          {showAll ? `Show fewer` : `Show all ${tokens.length} tokens`}
        </button>
      )}
    </div>
  )
}

export default function AppTokens() {
  const [text, setText] = useState('Hello, world! This is a tokenisation demo.')
  const [model, setModel] = useState('gpt-4o-mini')
  const [result, setResult] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const abortRef = useRef(null)

  const debouncedText = useDebounce(text, 300)
  const debouncedModel = useDebounce(model, 100)

  const tokenise = useCallback(async (t, m) => {
    if (!t.trim()) { setResult(null); return }
    if (abortRef.current) abortRef.current.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setIsLoading(true)
    try {
      const response = await fetch('/api/tokenise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: t, model: m }),
        signal: ctrl.signal,
      })
      if (!response.ok) throw new Error('Request failed')
      setResult(await response.json())
    } catch (e) {
      if (e.name !== 'AbortError') setResult(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    tokenise(debouncedText, debouncedModel)
  }, [debouncedText, debouncedModel, tokenise])

  const loadExample = (ex) => setText(ex.text)

  return (
    <div className="app tokens-app">
      {/* Controls */}
      <div className="tokens-controls">
        <div className="tokens-top-row">
          <select
            className="model-select"
            value={model}
            onChange={e => setModel(e.target.value)}
          >
            {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <div className="tokens-examples">
            {EXAMPLES.map((ex, i) => (
              <button key={i} className="example-btn" onClick={() => loadExample(ex)}>
                {ex.label}
              </button>
            ))}
          </div>
        </div>
        <textarea
          className="tokens-textarea"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Type or paste any text — tokens update live…"
          rows={4}
        />
      </div>

      {/* Stats bar */}
      {result && (
        <div className="tokens-stats">
          <StatChip label="tokens" value={result.token_count.toLocaleString()} highlight />
          <StatChip label="characters" value={result.char_count.toLocaleString()} />
          <StatChip label="chars / token" value={result.chars_per_token} />
          <StatChip label="encoding" value={result.encoding} />
          {result.cost_estimate_input_usd > 0 && (
            <StatChip
              label="est. input cost"
              value={result.cost_estimate_input_usd < 0.000001
                ? '< $0.000001'
                : `$${result.cost_estimate_input_usd.toFixed(6)}`}
            />
          )}
          {result.cost_per_1m_input > 0 && (
            <StatChip label="per 1M tokens (in)" value={`$${result.cost_per_1m_input}`} />
          )}
          {result.cost_per_1m_output > 0 && (
            <StatChip label="per 1M tokens (out)" value={`$${result.cost_per_1m_output}`} />
          )}
          {isLoading && <span className="tokens-loading">updating…</span>}
        </div>
      )}

      {result && (
        <ContextBar used={result.token_count} total={result.context_window} />
      )}

      {/* Main content */}
      {result && (
        <div className="tokens-layout">
          {/* Highlighted text */}
          <div className="tokens-col tokens-col--text">
            <div className="tokens-col-heading">Tokenised text</div>
            <HighlightedText text={text} tokens={result.tokens} />
            <p className="tokens-note">
              Each colour block is one token. Hover a block to see its index and ID.
              Spaces and newlines are tokens too — look for <code>·</code> and <code>↵</code> in the table.
            </p>
          </div>

          {/* Token table */}
          <div className="tokens-col tokens-col--table">
            <div className="tokens-col-heading">
              Token detail
              <span className="tokens-col-sub">{result.token_count} tokens</span>
            </div>
            <TokenTable tokens={result.tokens} />
          </div>
        </div>
      )}

      {!result && !isLoading && (
        <div className="tokens-placeholder">Start typing to see tokens appear.</div>
      )}
    </div>
  )
}
