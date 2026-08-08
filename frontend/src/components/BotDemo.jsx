import React, { useState } from 'react'
import { useInfoPanelQuestion } from '../hooks/useInfoPanelQuestion'
import './BotDemo.css'

const DEFAULT_EXAMPLES = [
  'What is Couchbase Vector Search?',
  'How do I create a vector index?',
  'What distance metrics does Couchbase support?',
]

export default function BotDemo({ bot, endpoint = '/api/slack-demo', mode = 'slash', renderMessage, tabId }) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  useInfoPanelQuestion(setInput)

  const examples = bot.examples?.[tabId] || bot.examples?.default || DEFAULT_EXAMPLES
  const demoLeft = (tabId && bot.demoLeft2?.[tabId]) ? bot.demoLeft2[tabId] : bot.demoLeft

  async function run(q) {
    const question = q || input.trim()
    if (!question) return
    setLoading(true)
    setError(null)
    setResult(null)
    const t0 = Date.now()
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, mode }),
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
    <div className="bot-demo-root">
      <div className="bot-demo-split">
        {/* Left: code explanation */}
        <div className="bot-demo-left">
          {demoLeft}
        </div>

        {/* Right: live demo */}
        <div className="bot-demo-right">
          <div className="bot-demo-header" style={{ background: bot.color }}>
            {bot.logo} Live preview
          </div>

          <div className="bot-demo-body">
            <div className="bot-demo-input-row">
              {bot.inputPrefix && <span className="bot-demo-prefix" style={{ color: bot.color }}>{bot.inputPrefix}</span>}
              <input
                className="bot-demo-input"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && run()}
                placeholder={bot.inputPlaceholder || 'Type a question…'}
                style={{ '--focus-color': bot.color }}
              />
              <button
                className="bot-demo-btn"
                style={{ background: bot.color }}
                onClick={() => run()}
                disabled={loading || !input.trim()}
              >
                {loading ? '…' : 'Send'}
              </button>
            </div>

            <div className="bot-demo-examples">
              {examples.map((ex, i) => (
                <button
                  key={i}
                  className="bot-demo-example"
                  style={{ '--bot-color': bot.color }}
                  onClick={() => { setInput(ex); run(ex) }}
                >
                  {ex}
                </button>
              ))}
            </div>

            {loading && (
              <div className="bot-demo-loading">
                <span className="bot-demo-spinner" style={{ borderTopColor: bot.color }} />
                Processing…
              </div>
            )}

            {error && <div className="bot-demo-error">{error}</div>}

            {result && renderMessage(result, bot)}

            {!result && !loading && !error && (
              <div className="bot-demo-placeholder">Send a question to see the bot response</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
