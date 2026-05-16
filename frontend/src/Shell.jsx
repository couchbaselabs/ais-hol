import React, { useState } from 'react'
import Header from './components/Header'
import InfoPanel from './components/InfoPanel'
import AppChat from './AppChat'
import AppChatCached from './AppChatCached'
import AppChatHistory from './AppChatHistory'
import AppChatRag from './AppChatRag'
import AppAgent from './AppAgent'

function Shell() {
  const [activeTab, setActiveTab] = useState('chat')
  const [headerAction, setHeaderAction] = useState(null)

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header activeTab={activeTab} onTabChange={setActiveTab} action={headerAction} />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {activeTab === 'chat'    && <AppChat        key="chat"    onHeaderAction={setHeaderAction} />}
        {activeTab === 'cached'  && <AppChatCached  key="cached"  />}
        {activeTab === 'history' && <AppChatHistory key="history" />}
        {activeTab === 'rag'     && <AppChatRag     key="rag"     />}
        {activeTab === 'agent'   && <AppAgent       key="agent"   />}
        <InfoPanel tab={activeTab} />
      </div>
    </div>
  )
}

export default Shell
