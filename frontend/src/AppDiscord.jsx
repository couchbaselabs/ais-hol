import React from 'react'
import BotOverview from './components/BotOverview'
import BotDemo from './components/BotDemo'
import BotDeploy from './components/BotDeploy'

export const DC_BOT = {
  name: 'Discord',
  logo: '🎮',
  color: '#5865F2',
  heroBg: '#f5f3ff',
  heroBorder: '#ddd6fe',
  title: 'Building a Discord Bot',
  subtitle: 'Slash commands, context menus, and embeds — Discord\'s interaction model is purpose-built for bots',
  deployDesc: 'Register slash commands, handle interactions, and deploy with discord.py or interactions.py.',
  inputPrefix: '/',
  inputPlaceholder: 'ask What is vector search?',
  archSteps: [
    { icon: '👤', label: 'User', desc: 'Types /ask in a Discord channel or DM' },
    { icon: '📡', label: 'Discord API', desc: 'Sends an Interaction object to your interactions endpoint' },
    { icon: '🤖', label: 'Bot Server', desc: 'Verifies Ed25519 signature, defers the response, runs RAG' },
    { icon: '🧠', label: 'LLM + RAG', desc: 'Generates a response using Couchbase vector search' },
    { icon: '💬', label: 'Discord API', desc: 'Bot edits the deferred message with the answer embed' },
  ],
  concepts: [
    { icon: '⚡', title: 'Slash Commands', desc: 'Register application commands via the Discord API. They appear in the / menu with descriptions and typed options. Must respond within 3 seconds.' },
    { icon: '🔐', title: 'Ed25519 Verification', desc: 'Every interaction POST is signed with Ed25519. Verify X-Signature-Ed25519 and X-Signature-Timestamp or Discord will reject your endpoint.' },
    { icon: '⏳', title: 'Deferred Responses', desc: 'For slow operations (like RAG), immediately return type 5 (DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE), then edit the followup when ready.' },
    { icon: '📋', title: 'Embeds', desc: 'Rich message format with title, description, fields, color, and footer. Use embeds to display RAG answers with source citations.' },
    { icon: '🖱️', title: 'Context Menus', desc: 'Right-click on a message → Apps → your command. Lets users run RAG on any message in the channel without typing.' },
    { icon: '🔘', title: 'Components', desc: 'Buttons and select menus attached to messages. Handle via COMPONENT interaction type. Great for follow-up questions.' },
  ],
  builds: [
    '<strong>/ask slash command</strong> — deferred response with a rich embed showing the answer and source citations',
    '<strong>Message context menu</strong> — right-click any message to run RAG on its content',
    '<strong>Button components</strong> — follow-up question buttons attached to each answer embed',
  ],
  demoLeft: (
    <div>
      <h2 style={{ color: '#5865F2' }}>Slash Command Handler</h2>
      <p>Discord sends all interactions as signed POSTs. Verify the signature, defer immediately, then run RAG and edit the followup.</p>
      <div className="bot-demo-flow">
        {[
          ['Verify', 'Ed25519 signature check (required by Discord)'],
          ['Defer', 'Return type 5 within 3 seconds'],
          ['RAG', 'embed → Couchbase search → LLM'],
          ['Edit', 'PATCH /webhooks/{app_id}/{token}/messages/@original'],
        ].map(([n, d], i) => (
          <div key={i} className="bot-demo-flow-step">
            <span className="bot-demo-flow-num" style={{ background: '#5865F2' }}>{i + 1}</span>
            <div><strong>{n}</strong> — {d}</div>
          </div>
        ))}
      </div>
      <pre className="bot-demo-code">{`@app.post("/interactions")
async def discord_interactions(request: Request):
    verify_discord_signature(request)  # Ed25519

    body = await request.json()
    if body["type"] == 1:  # PING
        return {"type": 1}

    if body["type"] == 2:  # APPLICATION_COMMAND
        name = body["data"]["name"]
        if name == "ask":
            question = body["data"]["options"][0]["value"]
            token = body["token"]
            background_tasks.add_task(
                rag_and_followup, question, token)
            return {"type": 5}  # DEFERRED

async def rag_and_followup(question, token):
    answer, sources = await run_rag(question)
    embed = build_embed(answer, sources)
    await edit_original_response(token, embed)`}</pre>
    </div>
  ),
  demoLeft2: {
    'discord-context': (
      <div>
        <h2 style={{ color: '#5865F2' }}>Message Context Menu</h2>
        <p>Right-click any message → Apps → your command. Discord sends a type 2 interaction with the target message content. Defer, run RAG on the message text, reply with an embed.</p>
        <div className="bot-demo-flow">
          {[
            ['Trigger', 'User right-clicks a message → Apps → "Summarise & Ask"'],
            ['Extract', 'body["data"]["resolved"]["messages"][target_id]["content"]'],
            ['RAG', 'Run RAG on the message content as the question'],
            ['Reply', 'Edit deferred response with answer embed'],
          ].map(([n, d], i) => (
            <div key={i} className="bot-demo-flow-step">
              <span className="bot-demo-flow-num" style={{ background: '#5865F2' }}>{i + 1}</span>
              <div><strong>{n}</strong> — {d}</div>
            </div>
          ))}
        </div>
        <pre className="bot-demo-code">{`# Register as type 3 (MESSAGE context menu)
# POST /applications/{app_id}/commands
{
  "name": "Ask RAG about this",
  "type": 3
}

# Handle in /interactions
if body["type"] == 2:  # APPLICATION_COMMAND
    cmd_type = body["data"].get("type", 1)

    if cmd_type == 3:  # MESSAGE context menu
        target_id = body["data"]["target_id"]
        messages  = body["data"]["resolved"]["messages"]
        content   = messages[target_id]["content"]

        background_tasks.add_task(
            rag_and_followup, content, body["token"])
        return {"type": 5}  # DEFERRED`}</pre>
      </div>
    ),
  },
  examples: {
    default: [
      'What is Couchbase Vector Search?',
      'How does RAG work?',
      'What is a vector embedding?',
    ],
    'discord-context': [
      'Summarise this message for me',
      'What does this code do?',
      'Explain this concept in simple terms',
    ],
  },
}

