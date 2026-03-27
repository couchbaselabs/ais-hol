import React, { useState } from 'react'
import Header from './components/Header'
import AppChat from './AppChat'
import App from './App'
import AppAgent from './AppAgent'

function Shell() {
  const [activeTab, setActiveTab] = useState('chat')
  const [headerAction, setHeaderAction] = useState(null)

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header activeTab={activeTab} onTabChange={setActiveTab} action={headerAction} />
      {activeTab === 'chat' && <AppChat key="chat" onHeaderAction={setHeaderAction} />}
      {activeTab === 'rag' && <App key="rag" />}
      {activeTab === 'agent' && <AppAgent key="agent" />}
    </div>
  )
}

export default Shell
