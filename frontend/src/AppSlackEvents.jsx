import React, { useState } from 'react'
import './AppSlackEvents.css'

const SCENARIOS = [
  {
    id: 'mention',
    label: '@mention in channel',
    icon: '📢',
    event: 'app_mention',
    desc: 'User mentions @RAGBot in a public channel. Bot replies in thread.',
    example: 'Hey @RAGBot, what is Couchbase Vector Search?',
  },
  {
    id: 'dm',
    label: 'Direct message',
    icon: '💬',
    event: 'message.im',
    desc: 'User sends a DM to the bot. Bot replies with conversation memory.',
    example: 'How do I create a vector index?',
  },
  {
    id: 'reaction',
    label: 'Reaction added',
    icon: '⭐',
    event: 'reaction_added',
    desc: 'User reacts with ⭐ to save a message to their Couchbase knowledge base.',
    example: '(React with ⭐ to any message)',
  },
]

function EventPayload({ scenario }) {
  const payloads = {
    mention: `{
  "type": "event_callback",
  "event": {
    "type": "app_mention",
    "user": "U123ABC",
    "text": "<@UBOT> what is Couchbase Vector Search?",
    "channel": "C456DEF",
    "thread_ts": null,
    "ts": "1234567890.123456"
  }
}`,
    dm: `{
  "type": "event_callback",
  "event": {
    "type": "message",
    "channel_type": "im",
    "user": "U123ABC",
    "text": "How do I create a vector index?",
    "channel": "D789GHI",
    "ts": "1234567890.123456"
  }
}`,
    reaction: `{
  "type": "event_callback",
  "event": {
    "type": "reaction_added",
    "user": "U123ABC",
    "reaction": "star",
    "item": {
      "type": "message",
      "channel": "C456DEF",
      "ts": "1234567890.123456"
    }
  }
}`,
  }
  return <pre className="slack-event-payload">{payloads[scenario.id]}</pre>
}

function ThreadReply({ answer, sources, scenario }) {
  return (
    <div className="slack-thread">
      <div className="slack-thread-header">
        <span className="slack-thread-label">Thread reply</span>
      </div>
      <div className="slack-thread-msg">
        <div className="slack-thread-avatar">🤖</div>
        <div className="slack-thread-body">
          <div className="slack-thread-name">RAG Bot <span className="slack-msg-app-badge">APP</span></div>
          <div className="slack-thread-text">{answer}</div>
          {sources && sources.length > 0 && (
            <div className="slack-thread-sources">
              {sources.map((s, i) => (
                <span key={i} className="slack-source-chip">
                  {s.filepath?.split('/').pop() || s.id}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AppSlackEvents() {
  const [activeScenario, setActiveScenario] = useState(SCENARIOS[0])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  async function runDemo() {
    if (activeScenario.id === 'reaction') {
      setResult({ answer: 'Message saved to your knowledge base in Couchbase. React with ⭐ again to remove it.', sources: [] })
      return
    }
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/slack-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: activeScenario.example, mode: 'event' }),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setResult(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function selectScenario(s) {
    setActiveScenario(s)
    setResult(null)
    setError(null)
  }

  return (
    <div className="slack-events-root">
      <div className="slack-events-split">
        {/* Left: scenario picker + payload */}
        <div className="slack-events-left">
          <h2 className="slack-events-title">Event Subscriptions</h2>
          <p className="slack-events-desc">
            Subscribe to Slack events in your app manifest. Slack delivers a JSON payload to your <code>/slack/events</code> endpoint. Always respond <code>200 OK</code> within 3 seconds — use background tasks for slow operations.
          </p>

          <div className="slack-scenario-list">
            {SCENARIOS.map(s => (
              <button
                key={s.id}
                className={`slack-scenario-btn ${activeScenario.id === s.id ? 'slack-scenario-btn--active' : ''}`}
                onClick={() => selectScenario(s)}
              >
                <span className="slack-scenario-icon">{s.icon}</span>
                <div>
                  <div className="slack-scenario-label">{s.label}</div>
                  <div className="slack-scenario-event"><code>{s.event}</code></div>
                </div>
              </button>
            ))}
          </div>

          <div className="slack-payload-label">Slack event payload</div>
          <EventPayload scenario={activeScenario} />

          <pre className="slack-code">{`@app.post("/slack/events")
async def slack_events(request: Request):
    verify_slack_signature(request)
    body = await request.json()

    # URL verification challenge
    if body.get("type") == "url_verification":
        return {"challenge": body["challenge"]}

    event = body.get("event", {})
    event_type = event.get("type")

    if event_type == "app_mention":
        background_tasks.add_task(
            handle_mention, event)
    elif event_type == "message" and \\
         event.get("channel_type") == "im":
        background_tasks.add_task(
            handle_dm, event)
    elif event_type == "reaction_added" and \\
         event.get("reaction") == "star":
        background_tasks.add_task(
            save_to_knowledge_base, event)

    return {"ok": True}`}
          </pre>
        </div>

        {/* Right: live demo */}
        <div className="slack-events-right">
          <div className="slack-demo-header">Simulate event</div>

          <div className="slack-event-demo-body">
            <div className="slack-event-scenario-info">
              <span className="slack-scenario-icon-lg">{activeScenario.icon}</span>
              <div>
                <div className="slack-event-scenario-name">{activeScenario.label}</div>
                <div className="slack-event-scenario-desc">{activeScenario.desc}</div>
              </div>
            </div>

            <div className="slack-event-input-row">
              <div className="slack-event-input-label">Simulated message</div>
              <div className="slack-event-input-val">{activeScenario.example}</div>
            </div>

            <button
              className="slack-event-run-btn"
              onClick={runDemo}
              disabled={loading}
            >
              {loading ? 'Processing…' : `Simulate ${activeScenario.event}`}
            </button>

            {loading && (
              <div className="slack-demo-loading">
                <span className="slack-spinner" />
                Handling event…
              </div>
            )}

            {error && <div className="slack-demo-error">{error}</div>}

            {result && (
              <ThreadReply
                answer={result.answer}
                sources={result.sources}
                scenario={activeScenario}
              />
            )}

            {!result && !loading && !error && (
              <div className="slack-demo-placeholder">
                Click "Simulate" to see the bot's response
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
