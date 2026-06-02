import React, { useState, useEffect } from 'react'
import './App.css'
import './AppCapellaSummarise.css'

const EXAMPLES = [
  `The World Wide Web was invented by Tim Berners-Lee at CERN in 1989. It opened to the public in 1991 and has since become the world's dominant software platform. Documents are accessed via HTTP using URLs, and web pages are written in HTML. CSS and JavaScript are the other two core technologies of the web. As of 2023, 98.7% of websites use JavaScript on the client side.`,
  `JavaScript is a high-level, interpreted programming language that conforms to the ECMAScript standard. It supports dynamic typing, prototype-based object-orientation, and first-class functions. JavaScript engines were originally used only in web browsers, but are now core components of servers and various applications. The most popular runtime outside browsers is Node.js.`,
  `CSS (Cascading Style Sheets) is a style sheet language used for describing the presentation of a document written in HTML. CSS is designed to enable the separation of presentation and content, including layout, colors, and fonts. This separation improves content accessibility and provides more flexibility in the specification of presentation characteristics.`,
]

export default function AppCapellaSummarise() {
  const [text, setText] = useState('')
  useEffect(() => {
    const h = (e) => setText(e.detail)
    window.addEventListener('infopanel:question', h)
    return () => window.removeEventListener('infopanel:question', h)
  }, [])
  const [maxWords, setMaxWords] = useState(80)
  const [result, setResult] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const run = async (overrideText) => {
    const t = overrideText ?? text
    if (!t.trim()) return
    if (overrideText !== undefined) setText(overrideText)
    setIsLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/capella-summarise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: t, max_words: maxWords }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Request failed')
      }
      setResult(await res.json())
    } catch (e) {
      setError(e.message || 'Request failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0

  return (
    <div className="app capella-summarise-app">
      <div className="capella-layout">
        {/* Input */}
        <div className="capella-input-panel">
          <div className="capella-panel-header">
            <h2 className="panel-heading">Input text</h2>
            <span className="word-count">{wordCount.toLocaleString()} words</span>
          </div>
          <textarea
            className="capella-textarea"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Paste any text to summarise using Capella ai_summary()…"
            rows={7}
          />

          <div className="capella-controls">
            <label className="capella-label">
              Max words in summary
              <input
                type="number"
                className="capella-number"
                value={maxWords}
                min={20}
                max={500}
                onChange={e => setMaxWords(Number(e.target.value))}
              />
            </label>
            <button
              className="capella-btn capella-btn--primary"
              onClick={() => run()}
              disabled={isLoading || !text.trim()}
            >
              {isLoading ? 'Summarising…' : 'Summarise →'}
            </button>
          </div>

          <div className="capella-examples">
            <span className="examples-label">Try an example:</span>
            {EXAMPLES.map((ex, i) => (
              <button key={i} className="example-btn" onClick={() => run(ex)}>
                {ex.slice(0, 65)}…
              </button>
            ))}
          </div>
        </div>

        {/* Output */}
        <div className="capella-output-panel">
          <div className="capella-panel-header">
            <h2 className="panel-heading">Summary</h2>
            <span className="capella-badge capella-badge--db">
              Runs inside the database
            </span>
          </div>

          {isLoading && (
            <div className="capella-loading">
              <div className="capella-spinner" />
              Calling <code>default:ai_summary()</code>…
            </div>
          )}
          {error && <div className="capella-error">{error}</div>}
          {!isLoading && !error && result && (
            <div className="capella-result">
              <p className="capella-result-text">{result.summary}</p>
              <div className="capella-result-footer">
                <span className="capella-source-badge">
                  {result.source === 'capella_ai_summary'
                    ? '⚡ default:ai_summary()'
                    : result.source}
                </span>
              </div>
            </div>
          )}
          {!isLoading && !error && !result && (
            <div className="capella-placeholder">
              The summary will appear here. Summarisation runs as a SQL++ query
              inside Couchbase — no extra LLM call and no server endpoint to deploy.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