const DEPLOY_STEPS = [
  {
    icon: '🛠️', title: 'Create Discord Application',
    content: (
      <div>
        <p>Go to <a href="https://discord.com/developers/applications" target="_blank" rel="noopener noreferrer">discord.com/developers/applications</a> → <strong>New Application</strong>. Under <strong>Bot</strong>, create a bot and copy the token. Under <strong>General Information</strong>, copy the <strong>Application ID</strong> and <strong>Public Key</strong>.</p>
      </div>
    ),
  },
  {
    icon: '⚡', title: 'Register slash commands',
    content: (
      <div>
        <p>Register commands via the Discord API (run once, or on deploy):</p>
        <pre className="bot-deploy-code">{`curl -X POST \\
  "https://discord.com/api/v10/applications/{APP_ID}/commands" \\
  -H "Authorization: Bot {BOT_TOKEN}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "ask",
    "description": "Ask a question using RAG",
    "options": [{
      "name": "question",
      "description": "Your question",
      "type": 3,
      "required": true
    }]
  }'`}</pre>
      </div>
    ),
  },
  {
    icon: '🔑', title: 'Environment variables',
    content: (
      <div>
        <pre className="bot-deploy-code">{`DISCORD_BOT_TOKEN=MTxxxxxxx
DISCORD_APPLICATION_ID=1234567890
DISCORD_PUBLIC_KEY=abcdef1234...  # Ed25519 public key`}</pre>
      </div>
    ),
  },
  {
    icon: '🚀', title: 'Set interactions endpoint & invite',
    content: (
      <div>
        <p>In the Discord Developer Portal → General Information, set <strong>Interactions Endpoint URL</strong> to your deployed URL. Discord will verify it with a PING.</p>
        <p>Invite the bot to your server using OAuth2 URL with <code>bot</code> and <code>applications.commands</code> scopes.</p>
        <p className="bot-deploy-note">⚠️ Discord requires your interactions endpoint to respond to the PING verification before saving. Deploy first, then set the URL.</p>
      </div>
    ),
  },
]

function renderDCMessage(result, bot) {
  return (
    <div style={{ background: '#36393f', borderRadius: 8, overflow: 'hidden', margin: '0.25rem 0', borderLeft: '4px solid #5865F2' }}>
      <div style={{ padding: '0.65rem 0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#5865F2' }}>🎮 RAG Bot</span>
          <span style={{ fontSize: '0.65rem', color: '#72767d' }}>Today at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div style={{ background: '#2f3136', borderRadius: 4, padding: '0.6rem 0.75rem', borderLeft: '4px solid #5865F2' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#5865F2', marginBottom: '0.3rem' }}>Answer</div>
          <div style={{ fontSize: '0.82rem', color: '#dcddde', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{result.answer}</div>
          {result.sources?.length > 0 && (
            <div style={{ marginTop: '0.5rem', borderTop: '1px solid #40444b', paddingTop: '0.4rem' }}>
              <div style={{ fontSize: '0.68rem', color: '#72767d', marginBottom: '0.25rem' }}>Sources</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                {result.sources.map((s, i) => (
                  <span key={i} style={{ fontSize: '0.68rem', background: '#40444b', color: '#00b0f4', borderRadius: 4, padding: '0.1rem 0.4rem', fontFamily: 'monospace' }}>
                    {s.filepath?.split('/').pop() || s.id}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
          {['🔍 Tell me more', '💡 Show example', '📚 Related'].map((label, i) => (
            <span key={i} style={{ fontSize: '0.7rem', background: '#4f545c', color: '#dcddde', borderRadius: 4, padding: '0.25rem 0.6rem', cursor: 'pointer', border: '1px solid #72767d' }}>
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export function AppDiscordOverview() { return <BotOverview bot={DC_BOT} /> }
export function AppDiscordDemo({ tabId }) { return <BotDemo bot={DC_BOT} endpoint="/api/slack-demo" mode="discord" renderMessage={renderDCMessage} tabId={tabId} /> }
export function AppDiscordDeploy() { return <BotDeploy bot={DC_BOT} steps={DEPLOY_STEPS} /> }
