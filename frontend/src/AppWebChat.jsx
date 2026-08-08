import React from 'react'
import BotOverview from './components/BotOverview'
import BotDemo from './components/BotDemo'
import BotDeploy from './components/BotDeploy'

export const WC_BOT = {
  name: 'Web Chat Widget',
  logo: '💬',
  color: '#0ea5e9',
  heroBg: '#f0f9ff',
  heroBorder: '#bae6fd',
  title: 'Building a Web Chat Widget',
  subtitle: 'Embed a streaming RAG chat widget on any website — no third-party platform required',
  deployDesc: 'A self-hosted chat widget with streaming responses, session memory, and easy embed via a script tag.',
  inputPrefix: '',
  inputPlaceholder: 'What is vector search?',
  archSteps: [
    { icon: '👤', label: 'User', desc: 'Types a message in the embedded chat widget' },
    { icon: '🌐', label: 'Widget (JS)', desc: 'POSTs to /api/chat with the message and session_id' },
    { icon: '🤖', label: 'FastAPI', desc: 'Runs RAG, streams the response via Server-Sent Events' },
    { icon: '🧠', label: 'LLM + RAG', desc: 'Couchbase vector search + LLM with streaming output' },
    { icon: '💬', label: 'Widget', desc: 'Renders tokens as they arrive for a real-time feel' },
  ],
  concepts: [
    { icon: '📡', title: 'Server-Sent Events', desc: 'SSE streams text tokens from the server to the browser over a single HTTP connection. Simpler than WebSockets for one-way streaming.' },
    { icon: '🪟', title: 'Embed via Script Tag', desc: 'The widget is a single JS file. Add <script src="widget.js"></script> to any page. It injects a floating chat button and panel.' },
    { icon: '🔑', title: 'Session Memory', desc: 'Each browser session gets a UUID stored in localStorage. The server keeps conversation history in Couchbase keyed by session_id.' },
    { icon: '🎨', title: 'Theming', desc: 'Pass data-color, data-title, and data-position attributes on the script tag to customize the widget without touching the source.' },
    { icon: '🔒', title: 'CORS & Auth', desc: 'Configure CORS to allow your domain. Optionally add an API key header for rate limiting. The widget sends it automatically.' },
    { icon: '⚡', title: 'Streaming UX', desc: 'Tokens render as they arrive. Show a typing indicator while waiting for the first token. Scroll to bottom on each new token.' },
  ],
  builds: [
    '<strong>Streaming endpoint</strong> — FastAPI SSE endpoint that streams LLM tokens as they are generated',
    '<strong>Session memory</strong> — conversation history stored in Couchbase, retrieved by session_id on each request',
    '<strong>Embeddable widget</strong> — self-contained JS widget with floating button, chat panel, and streaming renderer',
  ],
  demoLeft: (
    <div>
      <h2 style={{ color: '#0ea5e9' }}>Streaming SSE Endpoint</h2>
      <p>FastAPI streams LLM tokens via Server-Sent Events. The widget reads the stream and renders tokens as they arrive.</p>
      <div className="bot-demo-flow">
        {[
          ['Receive', 'POST /api/chat — {message, session_id}'],
          ['History', 'Load conversation from Couchbase by session_id'],
          ['RAG', 'embed → Couchbase search → build prompt with history'],
          ['Stream', 'Yield SSE events: data: {token}\\n\\n'],
        ].map(([n, d], i) => (
          <div key={i} className="bot-demo-flow-step">
            <span className="bot-demo-flow-num" style={{ background: '#0ea5e9' }}>{i + 1}</span>
            <div><strong>{n}</strong> — {d}</div>
          </div>
        ))}
      </div>
      <pre className="bot-demo-code">{`@app.post("/api/chat")
async def chat_stream(req: ChatRequest):
    history = await load_history(req.session_id)
    context = await vector_search(req.message)

    async def generate():
        full_response = ""
        async for token in llm_stream(
            req.message, context, history
        ):
            full_response += token
            yield f"data: {json.dumps({'token': token})}\\n\\n"

        await save_history(
            req.session_id, req.message, full_response)
        yield "data: [DONE]\\n\\n"

    return StreamingResponse(
        generate(), media_type="text/event-stream")`}</pre>
    </div>
  ),
  demoLeft2: {
    'webchat-widget': (
      <div>
        <h2 style={{ color: '#0ea5e9' }}>Embeddable Widget</h2>
        <p>The widget is a self-contained IIFE bundle. Drop one <code>&lt;script&gt;</code> tag on any page — it injects a floating chat button and panel, reads config from <code>data-*</code> attributes, and manages its own session UUID in <code>localStorage</code>.</p>
        <div className="bot-demo-flow">
          {[
            ['Load', 'Script tag injects floating button + hidden chat panel into DOM'],
            ['Config', 'Read data-color, data-title, data-position from script element'],
            ['Session', 'Generate UUID on first load, persist in localStorage'],
            ['Stream', 'fetch() + ReadableStream to consume SSE from /api/chat'],
          ].map(([n, d], i) => (
            <div key={i} className="bot-demo-flow-step">
              <span className="bot-demo-flow-num" style={{ background: '#0ea5e9' }}>{i + 1}</span>
              <div><strong>{n}</strong> — {d}</div>
            </div>
          ))}
        </div>
        <pre className="bot-demo-code">{`// widget.js — runs on the host page
(function () {
  const script = document.currentScript
  const color  = script.dataset.color    || '#0ea5e9'
  const title  = script.dataset.title    || 'Ask me anything'
  const apiUrl = script.dataset.apiUrl   || '/api/chat'

  // Persist session across page loads
  let sessionId = localStorage.getItem('chat_session_id')
  if (!sessionId) {
    sessionId = crypto.randomUUID()
    localStorage.setItem('chat_session_id', sessionId)
  }

  // Inject UI
  const panel = createChatPanel({ color, title })
  document.body.appendChild(panel)

  async function sendMessage(text) {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, session_id: sessionId }),
    })
    // Read SSE stream token by token
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value)
      renderTokens(chunk)  // append to chat panel
    }
  }
})()`}</pre>
      </div>
    ),
  },
  examples: {
    default: [
      'What is Couchbase Vector Search?',
      'How does RAG work?',
      'What is a vector embedding?',
    ],
    'webchat-widget': [
      'How do I embed the widget on my site?',
      'How does session memory work?',
      'Can I customise the widget colours?',
    ],
  },
}

