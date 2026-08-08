import React, { useState } from 'react'
import ChatWindow from './components/ChatWindow'
import CacheIndicator from './components/CacheIndicator'
import './App.css'

function AppChatRag() {
  const [sessionId] = useState(() => {
    let id = sessionStorage.getItem('rag-chat-session-id')
    if (!id) {
      id = crypto.randomUUID()
      sessionStorage.setItem('rag-chat-session-id', id)
    }
    return id
  })

  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello! I'm a RAG assistant backed by MDN Web Docs. Ask me about HTML, CSS, or JavaScript — I'll retrieve relevant documentation to answer.",
      sender: 'bot',
      timestamp: new Date(),
      cacheHit: null,
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
      cacheHit: null,
    }])
  }

  const sendMessage = async (messageText) => {
    setMessages(prev => [...prev, {
      id: Date.now(),
      text: messageText,
      sender: 'user',
      timestamp: new Date(),
      cacheHit: null,
    }])
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat-rag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText, session_id: sessionId }),
      })
      if (!response.ok) throw new Error('Request failed')

      const cacheHit = response.headers.get('X-Cache-Hit') === 'true'
      let citations = []
      try {
        const raw = response.headers.get('X-Citations')
        if (raw) citations = JSON.parse(raw)
      } catch { /* ignore malformed header */ }

      // Stream token-by-token
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let botText = ''
      const botId = Date.now() + 1

      setMessages(prev => [...prev, {
        id: botId,
        text: '',
        sender: 'bot',
        timestamp: new Date(),
        cacheHit,
        citations,
        badge: <CacheIndicator hit={cacheHit} />,
      }])

      let faithfulness = null
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        botText += chunk

        // Strip faithfulness sentinel from display text
        const sentinelIdx = botText.indexOf('\n__FAITHFULNESS__:')
        if (sentinelIdx !== -1) {
          try {
            faithfulness = JSON.parse(botText.slice(sentinelIdx + '\n__FAITHFULNESS__:'.length))
          } catch { /* ignore */ }
          botText = botText.slice(0, sentinelIdx)
        }

        setMessages(prev =>
          prev.map(msg => msg.id === botId
            ? { ...msg, text: botText, faithfulness }
            : msg
          )
        )
      }
    } catch {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        text: 'Sorry, I encountered an error. Please try again.',
        sender: 'bot',
        timestamp: new Date(),
        cacheHit: null,
      }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="app">
      <div className="app-toolbar">
        <button className="toolbar-btn toolbar-btn--danger" onClick={clearHistory}>
          🗑 Clear history
        </button>
        <span className="toolbar-session">Session: {sessionId.slice(0, 8)}…</span>
      </div>
      <ChatWindow
        messages={messages}
        onSendMessage={sendMessage}
        isLoading={isLoading}
        examples={[
          'What is Couchbase Vector Search?',
          'How do I create a vector index in Couchbase?',
          'What distance metrics does Couchbase vector search support?',
        ]}
      />
    </div>
  )
}

export default AppChatRag
