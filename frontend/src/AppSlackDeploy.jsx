import React, { useState } from 'react'
import './AppSlackDeploy.css'

const STEPS = [
  {
    id: 'app',
    icon: '🛠️',
    title: 'Create a Slack App',
    content: (
      <div>
        <p>Go to <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer">api.slack.com/apps</a> → <strong>Create New App</strong> → <strong>From manifest</strong>.</p>
        <p>Paste the manifest below. It configures all scopes, event subscriptions, and slash commands in one step.</p>
        <pre className="slack-deploy-code">{`display_information:
  name: RAG Bot
  description: Answers questions using Couchbase RAG
  background_color: "#4A154B"

features:
  bot_user:
    display_name: RAG Bot
    always_online: true
  slash_commands:
    - command: /ask
      url: https://YOUR_DOMAIN/slack/commands
      description: Ask a question using RAG
      usage_hint: "[your question]"
      should_escape: false

oauth_config:
  scopes:
    bot:
      - app_mentions:read
      - channels:history
      - chat:write
      - commands
      - im:history
      - im:write
      - reactions:read

settings:
  event_subscriptions:
    request_url: https://YOUR_DOMAIN/slack/events
    bot_events:
      - app_mention
      - message.im
      - reaction_added
  interactivity:
    is_enabled: false
  org_deploy_enabled: false
  socket_mode_enabled: false`}
        </pre>
      </div>
    ),
  },
  {
    id: 'env',
    icon: '🔑',
    title: 'Configure environment variables',
    content: (
      <div>
        <p>After installing the app to your workspace, copy the tokens from the Slack dashboard.</p>
        <pre className="slack-deploy-code">{`# Slack credentials
SLACK_BOT_TOKEN=xoxb-...        # Bot User OAuth Token
SLACK_SIGNING_SECRET=...        # Signing Secret (Basic Information)

# Existing Couchbase + OpenAI vars
COUCHBASE_CONNECTION_STRING=...
COUCHBASE_USERNAME=...
COUCHBASE_PASSWORD=...
INFERENCE_MODEL_API_KEY=...
EMBEDDING_MODEL_API_KEY=...`}
        </pre>
      </div>
    ),
  },
  {
    id: 'verify',
    icon: '🛡️',
    title: 'Verify Slack signatures',
    content: (
      <div>
        <p>Every request from Slack must be verified using HMAC-SHA256 before processing. Reject anything that fails.</p>
        <pre className="slack-deploy-code">{`import hashlib, hmac, time
from fastapi import HTTPException

def verify_slack_signature(request: Request, body: bytes):
    ts = request.headers.get("X-Slack-Request-Timestamp", "")
    sig = request.headers.get("X-Slack-Signature", "")

    # Reject stale requests (replay attack prevention)
    if abs(time.time() - int(ts)) > 300:
        raise HTTPException(403, "Stale request")

    base = f"v0:{ts}:{body.decode()}"
    expected = "v0=" + hmac.new(
        SLACK_SIGNING_SECRET.encode(),
        base.encode(),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected, sig):
        raise HTTPException(403, "Invalid signature")`}
        </pre>
      </div>
    ),
  },
  {
    id: 'deploy',
    icon: '🚀',
    title: 'Deploy to Render',
    content: (
      <div>
        <p>Add the Slack env vars to your Render service, then update the Request URL in your Slack app manifest to your Render domain.</p>
        <pre className="slack-deploy-code">{`# render.yaml — add to existing service envVars:
- key: SLACK_BOT_TOKEN
  sync: false          # set via Render dashboard
- key: SLACK_SIGNING_SECRET
  sync: false

# After deploy, update your Slack app manifest:
# settings.event_subscriptions.request_url:
#   https://your-app.onrender.com/slack/events
# features.slash_commands[0].url:
#   https://your-app.onrender.com/slack/commands`}
        </pre>
        <p className="slack-deploy-note">⚠️ Render free tier spins down after inactivity. Slack's 3-second timeout will fail on cold starts. Use a paid plan or keep-alive pings for production.</p>
      </div>
    ),
  },
  {
    id: 'test',
    icon: '✅',
    title: 'Test in Slack',
    content: (
      <div>
        <p>Once deployed and the manifest URLs are updated:</p>
        <ol className="slack-deploy-list">
          <li>In Slack, type <code>/ask What is Couchbase Vector Search?</code></li>
          <li>Mention the bot: <code>@RAG Bot how do I create a vector index?</code></li>
          <li>Send a DM directly to the bot</li>
          <li>React with ⭐ to any message to save it</li>
        </ol>
        <p>Check your Render logs for the incoming event payloads and any errors.</p>
      </div>
    ),
  },
]

export default function AppSlackDeploy() {
  const [activeStep, setActiveStep] = useState(STEPS[0].id)
  const step = STEPS.find(s => s.id === activeStep)

  return (
    <div className="slack-deploy-root">
      <h2 className="slack-deploy-title">Deploy your Slack bot</h2>
      <p className="slack-deploy-desc">
        End-to-end guide: create the Slack app, wire up the FastAPI endpoints, verify signatures, and deploy to Render.
      </p>

      <div className="slack-deploy-split">
        {/* Step nav */}
        <div className="slack-deploy-nav">
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              className={`slack-deploy-nav-btn ${activeStep === s.id ? 'slack-deploy-nav-btn--active' : ''}`}
              onClick={() => setActiveStep(s.id)}
            >
              <span className="slack-deploy-nav-num">{i + 1}</span>
              <span className="slack-deploy-nav-icon">{s.icon}</span>
              <span className="slack-deploy-nav-label">{s.title}</span>
            </button>
          ))}
        </div>

        {/* Step content */}
        <div className="slack-deploy-content">
          <div className="slack-deploy-step-header">
            <span className="slack-deploy-step-icon">{step.icon}</span>
            <h3 className="slack-deploy-step-title">{step.title}</h3>
          </div>
          <div className="slack-deploy-step-body">
            {step.content}
          </div>

          <div className="slack-deploy-nav-btns">
            {STEPS.findIndex(s => s.id === activeStep) > 0 && (
              <button
                className="slack-deploy-prev"
                onClick={() => setActiveStep(STEPS[STEPS.findIndex(s => s.id === activeStep) - 1].id)}
              >
                ← Previous
              </button>
            )}
            {STEPS.findIndex(s => s.id === activeStep) < STEPS.length - 1 && (
              <button
                className="slack-deploy-next"
                onClick={() => setActiveStep(STEPS[STEPS.findIndex(s => s.id === activeStep) + 1].id)}
              >
                Next →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
