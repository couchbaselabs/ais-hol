import React, { useState } from 'react'
import './App.css'
import './AppImageGeneration.css'
import { useInfoPanelQuestion } from './hooks/useInfoPanelQuestion'

const EXAMPLES = [
  'A serene mountain lake at sunset',
  'A futuristic city skyline with flying cars',
  'A cozy coffee shop on a rainy day',
  'An astronaut riding a horse on Mars',
]

const STYLES = [
  { value: '',              label: 'No style' },
  { value: 'photorealistic', label: '📷 Photorealistic' },
  { value: 'illustration',   label: '🎨 Illustration' },
  { value: 'sketch',         label: '✏️ Sketch' },
  { value: 'oil-painting',   label: '🖼️ Oil Painting' },
  { value: 'pixel-art',      label: '👾 Pixel Art' },
]

const SIZES = [
  { value: '1024x1024', label: '1:1 Square' },
  { value: '1792x1024', label: '16:9 Landscape' },
  { value: '1024x1792', label: '9:16 Portrait' },
]

const ACCENT = '#00A3E0'

export default function AppImageGeneration() {
  const [prompt, setPrompt]   = useState('')
  const [style, setStyle]     = useState('')
  const [size, setSize]       = useState('1024x1024')
  const [quality, setQuality] = useState('standard')
  const [result, setResult]   = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  useInfoPanelQuestion(setPrompt)

  const run = async (overridePrompt) => {
    const p = overridePrompt ?? prompt
    if (!p.trim()) return
    if (overridePrompt) setPrompt(overridePrompt)
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/image-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: p, style, size, quality }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setResult(data)
      if (data.url) {
        setHistory(prev => [data, ...prev].slice(0, 3))
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app ig-app">
      {/* Controls */}
      <div className="ig-controls">
        <div className="ig-prompt-row">
          <input
            className="ig-input"
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && run()}
            placeholder="Describe the image you want to generate…"
          />
          <button
            className="ig-run-btn"
            onClick={() => run()}
            disabled={loading || !prompt.trim()}
          >
            {loading ? 'Generating…' : 'Generate →'}
          </button>
        </div>

        <div className="ig-options-row">
          <label className="ig-option-label">
            Style
            <select className="ig-select" value={style} onChange={e => setStyle(e.target.value)}>
              {STYLES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </label>
          <label className="ig-option-label">
            Size
            <select className="ig-select" value={size} onChange={e => setSize(e.target.value)}>
              {SIZES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </label>
          <label className="ig-option-label">
            Quality
            <select className="ig-select" value={quality} onChange={e => setQuality(e.target.value)}>
              <option value="standard">Standard</option>
              <option value="hd">HD</option>
            </select>
          </label>
          <span className="ig-cost-hint">
            ~${quality === 'hd' ? (size === '1024x1024' ? '0.080' : '0.120') : (size === '1024x1024' ? '0.040' : '0.080')} / image
          </span>
        </div>

        <div className="ig-examples">
          {EXAMPLES.map((ex, i) => (
            <button key={i} className="example-btn" onClick={() => run(ex)}>{ex}</button>
          ))}
        </div>
      </div>

      {error && <div className="ig-error">{error}</div>}

      <div className="ig-body">
        {/* Main result */}
        {loading && (
          <div className="ig-loading">
            <div className="ig-spinner" />
            <span>DALL-E 3 is generating your image… (~10–20 s)</span>
          </div>
        )}

        {result && !loading && (
          <div className="ig-result">
            {result.mock ? (
              <div className="ig-mock-notice">
                DALL-E 3 is not available in mock mode. In production this would show the generated image.
              </div>
            ) : result.url ? (
              <img
                className="ig-image"
                src={result.url}
                alt={result.revised_prompt}
              />
            ) : null}

            <div className="ig-meta">
              <div className="ig-meta-row">
                <span className="ig-meta-label">Your prompt</span>
                <span className="ig-meta-value">{result.original_prompt}</span>
              </div>
              {result.style && (
                <div className="ig-meta-row">
                  <span className="ig-meta-label">Style applied</span>
                  <span className="ig-meta-value">{result.style}</span>
                </div>
              )}
              {result.revised_prompt !== result.final_prompt && (
                <div className="ig-meta-row ig-meta-row--revised">
                  <span className="ig-meta-label">DALL-E revised to</span>
                  <span className="ig-meta-value ig-meta-value--revised">{result.revised_prompt}</span>
                </div>
              )}
              <div className="ig-meta-pills">
                <span className="ig-pill">{result.size}</span>
                <span className="ig-pill">{result.quality}</span>
                <span className="ig-pill ig-pill--cost">${result.cost_usd?.toFixed(3)}</span>
              </div>
            </div>
          </div>
        )}

        {/* History */}
        {history.length > 1 && (
          <div className="ig-history">
            <div className="ig-history-label">Recent generations</div>
            <div className="ig-history-row">
              {history.slice(1).map((h, i) => (
                <div key={i} className="ig-history-item" onClick={() => setResult(h)}>
                  {h.url
                    ? <img className="ig-history-thumb" src={h.url} alt={h.original_prompt} />
                    : <div className="ig-history-thumb ig-history-thumb--mock">mock</div>
                  }
                  <span className="ig-history-prompt">{h.original_prompt}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!result && !loading && (
          <div className="ig-placeholder">
            <p>
              DALL-E 3 generates images from text descriptions. Unlike text generation,
              prompt engineering for images focuses on style, composition, lighting, and
              medium — not just content.
            </p>
            <ul>
              <li>Select a <strong>style preset</strong> to append a style suffix to your prompt</li>
              <li>The <strong>revised prompt</strong> shows what DALL-E actually used — it often rewrites your prompt</li>
              <li><strong>HD quality</strong> costs 2× but produces finer detail</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
