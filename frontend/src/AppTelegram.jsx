import React from 'react'
import BotOverview from './components/BotOverview'
import BotDemo from './components/BotDemo'
import BotDeploy from './components/BotDeploy'

export const TG_BOT = {
  name: 'Telegram',
  logo: '✈️',
  color: '#229ED9',
  heroBg: '#eff8ff',
  heroBorder: '#bfdbfe',
  title: 'Building a Telegram Bot',
  subtitle: 'The simplest bot API — no app review, instant setup via @BotFather, webhooks or polling',
  deployDesc: 'Create a bot with @BotFather, set a webhook, and deploy to Render in minutes.',
  inputPrefix: '/',
  inputPlaceholder: 'ask What is vector search?',
  archSteps: [
    { icon: '👤', label: 'User', desc: 'Sends a message or /command to your bot' },
    { icon: '📡', label: 'Telegram API', desc: 'Delivers an Update object to your webhook URL' },
    { icon: '🤖', label: 'Bot Server', desc: 'Parses the Update, routes to the right handler' },
    { icon: '🧠', label: 'LLM + RAG', desc: 'Generates a response using Couchbase vector search' },
    { icon: '💬', label: 'Telegram API', desc: 'Bot calls sendMessage with chat_id and text' },
  ],
  concepts: [
    { icon: '🤖', title: '@BotFather', desc: 'Create a bot with /newbot, get a token. Register commands with /setcommands. No app review needed.' },
    { icon: '🪝', title: 'Webhook vs Polling', desc: 'Webhook: Telegram POSTs updates to your URL (production). Polling: bot calls getUpdates in a loop (local dev, no public URL needed).' },
    { icon: '📨', title: 'Update Object', desc: 'Every event is an Update with an update_id. Contains message, callback_query, inline_query, etc. Always acknowledge by returning 200.' },
    { icon: '⌨️', title: 'Commands', desc: 'Register /ask, /search, /help. Telegram shows them in the command menu. Parse with message.text.startswith("/ask").' },
    { icon: '🔘', title: 'Inline Keyboards', desc: 'Send reply_markup with InlineKeyboardButton for follow-up actions. Handle button presses via callback_query updates.' },
    { icon: '🔒', title: 'Secret Token', desc: 'Set a secret_token when registering the webhook. Telegram sends it in X-Telegram-Bot-Api-Secret-Token header for verification.' },
  ],
  builds: [
    '<strong>/ask command</strong> — queries the RAG pipeline and returns a cited answer with inline source buttons',
    '<strong>Free-text handler</strong> — responds to any message (not just commands) with conversational RAG',
    '<strong>Inline keyboard</strong> — offers follow-up question suggestions as tappable buttons after each answer',
  ],
  demoLeft: (
    <div>
      <h2 style={{ color: '#229ED9' }}>Command & Message Handler</h2>
      <p>Telegram sends all events as Update objects. Route by type: commands go to the command handler, plain text to the RAG handler.</p>
      <div className="bot-demo-flow">
        {[
          ['Receive', 'POST /webhook — Update object from Telegram'],
          ['Route', 'message.text starts with "/" → command handler'],
          ['RAG', 'embed → Couchbase search → LLM'],
          ['Reply', 'sendMessage(chat_id, answer, reply_markup)'],
        ].map(([n, d], i) => (
          <div key={i} className="bot-demo-flow-step">
            <span className="bot-demo-flow-num" style={{ background: '#229ED9' }}>{i + 1}</span>
            <div><strong>{n}</strong> — {d}</div>
          </div>
        ))}
      </div>
      <pre className="bot-demo-code">{`@app.post("/webhook")
async def telegram_webhook(
    request: Request,
    x_telegram_bot_api_secret_token: str = Header(None),
):
    if x_telegram_bot_api_secret_token != SECRET_TOKEN:
        raise HTTPException(403)

    update = await request.json()
    message = update.get("message", {})
    text = message.get("text", "")
    chat_id = message["chat"]["id"]

    if text.startswith("/ask "):
        question = text[5:].strip()
    elif not text.startswith("/"):
        question = text
    else:
        return {"ok": True}

    background_tasks.add_task(
        rag_and_reply, question, chat_id)
    return {"ok": True}`}</pre>
    </div>
  ),
  demoLeft2: {
    'telegram-inline': (
      <div>
        <h2 style={{ color: '#229ED9' }}>Inline Keyboards</h2>
        <p>Attach tappable buttons to any message using <code>reply_markup</code>. When a user taps a button, Telegram sends a <code>callback_query</code> Update with the button's <code>callback_data</code>.</p>
        <div className="bot-demo-flow">
          {[
            ['Answer', 'Run RAG, generate the response text'],
            ['Buttons', 'Build InlineKeyboardMarkup with follow-up suggestions'],
            ['Send', 'sendMessage with reply_markup attached'],
            ['Handle', 'callback_query → answerCallbackQuery + new RAG call'],
          ].map(([n, d], i) => (
            <div key={i} className="bot-demo-flow-step">
              <span className="bot-demo-flow-num" style={{ background: '#229ED9' }}>{i + 1}</span>
              <div><strong>{n}</strong> — {d}</div>
            </div>
          ))}
        </div>
        <pre className="bot-demo-code">{`def build_inline_keyboard(suggestions: list[str]):
    return {
        "inline_keyboard": [[
            {"text": s, "callback_data": f"followup:{s[:60]}"}
            for s in suggestions
        ]]
    }

async def send_rag_reply(chat_id, answer, suggestions):
    await telegram_api("sendMessage", {
        "chat_id": chat_id,
        "text": answer,
        "parse_mode": "Markdown",
        "reply_markup": build_inline_keyboard(suggestions),
    })

# Handle button press
async def handle_callback(update):
    query = update["callback_query"]
    data  = query["data"]          # "followup:Tell me more"
    chat_id = query["message"]["chat"]["id"]
    # Acknowledge immediately (removes loading spinner)
    await telegram_api("answerCallbackQuery",
        {"callback_query_id": query["id"]})
    if data.startswith("followup:"):
        question = data[9:]
        await rag_and_reply(question, chat_id)`}</pre>
      </div>
    ),
  },
  examples: {
    default: [
      'What is Couchbase Vector Search?',
      'How does RAG work?',
      'What is a vector embedding?',
    ],
    'telegram-inline': [
      'Explain vector search',
      'What distance metrics are supported?',
      'How do I create a vector index?',
    ],
  },
}

