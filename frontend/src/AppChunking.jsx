import React, { useState } from 'react'
import './App.css'
import './AppChunking.css'
import { useInfoPanelQuestion } from './hooks/useInfoPanelQuestion'

const STRATEGIES = [
  { id: 'fixed',     label: 'Fixed-size',  desc: 'Split every N words, with optional overlap' },
  { id: 'sentence',  label: 'Sentence',    desc: 'Split at sentence boundaries (.!?)' },
  { id: 'paragraph', label: 'Paragraph',   desc: 'Split at blank lines' },
  { id: 'semantic',  label: 'Semantic',    desc: 'Split where embedding similarity drops (calls API)' },
]

const SAMPLE_TEXT = `Couchbase is a distributed NoSQL cloud database that delivers unmatched versatility, performance, scalability, and financial value across cloud, on-premises, hybrid, and edge computing deployments.

It supports key-value, document, columnar, full-text search, analytics, eventing, and mobile workloads — all in a single platform. Developers can use SQL++ (N1QL), a SQL-compatible query language, to query JSON documents without needing to learn a new paradigm.

The Couchbase Data Platform includes Couchbase Server for the cloud and on-premises, Couchbase Capella as a fully managed DBaaS, and Couchbase Lite for mobile and edge devices. Sync Gateway bridges the gap between mobile and cloud, enabling offline-first applications.

Couchbase AI Data Plane brings vector search, AI Functions, and LLM integrations directly into the database layer. This allows developers to build AI-powered applications without managing separate vector databases or orchestration layers.`

const CHUNK_COLORS = [
  '#dbeafe', '#dcfce7', '#fef9c3', '#fce7f3', '#ede9fe',
  '#ffedd5', '#cffafe', '#f0fdf4', '#fef2f2', '#f5f3ff',
]

export default function AppChunking() {
  const [text, setText] = useState(SAMPLE_TEXT)
  useInfoPanelQuestion(setText)
  const [strategy, setStrategy] = useState('fixed')
  const [chunkSize, setChunkSize] = useState(80)
  const [overlap, setOverlap] = useState(15)
  const [result, setResult] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const run = async () => {
    if (!text.trim()) return
    setIsLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/chunk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, strategy, chunk_size: chunkSize, overlap }),
      })
      if (!res.ok) throw new Error('Request failed')
      setResult(await res.json())
    } catch {
      setError('Request failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="app chunking-app">
      <div className="chunking-layout">
        {/* Left: controls */}
        <div className="chunking-left">
          <div className="chunking-section">
            <div className="chunking-section-label">Strategy</div>
            <div className="chunking-strategies">
              {STRATEGIES.map(s => (
                <button
                  key={s.id}
                  className={`chunking-strategy-btn ${strategy === s.id ? 'chunking-strategy-btn--active' : ''}`}
                  onClick={() => setStrategy(s.id)}
                >
                  <span className="chunking-strategy-name">{s.label}</span>
                  <span className="chunking-strategy-desc">{s.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {(strategy === 'fixed' || strategy === 'sentence') && (
            <div className="chunking-section">
              <div className="chunking-section-label">Parameters</div>
              <div className="chunking-params">
                <label className="chunking-param">
                  <span>Chunk size (words)</span>
                  <div className="chunking-param-row">
                    <input
                      type="range" min={20} max={300} step={10}
                      value={chunkSize}
                      onChange={e => setChunkSize(Number(e.target.value))}
                    />
                    <span className="chunking-param-val">{chunkSize}</span>
                  </div>
                </label>
                <label className="chunking-param">
                  <span>Overlap (words)</span>
                  <div className="chunking-param-row">
                    <input
                      type="range" min={0} max={Math.floor(chunkSize / 2)} step={5}
                      value={overlap}
                      onChange={e => setOverlap(Number(e.target.value))}
                    />
                    <span className="chunking-param-val">{overlap}</span>
                  </div>
                </label>
              </div>
            </div>
          )}

          <div className="chunking-section chunking-section--grow">
            <div className="chunking-section-label">Input text</div>
            <textarea
              className="chunking-text-input"
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Paste any text to chunk…"
            />
          </div>

          <button
            className="chunking-run-btn"
            onClick={run}
            disabled={isLoading || !text.trim()}
          >
            {isLoading ? (strategy === 'semantic' ? 'Embedding…' : 'Chunking…') : 'Chunk →'}
          </button>
        </div>

        {/* Right: results */}
        <div className="chunking-right">
          {error && <div className="chunking-error">{error}</div>}

          {result && (
            <>
              <div className="chunking-stats">
                <span className="chunking-stat"><strong>{result.count}</strong> chunks</span>
                <span className="chunking-stat"><strong>{result.avg_words}</strong> avg words/chunk</span>
                <span className="chunking-stat strategy-badge">{result.strategy}</span>
              </div>

              <div className="chunking-chunks">
                {result.chunks.map((chunk, i) => (
                  <div
                    key={i}
                    className="chunking-chunk"
                    style={{ background: CHUNK_COLORS[i % CHUNK_COLORS.length] }}
                  >
                    <div className="chunking-chunk-header">
                      <span className="chunking-chunk-num">Chunk {i + 1}</span>
                      <span className="chunking-chunk-words">{chunk.split(/\s+/).filter(Boolean).length} words</span>
                    </div>
                    <p className="chunking-chunk-text">{chunk}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {!result && !isLoading && (
            <div className="chunking-placeholder">
              Choose a strategy, adjust parameters, then click Chunk to see how the text
              is split. Each coloured block is one chunk that would be stored and retrieved
              independently in a RAG pipeline.
            </div>
          )}

          {isLoading && (
            <div className="chunking-loading">
              {strategy === 'semantic'
                ? 'Embedding each sentence and finding semantic boundaries…'
                : 'Splitting text…'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
