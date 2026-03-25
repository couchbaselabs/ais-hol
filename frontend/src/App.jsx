import React, { useState, useEffect } from 'react'
import ChatWindow from './components/ChatWindow'
import './App.css'

function App() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello! I'm your RAG assistant. Ask me about Web MDN Documentation!",
      sender: 'bot',
      timestamp: new Date()
    }
  ])

  const [isLoading, setIsLoading] = useState(false)

  // Each browser session gets a unique ID for conversation history (Exercise 4)
  const [sessionId] = useState(() => {
    let id = sessionStorage.getItem('rag-session-id')
    if (!id) {
      id = crypto.randomUUID()
      sessionStorage.setItem('rag-session-id', id)
    }
    return id
  })

  const sendMessage = async (messageText) => {
    const userMessage = {
      id: Date.now(),
      text: messageText,
      sender: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    try {
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: messageText, session_id: sessionId }),
      })

      if (!response.ok) throw new Error('Failed to send message')

      // Stream the response token by token
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let botResponseText = ''

      const botMessage = {
        id: Date.now() + 1,
        text: '',
        sender: 'bot',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, botMessage])

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        botResponseText += decoder.decode(value, { stream: true })
        setMessages(prev =>
          prev.map(msg =>
            msg.id === botMessage.id ? { ...msg, text: botResponseText } : msg
          )
        )
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        text: 'Sorry, I encountered an error. Please try again.',
        sender: 'bot',
        timestamp: new Date()
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
      />
    </div>
  )
}

export default App
