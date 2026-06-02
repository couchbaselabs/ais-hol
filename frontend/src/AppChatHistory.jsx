import React, { useState } from 'react'
import ChatWindow from './components/ChatWindow'
import CacheIndicator from './components/CacheIndicator'
import './App.css'

function AppChatHistory() {
  const [sessionId] = useState(() => {
    let id = sessionStorage.getItem('history-session-id')
    if (!id) {
      id = crypto.randomUUID()
      sessionStorage.setItem('history-session-id', id)
    }
    return id
  })

  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello! I remember our conversation across messages. Ask me something, then refer back to it.",
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
      const response = await fetch('/api/chat-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText, session_id: sessionId }),
      })
      if (!response.ok) throw new Error('Request failed')
      const data = await response.json()
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        text: data.response,
        sender: 'bot',
        timestamp: new Date(),
        cacheHit: data.cache_hit,
        badge: <CacheIndicator hit={data.cache_hit} />,
      }])
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
          'My name is Alex. Remember that.',
          'What is my name? (tests memory)',
          'What did I just tell you?',
        ]}
      />
    </div>
  )
}

export default AppChatHistory
