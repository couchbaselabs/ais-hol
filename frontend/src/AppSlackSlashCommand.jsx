import React, { useState } from 'react'
import './AppSlackSlashCommand.css'

const EXAMPLES = [
  'What is Couchbase Vector Search?',
  'How do I create a vector index?',
  'What distance metrics does Couchbase support?',
]

// Simulates what the Slack Block Kit response would look like
function SlackMessage({ question, answer, sources, latencyMs }) {
  return (
    <div className="slack-msg">
      <div className="slack-msg-header">
        <div className="slack-msg-bot">
          <div className="slack-msg-avatar">🤖</div>
          <div>
            <span className="slack-msg-name">RAG Bot</span>
            <span className="slack-msg-app-badge">APP</span>
          </div>
        </div>
        <span className="slack-msg-time">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>

      {/* Block Kit: section block */}
      <div className="slack-block slack-block--section">
        <div className="slack-block-text">{answer}</div>
      </div>

      {/* Block Kit: divider */}
      <div className="slack-block-divider" />

      {/* Block Kit: context block with sources */}
      {sources && sources.length > 0 && (
        <div className="slack-block slack-block--context">
          <span className="slack-context-label">📎 Sources:</span>
          {sources.map((s, i) => (
            <span key={i} className="slack-source-chip">
              {s.filepath?.split('/').pop() || s.id}
            </span>
          ))}
        </div>
      )}

      {/* Block Kit: context block with meta */}
      <div className="slack-block slack-block--context slack-block--meta">
        <span>⚡ {latencyMs}ms</span>
        <span>·</span>
        <span>Powered by Couchbase RAG</span>
      </div>
    </div>
  )
}

export default function AppSlackSlashCommand() {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  async function runDemo(q) {
    const question = q || input.trim()
    if (!question) return
    setLoading(true)
    setError(null)
    setResult(null)
    const t0 = Date.now()
    try {
      const res = await fetch('/api/slack-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, mode: 'slash' }),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setResult({ ...data, latencyMs: Date.now() - t0, question })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="slack-cmd-root">
      <div className="slack-cmd-split">
        {/* Left: code + explanation */}
        <div className="slack-cmd-left">
          <h2 className="slack-cmd-title">Slash Command: <code>/ask</code></h2>
          <p className="slack-cmd-desc">
            A slash command sends a form-encoded POST to your bot's URL. You must respond within 3 seconds — for slow RAG queries, acknowledge immediately and post the answer via <code>response_url</code>.
          </p>

          <div className="slack-cmd-flow">
            <div className="slack-flow-step">
              <span className="slack-flow-num">1</span>
              <div>
                <strong>User types</strong> <code>/ask What is vector search?</code>
              </div>
            </div>
            <div className="slack-flow-step">
              <span className="slack-flow-num">2</span>
              <div>
                <strong>Slack POSTs</strong> to your <code>/slack/commands</code> endpoint with <code>text=What is vector search?</code>
              </div>
            </div>
            <div className="slack-flow-step">
              <span className="slack-flow-num">3</span>
              <div>
                <strong>Bot responds</strong> <code>200 OK</code> immediately with <code>{'{"response_type": "in_channel"}'}</code> and queues the RAG call
              </div>
            </div>
            <div className="slack-flow-step">
              <span className="slack-flow-num">4</span>
              <div>
                <strong>Bot POSTs</strong> the answer to <code>response_url</code> with Block Kit formatting
              </div>
            </div>
          </div>

          <pre className="slack-code">{`@app.post("/slack/commands")
async def slack_command(
    text: str = Form(...),
    response_url: str = Form(...),
    user_id: str = Form(...),
):
    # Verify Slack signature first
    verify_slack_signature(request)

    # Acknowledge immediately (< 3s)
    background_tasks.add_task(
        handle_rag_and_reply,
        question=text,
        response_url=response_url,
        user_id=user_id,
    )
    return {"response_type": "in_channel",
            "text": "Searching…"}

async def handle_rag_and_reply(question, response_url, user_id):
    embedding = await get_embedding(question)
    docs = await get_relevant_documents(embedding)
    answer = await generate_response(question, docs)
    # Post back to Slack via response_url
    await httpx.post(response_url, json=build_blocks(answer, docs))`}
          </pre>
        </div>

        {/* Right: live demo */}
        <div className="slack-cmd-right">
          <div className="slack-demo-header">Live preview</div>
          <div className="slack-demo-input-row">
            <span className="slack-cmd-prefix">/ask</span>
            <input
              className="slack-demo-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && runDemo()}
              placeholder="Type a question…"
            />
            <button
              className="slack-demo-btn"
              onClick={() => runDemo()}
              disabled={loading || !input.trim()}
            >
              {loading ? '…' : 'Send'}
            </button>
          </div>

          <div className="slack-examples-row">
            {EXAMPLES.map((ex, i) => (
              <button key={i} className="slack-example-chip" onClick={() => { setInput(ex); runDemo(ex) }}>
                {ex}
              </button>
            ))}
          </div>

          {loading && (
            <div className="slack-demo-loading">
              <span className="slack-spinner" />
              RAG pipeline running…
            </div>
          )}

          {error && <div className="slack-demo-error">{error}</div>}

          {result && (
            <SlackMessage
              question={result.question}
              answer={result.answer}
              sources={result.sources}
              latencyMs={result.latencyMs}
            />
          )}

          {!result && !loading && !error && (
            <div className="slack-demo-placeholder">
              Send a question to see the Slack Block Kit response
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