const DEPLOY_STEPS = [
  {
    icon: '🏗️', title: 'Build the widget JS',
    content: (
      <div>
        <p>The widget is a self-contained JS bundle. Build it with Vite or esbuild:</p>
        <pre className="bot-deploy-code">{`# vite.config.js (widget build)
export default {
  build: {
    lib: {
      entry: 'src/widget.js',
      name: 'ChatWidget',
      fileName: 'widget',
      formats: ['iife'],
    },
    rollupOptions: {
      output: { inlineDynamicImports: true }
    }
  }
}`}</pre>
      </div>
    ),
  },
  {
    icon: '🔑', title: 'Environment variables',
    content: (
      <div>
        <pre className="bot-deploy-code">{`# Backend
COUCHBASE_CONNECTION_STRING=couchbases://...
COUCHBASE_USERNAME=Administrator
COUCHBASE_PASSWORD=...
OPENAI_API_KEY=sk-...

# Widget (optional)
VITE_API_URL=https://your-api.onrender.com
VITE_WIDGET_COLOR=#0ea5e9`}</pre>
      </div>
    ),
  },
  {
    icon: '🌐', title: 'Configure CORS',
    content: (
      <div>
        <p>Allow your website's origin in FastAPI:</p>
        <pre className="bot-deploy-code">{`from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yoursite.com"],
    allow_methods=["POST"],
    allow_headers=["*"],
)`}</pre>
      </div>
    ),
  },
  {
    icon: '🚀', title: 'Embed on your site',
    content: (
      <div>
        <p>Add one line to any HTML page:</p>
        <pre className="bot-deploy-code">{`<script
  src="https://your-api.onrender.com/widget.js"
  data-color="#0ea5e9"
  data-title="Ask me anything"
  data-position="bottom-right"
></script>`}</pre>
        <p className="bot-deploy-note">⚠️ Serve widget.js from the same origin as your API to avoid CORS issues, or configure the API URL via the data-api-url attribute.</p>
      </div>
    ),
  },
]

function renderWCMessage(result, bot) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e0f2fe', borderRadius: 12, overflow: 'hidden', margin: '0.25rem 0', boxShadow: '0 1px 4px rgba(14,165,233,0.08)' }}>
      <div style={{ padding: '0.65rem 0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
          <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#0ea5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: '#fff', fontWeight: 700 }}>AI</span>
          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#0ea5e9' }}>Assistant</span>
        </div>
        <div style={{ fontSize: '0.82rem', color: '#111827', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: '0.4rem' }}>{result.answer}</div>
        {result.sources?.length > 0 && (
          <div style={{ borderTop: '1px solid #e0f2fe', paddingTop: '0.4rem', marginTop: '0.4rem' }}>
            <div style={{ fontSize: '0.68rem', color: '#64748b', marginBottom: '0.25rem' }}>Sources</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
              {result.sources.map((s, i) => (
                <span key={i} style={{ fontSize: '0.68rem', background: '#f0f9ff', color: '#0ea5e9', border: '1px solid #bae6fd', borderRadius: 4, padding: '0.1rem 0.4rem', fontFamily: 'monospace' }}>
                  {s.filepath?.split('/').pop() || s.id}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function AppWebChatOverview() { return <BotOverview bot={WC_BOT} /> }
export function AppWebChatDemo({ tabId }) { return <BotDemo bot={WC_BOT} endpoint="/api/slack-demo" mode="webchat" renderMessage={renderWCMessage} tabId={tabId} /> }
export function AppWebChatDeploy() { return <BotDeploy bot={WC_BOT} steps={DEPLOY_STEPS} /> }
