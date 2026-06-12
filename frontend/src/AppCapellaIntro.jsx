import React from 'react'
import './AppCapellaIntro.css'

// Maps each Capella function to the DIY tab it replaces
const FUNCTION_MAP = [
  {
    fn: 'ai_summary()',
    replaces: 'summarise',
    replacesLabel: 'Summarisation',
    diy: 'Embed → chunk → LLM call with custom prompt',
    capella: 'SELECT default:ai_summary({…}) AS result',
    icon: '📄',
  },
  {
    fn: 'ai_sentiment()',
    replaces: 'moderation',
    replacesLabel: 'Moderation',
    diy: 'POST to OpenAI moderation API + parse response',
    capella: 'SELECT default:ai_sentiment({…}) AS result',
    icon: '💬',
  },
  {
    fn: 'ai_classification()',
    replaces: 'moderation',
    replacesLabel: 'Moderation / Structured Output',
    diy: 'LLM call + JSON parse + label validation',
    capella: 'SELECT default:ai_classification({…}) AS result',
    icon: '🏷️',
  },
  {
    fn: 'ai_extraction()',
    replaces: 'structured',
    replacesLabel: 'Structured Output',
    diy: 'LLM call with JSON schema prompt + parse',
    capella: 'SELECT default:ai_extraction({…}) AS result',
    icon: '🧩',
  },
  {
    fn: 'ai_translation()',
    replaces: null,
    replacesLabel: null,
    diy: 'LLM call with "translate to X" prompt',
    capella: 'SELECT default:ai_translation({…}) AS result',
    icon: '🌐',
  },
  {
    fn: 'ai_masked()',
    replaces: null,
    replacesLabel: null,
    diy: 'Regex + NER model + manual redaction logic',
    capella: 'SELECT default:ai_masked({…}) AS result',
    icon: '🛡️',
  },
  {
    fn: 'ai_similarity()',
    replaces: 'cached',
    replacesLabel: 'Semantic Cache',
    diy: 'Embed query → ANN search → threshold check',
    capella: 'SELECT default:ai_similarity({…}) AS score',
    icon: '🔢',
  },
  {
    fn: 'ai_completion()',
    replaces: 'rag',
    replacesLabel: 'RAG Pipeline',
    diy: 'Build prompt string → POST to LLM API',
    capella: 'SELECT default:ai_completion({…}) AS result',
    icon: '🤖',
  },
  {
    fn: 'ai_corrected_grammar()',
    replaces: null,
    replacesLabel: null,
    diy: 'LLM call with grammar correction prompt',
    capella: 'SELECT default:ai_corrected_grammar({…}) AS result',
    icon: '✏️',
  },
]

const BEFORE_AFTER = [
  {
    label: 'Semantic Cache lookup',
    before: `# 1. Embed the query
vec = openai.embeddings.create(
    model="text-embedding-3-small",
    input=query
).data[0].embedding

# 2. ANN search in Couchbase
hits = scope.search("cache_idx",
    VectorSearch.from_vector_query(
        VectorQuery("embedding", vec, num_candidates=5)
    ),
    SearchOptions(limit=1, fields=["response"]),
)
hit = next(hits.rows(), None)
if hit and hit.score > 0.85:
    return hit.fields["response"]

# 3. Cache miss — call LLM
answer = openai.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role":"user","content":query}],
).choices[0].message.content

# 4. Store for next time
col.upsert(key, {"query":query,
                 "embedding":vec,
                 "response":answer})`,
    after: `SELECT
  CASE
    WHEN ai_similarity({
      "text": $query,
      "candidates": cache_docs
    }) > 0.85
    THEN cached_response
    ELSE default:ai_completion({
      "prompt": $query,
      "model": "gpt-4o-mini"
    })
  END AS result
FROM semantic_cache
LIMIT 1`,
    beforeStats: { calls: 3, lines: 22 },
    afterStats: { calls: 0, lines: 13 },
  },
  {
    label: 'RAG answer generation',
    before: `# 1. Embed the question
q_vec = openai.embeddings.create(
    model="text-embedding-3-small",
    input=question
).data[0].embedding

# 2. Vector search for chunks
hits = scope.search("docs_idx",
    VectorSearch.from_vector_query(
        VectorQuery("embedding", q_vec,
                    num_candidates=10)
    ),
    SearchOptions(limit=3, fields=["text"]),
)
context = "\\n\\n".join(
    h.fields["text"] for h in hits.rows()
)

# 3. Build prompt and call LLM
prompt = (
    f"Context:\\n{context}\\n\\n"
    f"Question: {question}"
)
answer = openai.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role":"user","content":prompt}],
).choices[0].message.content`,
    after: `SELECT default:ai_completion({
  "prompt": CONCAT(
    "Context:\\n",
    ARRAY_TO_STRING(
      ARRAY c.text FOR c IN chunks END,
      "\\n\\n"
    ),
    "\\n\\nQuestion: ", $question
  ),
  "model": "gpt-4o-mini"
}) AS answer
FROM (
  SELECT d.text
  FROM documents d
  ORDER BY ANN_DISTANCE(
    d.embedding, $q_vec, "L2"
  ) ASC
  LIMIT 3
) AS chunks`,
    beforeStats: { calls: 2, lines: 24 },
    afterStats: { calls: 1, lines: 17 },
  },
]

function StatBadge({ label, value, good }) {
  return (
    <span className={`ci-stat ${good ? 'ci-stat--good' : ''}`}>
      <strong>{value}</strong> {label}
    </span>
  )
}

