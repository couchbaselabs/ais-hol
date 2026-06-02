import React, { useState } from 'react'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
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
import AppTokens from './AppTokens'
import AppCapellaSummarise from './AppCapellaSummarise'
import AppCapellaSentiment from './AppCapellaSentiment'
import AppTemperature from './AppTemperature'
import AppToolCalling from './AppToolCalling'
import AppContextWindow from './AppContextWindow'
import AppQueryExpansion from './AppQueryExpansion'
import AppCostLatency from './AppCostLatency'
import AppGuardrails from './AppGuardrails'
import AppVoiceWasm        from './AppVoiceWasm'
import AppVoiceServer      from './AppVoiceServer'
import AppVision           from './AppVision'
import AppFewShot          from './AppFewShot'
import AppModelComparison  from './AppModelComparison'
import AppPersonas         from './AppPersonas'
import AppHallucination    from './AppHallucination'
import AppChunking         from './AppChunking'
import AppAgenticRag       from './AppAgenticRag'
import AppLogprobs         from './AppLogprobs'
import AppChainOfThought   from './AppChainOfThought'
import AppIngestion        from './AppIngestion'
import AppPromptInjection  from './AppPromptInjection'

function Shell() {
  const [activeTab, setActiveTab] = useState('chat')

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
        {activeTab === 'chat'       && <AppChat           key="chat" />}
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
        {activeTab === 'tokens'            && <AppTokens          key="tokens"            />}
        {activeTab === 'capella-summarise' && <AppCapellaSummarise key="capella-summarise" />}
        {activeTab === 'capella-sentiment' && <AppCapellaSentiment key="capella-sentiment" />}
        {activeTab === 'temperature'       && <AppTemperature      key="temperature"       />}
        {activeTab === 'tool-calling'      && <AppToolCalling      key="tool-calling"      />}
        {activeTab === 'context-window'    && <AppContextWindow    key="context-window"    />}
        {activeTab === 'query-expansion'   && <AppQueryExpansion   key="query-expansion"   />}
        {activeTab === 'cost-latency'      && <AppCostLatency      key="cost-latency"      />}
        {activeTab === 'guardrails'        && <AppGuardrails       key="guardrails"        />}
        {activeTab === 'voice-wasm'        && <AppVoiceWasm        key="voice-wasm"        />}
        {activeTab === 'voice-server'      && <AppVoiceServer      key="voice-server"      />}
        {activeTab === 'vision'            && <AppVision           key="vision"            />}
        {activeTab === 'few-shot'          && <AppFewShot          key="few-shot"          />}
        {activeTab === 'model-comparison'  && <AppModelComparison  key="model-comparison"  />}
        {activeTab === 'personas'          && <AppPersonas         key="personas"          />}
        {activeTab === 'hallucination'     && <AppHallucination    key="hallucination"     />}
        {activeTab === 'chunking'          && <AppChunking         key="chunking"          />}
        {activeTab === 'agentic-rag'       && <AppAgenticRag       key="agentic-rag"       />}
        {activeTab === 'logprobs'          && <AppLogprobs         key="logprobs"          />}
        {activeTab === 'chain-of-thought'  && <AppChainOfThought   key="chain-of-thought"  />}
        {activeTab === 'ingestion'         && <AppIngestion        key="ingestion"         />}
        {activeTab === 'prompt-injection'  && <AppPromptInjection  key="prompt-injection"  />}
        <InfoPanel tab={activeTab} onTabChange={setActiveTab} />
      </div>
    </div>
  )
}

export default Shell
