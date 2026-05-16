import React, { useState, useRef } from 'react'
import ChatWindow from './components/ChatWindow'
import './App.css'
import './AppChatStream.css'

/**
 * Streaming Chat tab — demonstrates token-by-token SSE streaming.
 *
 * Visually identical to Simple Chat but the response arrives as a chunked
 * stream. A live token counter and a time-to-first-token (TTFT) metric are
 * shown on each bot message so the difference from blocking JSON is tangible.
 */
function AppChatStream() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello! Watch the response appear token by token. Each word arrives as soon as the model generates it — no waiting for the full response.",
      sender: 'bot',
      timestamp: new Date(),
      meta: null,
    },
  ])
  const [isLoading, setIsLoading] = useState(false)
  const startTimeRef = useRef(null)

  const sendMessage = async (messageText) => {
    setMessages(prev => [...prev, {
      id: Date.now(),
      text: messageText,
      sender: 'user',
      timestamp: new Date(),
      meta: null,
    }])
    setIsLoading(true)
    startTimeRef.current = performance.now()

    const botId = Date.now() + 1
    setMessages(prev => [...prev, {
      id: botId,
      text: '',
      sender: 'bot',
      timestamp: new Date(),
      meta: { ttft: null, tokens: 0 },
    }])

    try {
      const response = await fetch('/api/chat-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText }),
      })
      if (!response.ok) throw new Error('Request failed')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let text = ''
      let tokenCount = 0
      let ttft = null

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        if (ttft === null) {
          ttft = ((performance.now() - startTimeRef.current) / 1000).toFixed(2)
        }
        text += chunk
        // Rough token count: split on whitespace boundaries
        tokenCount = text.trim().split(/\s+/).filter(Boolean).length
        setMessages(prev => prev.map(msg =>
          msg.id === botId
            ? { ...msg, text, meta: { ttft, tokens: tokenCount } }
            : msg
        ))
      }
    } catch {
      setMessages(prev => prev.map(msg =>
        msg.id === botId
          ? { ...msg, text: 'Sorry, I encountered an error. Please try again.' }
          : msg
      ))
    } finally {
      setIsLoading(false)
    }
  }

  const messagesWithBadges = messages.map(msg => {
    if (msg.sender !== 'bot' || !msg.meta || msg.meta.ttft === null) return msg
    return {
      ...msg,
      badge: (
        <div className="stream-meta">
          <span className="stream-stat">⚡ TTFT {msg.meta.ttft}s</span>
          <span className="stream-stat">~{msg.meta.tokens} tokens</span>
        </div>
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

export default AppChatStream