export default function AppCapellaIntro() {
  return (
    <div className="ci-root">

      {/* Hero */}
      <div className="ci-hero">
        <div className="ci-hero-text">
          <h1 className="ci-hero-title">Capella AI Functions</h1>
          <p className="ci-hero-lead">
            Every AI integration you've built in this lab follows the same pattern:
            embed → search → call LLM → parse → store. Capella AI Functions collapse
            that multi-step pipeline into a single SQL++ query that runs inside the
            database — no extra API calls from your application, no orchestration code
            to maintain.
          </p>
        </div>
        <div className="ci-hero-badge">
          <span className="ci-hero-badge-text">SQL++</span>
          <span className="ci-hero-badge-sub">runs inside Couchbase</span>
        </div>
      </div>

      {/* How it works */}
      <section className="ci-section">
        <h2 className="ci-section-title">How it works</h2>
        <div className="ci-how-grid">
          <div className="ci-how-card">
            <span className="ci-how-num">1</span>
            <div>
              <strong>Configure once</strong>
              <p>Connect an LLM provider (OpenAI, Bedrock, Vertex…) in the Capella UI. Your application code never touches API keys or model names.</p>
            </div>
          </div>
          <div className="ci-how-card">
            <span className="ci-how-num">2</span>
            <div>
              <strong>Call from SQL++</strong>
              <p>Use <code>default:ai_summary()</code>, <code>default:ai_completion()</code>, and others as regular SQL++ functions in any SELECT, UPDATE, or INSERT.</p>
            </div>
          </div>
          <div className="ci-how-card">
            <span className="ci-how-num">3</span>
            <div>
              <strong>Results in the query row</strong>
              <p>The LLM response comes back as a field in the result set — alongside your document data, in one round trip from your application.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Before / After */}
      <section className="ci-section">
        <h2 className="ci-section-title">Before → After</h2>
        <p className="ci-section-sub">
          Two patterns you built manually in this lab, rewritten as SQL++.
        </p>
        {BEFORE_AFTER.map((ex, i) => (
          <div key={i} className="ci-ba-block">
            <div className="ci-ba-label">{ex.label}</div>
            <div className="ci-ba-columns">
              <div className="ci-ba-col ci-ba-col--before">
                <div className="ci-ba-col-header">
                  <span>🐍 DIY Python</span>
                  <div className="ci-ba-stats">
                    <StatBadge label="external API calls" value={ex.beforeStats.calls} />
                    <StatBadge label="lines" value={ex.beforeStats.lines} />
                  </div>
                </div>
                <pre className="ci-code">{ex.before}</pre>
              </div>
              <div className="ci-ba-arrow">→</div>
              <div className="ci-ba-col ci-ba-col--after">
                <div className="ci-ba-col-header">
                  <span>🗄️ Capella SQL++</span>
                  <div className="ci-ba-stats">
                    <StatBadge label="external API calls" value={ex.afterStats.calls} good={ex.afterStats.calls < ex.beforeStats.calls} />
                    <StatBadge label="lines" value={ex.afterStats.lines} good={ex.afterStats.lines < ex.beforeStats.lines} />
                  </div>
                </div>
                <pre className="ci-code ci-code--sql">{ex.after}</pre>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Function map */}
      <section className="ci-section">
        <h2 className="ci-section-title">Available functions</h2>
        <p className="ci-section-sub">
          Each function in this module replaces a pattern you've already seen in the lab.
        </p>
        <div className="ci-fn-table">
          <div className="ci-fn-row ci-fn-row--header">
            <span>Function</span>
            <span>Replaces (DIY tab)</span>
            <span>DIY approach</span>
            <span>Capella SQL++</span>
          </div>
          {FUNCTION_MAP.map((f, i) => (
            <div key={i} className="ci-fn-row">
              <span className="ci-fn-name">
                <span className="ci-fn-icon">{f.icon}</span>
                <code>{f.fn}</code>
              </span>
              <span className="ci-fn-replaces">
                {f.replacesLabel
                  ? <span className="ci-fn-tag">{f.replacesLabel}</span>
                  : <span className="ci-fn-new">New capability</span>
                }
              </span>
              <span className="ci-fn-diy">{f.diy}</span>
              <code className="ci-fn-sql">{f.capella}</code>
            </div>
          ))}
        </div>
      </section>

      {/* What's next */}
      <section className="ci-section ci-section--last">
        <h2 className="ci-section-title">What's in this module</h2>
        <p className="ci-section-sub">
          Each tab in this module lets you run a Capella AI Function live and compare
          it to the DIY equivalent you built earlier. Start with{' '}
          <strong>AI Data Plane</strong> for a side-by-side timing comparison,
          then explore individual functions.
        </p>
        <div className="ci-next-grid">
          {[
            { label: 'AI Data Plane', desc: 'Side-by-side DIY vs SQL++ with live timing' },
            { label: 'AI Summarisation', desc: 'ai_summary() — replaces the Summarisation tab' },
            { label: 'AI Sentiment', desc: 'ai_sentiment() — label + confidence score' },
            { label: 'AI Classification', desc: 'ai_classification() — custom label sets' },
            { label: 'AI Extraction', desc: 'ai_extraction() — named entities as structured JSON' },
            { label: 'AI Translation', desc: 'ai_translation() — 12 languages, auto-detect source' },
            { label: 'AI Masking', desc: 'ai_masked() — PII redaction for compliance' },
            { label: 'AI Similarity', desc: 'ai_similarity() — replaces embedding + ANN search' },
            { label: 'AI Completion', desc: 'ai_completion() — general-purpose LLM from SQL++' },
            { label: 'AI Grammar', desc: 'ai_corrected_grammar() — clean user-generated content' },
          ].map((item, i) => (
            <div key={i} className="ci-next-card">
              <span className="ci-next-label">{item.label}</span>
              <span className="ci-next-desc">{item.desc}</span>
            </div>
          ))}
        </div>
      </section>

    </div>
  )
}
