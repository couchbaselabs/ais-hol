import React, { useState } from 'react'
import ChatWindow from './components/ChatWindow'
import './App.css'
import './AppAgent.css'

// ---------------------------------------------------------------------------
// Routing badge
// ---------------------------------------------------------------------------

const ROUTE_META = {
  router:           { label: 'Direct',      className: 'badge badge--router' },
  math_agent:       { label: 'Math Agent',  className: 'badge badge--math'   },
  faq_search_agent: { label: 'FAQ Search',  className: 'badge badge--faq'    },
  rag_agent:        { label: 'RAG Agent',   className: 'badge badge--rag'    },
}

function AgentBadge({ routedTo, faqCollection, missingTopic }) {
  if (missingTopic) {
    return (
      <span className="badge badge--missing">
        No FAQ found · {missingTopic.replace(/_/g, ' ')}
      </span>
    )
  }
  const meta = ROUTE_META[routedTo]
  if (!meta) return null
  const label =
    routedTo === 'faq_search_agent' && faqCollection
      ? `FAQ Search · ${faqCollection.replace(/_/g, ' ')}`
      : meta.label
  return <span className={meta.className}>{label}</span>
}

// ---------------------------------------------------------------------------
// Reasoning trace panel
// ---------------------------------------------------------------------------

function TraceStep({ step }) {
  switch (step.type) {
    case 'route':
      return (
        <div className="trace-step trace-step--route">
          <span className="trace-label">Router →</span>
          <span className="trace-value">
            {step.decision}
            {step.collection ? ` · ${step.collection.replace(/_/g, ' ')}` : ''}
            {step.topic ? ` · ${step.topic.replace(/_/g, ' ')}` : ''}
          </span>
        </div>
      )
    case 'tool_call':
      return (
        <div className="trace-step trace-step--tool-call">
          <span className="trace-label">🔧 {step.tool}</span>
          <pre className="trace-pre">{JSON.stringify(step.input, null, 2)}</pre>
        </div>
      )
    case 'tool_result':
      return (
        <div className="trace-step trace-step--tool-result">
          <span className="trace-label">↩ result</span>
          <pre className="trace-pre">{
            typeof step.content === 'string'
              ? step.content.slice(0, 400) + (step.content.length > 400 ? '…' : '')
              : JSON.stringify(step.content, null, 2).slice(0, 400)
          }</pre>
        </div>
      )
    case 'thought':
      return (
        <div className="trace-step trace-step--thought">
          <span className="trace-label">💭 thought</span>
          <p className="trace-text">{step.content}</p>
        </div>
      )
    default:
      return null
  }
}

function TracePanel({ steps }) {
  const [open, setOpen] = useState(false)
  if (!steps || steps.length === 0) return null

  return (
    <div className="trace-panel">
      <button className="trace-toggle" onClick={() => setOpen(v => !v)}>
        {open ? '▲' : '▼'} Reasoning trace ({steps.length} step{steps.length !== 1 ? 's' : ''})
      </button>
      {open && (
        <div className="trace-body">
          {steps.map((step, i) => <TraceStep key={i} step={step} />)}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

function AppAgent() {
  const [sessionId] = useState(() => {
    let id = sessionStorage.getItem('agent-session-id')
    if (!id) {
      id = crypto.randomUUID()
      sessionStorage.setItem('agent-session-id', id)
    }
    return id
  })

  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello! I'm your multi-agent assistant. I can answer general questions, do maths, search MDN documentation, or look up FAQ documents — and I remember our conversation.",
      sender: 'bot',
      timestamp: new Date(),
      meta: null,
    },
  ])
  const [isLoading, setIsLoading] = useState(false)

  const clearHistory = async () => {
    await fetch('/api/conversation/clear', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId }),
    })
    setMessages([{
      id: Date.now(),
      text: 'Conversation history cleared. Starting fresh!',
      sender: 'bot',
      timestamp: new Date(),
      meta: null,
    }])
  }

  const sendMessage = async (messageText) => {
    setMessages(prev => [...prev, {
      id: Date.now(),
      text: messageText,
      sender: 'user',
      timestamp: new Date(),
      meta: null,
    }])
    setIsLoading(true)

    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText, session_id: sessionId }),
      })
      if (!response.ok) throw new Error('Agent request failed')
      const data = await response.json()

      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        text: data.response,
        sender: 'bot',
        timestamp: new Date(),
        meta: {
          routedTo: data.routed_to,
          faqCollection: data.faq_collection,
          missingTopic: data.missing_topic,
          traceSteps: data.trace_steps || [],
        },
      }])
    } catch (error) {
      console.error('Agent error:', error)
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        text: 'Sorry, I encountered an error. Please try again.',
        sender: 'bot',
        timestamp: new Date(),
        meta: null,
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const messagesWithExtras = messages.map(msg => {
    if (msg.sender !== 'bot' || !msg.meta) return msg
    return {
      ...msg,
      badge: (
        <div>
          <AgentBadge
            routedTo={msg.meta.routedTo}
            faqCollection={msg.meta.faqCollection}
            missingTopic={msg.meta.missingTopic}
          />
          <TracePanel steps={msg.meta.traceSteps} />
        </div>
      ),
    }
  })

  return (
    <div className="app">
      <div className="app-toolbar">
        <button className="toolbar-btn toolbar-btn--danger" onClick={clearHistory}>
          🗑 Clear history
        </button>
        <span className="toolbar-session">Session: {sessionId.slice(0, 8)}…</span>
      </div>
      <ChatWindow
        messages={messagesWithExtras}
        onSendMessage={sendMessage}
        isLoading={isLoading}
      />
    </div>
  )
}

export default AppAgent
