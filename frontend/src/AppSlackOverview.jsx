import React from 'react'
import './AppSlackOverview.css'

const SLACK_PURPLE = '#4A154B'

const ARCH_STEPS = [
  {
    icon: '👤',
    label: 'User',
    desc: 'Types a message or slash command in Slack',
  },
  {
    icon: '⚡',
    label: 'Slack API',
    desc: 'Delivers an HTTP POST event to your bot\'s Request URL within 3 s',
  },
  {
    icon: '🤖',
    label: 'Bot Server',
    desc: 'FastAPI app verifies the Slack signature, processes the event, calls the LLM',
  },
  {
    icon: '🧠',
    label: 'LLM + RAG',
    desc: 'Generates a response, optionally retrieving context from Couchbase',
  },
  {
    icon: '💬',
    label: 'Slack API',
    desc: 'Bot posts the reply back to the channel via chat.postMessage',
  },
]

const CONCEPTS = [
  {
    title: 'OAuth & App Installation',
    icon: '🔑',
    desc: 'Users install your app via OAuth 2.0. Slack issues a bot token (xoxb-…) scoped to the workspace. Store it per-workspace in Couchbase.',
  },
  {
    title: 'Event Subscriptions',
    icon: '📡',
    desc: 'Subscribe to events like app_mention or message.im. Slack sends a JSON payload to your Request URL. You must respond with HTTP 200 within 3 seconds — offload slow work to a background task.',
  },
  {
    title: 'Slash Commands',
    icon: '/',
    desc: 'Register /ask, /search, etc. in your app manifest. Slack sends a form-encoded POST. Respond immediately with an ephemeral or in-channel message, or use response_url for delayed replies.',
  },
  {
    title: 'Signature Verification',
    icon: '🛡️',
    desc: 'Every request from Slack includes X-Slack-Signature (HMAC-SHA256 of the raw body). Always verify before processing — reject anything that fails.',
  },
  {
    title: 'Socket Mode',
    icon: '🔌',
    desc: 'For development: connect via WebSocket instead of exposing a public URL. No ngrok needed. Switch to HTTP events for production.',
  },
  {
    title: 'Block Kit',
    icon: '🧱',
    desc: 'Slack\'s UI framework for rich messages — buttons, dropdowns, modals. Use it to show RAG sources, confidence scores, or follow-up actions.',
  },
]

export default function AppSlackOverview() {
  return (
    <div className="slack-root">
      <div className="slack-hero">
        <div className="slack-hero-icon">
          <svg viewBox="0 0 54 54" width="48" height="48" xmlns="http://www.w3.org/2000/svg">
            <path d="M19.712.133a5.381 5.381 0 0 0-5.376 5.387 5.381 5.381 0 0 0 5.376 5.386h5.376V5.52A5.381 5.381 0 0 0 19.712.133m0 14.365H5.376A5.381 5.381 0 0 0 0 19.884a5.381 5.381 0 0 0 5.376 5.387h14.336a5.381 5.381 0 0 0 5.376-5.387 5.381 5.381 0 0 0-5.376-5.386" fill="#36C5F0"/>
            <path d="M53.76 19.884a5.381 5.381 0 0 0-5.376-5.386 5.381 5.381 0 0 0-5.376 5.386v5.387h5.376a5.381 5.381 0 0 0 5.376-5.387m-14.336 0V5.52A5.381 5.381 0 0 0 34.048.133a5.381 5.381 0 0 0-5.376 5.387v14.364a5.381 5.381 0 0 0 5.376 5.387 5.381 5.381 0 0 0 5.376-5.387" fill="#2EB67D"/>
            <path d="M34.048 54a5.381 5.381 0 0 0 5.376-5.387 5.381 5.381 0 0 0-5.376-5.386h-5.376v5.386A5.381 5.381 0 0 0 34.048 54m0-14.365h14.336a5.381 5.381 0 0 0 5.376-5.386 5.381 5.381 0 0 0-5.376-5.387H34.048a5.381 5.381 0 0 0-5.376 5.387 5.381 5.381 0 0 0 5.376 5.386" fill="#ECB22E"/>
            <path d="M0 34.249a5.381 5.381 0 0 0 5.376 5.386 5.381 5.381 0 0 0 5.376-5.386v-5.387H5.376A5.381 5.381 0 0 0 0 34.249m14.336 0v14.364A5.381 5.381 0 0 0 19.712 54a5.381 5.381 0 0 0 5.376-5.387V34.249a5.381 5.381 0 0 0-5.376-5.387 5.381 5.381 0 0 0-5.376 5.387" fill="#E01E5A"/>
          </svg>
        </div>
        <div>
          <h1 className="slack-hero-title">Building a Slack Chatbot</h1>
          <p className="slack-hero-sub">Connect your RAG pipeline to Slack — slash commands, @mentions, and rich Block Kit responses</p>
        </div>
      </div>

      <section className="slack-section">
        <h2 className="slack-section-title">Request flow</h2>
        <div className="slack-arch">
          {ARCH_STEPS.map((step, i) => (
            <React.Fragment key={i}>
              <div className="slack-arch-step">
                <div className="slack-arch-icon">{step.icon}</div>
                <div className="slack-arch-label">{step.label}</div>
                <div className="slack-arch-desc">{step.desc}</div>
              </div>
              {i < ARCH_STEPS.length - 1 && <div className="slack-arch-arrow">→</div>}
            </React.Fragment>
          ))}
        </div>
      </section>

      <section className="slack-section">
        <h2 className="slack-section-title">Key concepts</h2>
        <div className="slack-concepts">
          {CONCEPTS.map((c, i) => (
            <div key={i} className="slack-concept-card">
              <div className="slack-concept-icon">{c.icon}</div>
              <div>
                <div className="slack-concept-title">{c.title}</div>
                <div className="slack-concept-desc">{c.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="slack-section">
        <h2 className="slack-section-title">What you'll build</h2>
        <div className="slack-build-list">
          <div className="slack-build-item">
            <span className="slack-build-num">1</span>
            <div>
              <strong>/ask [question]</strong> — slash command that queries your Couchbase RAG pipeline and returns a cited answer
            </div>
          </div>
          <div className="slack-build-item">
            <span className="slack-build-num">2</span>
            <div>
              <strong>@mention handler</strong> — responds to direct mentions in any channel with a conversational reply using session memory
            </div>
          </div>
          <div className="slack-build-item">
            <span className="slack-build-num">3</span>
            <div>
              <strong>Block Kit response</strong> — formats answers with source citations as clickable buttons and a confidence indicator
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
