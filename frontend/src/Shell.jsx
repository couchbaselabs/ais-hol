import React, { useState, useEffect } from 'react'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import InfoPanel from './components/InfoPanel'
import ErrorBoundary from './components/ErrorBoundary'
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
import AppSlackOverview      from './AppSlackOverview'
import AppSlackSlashCommand  from './AppSlackSlashCommand'
import AppSlackEvents        from './AppSlackEvents'
import AppSlackDeploy        from './AppSlackDeploy'
import AppAgentCatalogOverview from './AppAgentCatalogOverview'
import AppAgentCatalogTools from './AppAgentCatalogTools'
import AppAgentCatalogRuns from './AppAgentCatalogRuns'
import AppCapellaIntro from './AppCapellaIntro'
import AppCapellaModelService from './AppCapellaModelService'
import AppCapellaIngestion from './AppCapellaIngestion'
import AppCapellaService from './AppCapellaService'
import AppCapellaSummarise from './AppCapellaSummarise'
import AppCapellaSentiment from './AppCapellaSentiment'
import AppCapellaClassification from './AppCapellaClassification'
import AppCapellaExtraction from './AppCapellaExtraction'
import AppCapellaTranslation from './AppCapellaTranslation'
import AppCapellaMasking from './AppCapellaMasking'
import AppCapellaSimilarity from './AppCapellaSimilarity'
import AppCapellaCompletion from './AppCapellaCompletion'
import AppCapellaGrammar from './AppCapellaGrammar'
import AppTemperature from './AppTemperature'
import AppToolCalling from './AppToolCalling'
import AppContextWindow  from './AppContextWindow'
import AppParallel       from './AppParallel'
import AppQueryExpansion from './AppQueryExpansion'
import AppCostLatency from './AppCostLatency'
import AppGuardrails from './AppGuardrails'
import AppVoiceWasm        from './AppVoiceWasm'
import AppVoiceServer      from './AppVoiceServer'
import AppVision           from './AppVision'
import AppImageGeneration  from './AppImageGeneration'
import AppModeration       from './AppModeration'
import AppFewShot          from './AppFewShot'
import AppModelComparison  from './AppModelComparison'
import AppPersonas         from './AppPersonas'
import AppOutputFormat     from './AppOutputFormat'
import AppHallucination    from './AppHallucination'
import AppChunking         from './AppChunking'
import AppAgenticRag       from './AppAgenticRag'
import AppLogprobs         from './AppLogprobs'
import AppChainOfThought   from './AppChainOfThought'
import AppIngestion        from './AppIngestion'
import AppPromptInjection  from './AppPromptInjection'
import AppVectorSearch       from './AppVectorSearch'
import AppMetadataFiltering  from './AppMetadataFiltering'
import AppMultiVector         from './AppMultiVector'
import AppRetry              from './AppRetry'
import AppTokenBudget        from './AppTokenBudget'
import AppObservability      from './AppObservability'
import { AppWhatsAppOverview, AppWhatsAppDemo, AppWhatsAppDeploy } from './AppWhatsApp'
import { AppTelegramOverview, AppTelegramDemo, AppTelegramDeploy } from './AppTelegram'
import { AppDiscordOverview, AppDiscordDemo, AppDiscordDeploy }   from './AppDiscord'
import { AppWebChatOverview, AppWebChatDemo, AppWebChatDeploy }   from './AppWebChat'
import { AppShopifyOverview, AppShopifyDemo, AppShopifyDeploy }   from './AppShopify'
import {
  AppAgentMemoryOverview,
  AppAgentMemorySessions,
  AppAgentMemorySearch,
  AppAgentMemoryIntegration,
  AppAgentMemoryComparison,
} from './AppAgentMemory'

