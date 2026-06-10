import React, { useState } from 'react'
import './AppCapellaIngestion.css'
import CapellaDiyBanner from './components/CapellaDiyBanner'

const EXAMPLE_DOCS = [
  {
    label: 'JavaScript Promises',
    title: 'JavaScript Promises',
    content: `A Promise in JavaScript represents the eventual completion or failure of an asynchronous operation. Promises have three states: pending, fulfilled, and rejected. You create a promise with new Promise((resolve, reject) => { ... }). The .then() method handles fulfillment, .catch() handles rejection, and .finally() runs regardless of outcome. Promises can be chained — each .then() returns a new promise. Promise.all() waits for multiple promises to resolve. Promise.race() resolves or rejects as soon as the first promise settles. Async/await is syntactic sugar over promises — an async function always returns a promise, and await pauses execution until the awaited promise settles. Error handling with async/await uses try/catch blocks. Promises replaced callback-based patterns and eliminated callback hell. The microtask queue processes promise callbacks before the next macrotask, giving promises higher priority than setTimeout callbacks.`,
  },
  {
    label: 'Couchbase Vector Search',
    title: 'Couchbase Vector Search',
    content: `Couchbase supports vector search through its Full-Text Search (FTS) service. Vector indexes store high-dimensional embeddings alongside document data. The ANN_DISTANCE function computes approximate nearest-neighbour distance in SQL++ queries. Vector indexes are created with CREATE VECTOR INDEX specifying the field name, dimension count, and similarity metric (L2, dot product, or cosine). The VectorQuery class in the Python SDK wraps a query vector and num_candidates parameter. Vector search results include a score field representing similarity. Hybrid search combines vector similarity with keyword matching using SearchRequest.create() with multiple query types. Metadata filtering narrows vector search results using WHERE clauses or filter parameters. The ENCODE_VECTOR function converts a JSON array to the internal vector format. Capella AI Services can automatically generate and store embeddings via the vectorization workflow, eliminating the need to call an embedding API from application code.`,
  },
  {
    label: 'RAG Architecture',
    title: 'RAG Architecture',
    content: `Retrieval-Augmented Generation (RAG) combines a retrieval system with a generative language model. The retrieval component finds relevant documents from a knowledge base using semantic similarity. The generation component uses retrieved documents as context to produce grounded answers. The ingestion pipeline prepares documents: chunking splits long texts into overlapping segments, embedding converts chunks to vectors, and storage persists vectors with metadata. At query time, the user question is embedded and used to search the vector store. Top-k results are assembled into a context string and injected into the LLM prompt. RAG reduces hallucination by grounding responses in retrieved facts. Chunk size affects retrieval quality — smaller chunks are more precise, larger chunks provide more context. Overlap between chunks prevents information loss at boundaries. Reranking applies a cross-encoder model to re-score retrieved chunks for better relevance. HyDE generates a hypothetical answer to the question and uses its embedding for retrieval, improving recall for abstract queries.`,
  },
]

const SOURCES = [
  { id: 'capella', icon: '🗄️', label: 'Capella collection', desc: 'Vectorise existing documents already in Couchbase' },
  { id: 's3',      icon: '☁️', label: 'S3 bucket',          desc: 'Ingest PDFs, DOCX, HTML from Amazon S3' },
  { id: 'url',     icon: '🌐', label: 'Web URL',             desc: 'Crawl and ingest web pages' },
  { id: 'upload',  icon: '📄', label: 'File upload',         desc: 'Upload PDFs or documents directly' },
]

const WORKFLOW_STEPS = [
  { icon: '📂', label: 'Source',    desc: 'Choose data source: Capella collection, S3, URL, or file upload' },
  { icon: '✂️', label: 'Chunk',     desc: 'Configure chunk size, overlap, and splitting strategy' },
  { icon: '🔢', label: 'Embed',     desc: 'Select embedding model (OpenAI, Bedrock, Capella-hosted)' },
  { icon: '🗄️', label: 'Store',     desc: 'Target bucket, scope, and collection in Couchbase' },
  { icon: '🔍', label: 'Index',     desc: 'Vector index created automatically — ready for ANN search' },
]

