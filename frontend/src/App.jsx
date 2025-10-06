import React, { useState, useEffect } from 'react'
import ChatWindow from './components/ChatWindow'
import Header from './components/Header'
import SystemPrompt from './components/SystemPrompt'
import './App.css'

function App() {
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
      // TODO: Implement API call to backend with systemPrompt and messageText
      // Example:
      // const response = await fetch('/api/chat', { ... })
      // const data = await response.json()
      // Use data.response for bot reply

      // Placeholder bot response for workshop
      const botMessage = {
        id: Date.now() + 1,
        text: '[Bot response will appear here. Implement API call and response handling.]',
        sender: 'bot',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, botMessage])
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

  return (
    <div className="app">
      <Header />
      <ChatWindow 
        messages={messages} 
        onSendMessage={sendMessage}
        isLoading={isLoading}
      />
      <SystemPrompt 
        systemPrompt={systemPrompt}
        onSystemPromptChange={handleSystemPromptChange}
        isVisible={showSystemPrompt}
        onToggleVisibility={() => setShowSystemPrompt(!showSystemPrompt)}
        defaultSystemPrompt={defaultSystemPrompt}
      />
    </div>
  )
}

export default App
