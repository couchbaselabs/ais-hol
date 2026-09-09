import React, { useState, useEffect, useCallback } from 'react'
import { ORDERED_TAB_IDS } from './curriculum'
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
import AppAiDataPlaneIntro from './AppAiDataPlaneIntro'
import AppAiDataPlaneModelService from './AppAiDataPlaneModelService'
import AppAiDataPlaneIngestion from './AppAiDataPlaneIngestion'
import AppAiDataPlaneService from './AppAiDataPlaneService'
import AppAiDataPlaneSummarise from './AppAiDataPlaneSummarise'
import AppAiDataPlaneSentiment from './AppAiDataPlaneSentiment'
import AppAiDataPlaneClassification from './AppAiDataPlaneClassification'
import AppAiDataPlaneExtraction from './AppAiDataPlaneExtraction'
import AppAiDataPlaneTranslation from './AppAiDataPlaneTranslation'
import AppAiDataPlaneMasking from './AppAiDataPlaneMasking'
import AppAiDataPlaneSimilarity from './AppAiDataPlaneSimilarity'
import AppAiDataPlaneCompletion from './AppAiDataPlaneCompletion'
import AppAiDataPlaneGrammar from './AppAiDataPlaneGrammar'
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

// Resolve the active tab from a URL path, e.g. "/chat" -> "chat".
// Falls back to "chat" for the root path or any unrecognised path.
function tabFromPath(pathname) {
  const id = pathname.replace(/^\//, '')
  return ORDERED_TAB_IDS.includes(id) ? id : 'chat'
}

function Shell() {
  const [activeTab, setActiveTab] = useState(() => tabFromPath(window.location.pathname))

  // Give every tab a real, shareable URL (a permalink) and make the browser's
  // back/forward buttons move between tabs via the History API.
  const navigate = useCallback((tabId) => {
    setActiveTab(tabId)
    const path = `/${tabId}`
    if (window.location.pathname !== path) {
      window.history.pushState({ tab: tabId }, '', path)
    }
  }, [])

  useEffect(() => {
    // Normalize the initial URL (e.g. "/" or an unknown path) to the resolved
    // tab's permalink, without adding a history entry.
    const initial = tabFromPath(window.location.pathname)
    const path = `/${initial}`
    if (window.location.pathname !== path) {
      window.history.replaceState({ tab: initial }, '', path)
    }

    const onPopState = () => setActiveTab(tabFromPath(window.location.pathname))
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    const handler = (e) => navigate(e.detail)
    window.addEventListener('shell:navigate', handler)
    return () => window.removeEventListener('shell:navigate', handler)
  }, [navigate])

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <Sidebar activeTab={activeTab} onTabChange={navigate} />
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
        {activeTab === 'ai-data-plane-intro'          && <AppAiDataPlaneIntro          key="ai-data-plane-intro" />}
        {activeTab === 'ai-data-plane-service'        && <AppAiDataPlaneService        key="ai-data-plane-service" />}
        {activeTab === 'ai-data-plane-summarise'     && <AppAiDataPlaneSummarise     key="ai-data-plane-summarise" />}
        {activeTab === 'ai-data-plane-sentiment'      && <AppAiDataPlaneSentiment      key="ai-data-plane-sentiment" />}
        {activeTab === 'ai-data-plane-classification' && <AppAiDataPlaneClassification key="ai-data-plane-classification" />}
        {activeTab === 'ai-data-plane-extraction'     && <AppAiDataPlaneExtraction     key="ai-data-plane-extraction" />}
        {activeTab === 'ai-data-plane-translation'    && <AppAiDataPlaneTranslation    key="ai-data-plane-translation" />}
        {activeTab === 'ai-data-plane-masking'        && <AppAiDataPlaneMasking        key="ai-data-plane-masking" />}
        {activeTab === 'ai-data-plane-similarity'     && <AppAiDataPlaneSimilarity     key="ai-data-plane-similarity" />}
        {activeTab === 'ai-data-plane-completion'     && <AppAiDataPlaneCompletion     key="ai-data-plane-completion" />}
        {activeTab === 'ai-data-plane-grammar'        && <AppAiDataPlaneGrammar        key="ai-data-plane-grammar" />}
        {activeTab === 'ai-data-plane-model-guardrails' && <AppAiDataPlaneModelService key="ai-data-plane-model-guardrails" featureId="guardrails" />}
        {activeTab === 'ai-data-plane-model-cache'      && <AppAiDataPlaneModelService key="ai-data-plane-model-cache"      featureId="cache" />}
        {activeTab === 'ai-data-plane-model-providers'  && <AppAiDataPlaneModelService key="ai-data-plane-model-providers"  featureId="providers" />}
        {activeTab === 'ai-data-plane-model-ratelimit'  && <AppAiDataPlaneModelService key="ai-data-plane-model-ratelimit"  featureId="ratelimit" />}
        {activeTab === 'ai-data-plane-ingestion'      && <AppAiDataPlaneIngestion      key="ai-data-plane-ingestion" />}
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
        <InfoPanel tab={activeTab} onTabChange={navigate} />
      </div>
    </div>
  )
}

export default Shell
