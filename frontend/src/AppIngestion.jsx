import React, { useState } from 'react'
import './App.css'
import './AppIngestion.css'

const SAMPLE_DOC = {
  title: 'Couchbase Vector Search',
  content: `Couchbase Vector Search enables applications to store and query high-dimensional vector embeddings alongside JSON documents. This allows developers to build semantic search, recommendation systems, and AI-powered applications without managing a separate vector database.

Vector embeddings are numerical representations of data — text, images, or audio — that capture semantic meaning. Similar items have embeddings that are close together in the high-dimensional space. Couchbase stores these embeddings as arrays within JSON documents and indexes them using approximate nearest neighbour (ANN) algorithms.

To use vector search, you first generate embeddings using a model like OpenAI's text-embedding-3-small. You then store the embedding alongside the original content in a Couchbase document. A vector index is created using CREATE VECTOR INDEX in SQL++, specifying the field containing the embedding and the distance metric (L2 or cosine).

At query time, you embed the user's query using the same model, then use ANN_DISTANCE() in a SQL++ ORDER BY clause to retrieve the most semantically similar documents. This is the retrieval step in a RAG (Retrieval-Augmented Generation) pipeline.

Couchbase Capella AI Services extends this with managed embedding generation, so you can store and query vectors without calling an external embedding API from your application code.`,
}

const PIPELINE_STEPS = [
  { id: 'input',   label: '1. Input',    icon: '📄', desc: 'Raw document text' },
  { id: 'chunk',   label: '2. Chunk',    icon: '✂️', desc: 'Split into overlapping windows' },
  { id: 'embed',   label: '3. Embed',    icon: '🔢', desc: 'Each chunk → vector via API' },
  { id: 'store',   label: '4. Store',    icon: '🗄️', desc: 'Vectors + text → Couchbase' },
]

