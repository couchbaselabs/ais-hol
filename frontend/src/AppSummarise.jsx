import React, { useState } from 'react'
import './App.css'
import './AppSummarise.css'

/**
 * Long-context Summarisation tab — map-reduce pipeline for long documents.
 *
 * Shows the chunking, per-chunk summaries (Map step), and the final
 * combined summary (Reduce step) so the pipeline is fully transparent.
 */

const SAMPLE_TEXT = `The World Wide Web (WWW), commonly known as the Web, is an information system that enables content sharing over the Internet through user-friendly ways meant to appeal to users beyond IT specialists and hobbyists. It allows documents and other web resources to be accessed over the Internet according to specific rules of the Hypertext Transfer Protocol (HTTP).

The Web was invented by English computer scientist Tim Berners-Lee while at CERN in 1989 and opened to the public in 1991. Documents and downloadable media are made available to the network through web servers and can be accessed by programs such as web browsers. Servers and resources on the World Wide Web are identified and located through character strings called uniform resource locators (URLs).

The original and still very common document type is a web page formatted in Hypertext Markup Language (HTML). This markup language supports plain text, images, embedded video and audio contents, and scripts (short programs) that implement complex user interaction. The HTML language also supports hyperlinks (embedded URLs) which provide immediate access to other web resources. Web navigation, or web surfing, is the common practice of following such hyperlinks across multiple websites.

Web applications are web pages that function as application software. The information in the Web is transferred across the Internet using HTTP. Multiple web resources with a common theme and usually a common domain name make up a website. A single web server may provide multiple websites, while some websites, especially the most popular ones, may be provided by multiple servers.

Website content is provided by a myriad of companies, organizations, government agencies, and individual users; and comprises an enormous mass of educational, entertainment, commercial, and government information. The Web has become the world's dominant software platform. It is the primary tool billions of people worldwide use to interact with the Internet.

Berners-Lee proposed building a global hypertext system in 1989 while working at CERN. Initially called "Mesh", it was renamed the World Wide Web when implemented in 1990. On 30 April 1993, CERN announced that the World Wide Web would be free to use for anyone, contributing to the immense growth of the Web.

The Web began to enter everyday use in 1993–1994, when websites for general use started to become available. The Web has been central to the development of the Information Age and is the primary tool billions of people use to interact with the Internet. The Web has also become a major platform for commerce, entertainment, and social networking.

CSS (Cascading Style Sheets) is a style sheet language used for describing the presentation of a document written in a markup language such as HTML or XML. CSS is a cornerstone technology of the World Wide Web, alongside HTML and JavaScript. CSS is designed to enable the separation of presentation and content, including layout, colors, and fonts. This separation can improve content accessibility; provide more flexibility and control in the specification of presentation characteristics; enable multiple web pages to share formatting by specifying the relevant CSS in a separate .css file, which reduces complexity and repetition in the structural content; and enable the .css file to be cached to improve the page load speed between the pages that share the file and its formatting.

JavaScript, often abbreviated as JS, is a programming language that is one of the core technologies of the World Wide Web, alongside HTML and CSS. As of 2023, 98.7% of websites use JavaScript on the client side for webpage behavior, often incorporating third-party libraries. All major web browsers have a dedicated JavaScript engine to execute the code on users' devices. JavaScript is a high-level, often just-in-time compiled language that conforms to the ECMAScript standard. It has dynamic typing, prototype-based object-orientation, and first-class functions. It is multi-paradigm, supporting event-driven, functional, and imperative programming styles. It has application programming interfaces (APIs) for working with text, dates, regular expressions, standard data structures, and the Document Object Model (DOM).`

function AppSummarise() {
  const [text, setText] = useState('')
  const [focus, setFocus] = useState('')
  const [result, setResult] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const run = async (overrideText) => {
    const t = overrideText || text
    if (!t.trim()) return
    setText(t)
    setIsLoading(true)
    setError(null)
    setResult(null)
    try {
      const response = await fetch('/api/summarise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: t, focus: focus.trim() || null }),
      })
      if (!response.ok) throw new Error('Request failed')
      setResult(await response.json())
    } catch {
      setError('Request failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0

  return (
    <div className="app summarise-app">
      <div className="summarise-controls">
        <div className="summarise-input-row">
          <textarea
            className="summarise-textarea"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Paste a long document here (articles, documentation, reports)…"
            rows={5}
          />
          <div className="summarise-sidebar">
            <div className="word-count">{wordCount.toLocaleString()} words</div>
            <input
              className="focus-input"
              value={focus}
              onChange={e => setFocus(e.target.value)}
              placeholder="Optional focus (e.g. 'technical details')"
            />
            <button
              className="summarise-btn"
              onClick={() => run()}
              disabled={isLoading || !text.trim()}
            >
              {isLoading ? 'Summarising…' : 'Summarise →'}
            </button>
            <button
              className="sample-btn"
              onClick={() => run(SAMPLE_TEXT)}
              disabled={isLoading}
            >
              Load sample text
            </button>
          </div>
        </div>
      </div>

      {error && <div className="summarise-error">{error}</div>}

      {result && (
        <div className="summarise-results">
          {/* Stats bar */}
          <div className="summarise-stats">
            <span className="stat-chip">{result.total_words.toLocaleString()} words input</span>
            <span className="stat-chip">÷ {result.num_chunks} chunks</span>
            <span className="stat-chip">~{result.total_tokens_used} tokens used</span>
          </div>

          <div className="summarise-layout">
            {/* Map column */}
            <div className="summarise-col">
              <div className="summarise-col-heading">
                <span className="step-badge step-badge--map">Map</span>
                Per-chunk summaries ({result.chunk_summaries.length})
              </div>
              <div className="chunk-list">
                {result.chunk_summaries.map((chunk, i) => (
                  <div key={i} className="chunk-card">
                    <div className="chunk-header">
                      <span className="chunk-label">Chunk {chunk.index + 1}</span>
                      <span className="chunk-words">{chunk.word_count} words</span>
                      <span className="chunk-tokens">{chunk.tokens} tok out</span>
                    </div>
                    <p className="chunk-summary">{chunk.summary}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Arrow */}
            <div className="summarise-arrow">→</div>

            {/* Reduce column */}
            <div className="summarise-col summarise-col--reduce">
              <div className="summarise-col-heading">
                <span className="step-badge step-badge--reduce">Reduce</span>
                Final summary
              </div>
              <div className="final-summary-card">
                <p className="final-summary-text">{result.final_summary}</p>
              </div>
              <p className="reduce-note">
                The Reduce step receives all {result.num_chunks} chunk summaries and combines them into one coherent summary — without ever seeing the full original text.
              </p>
            </div>
          </div>
        </div>
      )}

      {!result && !isLoading && (
        <div className="summarise-placeholder">
          Paste a long document or load the sample text to see the map-reduce pipeline in action.
        </div>
      )}
    </div>
  )
}

export default AppSummarise
