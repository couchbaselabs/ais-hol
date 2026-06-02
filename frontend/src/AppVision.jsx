import React, { useState, useRef, useCallback } from 'react'
import './App.css'
import './AppVision.css'
import { useInfoPanelQuestion } from './hooks/useInfoPanelQuestion'

const EXAMPLES = [
  { label: 'Describe this image', prompt: 'Describe what you see in this image in detail.' },
  { label: 'Extract text', prompt: 'Extract all text visible in this image.' },
  { label: 'Identify objects', prompt: 'List every distinct object you can identify in this image.' },
  { label: 'Explain a chart', prompt: 'Explain what this chart or diagram is showing.' },
]

export default function AppVision() {
  const [imageData, setImageData] = useState(null)   // base64 data URL
  const [imageMime, setImageMime] = useState('image/jpeg')
  const [prompt, setPrompt] = useState('')
  useInfoPanelQuestion(setPrompt)
  const [result, setResult] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)

  const loadFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return
    setImageMime(file.type)
    const reader = new FileReader()
    reader.onload = (e) => setImageData(e.target.result)
    reader.readAsDataURL(file)
    setResult(null)
    setError(null)
  }

  const onFileChange = (e) => loadFile(e.target.files[0])

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
    loadFile(e.dataTransfer.files[0])
  }, [])

  const onDragOver = (e) => { e.preventDefault(); setIsDragging(true) }
  const onDragLeave = () => setIsDragging(false)

  const onPaste = useCallback((e) => {
    const item = [...e.clipboardData.items].find(i => i.type.startsWith('image/'))
    if (item) loadFile(item.getAsFile())
  }, [])

  const run = async (overridePrompt) => {
    const p = overridePrompt ?? prompt
    if (!imageData || !p.trim()) return
    if (overridePrompt) setPrompt(overridePrompt)
    setIsLoading(true)
    setError(null)
    setResult(null)
    try {
      // Strip the data URL prefix to send raw base64
      const base64 = imageData.split(',')[1]
      const res = await fetch('/api/vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: base64, mime_type: imageMime, prompt: p }),
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
    <div className="app vision-app" onPaste={onPaste}>
      <div className="vision-layout">
        {/* Left: image upload */}
        <div className="vision-left">
          <div
            className={`vision-dropzone ${isDragging ? 'vision-dropzone--drag' : ''} ${imageData ? 'vision-dropzone--has-image' : ''}`}
            onClick={() => !imageData && fileInputRef.current.click()}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
          >
            {imageData ? (
              <>
                <img src={imageData} alt="uploaded" className="vision-preview" />
                <button
                  className="vision-clear-btn"
                  onClick={(e) => { e.stopPropagation(); setImageData(null); setResult(null) }}
                >✕</button>
              </>
            ) : (
              <div className="vision-dropzone-hint">
                <span className="vision-dropzone-icon">🖼️</span>
                <p>Drop an image, paste from clipboard, or click to browse</p>
                <span className="vision-dropzone-sub">JPEG · PNG · GIF · WebP</span>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={onFileChange}
          />
        </div>

        {/* Right: prompt + result */}
        <div className="vision-right">
          <div className="vision-prompt-row">
            <textarea
              className="vision-prompt-input"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Ask anything about the image…"
              rows={3}
            />
            <button
              className="vision-run-btn"
              onClick={() => run()}
              disabled={isLoading || !imageData || !prompt.trim()}
            >
              {isLoading ? 'Analysing…' : 'Ask →'}
            </button>
          </div>

          <div className="vision-examples">
            {EXAMPLES.map((ex, i) => (
              <button
                key={i}
                className="example-btn"
                onClick={() => run(ex.prompt)}
                disabled={!imageData || isLoading}
              >
                {ex.label}
              </button>
            ))}
          </div>

          {error && <div className="vision-error">{error}</div>}
          {isLoading && <div className="vision-loading">GPT-4o is analysing the image…</div>}

          {result && (
            <div className="vision-result">
              <div className="vision-result-header">
                <span className="vision-result-model">{result.model}</span>
                <span className="vision-result-meta">
                  {result.input_tokens} in · {result.output_tokens} out tokens
                </span>
              </div>
              <p className="vision-result-text">{result.response}</p>
            </div>
          )}

          {!result && !isLoading && (
            <div className="vision-placeholder">
              Upload an image then ask a question. GPT-4o can describe scenes,
              read text, interpret charts, identify objects, and more.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
