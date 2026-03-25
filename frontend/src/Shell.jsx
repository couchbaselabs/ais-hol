import React, { useState } from 'react'
import Header from './components/Header'
import AppChat from './AppChat'
import App from './App'

function Shell() {
  const [activeTab, setActiveTab] = useState('chat')

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header activeTab={activeTab} onTabChange={setActiveTab} />
      {activeTab === 'chat' ? <AppChat key="chat" /> : <App key="rag" />}
    </div>
  )
}

export default Shell
