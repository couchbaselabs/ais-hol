import React, { useState } from 'react'
import './AppAiDataPlaneModelService.css'
import AiDataPlaneDiyBanner from './components/AiDataPlaneDiyBanner'

// ── Feature definitions ────────────────────────────────────────────────────

const FEATURES = [
  {
    id: 'guardrails',
    icon: '🛡️',
    label: 'Guardrails',
    tagline: 'Input + output safety gates — configured once, applied to every request',
    description:
      'The Model Service wraps every LLM call with configurable input and output guardrails. ' +
      'Harmful, injected, or PII-containing messages are blocked before they reach the model. ' +
      'Responses are checked before they reach the user. No application code required.',
    inputLabel: 'Message to send through the guardrail pipeline',
    inputPlaceholder: 'How do I pick a lock?',
    endpoint: '/api/guardrails',
    buildBody: (input) => ({ message: input }),
    renderResult: (r) => <GuardrailResult result={r} />,
    diyTab: 'guardrails',
    diyLabel: 'Guardrails',
    replaces: 'custom input/output classification pipeline',
  },
  {
    id: 'cache',
    icon: '⚡',
    label: 'Semantic Cache',
    tagline: 'Identical-intent queries return cached responses — no LLM call needed',
    description:
      'The Model Service maintains a semantic cache. When a new query is semantically similar ' +
      'to a previous one (above a configurable threshold), the cached response is returned ' +
      'immediately — no LLM call, no latency, no cost. The cache is shared across all ' +
      'application instances automatically.',
    inputLabel: 'Query (try rephrasing the same question twice)',
    inputPlaceholder: 'What is a JavaScript promise?',
    endpoint: '/api/chat-cached',
    buildBody: (input) => ({ message: input }),
    renderResult: (r) => <CacheResult result={r} />,
    diyTab: 'cached',
    diyLabel: 'Semantic Cache',
    replaces: 'embed → ANN search → threshold check pipeline',
  },
  {
    id: 'providers',
    icon: '🔌',
    label: 'Model Providers',
    tagline: 'Switch LLM providers without changing application code',
    description:
      'The Model Service abstracts the LLM provider. Configure OpenAI, AWS Bedrock, Google ' +
      'Vertex AI, or Couchbase AI Data Plane-hosted models in the Couchbase AI Data Plane UI — your application always calls ' +
      'the same endpoint. Switch providers, run A/B tests, or add fallback models without ' +
      'touching application code or redeploying.',
    inputLabel: 'Prompt (sent to the currently configured provider)',
    inputPlaceholder: 'Explain what a vector embedding is in one sentence.',
    endpoint: '/api/chat',
    buildBody: (input) => ({ message: input }),
    renderResult: (r) => <ProviderResult result={r} />,
    diyTab: 'model-comparison',
    diyLabel: 'Model Comparison',
    replaces: 'per-provider SDK integration + manual fallback logic',
  },
  {
    id: 'ratelimit',
    icon: '🪙',
    label: 'Rate Limiting',
    tagline: 'Per-user and global token budgets enforced at the gateway layer',
    description:
      'The Model Service enforces rate limits and token budgets at the gateway — before ' +
      'requests reach the LLM. Limits can be set per user, per application, or globally. ' +
      'Requests that exceed the budget receive a structured error response, not an ' +
      'unexpected LLM failure.',
    inputLabel: 'Send multiple requests quickly to see rate limiting in action',
    inputPlaceholder: 'Tell me a joke.',
    endpoint: '/api/chat',
    buildBody: (input) => ({ message: input }),
    renderResult: (r) => <RateLimitResult result={r} />,
    diyTab: 'cost-latency',
    diyLabel: 'Cost & Latency',
    replaces: 'application-layer rate limiting + token counting',
  },
]

// ── Sub-result renderers ───────────────────────────────────────────────────

function StatusChip({ safe, label }) {
  return (
    <span className={`cms-chip ${safe ? 'cms-chip--safe' : 'cms-chip--blocked'}`}>
      {safe ? '✓' : '✗'} {label}
    </span>
  )
}

