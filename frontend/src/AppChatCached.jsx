import React, { useState } from 'react'
import ChatWindow from './components/ChatWindow'
import CacheIndicator from './components/CacheIndicator'
import './App.css'

function AppChatCached() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello! I'm a cache-aware assistant. Ask me something — then ask the same thing again to see a cache hit.",
      sender: 'bot',
      timestamp: new Date(),
      cacheHit: null,
    },
  ])
  const [isLoading, setIsLoading] = useState(false)

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
      const response = await fetch('/api/chat-cached', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText }),
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
      <ChatWindow
        messages={messages}
        onSendMessage={sendMessage}
        isLoading={isLoading}
        examples={[
          'What is JavaScript? (ask twice to see a cache hit)',
          'Explain closures in JavaScript',
          'What is a Promise?',
        ]}
      />
    </div>
  )
}

export default AppChatCached
