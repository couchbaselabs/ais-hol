import React, { useState, useRef, useEffect } from 'react'
import './App.css'
import './AppEmbeddings.css'

/**
 * Embeddings Explorer — embed phrases, visualise cosine similarity and 2-D PCA.
 *
 * Left: editable phrase list + similarity matrix heatmap.
 * Right: 2-D scatter plot of the PCA projection.
 */

const PRESETS = [
  {
    label: 'Synonyms vs antonyms',
    phrases: ['happy', 'joyful', 'sad', 'miserable', 'excited', 'calm'],
  },
  {
    label: 'Programming languages',
    phrases: ['Python', 'JavaScript', 'Rust', 'Java', 'SQL', 'HTML'],
  },
  {
    label: 'Web dev concepts',
    phrases: ['DOM manipulation', 'CSS flexbox', 'HTTP request', 'async/await', 'REST API', 'WebSocket'],
  },
  {
    label: 'Semantic drift',
    phrases: ['bank (finance)', 'bank (river)', 'bank (tilt)', 'financial institution', 'riverbank'],
  },
]

// Map similarity 0–1 to a colour (red=low, green=high)
function simColor(v) {
  if (v >= 0.99) return '#e0e7ff' // diagonal — self-similarity
  const t = Math.max(0, Math.min(1, (v - 0.5) / 0.5))
  const r = Math.round(255 * (1 - t))
  const g = Math.round(200 * t)
  return `rgb(${r},${g},80)`
}