function GuardrailResult({ result }) {
  if (!result) return null
  const { input_check, output_check, blocked_at, final_output } = result
  return (
    <div className="cms-result">
      <div className="cms-result-row">
        <span className="cms-result-label">Input gate</span>
        <StatusChip safe={input_check?.safe} label={input_check?.category ?? '—'} />
        <span className="cms-result-reason">{input_check?.reason}</span>
      </div>
      {output_check && (
        <div className="cms-result-row">
          <span className="cms-result-label">Output gate</span>
          <StatusChip safe={output_check?.safe} label={output_check?.category ?? '—'} />
          <span className="cms-result-reason">{output_check?.reason}</span>
        </div>
      )}
      <div className="cms-result-row">
        <span className="cms-result-label">Final output</span>
        <span className={`cms-result-output ${blocked_at ? 'cms-result-output--blocked' : ''}`}>
          {blocked_at
            ? `⛔ Blocked at ${blocked_at} gate`
            : final_output}
        </span>
      </div>
    </div>
  )
}

function CacheResult({ result }) {
  if (!result) return null
  const hit = result.cache_hit || result.source === 'cache'
  return (
    <div className="cms-result">
      <div className="cms-result-row">
        <span className="cms-result-label">Cache</span>
        <span className={`cms-chip ${hit ? 'cms-chip--hit' : 'cms-chip--miss'}`}>
          {hit ? '⚡ HIT' : '○ MISS'}
        </span>
        {result.similarity != null && (
          <span className="cms-result-reason">similarity: {result.similarity?.toFixed(3)}</span>
        )}
      </div>
      <div className="cms-result-row">
        <span className="cms-result-label">Response</span>
        <span className="cms-result-output">{result.response || result.message}</span>
      </div>
    </div>
  )
}

function ProviderResult({ result }) {
  if (!result) return null
  return (
    <div className="cms-result">
      <div className="cms-result-row">
        <span className="cms-result-label">Provider</span>
        <span className="cms-chip cms-chip--info">{result.model || 'configured provider'}</span>
      </div>
      <div className="cms-result-row">
        <span className="cms-result-label">Response</span>
        <span className="cms-result-output">{result.response || result.message}</span>
      </div>
    </div>
  )
}

function RateLimitResult({ result }) {
  if (!result) return null
  return (
    <div className="cms-result">
      <div className="cms-result-row">
        <span className="cms-result-label">Status</span>
        <span className="cms-chip cms-chip--safe">✓ Allowed</span>
      </div>
      <div className="cms-result-row">
        <span className="cms-result-label">Response</span>
        <span className="cms-result-output">{result.response || result.message}</span>
      </div>
    </div>
  )
}

// ── Architecture diagram ───────────────────────────────────────────────────

