import React from 'react'
import BotOverview from './components/BotOverview'
import BotDemo from './components/BotDemo'
import BotDeploy from './components/BotDeploy'

export const WA_BOT = {
  name: 'WhatsApp',
  logo: '💬',
  color: '#25D366',
  heroBg: '#f0fdf4',
  heroBorder: '#bbf7d0',
  title: 'Building a WhatsApp Chatbot',
  subtitle: 'Connect your RAG pipeline to WhatsApp via the Meta Cloud API (no Twilio required)',
  deployDesc: 'End-to-end: Meta app setup, webhook verification, phone number registration, and Render deployment.',
  inputPrefix: null,
  inputPlaceholder: 'Type a WhatsApp message…',
  archSteps: [
    { icon: '👤', label: 'User', desc: 'Sends a WhatsApp message to your business number' },
    { icon: '📡', label: 'Meta API', desc: 'Delivers a webhook POST to your /webhook endpoint' },
    { icon: '🤖', label: 'Bot Server', desc: 'Verifies the payload, extracts the message, calls RAG' },
    { icon: '🧠', label: 'LLM + RAG', desc: 'Generates a response using Couchbase vector search' },
    { icon: '💬', label: 'Meta API', desc: 'Bot sends reply via messages.send with the phone number ID' },
  ],
  concepts: [
    { icon: '🔑', title: 'Meta App & Phone Number', desc: 'Create a Meta Business app, add the WhatsApp product, and register a test phone number. Production requires business verification.' },
    { icon: '🪝', title: 'Webhook Verification', desc: 'Meta sends a GET with hub.challenge on setup. Your endpoint must echo it back. Every POST is signed with X-Hub-Signature-256.' },
    { icon: '📨', title: 'Message Types', desc: 'Text, image, audio, document, location, interactive (buttons/lists). Parse entry[0].changes[0].value.messages[0] to get the content.' },
    { icon: '📞', title: 'Phone Number ID', desc: 'Each message includes the phone_number_id. Use it (not the display number) in the send API call.' },
    { icon: '✅', title: 'Message Status', desc: 'Webhooks also deliver delivery receipts (sent, delivered, read). Filter by object === "whatsapp_business_account".' },
    { icon: '🔄', title: 'Session Memory', desc: 'WhatsApp has no built-in session concept. Store conversation history in Couchbase keyed by the user\'s phone number (wa_id).' },
  ],
  builds: [
    '<strong>Text message handler</strong> — receives any WhatsApp message and replies with a RAG-generated answer',
    '<strong>Interactive buttons</strong> — sends follow-up questions as WhatsApp button messages for guided conversations',
    '<strong>Session memory</strong> — stores per-user conversation history in Couchbase keyed by phone number',
  ],
  demoLeft: (
    <div>
      <h2 style={{ color: '#25D366' }}>Webhook Handler</h2>
      <p>Meta delivers messages as JSON webhooks. Verify the signature, extract the message text, run RAG, and reply via the Messages API.</p>
      <div className="bot-demo-flow">
        {[
          ['Verify', 'X-Hub-Signature-256 HMAC-SHA256 check'],
          ['Extract', 'entry[0].changes[0].value.messages[0]'],
          ['RAG', 'embed → Couchbase search → LLM'],
          ['Reply', 'POST /messages with phone_number_id'],
        ].map(([n, d], i) => (
          <div key={i} className="bot-demo-flow-step">
            <span className="bot-demo-flow-num" style={{ background: '#25D366' }}>{i + 1}</span>
            <div><strong>{n}</strong> — {d}</div>
          </div>
        ))}
      </div>
      <pre className="bot-demo-code">{`@app.post("/webhook")
async def whatsapp_webhook(request: Request):
    verify_meta_signature(request)
    body = await request.json()
    msg = (body["entry"][0]["changes"][0]
               ["value"]["messages"][0])
    phone_id = (body["entry"][0]["changes"][0]
                    ["value"]["metadata"]["phone_number_id"])
    text = msg["text"]["body"]
    wa_id = msg["from"]

    background_tasks.add_task(
        handle_and_reply, text, wa_id, phone_id)
    return {"status": "ok"}

async def handle_and_reply(text, wa_id, phone_id):
    history = await get_history(wa_id)
    embedding = await get_embedding(text)
    docs = await get_relevant_documents(embedding)
    answer = await generate_response(text, docs, history)
    await save_message(wa_id, text, answer)
    await send_whatsapp(phone_id, wa_id, answer)`}</pre>
    </div>
  ),
  demoLeft2: {
    'whatsapp-memory': (
      <div>
        <h2 style={{ color: '#25D366' }}>Session Memory</h2>
        <p>WhatsApp has no built-in session concept. Store conversation history in Couchbase keyed by the user's <code>wa_id</code> (phone number) and include it in every LLM prompt for multi-turn conversations.</p>
        <div className="bot-demo-flow">
          {[
            ['Load', 'Fetch history from Couchbase key "whatsapp::{wa_id}"'],
            ['Prompt', 'Prepend history as alternating user/assistant messages'],
            ['RAG', 'embed → Couchbase search → LLM with history context'],
            ['Save', 'Append new turn, trim to last N, set TTL'],
          ].map(([n, d], i) => (
            <div key={i} className="bot-demo-flow-step">
              <span className="bot-demo-flow-num" style={{ background: '#25D366' }}>{i + 1}</span>
              <div><strong>{n}</strong> — {d}</div>
            </div>
          ))}
        </div>
        <pre className="bot-demo-code">{`HISTORY_KEY = "whatsapp::{wa_id}"
MAX_TURNS = 10
TTL_SECONDS = 3600  # 1 hour

async def get_history(wa_id: str) -> list:
    try:
        result = await cb.get(HISTORY_KEY.format(wa_id=wa_id))
        return result.content_as[dict].get("turns", [])
    except DocumentNotFoundException:
        return []

async def save_history(wa_id, user_msg, assistant_msg):
    history = await get_history(wa_id)
    history.append({"role": "user",      "content": user_msg})
    history.append({"role": "assistant", "content": assistant_msg})
    history = history[-(MAX_TURNS * 2):]  # keep last N turns
    await cb.upsert(
        HISTORY_KEY.format(wa_id=wa_id),
        {"turns": history},
        UpsertOptions(expiry=timedelta(seconds=TTL_SECONDS)),
    )`}</pre>
      </div>
    ),
  },
  examples: {
    default: [
      'What is Couchbase Vector Search?',
      'How does RAG work?',
      'What is a vector embedding?',
    ],
    'whatsapp-memory': [
      'Tell me about vector search',
      'Can you give me an example?',
      'How is that different from keyword search?',
    ],
  },
}

