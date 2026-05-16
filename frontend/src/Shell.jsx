import React, { useState } from 'react'
import Header from './components/Header'
import InfoPanel from './components/InfoPanel'
import AppChat from './AppChat'
import AppChatStream from './AppChatStream'
import AppChatCached from './AppChatCached'
import AppChatHistory from './AppChatHistory'
import AppChatRag from './AppChatRag'
import AppAgent from './AppAgent'
import AppChatStructured from './AppChatStructured'
import AppChatRerank from './AppChatRerank'
import AppChatPrompt from './AppChatPrompt'
import AppEmbeddings from './AppEmbeddings'
import AppChatHyde from './AppChatHyde'
import AppChatEvaluate from './AppChatEvaluate'
import AppSummarise from './AppSummarise'

function Shell() {
  const [activeTab, setActiveTab] = useState('chat')
  const [headerAction, setHeaderAction] = useState(null)

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header activeTab={activeTab} onTabChange={setActiveTab} action={headerAction} />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {activeTab === 'chat'       && <AppChat           key="chat"       onHeaderAction={setHeaderAction} />}
        {activeTab === 'stream'     && <AppChatStream     key="stream"     />}
        {activeTab === 'cached'     && <AppChatCached     key="cached"     />}
        {activeTab === 'history'    && <AppChatHistory    key="history"    />}
        {activeTab === 'rag'        && <AppChatRag        key="rag"        />}
        {activeTab === 'agent'      && <AppAgent          key="agent"      />}
        {activeTab === 'structured' && <AppChatStructured key="structured" />}
        {activeTab === 'rerank'     && <AppChatRerank     key="rerank"     />}
        {activeTab === 'prompt'     && <AppChatPrompt     key="prompt"     />}
        {activeTab === 'embeddings' && <AppEmbeddings     key="embeddings" />}
        {activeTab === 'hyde'       && <AppChatHyde       key="hyde"       />}
        {activeTab === 'evaluate'   && <AppChatEvaluate   key="evaluate"   />}
        {activeTab === 'summarise'  && <AppSummarise      key="summarise"  />}
        <InfoPanel tab={activeTab} />
      </div>
    </div>
  )
}

export default Shell
