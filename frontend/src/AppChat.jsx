import React, { useState, useEffect } from 'react'
import ChatWindow from './components/ChatWindow'
import SystemPrompt from './components/SystemPrompt'
import './App.css'

function AppChat({ onHeaderAction }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello! I'm your AI assistant. How can I help you today?",
      sender: 'bot',
      timestamp: new Date()
    }
  ])

  const defaultSystemPrompt = "You are a helpful AI assistant. Please respond to the user's message in a friendly and helpful manner. Keep your responses concise but informative."
  
  const [isLoading, setIsLoading] = useState(false)
  const [systemPrompt, setSystemPrompt] = useState(defaultSystemPrompt)
  const [showSystemPrompt, setShowSystemPrompt] = useState(false)

  // Push the toggle button into the header whenever visibility state changes
  React.useEffect(() => {
    if (!onHeaderAction) return
    onHeaderAction(
      <button
        className="toggle-button"
        onClick={() => setShowSystemPrompt(v => !v)}
        title="Configure System Prompt"
      >
        ⚙️ System Prompt
      </button>
    )
    return () => onHeaderAction(null)
  }, [onHeaderAction])

  // Load system prompt from localStorage on component mount
  useEffect(() => {
    const savedSystemPrompt = localStorage.getItem('chatapp-system-prompt')
    if (savedSystemPrompt) {
      setSystemPrompt(savedSystemPrompt)
    }
  }, [])

  // Save system prompt to localStorage whenever it changes
  const handleSystemPromptChange = (newPrompt) => {
    setSystemPrompt(newPrompt)
    localStorage.setItem('chatapp-system-prompt', newPrompt)
  }

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
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText, systemPrompt }),
      })

      if (!response.ok) throw new Error('Failed to send message')

      const data = await response.json()
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        text: data.response,
        sender: 'bot',
        timestamp: new Date()
      }])
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage = {
        id: Date.now() + 1,
        text: 'Sorry, I encountered an error. Please try again.',
        sender: 'bot',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const examples = [
    'What is JavaScript?',
    'Explain the difference between null and undefined',
    'What does Array.map() do?',
  ]

  return (
    <div className="app">
      <ChatWindow 
        messages={messages} 
        onSendMessage={sendMessage}
        isLoading={isLoading}
        examples={examples}
      />
      {showSystemPrompt && (
        <SystemPrompt
          systemPrompt={systemPrompt}
          onSystemPromptChange={handleSystemPromptChange}
          isVisible={showSystemPrompt}
          onToggleVisibility={() => setShowSystemPrompt(!showSystemPrompt)}
          defaultSystemPrompt={defaultSystemPrompt}
        />
      )}
    </div>
  )
}

export default AppChat