const DEPLOY_STEPS = [
  {
    icon: '🛠️', title: 'Create Meta App',
    content: (
      <div>
        <p>Go to <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer">developers.facebook.com/apps</a> → <strong>Create App</strong> → <strong>Business</strong> → add <strong>WhatsApp</strong> product.</p>
        <p>Under WhatsApp → Getting Started, note your <strong>Phone Number ID</strong> and <strong>Temporary Access Token</strong>. Add a test recipient phone number.</p>
      </div>
    ),
  },
  {
    icon: '🪝', title: 'Register webhook',
    content: (
      <div>
        <p>Under WhatsApp → Configuration, set your webhook URL and a verify token of your choice.</p>
        <pre className="bot-deploy-code">{`@app.get("/webhook")
async def verify_webhook(
    hub_mode: str = Query(alias="hub.mode"),
    hub_challenge: str = Query(alias="hub.challenge"),
    hub_verify_token: str = Query(alias="hub.verify_token"),
):
    if hub_verify_token == WEBHOOK_VERIFY_TOKEN:
        return PlainTextResponse(hub_challenge)
    raise HTTPException(403)`}</pre>
        <p>Subscribe to the <code>messages</code> webhook field.</p>
      </div>
    ),
  },
  {
    icon: '🔑', title: 'Environment variables',
    content: (
      <div>
        <pre className="bot-deploy-code">{`WHATSAPP_TOKEN=EAAxxxxxxx   # Access Token
WHATSAPP_PHONE_NUMBER_ID=1234567890
WEBHOOK_VERIFY_TOKEN=my-secret-token
WHATSAPP_API_URL=https://graph.facebook.com/v19.0`}</pre>
      </div>
    ),
  },
  {
    icon: '🚀', title: 'Deploy & go live',
    content: (
      <div>
        <p>Deploy to Render, update the webhook URL in Meta dashboard, then send a WhatsApp message to your test number.</p>
        <p className="bot-deploy-note">⚠️ Production requires Meta Business Verification and a permanent phone number. The test number works for up to 5 recipient numbers.</p>
      </div>
    ),
  },
]

function renderWAMessage(result, bot) {
  return (
    <div style={{ background: '#e9fbe9', borderRadius: 8, padding: '0.75rem', margin: '0.25rem 0' }}>
      <div style={{ fontSize: '0.68rem', color: '#25D366', fontWeight: 700, marginBottom: '0.3rem' }}>RAG Bot · WhatsApp</div>
      <div style={{ fontSize: '0.82rem', color: '#111827', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{result.answer}</div>
      {result.sources?.length > 0 && (
        <div style={{ marginTop: '0.4rem', display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
          {result.sources.map((s, i) => (
            <span key={i} style={{ fontSize: '0.68rem', background: '#d1fae5', color: '#065f46', borderRadius: 4, padding: '0.1rem 0.4rem', fontFamily: 'monospace' }}>
              {s.filepath?.split('/').pop() || s.id}
            </span>
          ))}
        </div>
      )}
      <div style={{ fontSize: '0.65rem', color: '#9ca3af', marginTop: '0.3rem', textAlign: 'right' }}>
        {result.latencyMs}ms · {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ✓✓
      </div>
    </div>
  )
}

export function AppWhatsAppOverview() { return <BotOverview bot={WA_BOT} /> }
export function AppWhatsAppDemo({ tabId }) { return <BotDemo bot={WA_BOT} endpoint="/api/slack-demo" mode="whatsapp" renderMessage={renderWAMessage} tabId={tabId} /> }
export function AppWhatsAppDeploy() { return <BotDeploy bot={WA_BOT} steps={DEPLOY_STEPS} /> }
