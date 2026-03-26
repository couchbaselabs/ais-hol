import React, { useState } from 'react'
import ChatWindow from './components/ChatWindow'
import './App.css'

const BADGE_LABELS = {
  router: { text: 'Router', className: 'badge badge--router' },
  math_agent: { text: 'Math Agent', className: 'badge badge--math' },
  faq_search_agent: { text: 'FAQ Search', className: 'badge badge--faq' },
}

function AgentBadge({ routedTo, faqCollection, missingTopic }) {
  if (missingTopic) {
    return (
      <span className="badge badge--missing">
        No FAQ found · {missingTopic.replace(/_/g, ' ')}
      </span>
    )
  }

  const badge = BADGE_LABELS[routedTo]
  if (!badge) return null

  const label =
    routedTo === 'faq_search_agent' && faqCollection
      ? `FAQ Search · ${faqCollection.replace(/_/g, ' ')}`
      : badge.text

  return <span className={badge.className}>{label}</span>
}

function AppAgent() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello! I'm your multi-agent assistant. Ask me anything — I'll route your question to the right agent.",
      sender: 'bot',
      timestamp: new Date(),
      meta: null,
    },
  ])
  const [isLoading, setIsLoading] = useState(false)

  const sendMessage = async (messageText) => {
    const userMessage = {
      id: Date.now(),
      text: messageText,
      sender: 'user',
      timestamp: new Date(),
      meta: null,
    }
    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)

    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText }),
      })

      if (!response.ok) throw new Error('Agent request failed')

      const data = await response.json()

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          text: data.response,
          sender: 'bot',
          timestamp: new Date(),
          meta: {
            routedTo: data.routed_to,
            faqCollection: data.faq_collection,
            missingTopic: data.missing_topic,
          },
        },
      ])
    } catch (error) {
      console.error('Agent error:', error)
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          text: 'Sorry, I encountered an error. Please try again.',
          sender: 'bot',
          timestamp: new Date(),
          meta: null,
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  // Wrap ChatWindow messages to inject badges below bot messages.
  const messagesWithBadges = messages.map((msg) => {
    if (msg.sender !== 'bot' || !msg.meta) return msg
    return {
      ...msg,
      badge: (
        <AgentBadge
          routedTo={msg.meta.routedTo}
          faqCollection={msg.meta.faqCollection}
          missingTopic={msg.meta.missingTopic}
        />
      ),
    }
  })

  return (
    <div className="app">
      <ChatWindow
        messages={messagesWithBadges}
        onSendMessage={sendMessage}
        isLoading={isLoading}
      />
    </div>
  )
}

export default AppAgent