function SimilarityMatrix({ phrases, matrix }) {
  return (
    <div className="matrix-wrap">
      <table className="sim-matrix">
        <thead>
          <tr>
            <th />
            {phrases.map((p, j) => (
              <th key={j} className="matrix-label matrix-label--col" title={p}>
                {p.length > 10 ? p.slice(0, 9) + '…' : p}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => (
            <tr key={i}>
              <td className="matrix-label matrix-label--row" title={phrases[i]}>
                {phrases[i].length > 10 ? phrases[i].slice(0, 9) + '…' : phrases[i]}
              </td>
              {row.map((val, j) => (
                <td
                  key={j}
                  className="matrix-cell"
                  style={{ background: simColor(val) }}
                  title={`${phrases[i]} ↔ ${phrases[j]}: ${val}`}
                >
                  {i === j ? '—' : val.toFixed(2)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ScatterPlot({ phrases, points }) {
  const canvasRef = useRef(null)
  const COLORS = ['#6366f1','#0891b2','#d97706','#059669','#7c3aed','#dc2626','#0284c7','#65a30d']

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !points.length) return
    const ctx = canvas.getContext('2d')
    const W = canvas.width
    const H = canvas.height
    ctx.clearRect(0, 0, W, H)

    const xs = points.map(p => p[0])
    const ys = points.map(p => p[1])
    const minX = Math.min(...xs), maxX = Math.max(...xs)
    const minY = Math.min(...ys), maxY = Math.max(...ys)
    const pad = 40

    const toCanvas = (x, y) => {
      const rangeX = maxX - minX || 1
      const rangeY = maxY - minY || 1
      return [
        pad + ((x - minX) / rangeX) * (W - 2 * pad),
        H - pad - ((y - minY) / rangeY) * (H - 2 * pad),
      ]
    }

    // Axes
    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(pad, H / 2); ctx.lineTo(W - pad, H / 2); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(W / 2, pad); ctx.lineTo(W / 2, H - pad); ctx.stroke()

    // Points + labels
    points.forEach(([x, y], i) => {
      const [cx, cy] = toCanvas(x, y)
      ctx.beginPath()
      ctx.arc(cx, cy, 7, 0, Math.PI * 2)
      ctx.fillStyle = COLORS[i % COLORS.length]
      ctx.fill()

      ctx.font = '11px system-ui, sans-serif'
      ctx.fillStyle = '#111827'
      ctx.fillText(phrases[i], cx + 10, cy + 4)
    })
  }, [phrases, points])

  return (
    <canvas
      ref={canvasRef}
      width={420}
      height={320}
      className="scatter-canvas"
    />
  )
}

function AppEmbeddings() {
  const [phrases, setPhrases] = useState(['king', 'queen', 'man', 'woman', 'prince', 'princess'])
  useEffect(() => {
    const h = (e) => setPhrases(prev =>
      prev.includes(e.detail) ? prev : [...prev.slice(-7), e.detail]
    )
    window.addEventListener('infopanel:question', h)
    return () => window.removeEventListener('infopanel:question', h)
  }, [])
  const [result, setResult] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const updatePhrase = (i, val) => {
    setPhrases(prev => prev.map((p, idx) => idx === i ? val : p))
  }

  const addPhrase = () => {
    if (phrases.length < 8) setPhrases(prev => [...prev, ''])
  }

  const removePhrase = (i) => {
    if (phrases.length > 2) setPhrases(prev => prev.filter((_, idx) => idx !== i))
  }

  const run = async (overridePhrases) => {
    const toEmbed = (overridePhrases || phrases).filter(p => p.trim())
    if (toEmbed.length < 2) return
    setIsLoading(true)
    setError(null)
    setResult(null)
    try {
      const response = await fetch('/api/embeddings-compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phrases: toEmbed }),
      })
      if (!response.ok) throw new Error('Request failed')
      setResult(await response.json())
    } catch {
      setError('Request failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const loadPreset = (preset) => {
    setPhrases(preset.phrases)
    run(preset.phrases)
  }

  return (
    <div className="app embeddings-app">
      <div className="embeddings-controls">
        {/* Phrase inputs */}
        <div className="phrase-inputs">
          {phrases.map((p, i) => (
            <div key={i} className="phrase-row">
              <input
                className="phrase-input"
                value={p}
                onChange={e => updatePhrase(i, e.target.value)}
                onKeyDown={e => e.key === 'Enter' && run()}
                placeholder={`Phrase ${i + 1}`}
              />
              {phrases.length > 2 && (
                <button className="phrase-remove" onClick={() => removePhrase(i)}>✕</button>
              )}
            </div>
          ))}
          {phrases.length < 8 && (
            <button className="phrase-add" onClick={addPhrase}>+ Add phrase</button>
          )}
        </div>

        <div className="embeddings-actions">
          <button className="embed-btn" onClick={() => run()} disabled={isLoading || phrases.filter(p => p.trim()).length < 2}>
            {isLoading ? 'Embedding…' : 'Compare →'}
          </button>
          <div className="preset-list">
            <span className="preset-list-label">Presets:</span>
            {PRESETS.map((pr, i) => (
              <button key={i} className="example-btn" onClick={() => loadPreset(pr)}>{pr.label}</button>
            ))}
          </div>
        </div>
      </div>

      {error && <div className="embed-error">{error}</div>}

      {result && (
        <div className="embeddings-results">
          <div className="embed-col">
            <div className="embed-col-heading">
              Cosine similarity matrix
              <span className="embed-dim">{result.dimension}-dim embeddings</span>
            </div>
            <SimilarityMatrix phrases={result.phrases} matrix={result.similarity_matrix} />
            <div className="sim-legend">
              <span className="legend-low">0.0 (dissimilar)</span>
              <div className="legend-bar" />
              <span className="legend-high">1.0 (identical)</span>
            </div>
          </div>

          <div className="embed-col">
            <div className="embed-col-heading">2-D PCA projection</div>
            <ScatterPlot phrases={result.phrases} points={result.points_2d} />
            <p className="pca-note">
              PCA reduces {result.dimension} dimensions to 2 for visualisation.
              Nearby points are semantically similar.
            </p>
          </div>
        </div>
      )}

      {!result && !isLoading && (
        <div className="embed-placeholder">
          Enter phrases and click Compare to see their similarity matrix and 2-D projection.
        </div>
      )}
    </div>
  )
}

export default AppEmbeddings