const DEPLOY_STEPS = [
  {
    icon: '🤖', title: 'Create bot with @BotFather',
    content: (
      <div>
        <p>Open Telegram, search for <strong>@BotFather</strong>, and send <code>/newbot</code>. Choose a name and username (must end in "bot"). Copy the <strong>API token</strong>.</p>
        <p>Register your commands: send <code>/setcommands</code> to @BotFather and paste:</p>
        <pre className="bot-deploy-code">{`ask - Ask a question using RAG
help - Show available commands`}</pre>
      </div>
    ),
  },
  {
    icon: '🪝', title: 'Register webhook',
    content: (
      <div>
        <p>After deploying, register your webhook URL with Telegram:</p>
        <pre className="bot-deploy-code">{`curl "https://api.telegram.org/bot{TOKEN}/setWebhook" \\
  -d url=https://your-app.onrender.com/webhook \\
  -d secret_token=your-secret-token`}</pre>
        <p>Verify with <code>getWebhookInfo</code>.</p>
      </div>
    ),
  },
  {
    icon: '🔑', title: 'Environment variables',
    content: (
      <div>
        <pre className="bot-deploy-code">{`TELEGRAM_BOT_TOKEN=1234567890:AAxxxxxxx
TELEGRAM_SECRET_TOKEN=my-secret-token
TELEGRAM_API_URL=https://api.telegram.org`}</pre>
      </div>
    ),
  },
  {
    icon: '🚀', title: 'Deploy & test',
    content: (
      <div>
        <p>Deploy to Render, register the webhook, then message your bot on Telegram.</p>
        <p>For local dev, use polling instead:</p>
        <pre className="bot-deploy-code">{`# No public URL needed for local dev
while True:
    updates = get_updates(offset=last_update_id + 1)
    for update in updates:
        handle_update(update)
        last_update_id = update["update_id"]`}</pre>
        <p className="bot-deploy-note">⚠️ Telegram bots are free with no rate limits for personal use. For high-volume bots, consider the Bot API local server.</p>
      </div>
    ),
  },
]

function renderTGMessage(result, bot) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', margin: '0.25rem 0' }}>
      <div style={{ background: '#229ED9', padding: '0.3rem 0.75rem', fontSize: '0.68rem', color: '#fff', fontWeight: 600 }}>
        ✈️ RAG Bot
      </div>
      <div style={{ padding: '0.65rem 0.75rem' }}>
        <div style={{ fontSize: '0.82rem', color: '#111827', lineHeight: 1.55, whiteSpace: 'pre-wrap', marginBottom: '0.4rem' }}>{result.answer}</div>
        {result.sources?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '0.4rem' }}>
            {result.sources.map((s, i) => (
              <span key={i} style={{ fontSize: '0.68rem', background: '#eff8ff', color: '#229ED9', border: '1px solid #bfdbfe', borderRadius: 4, padding: '0.1rem 0.4rem', fontFamily: 'monospace' }}>
                {s.filepath?.split('/').pop() || s.id}
              </span>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {['Tell me more', 'Show code example', 'Related topics'].map((label, i) => (
            <span key={i} style={{ fontSize: '0.7rem', background: '#eff8ff', color: '#229ED9', border: '1px solid #bfdbfe', borderRadius: 6, padding: '0.2rem 0.6rem', cursor: 'pointer' }}>
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export function AppTelegramOverview() { return <BotOverview bot={TG_BOT} /> }
export function AppTelegramDemo({ tabId }) { return <BotDemo bot={TG_BOT} endpoint="/api/slack-demo" mode="telegram" renderMessage={renderTGMessage} tabId={tabId} /> }
export function AppTelegramDeploy() { return <BotDeploy bot={TG_BOT} steps={DEPLOY_STEPS} /> }