function Shell() {
  const [activeTab, setActiveTab] = useState('chat')

  useEffect(() => {
    const handler = (e) => setActiveTab(e.detail)
    window.addEventListener('shell:navigate', handler)
    return () => window.removeEventListener('shell:navigate', handler)
  }, [])

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <ErrorBoundary key={activeTab}>
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
        {activeTab === 'slack-overview' && <AppSlackOverview     key="slack-overview" />}
        {activeTab === 'slack-slash'    && <AppSlackSlashCommand key="slack-slash" />}
        {activeTab === 'slack-events'   && <AppSlackEvents       key="slack-events" />}
        {activeTab === 'slack-deploy'   && <AppSlackDeploy       key="slack-deploy" />}
        {activeTab === 'agent-catalog-overview' && <AppAgentCatalogOverview  key="agent-catalog-overview" />}
        {activeTab === 'agent-catalog-tools'    && <AppAgentCatalogTools     key="agent-catalog-tools" />}
        {activeTab === 'agent-catalog-runs'     && <AppAgentCatalogRuns      key="agent-catalog-runs" />}
        {activeTab === 'capella-intro'          && <AppCapellaIntro          key="capella-intro" />}
        {activeTab === 'capella-service'        && <AppCapellaService        key="capella-service" />}
        {activeTab === 'capella-summarise'     && <AppCapellaSummarise     key="capella-summarise" />}
        {activeTab === 'capella-sentiment'      && <AppCapellaSentiment      key="capella-sentiment" />}
        {activeTab === 'capella-classification' && <AppCapellaClassification key="capella-classification" />}
        {activeTab === 'capella-extraction'     && <AppCapellaExtraction     key="capella-extraction" />}
        {activeTab === 'capella-translation'    && <AppCapellaTranslation    key="capella-translation" />}
        {activeTab === 'capella-masking'        && <AppCapellaMasking        key="capella-masking" />}
        {activeTab === 'capella-similarity'     && <AppCapellaSimilarity     key="capella-similarity" />}
        {activeTab === 'capella-completion'     && <AppCapellaCompletion     key="capella-completion" />}
        {activeTab === 'capella-grammar'        && <AppCapellaGrammar        key="capella-grammar" />}
        {activeTab === 'capella-model-guardrails' && <AppCapellaModelService key="capella-model-guardrails" featureId="guardrails" />}
        {activeTab === 'capella-model-cache'      && <AppCapellaModelService key="capella-model-cache"      featureId="cache" />}
        {activeTab === 'capella-model-providers'  && <AppCapellaModelService key="capella-model-providers"  featureId="providers" />}
        {activeTab === 'capella-model-ratelimit'  && <AppCapellaModelService key="capella-model-ratelimit"  featureId="ratelimit" />}
        {activeTab === 'capella-ingestion'      && <AppCapellaIngestion      key="capella-ingestion" />}
        {activeTab === 'temperature'       && <AppTemperature      key="temperature"       />}
        {activeTab === 'tool-calling'      && <AppToolCalling      key="tool-calling"      />}
        {activeTab === 'context-window'    && <AppContextWindow    key="context-window"    />}
        {activeTab === 'parallel'          && <AppParallel         key="parallel"          />}
        {activeTab === 'query-expansion'   && <AppQueryExpansion   key="query-expansion"   />}
        {activeTab === 'cost-latency'      && <AppCostLatency      key="cost-latency"      />}
        {activeTab === 'guardrails'        && <AppGuardrails       key="guardrails"        />}
        {activeTab === 'retry'             && <AppRetry            key="retry"             />}
        {activeTab === 'token-budget'      && <AppTokenBudget      key="token-budget"      />}
        {activeTab === 'observability'     && <AppObservability    key="observability"     />}
        {activeTab === 'voice-wasm'        && <AppVoiceWasm        key="voice-wasm"        />}
        {activeTab === 'voice-server'      && <AppVoiceServer      key="voice-server"      />}
        {activeTab === 'vision'            && <AppVision           key="vision"            />}
        {activeTab === 'image-generation'  && <AppImageGeneration  key="image-generation"  />}
        {activeTab === 'moderation'        && <AppModeration       key="moderation"        />}
        {activeTab === 'few-shot'          && <AppFewShot          key="few-shot"          />}
        {activeTab === 'model-comparison'  && <AppModelComparison  key="model-comparison"  />}
        {activeTab === 'personas'          && <AppPersonas         key="personas"          />}
        {activeTab === 'output-format'     && <AppOutputFormat     key="output-format"     />}
        {activeTab === 'hallucination'     && <AppHallucination    key="hallucination"     />}
        {activeTab === 'chunking'          && <AppChunking         key="chunking"          />}
        {activeTab === 'agentic-rag'       && <AppAgenticRag       key="agentic-rag"       />}
        {activeTab === 'logprobs'          && <AppLogprobs         key="logprobs"          />}
        {activeTab === 'chain-of-thought'  && <AppChainOfThought   key="chain-of-thought"  />}
        {activeTab === 'ingestion'         && <AppIngestion        key="ingestion"         />}
        {activeTab === 'prompt-injection'  && <AppPromptInjection  key="prompt-injection"  />}
        {activeTab === 'vector-search'      && <AppVectorSearch       key="vector-search"      />}
        {activeTab === 'metadata-filtering' && <AppMetadataFiltering  key="metadata-filtering" />}
        {activeTab === 'multi-vector'       && <AppMultiVector         key="multi-vector"       />}
        {activeTab === 'whatsapp-overview'  && <AppWhatsAppOverview    key="whatsapp-overview"  />}
        {activeTab === 'whatsapp-webhook'   && <AppWhatsAppDemo        key="whatsapp-webhook"   tabId="whatsapp-webhook"  />}
        {activeTab === 'whatsapp-memory'    && <AppWhatsAppDemo        key="whatsapp-memory"    tabId="whatsapp-memory"   />}
        {activeTab === 'whatsapp-deploy'    && <AppWhatsAppDeploy      key="whatsapp-deploy"    />}
        {activeTab === 'telegram-overview'  && <AppTelegramOverview    key="telegram-overview"  />}
        {activeTab === 'telegram-commands'  && <AppTelegramDemo        key="telegram-commands"  tabId="telegram-commands" />}
        {activeTab === 'telegram-inline'    && <AppTelegramDemo        key="telegram-inline"    tabId="telegram-inline"   />}
        {activeTab === 'telegram-deploy'    && <AppTelegramDeploy      key="telegram-deploy"    />}
        {activeTab === 'discord-overview'   && <AppDiscordOverview     key="discord-overview"   />}
        {activeTab === 'discord-slash'      && <AppDiscordDemo         key="discord-slash"      tabId="discord-slash"     />}
        {activeTab === 'discord-context'    && <AppDiscordDemo         key="discord-context"    tabId="discord-context"   />}
        {activeTab === 'discord-deploy'     && <AppDiscordDeploy       key="discord-deploy"     />}
        {activeTab === 'webchat-overview'   && <AppWebChatOverview     key="webchat-overview"   />}
        {activeTab === 'webchat-widget'     && <AppWebChatDemo         key="webchat-widget"     tabId="webchat-widget"    />}
        {activeTab === 'webchat-streaming'  && <AppWebChatDemo         key="webchat-streaming"  tabId="webchat-streaming" />}
        {activeTab === 'webchat-deploy'     && <AppWebChatDeploy       key="webchat-deploy"     />}
        {activeTab === 'shopify-overview'   && <AppShopifyOverview     key="shopify-overview"   />}
        {activeTab === 'shopify-catalog'    && <AppShopifyDemo         key="shopify-catalog"    tabId="shopify-catalog"   />}
        {activeTab === 'shopify-search'     && <AppShopifyDemo         key="shopify-search"     tabId="shopify-search"    />}
        {activeTab === 'shopify-deploy'          && <AppShopifyDeploy          key="shopify-deploy"          />}
        {activeTab === 'agent-memory-overview'    && <AppAgentMemoryOverview    key="agent-memory-overview"    />}
        {activeTab === 'agent-memory-sessions'    && <AppAgentMemorySessions    key="agent-memory-sessions"    />}
        {activeTab === 'agent-memory-search'      && <AppAgentMemorySearch      key="agent-memory-search"      />}
        {activeTab === 'agent-memory-integration' && <AppAgentMemoryIntegration key="agent-memory-integration" />}
        {activeTab === 'agent-memory-comparison'  && <AppAgentMemoryComparison  key="agent-memory-comparison"  />}
        </ErrorBoundary>
        <InfoPanel tab={activeTab} onTabChange={setActiveTab} />
      </div>
    </div>
  )
}

export default Shell