function PipelineStep({ step, active, done }) {
  return (
    <div className={`ci2-step ${active ? 'ci2-step--active' : ''} ${done ? 'ci2-step--done' : ''}`}>
      <div className="ci2-step-icon">{done ? '✓' : step.icon}</div>
      <div className="ci2-step-body">
        <div className="ci2-step-label">{step.label}</div>
        {active && <div className="ci2-step-desc">{step.desc}</div>}
      </div>
    </div>
  )
}

function ChunkCard({ chunk, index }) {
  const preview = chunk.text.slice(0, 120) + (chunk.text.length > 120 ? '…' : '')
  return (
    <div className="ci2-chunk">
      <div className="ci2-chunk-header">
        <span className="ci2-chunk-num">Chunk {index + 1}</span>
        <span className="ci2-chunk-words">{chunk.word_count} words</span>
        {chunk.embedding_preview && (
          <span className="ci2-chunk-vec">
            [{chunk.embedding_preview.map(v => v.toFixed(3)).join(', ')}…]
          </span>
        )}
      </div>
      <div className="ci2-chunk-text">{preview}</div>
    </div>
  )
}

export default function AppCapellaIngestion() {
  const [mode, setMode] = useState('diy') // 'diy' | 'capella'
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [chunkSize, setChunkSize] = useState(150)
  const [overlap, setOverlap] = useState(20)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [activeSource, setActiveSource] = useState('capella')
  const [workflowStep, setWorkflowStep] = useState(null) // null | 0..4

  function loadExample(ex) {
    setTitle(ex.title)
    setContent(ex.content)
    setResult(null)
    setError(null)
  }

  async function runDiy() {
    if (!content.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || 'Untitled',
          content,
          chunk_size: chunkSize,
          overlap,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        throw new Error(err.detail || 'Request failed')
      }
      setResult(await res.json())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function simulateWorkflow() {
    setWorkflowStep(0)
    for (let i = 1; i <= WORKFLOW_STEPS.length; i++) {
      await new Promise(r => setTimeout(r, 700))
      setWorkflowStep(i)
    }
  }

  return (
    <div className="ci2-root">
      <CapellaDiyBanner
        diyTab="ingestion"
        diyLabel="Ingestion"
        replaces="manual chunk → embed → store pipeline"
      />

      {/* Mode toggle */}
      <div className="ci2-mode-bar">
        <button
          className={`ci2-mode-btn ${mode === 'diy' ? 'ci2-mode-btn--active' : ''}`}
          onClick={() => setMode('diy')}
        >
          🐍 DIY Pipeline
        </button>
        <button
          className={`ci2-mode-btn ${mode === 'capella' ? 'ci2-mode-btn--active' : ''}`}
          onClick={() => setMode('capella')}
        >
          🗄️ Capella Workflow
        </button>
      </div>

      {mode === 'diy' ? (
        <div className="ci2-body">
          {/* Left: input */}
          <div className="ci2-input-panel">
            <div className="ci2-panel-title">Document</div>

            <div className="ci2-examples">
              {EXAMPLE_DOCS.map((ex, i) => (
                <button key={i} className="ci2-example-btn" onClick={() => loadExample(ex)}>
                  {ex.label}
                </button>
              ))}
            </div>

            <input
              className="ci2-text-input"
              type="text"
              placeholder="Document title"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
            <textarea
              className="ci2-textarea"
              rows={8}
              placeholder="Paste document text to chunk, embed, and store…"
              value={content}
              onChange={e => setContent(e.target.value)}
            />

            <div className="ci2-params">
              <label className="ci2-param-label">
                Chunk size (words)
                <input
                  type="number"
                  className="ci2-param-input"
                  value={chunkSize}
                  min={50}
                  max={500}
                  onChange={e => setChunkSize(Number(e.target.value))}
                />
              </label>
              <label className="ci2-param-label">
                Overlap (words)
                <input
                  type="number"
                  className="ci2-param-input"
                  value={overlap}
                  min={0}
                  max={100}
                  onChange={e => setOverlap(Number(e.target.value))}
                />
              </label>
            </div>

            <button
              className="ci2-run-btn"
              onClick={runDiy}
              disabled={loading || !content.trim()}
            >
              {loading ? 'Processing…' : 'Run pipeline →'}
            </button>
            {error && <div className="ci2-error">{error}</div>}
          </div>

          {/* Right: pipeline steps + results */}
          <div className="ci2-output-panel">
            <div className="ci2-panel-title">Pipeline</div>

            <div className="ci2-pipeline-steps">
              {[
                { icon: '✂️', label: 'Chunk', desc: `Split into overlapping ${chunkSize}-word segments` },
                { icon: '🔢', label: 'Embed', desc: 'Call OpenAI embeddings API for each chunk' },
                { icon: '🗄️', label: 'Store', desc: 'Upsert chunk + vector into Couchbase collection' },
              ].map((s, i) => (
                <div key={i} className={`ci2-pipeline-step ${result ? 'ci2-pipeline-step--done' : ''}`}>
                  <span className="ci2-pipeline-icon">{result ? '✓' : s.icon}</span>
                  <span className="ci2-pipeline-label">{s.label}</span>
                  <span className="ci2-pipeline-desc">{s.desc}</span>
                </div>
              ))}
            </div>

            {result && (
              <>
                <div className="ci2-stats">
                  <div className="ci2-stat">
                    <span className="ci2-stat-value">{result.total_words}</span>
                    <span className="ci2-stat-label">words</span>
                  </div>
                  <div className="ci2-stat">
                    <span className="ci2-stat-value">{result.chunk_count}</span>
                    <span className="ci2-stat-label">chunks</span>
                  </div>
                  <div className="ci2-stat">
                    <span className="ci2-stat-value">{result.embedding_dim}</span>
                    <span className="ci2-stat-label">dims</span>
                  </div>
                  <div className="ci2-stat">
                    <span className="ci2-stat-value">{result.embed_ms}ms</span>
                    <span className="ci2-stat-label">embed time</span>
                  </div>
                  <div className={`ci2-stat ${result.stored > 0 ? 'ci2-stat--ok' : 'ci2-stat--warn'}`}>
                    <span className="ci2-stat-value">{result.stored}</span>
                    <span className="ci2-stat-label">stored</span>
                  </div>
                </div>

                {result.store_error && (
                  <div className="ci2-store-note">
                    ⚠️ Couchbase not configured — chunks embedded but not stored.
                    Connect a cluster to persist.
                  </div>
                )}

                <div className="ci2-chunks-title">Chunks ({result.chunks?.length})</div>
                <div className="ci2-chunks">
                  {result.chunks?.map((c, i) => <ChunkCard key={i} chunk={c} index={i} />)}
                </div>
              </>
            )}

            {!result && !loading && (
              <div className="ci2-placeholder">
                Run the pipeline to see chunks, embeddings, and storage results.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── Capella Workflow view ── */
        <div className="ci2-capella-body">
          <div className="ci2-capella-intro">
            <h2 className="ci2-capella-title">Capella AI Services — Ingestion Workflow</h2>
            <p className="ci2-capella-desc">
              The Capella ingestion workflow replaces the entire DIY pipeline — chunking,
              embedding, storing, and index creation — with a UI-driven configuration.
              No code to write, no embedding API to call, no vector index to manage.
            </p>
          </div>

          <div className="ci2-capella-cols">
            {/* Left: workflow builder */}
            <div className="ci2-workflow-panel">
              <div className="ci2-workflow-title">Configure workflow</div>

              <div className="ci2-workflow-section">
                <div className="ci2-workflow-section-label">1. Data source</div>
                <div className="ci2-source-grid">
                  {SOURCES.map(s => (
                    <button
                      key={s.id}
                      className={`ci2-source-btn ${activeSource === s.id ? 'ci2-source-btn--active' : ''}`}
                      onClick={() => setActiveSource(s.id)}
                    >
                      <span className="ci2-source-icon">{s.icon}</span>
                      <span className="ci2-source-label">{s.label}</span>
                      <span className="ci2-source-desc">{s.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="ci2-workflow-section">
                <div className="ci2-workflow-section-label">2. Chunking strategy</div>
                <div className="ci2-workflow-options">
                  {['Fixed size (words)', 'Sentence boundary', 'Paragraph', 'Semantic'].map((opt, i) => (
                    <label key={i} className="ci2-workflow-radio">
                      <input type="radio" name="chunk" defaultChecked={i === 0} />
                      {opt}
                    </label>
                  ))}
                </div>
              </div>

              <div className="ci2-workflow-section">
                <div className="ci2-workflow-section-label">3. Embedding model</div>
                <div className="ci2-workflow-options">
                  {['OpenAI text-embedding-3-small', 'OpenAI text-embedding-3-large', 'Capella-hosted model', 'AWS Bedrock Titan'].map((opt, i) => (
                    <label key={i} className="ci2-workflow-radio">
                      <input type="radio" name="embed" defaultChecked={i === 0} />
                      {opt}
                    </label>
                  ))}
                </div>
              </div>

              <div className="ci2-workflow-section">
                <div className="ci2-workflow-section-label">4. Target collection</div>
                <div className="ci2-workflow-fields">
                  <input className="ci2-workflow-input" placeholder="Bucket: shared" readOnly />
                  <input className="ci2-workflow-input" placeholder="Scope: public" readOnly />
                  <input className="ci2-workflow-input" placeholder="Collection: documentation" readOnly />
                </div>
              </div>

              <button
                className="ci2-workflow-run-btn"
                onClick={simulateWorkflow}
                disabled={workflowStep !== null && workflowStep < WORKFLOW_STEPS.length}
              >
                {workflowStep === null ? 'Run Workflow →'
                  : workflowStep < WORKFLOW_STEPS.length ? 'Running…'
                  : 'Run Again →'}
              </button>
            </div>

            {/* Right: workflow progress */}
            <div className="ci2-workflow-progress">
              <div className="ci2-workflow-title">Workflow progress</div>
              {WORKFLOW_STEPS.map((step, i) => (
                <PipelineStep
                  key={i}
                  step={step}
                  active={workflowStep === i}
                  done={workflowStep !== null && workflowStep > i}
                />
              ))}

              {workflowStep === WORKFLOW_STEPS.length && (
                <div className="ci2-workflow-done">
                  <div className="ci2-workflow-done-icon">✓</div>
                  <div>
                    <div className="ci2-workflow-done-title">Workflow complete</div>
                    <div className="ci2-workflow-done-desc">
                      Documents chunked, embedded, stored, and indexed.
                      Vector search is ready — no application code written.
                    </div>
                  </div>
                </div>
              )}

              {workflowStep === null && (
                <div className="ci2-workflow-idle">
                  Configure the workflow and click Run to see the pipeline execute.
                </div>
              )}

              {/* Comparison */}
              <div className="ci2-compare-box">
                <div className="ci2-compare-box-title">What Capella replaces</div>
                <table className="ci2-compare-table">
                  <thead>
                    <tr>
                      <th>Step</th>
                      <th>DIY</th>
                      <th>Capella</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Chunking',   'Custom split function',         'UI config'],
                      ['Embedding',  'Call embedding API per chunk',  'Managed, batched'],
                      ['Storage',    'SDK upsert loop',               'Automatic'],
                      ['Vector index','CREATE VECTOR INDEX SQL++',    'Auto-created'],
                      ['Scheduling', 'Cron job or manual trigger',    'Scheduled or event-driven'],
                      ['Monitoring', 'Custom logging',                'Built-in progress UI'],
                    ].map(([step, diy, cap], i) => (
                      <tr key={i}>
                        <td>{step}</td>
                        <td className="ci2-compare-diy">{diy}</td>
                        <td className="ci2-compare-cap">{cap}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