export default function AppIngestion() {
  const [title, setTitle] = useState(SAMPLE_DOC.title)
  const [content, setContent] = useState(SAMPLE_DOC.content)
  const [chunkSize, setChunkSize] = useState(150)
  const [overlap, setOverlap] = useState(20)
  const [result, setResult] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [activeStep, setActiveStep] = useState(null)
  const [expandedChunk, setExpandedChunk] = useState(null)

  const run = async () => {
    if (!content.trim() || !title.trim()) return
    setIsLoading(true)
    setError(null)
    setResult(null)
    setActiveStep('chunk')

    try {
      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, chunk_size: chunkSize, overlap }),
      })
      if (!res.ok) throw new Error('Request failed')
      const data = await res.json()
      setActiveStep('store')
      setResult(data)
    } catch {
      setError('Request failed. Please try again.')
    } finally {
      setIsLoading(false)
      setActiveStep(null)
    }
  }

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length

  return (
    <div className="app ingest-app">
      <div className="ingest-layout">
        {/* Left: input + controls */}
        <div className="ingest-left">
          <div className="ingest-section">
            <div className="ingest-section-label">Document title</div>
            <input
              className="ingest-title-input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Document title…"
            />
          </div>

          <div className="ingest-section ingest-section--grow">
            <div className="ingest-section-label">
              Content
              <span className="ingest-word-count">{wordCount} words</span>
            </div>
            <textarea
              className="ingest-content-input"
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Paste any document text…"
            />
          </div>

          <div className="ingest-section">
            <div className="ingest-section-label">Chunking parameters</div>
            <div className="ingest-params">
              <label className="ingest-param">
                <span>Chunk size (words)</span>
                <div className="ingest-param-row">
                  <input type="range" min={50} max={400} step={25} value={chunkSize}
                    onChange={e => setChunkSize(Number(e.target.value))} />
                  <span className="ingest-param-val">{chunkSize}</span>
                </div>
              </label>
              <label className="ingest-param">
                <span>Overlap (words)</span>
                <div className="ingest-param-row">
                  <input type="range" min={0} max={Math.floor(chunkSize / 2)} step={10} value={overlap}
                    onChange={e => setOverlap(Number(e.target.value))} />
                  <span className="ingest-param-val">{overlap}</span>
                </div>
              </label>
            </div>
          </div>

          <button
            className="ingest-run-btn"
            onClick={run}
            disabled={isLoading || !content.trim() || !title.trim()}
          >
            {isLoading ? 'Ingesting…' : 'Ingest document →'}
          </button>
        </div>

        {/* Right: pipeline + results */}
        <div className="ingest-right">
          {/* Pipeline diagram */}
          <div className="ingest-pipeline">
            {PIPELINE_STEPS.map((step, i) => (
              <React.Fragment key={step.id}>
                <div className={`ingest-step ${activeStep === step.id ? 'ingest-step--active' : ''} ${result && i < 4 ? 'ingest-step--done' : ''}`}>
                  <span className="ingest-step-icon">{step.icon}</span>
                  <span className="ingest-step-label">{step.label}</span>
                  <span className="ingest-step-desc">{step.desc}</span>
                </div>
                {i < PIPELINE_STEPS.length - 1 && <div className="ingest-pipeline-arrow">→</div>}
              </React.Fragment>
            ))}
          </div>

          {error && <div className="ingest-error">{error}</div>}
          {isLoading && <div className="ingest-loading">Chunking and embedding… this may take a few seconds.</div>}

          {result && (
            <>
              {/* Stats */}
              <div className="ingest-stats">
                <div className="ingest-stat-card">
                  <div className="ingest-stat-val">{result.total_words}</div>
                  <div className="ingest-stat-label">Total words</div>
                </div>
                <div className="ingest-stat-card">
                  <div className="ingest-stat-val">{result.chunk_count}</div>
                  <div className="ingest-stat-label">Chunks</div>
                </div>
                <div className="ingest-stat-card">
                  <div className="ingest-stat-val">{result.embedding_dim.toLocaleString()}</div>
                  <div className="ingest-stat-label">Embedding dims</div>
                </div>
                <div className="ingest-stat-card">
                  <div className="ingest-stat-val">{result.embed_ms}ms</div>
                  <div className="ingest-stat-label">Embed time</div>
                </div>
                <div className={`ingest-stat-card ${result.store_error ? 'ingest-stat-card--warn' : 'ingest-stat-card--ok'}`}>
                  <div className="ingest-stat-val">{result.stored}</div>
                  <div className="ingest-stat-label">{result.store_error ? 'Stored (no DB)' : 'Stored in CB'}</div>
                </div>
              </div>

              {result.store_error && (
                <div className="ingest-store-warn">
                  ⚠️ Couchbase not configured — embeddings computed but not persisted.
                  Connect a cluster to complete the pipeline.
                </div>
              )}

              {/* Chunk list */}
              <div className="ingest-chunks-heading">
                Chunks ({result.chunks.length})
                <span className="ingest-chunks-hint">Click to expand</span>
              </div>
              <div className="ingest-chunks">
                {result.chunks.map((chunk, i) => (
                  <div
                    key={i}
                    className={`ingest-chunk ${expandedChunk === i ? 'ingest-chunk--open' : ''}`}
                    onClick={() => setExpandedChunk(expandedChunk === i ? null : i)}
                  >
                    <div className="ingest-chunk-header">
                      <span className="ingest-chunk-num">Chunk {i + 1}</span>
                      <span className="ingest-chunk-words">{chunk.word_count} words</span>
                      <span className="ingest-chunk-vec">
                        [{chunk.embedding_preview.map(v => v.toFixed(3)).join(', ')}…]
                      </span>
                    </div>
                    {expandedChunk === i && (
                      <p className="ingest-chunk-text">{chunk.text}</p>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {!result && !isLoading && (
            <div className="ingest-placeholder">
              This tab shows the ingestion side of RAG: a document is chunked, each chunk
              is embedded via the OpenAI API, and the vectors are stored in Couchbase.
              The stored chunks are then available for retrieval in the RAG tab.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