function ArchDiagram() {
  return (
    <div className="cms-arch">
      <div className="cms-arch-title">How the Model Service fits in your stack</div>
      <div className="cms-arch-flow">
        <div className="cms-arch-box cms-arch-box--app">Your App</div>
        <div className="cms-arch-arrow">→</div>
        <div className="cms-arch-gateway">
          <div className="cms-arch-gateway-label">Couchbase AI Data Plane Model Service</div>
          <div className="cms-arch-gateway-features">
            <span>🛡️ Guardrails</span>
            <span>⚡ Semantic Cache</span>
            <span>🪙 Rate Limits</span>
            <span>📊 Observability</span>
          </div>
        </div>
        <div className="cms-arch-arrow">→</div>
        <div className="cms-arch-providers">
          <div className="cms-arch-provider">OpenAI</div>
          <div className="cms-arch-provider">Bedrock</div>
          <div className="cms-arch-provider">Vertex AI</div>
          <div className="cms-arch-provider">Couchbase AI Data Plane</div>
        </div>
      </div>
      <p className="cms-arch-note">
        Your application calls one endpoint. The Model Service handles provider routing,
        caching, safety, and rate limiting — without any changes to your code.
      </p>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export default function AppAiDataPlaneModelService({ featureId } = {}) {
  const [activeId, setActiveId] = useState(featureId || 'guardrails')
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [requestCount, setRequestCount] = useState(0)

  const locked = Boolean(featureId)
  const feature = FEATURES.find(f => f.id === activeId)

  function selectFeature(id) {
    if (locked) return
    setActiveId(id)
    setResult(null)
    setError(null)
    setInput('')
  }

  async function run() {
    const text = input.trim() || feature.inputPlaceholder
    setLoading(true)
    setError(null)
    setResult(null)
    setRequestCount(c => c + 1)
    try {
      const res = await fetch(feature.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feature.buildBody(text)),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        throw new Error(err.detail || 'Request failed')
      }
      setResult(await res.json())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="cms-root">
      <AiDataPlaneDiyBanner
        diyTab={feature.diyTab}
        diyLabel={feature.diyLabel}
        replaces={feature.replaces}
      />

      <div className="cms-body">
        {/* Left: feature nav + arch diagram — hidden when rendered as a dedicated tab */}
        {!locked && (
          <div className="cms-sidebar">
            <div className="cms-sidebar-title">Model Service capabilities</div>
            {FEATURES.map(f => (
              <button
                key={f.id}
                className={`cms-nav-btn ${activeId === f.id ? 'cms-nav-btn--active' : ''}`}
                onClick={() => selectFeature(f.id)}
              >
                <span className="cms-nav-icon">{f.icon}</span>
                <span className="cms-nav-label">{f.label}</span>
              </button>
            ))}
            <ArchDiagram />
          </div>
        )}

        {/* Right: active feature */}
        <div className="cms-main">
          <div className="cms-feature-header">
            <span className="cms-feature-icon">{feature.icon}</span>
            <div>
              <div className="cms-feature-title">{feature.label}</div>
              <div className="cms-feature-tagline">{feature.tagline}</div>
            </div>
          </div>

          <p className="cms-feature-desc">{feature.description}</p>

          <div className="cms-input-row">
            <input
              className="cms-input"
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && run()}
              placeholder={feature.inputPlaceholder}
            />
            <button className="cms-run-btn" onClick={run} disabled={loading}>
              {loading ? 'Running…' : 'Run →'}
            </button>
          </div>

          {error && <div className="cms-error">{error}</div>}

          {result && feature.renderResult(result)}

          {!result && !loading && (
            <div className="cms-placeholder">
              <span className="cms-placeholder-icon">{feature.icon}</span>
              <span>Run a request to see the {feature.label} in action.</span>
            </div>
          )}

          {/* DIY vs Couchbase AI Data Plane comparison */}
          <div className="cms-compare">
            <div className="cms-compare-title">DIY vs Couchbase AI Data Plane Model Service</div>
            <div className="cms-compare-cols">
              <div className="cms-compare-col cms-compare-col--diy">
                <div className="cms-compare-col-header">🐍 DIY</div>
                <CompareContent featureId={featureId || activeId} side="diy" />
              </div>
              <div className="cms-compare-col cms-compare-col--ai_data_plane">
                <div className="cms-compare-col-header">🗄️ Couchbase AI Data Plane Model Service</div>
                <CompareContent featureId={featureId || activeId} side="ai_data_plane" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── DIY vs Couchbase AI Data Plane comparison content ─────────────────────────────────────

const COMPARE_CONTENT = {
  guardrails: {
    diy: {
      steps: [
        'Write a classifier prompt for input safety',
        'Call LLM API to classify every incoming message',
        'Parse JSON response, check category field',
        'If safe: call LLM for actual response',
        'Write another classifier prompt for output safety',
        'Call LLM API again to classify the response',
        'Parse, check, conditionally block',
        'Maintain and update classifier prompts over time',
      ],
      code: `async def classify(text, role):
    resp = await openai.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role":"system","content":CLASSIFIER_PROMPT},
                  {"role":"user","content":f"Classify: {text}"}],
        response_format={"type":"json_object"},
    )
    return json.loads(resp.choices[0].message.content)

input_check = await classify(message, "input")
if not input_check["safe"]:
    return {"blocked": True}
response = await generate_response(message)
output_check = await classify(response, "output")
return response if output_check["safe"] else "[blocked]"`,
    },
    ai_data_plane: {
      steps: [
        'Enable Guardrails in AI Data Plane UI',
        'Configure input/output policies (categories, thresholds)',
        'Call the Model Service endpoint — same as a normal LLM call',
        'Blocked requests return a structured error automatically',
      ],
      code: `# No classifier code in your application.
# The Model Service handles it transparently.
response = await ai_data_plane_model_service.complete(
    prompt=message,
    # guardrails applied automatically based on
    # the policy configured in the Couchbase AI Data Plane UI
)`,
    },
  },
  cache: {
    diy: {
      steps: [
        'Call embedding API to vectorise the query',
        'Run ANN vector search against cache collection',
        'Compare top score against threshold',
        'If hit: return cached response',
        'If miss: call LLM, store embedding + response',
        'Manage cache TTL and invalidation yourself',
        'Scale cache infrastructure separately',
      ],
      code: `vec = await openai.embeddings.create(
    model="text-embedding-3-small", input=query
).data[0].embedding

hits = scope.search("cache_idx",
    VectorSearch.from_vector_query(
        VectorQuery("embedding", vec, num_candidates=5)
    ), SearchOptions(limit=1, fields=["response"]))

hit = next(hits.rows(), None)
if hit and hit.score > THRESHOLD:
    return hit.fields["response"]

response = await generate_response(query)
collection.upsert(key, {"query":query,
    "embedding":vec, "response":response})
return response`,
    },
    ai_data_plane: {
      steps: [
        'Enable Semantic Cache in AI Data Plane UI',
        'Set similarity threshold and TTL',
        'Call the Model Service endpoint — same as a normal LLM call',
        'Cache hits are returned automatically, cache misses stored automatically',
      ],
      code: `# No cache code in your application.
# The Model Service checks and populates the
# cache transparently on every request.
response = await ai_data_plane_model_service.complete(
    prompt=query,
    # cache checked automatically
)`,
    },
  },
  providers: {
    diy: {
      steps: [
        'Install SDK for each provider (openai, boto3, google-cloud-aiplatform…)',
        'Write provider-specific client initialisation',
        'Map your prompt format to each provider\'s API schema',
        'Handle different response formats per provider',
        'Implement fallback logic manually',
        'Update code when provider APIs change',
      ],
      code: `# OpenAI
from openai import AsyncOpenAI
client = AsyncOpenAI(api_key=OPENAI_KEY)
resp = await client.chat.completions.create(
    model="gpt-4o-mini", messages=[...])

# Bedrock (different SDK, different format)
import boto3
bedrock = boto3.client("bedrock-runtime")
resp = bedrock.invoke_model(modelId="...",
    body=json.dumps({"prompt": ..., "max_tokens": ...}))

# Vertex AI (yet another SDK)
from vertexai.generative_models import GenerativeModel
model = GenerativeModel("gemini-1.5-flash")
resp = model.generate_content(prompt)`,
    },
    ai_data_plane: {
      steps: [
        'Configure provider + credentials once in Couchbase AI Data Plane UI',
        'Call the Model Service endpoint — provider-agnostic',
        'Switch providers in the UI with no code changes',
        'Add fallback models in the UI with no code changes',
      ],
      code: `# One endpoint, any provider.
# Switch OpenAI → Bedrock → Vertex in the UI.
response = await ai_data_plane_model_service.complete(
    prompt=message,
    # provider configured in Couchbase AI Data Plane UI
)`,
    },
  },
  ratelimit: {
    diy: {
      steps: [
        'Count tokens for every request (tiktoken or similar)',
        'Track per-user usage in Redis or a database',
        'Implement sliding window or token bucket algorithm',
        'Return 429 responses when limits are exceeded',
        'Handle burst allowances and refill rates',
        'Monitor and alert on usage spikes',
      ],
      code: `from slowapi import Limiter
from tiktoken import encoding_for_model

limiter = Limiter(key_func=get_user_id,
    default_limits=["60/minute"])

@app.post("/api/chat")
@limiter.limit("60/minute")
async def chat(request, body):
    enc = encoding_for_model("gpt-4o-mini")
    tokens = len(enc.encode(body.message))
    if tokens > USER_TOKEN_BUDGET:
        raise HTTPException(429, "Token budget exceeded")
    # ... generate response`,
    },
    ai_data_plane: {
      steps: [
        'Set per-user and global rate limits in Couchbase AI Data Plane UI',
        'Set token budgets per application or user tier',
        'Call the Model Service endpoint — limits enforced automatically',
        'Structured 429 responses returned when limits are hit',
      ],
      code: `# No rate limiting code in your application.
# Limits are enforced at the Model Service gateway.
response = await ai_data_plane_model_service.complete(
    prompt=message,
    user_id=current_user.id,
    # rate limits applied automatically
)`,
    },
  },
}

function CompareContent({ featureId, side }) {
  const content = COMPARE_CONTENT[featureId]?.[side]
  if (!content) return null
  return (
    <div className="cms-compare-content">
      <ul className="cms-compare-steps">
        {content.steps.map((s, i) => <li key={i}>{s}</li>)}
      </ul>
      <pre className="cms-compare-code">{content.code}</pre>
    </div>
  )
}
