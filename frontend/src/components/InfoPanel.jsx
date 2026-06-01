import React, { useState } from 'react'
import './InfoPanel.css'
import CodeBlock from './CodeBlock'

const TAB_INFO = {
  tokens: {
    title: 'Token Counter',
    subtitle: 'Live tokenisation with tiktoken — see exactly what the model reads',
    color: '#6366f1',
    icon: '🔤',
    what: 'LLMs don\'t read text character by character — they read tokens. A token is a chunk of text that the model\'s vocabulary recognises as a unit: sometimes a whole word, sometimes a sub-word, sometimes a single character or punctuation mark. Tiktoken is OpenAI\'s tokeniser library. This tab tokenises any text live, colour-codes each token in the original text, and shows the token ID, decoded text, and raw bytes for every token.',
    how: [
      'Text typed → debounced 300 ms → POST /api/tokenise',
      'Backend loads the correct tiktoken encoding for the selected model',
      'enc.encode(text) returns a list of integer token IDs',
      'Each ID decoded back to bytes and UTF-8 text for display',
      'Context window usage computed: token_count / context_window × 100%',
      'Estimated input cost: token_count / 1,000,000 × price_per_1M',
      'Results streamed back; UI updates without a full page reload',
    ],
    limitations: [
      'Different models use different encodings (cl100k_base vs o200k_base) — the same text tokenises differently',
      'Token count is exact for the selected model\'s encoding; actual API usage may differ slightly for chat messages due to message formatting overhead',
      'Cost estimates use May 2025 list prices — check OpenAI pricing for current rates',
      'The highlighted text reconstructs tokens by joining their decoded text, which may differ from the original for multi-byte characters',
    ],
    stack: ['tiktoken (OpenAI tokeniser library)', 'FastAPI', 'React debounced live update'],
    questions: [
      'Try: "Hello, world!" — how many tokens?',
      'Try the same word in English vs French vs Japanese',
      'Try a code snippet — notice how indentation tokenises',
      'Try numbers: 1234 vs 1,234 vs $1,234.56',
    ],
    snippets: [
      {
        title: 'backend/main.py — tokenise endpoint',
        language: 'python',
        code: `import tiktoken

enc = tiktoken.get_encoding("cl100k_base")  # or o200k_base for gpt-4o
token_ids = enc.encode("Hello, world!")

for tid in token_ids:
    raw_bytes = enc.decode_single_token_bytes(tid)
    text = raw_bytes.decode("utf-8")
    print(f"id={tid}  bytes={list(raw_bytes)}  text={repr(text)}")
# id=9906  bytes=[72, 101, 108, 108, 111]  text='Hello'
# id=11   bytes=[44]                        text=','
# id=1917 bytes=[32, 119, 111, 114, 108]   text=' worl'
# id=0    bytes=[100, 33]                  text='d!'`,
      },
      {
        title: 'frontend — debounced live update',
        language: 'jsx',
        code: `// Debounce prevents a request on every keystroke
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)   // cancel on next keystroke
  }, [value, delay])
  return debounced
}

// AbortController cancels in-flight requests when text changes
const abortRef = useRef(null)
const tokenise = async (text) => {
  if (abortRef.current) abortRef.current.abort()
  const ctrl = new AbortController()
  abortRef.current = ctrl
  const res = await fetch('/api/tokenise', {
    method: 'POST',
    body: JSON.stringify({ text, model }),
    signal: ctrl.signal,
  })
  setResult(await res.json())
}`,
      },
    ],
  },
  embeddings: {
    title: 'Embeddings Explorer',
    subtitle: 'Visualise semantic similarity and 2-D PCA projections of text embeddings',
    color: '#0891b2',
    icon: '🔢',
    what: 'An embedding is a high-dimensional vector (1536 numbers for text-embedding-3-small) that encodes the semantic meaning of a phrase. Phrases with similar meanings have vectors that point in similar directions — measured by cosine similarity. This tab embeds up to 8 phrases, computes a pairwise similarity matrix, and projects the vectors into 2-D using PCA so you can see clusters and distances visually.',
    how: [
      'All phrases embedded in parallel (OpenAI text-embedding-3-small)',
      'Pairwise cosine similarity computed for every pair',
      'Similarity matrix rendered as a colour heatmap (red=low, green=high)',
      '2-D PCA projection computed server-side (power iteration, no numpy)',
      'Scatter plot drawn on an HTML canvas element',
    ],
    limitations: [
      'PCA is a linear projection — non-linear structure is lost',
      'Cosine similarity ignores magnitude; two very different-length texts can score high',
      'Embeddings capture training-data semantics — domain-specific terms may cluster unexpectedly',
    ],
    stack: ['OpenAI text-embedding-3-small', 'Server-side PCA (pure Python)', 'HTML Canvas (browser)'],
    questions: [
      'Try: king, queen, man, woman (classic analogy)',
      'Try: happy, joyful, sad, miserable (synonyms vs antonyms)',
      'Try: Python, JavaScript, Rust, SQL (programming languages)',
    ],
    snippets: [
      {
        title: 'backend/main.py — embed and compare',
        language: 'python',
        code: `import math

async def cosine(a, b):
    dot = sum(x * y for x, y in zip(a, b))
    na  = math.sqrt(sum(x*x for x in a))
    nb  = math.sqrt(sum(x*x for x in b))
    return dot / (na * nb)

# Embed two phrases in parallel
emb_a, emb_b = await asyncio.gather(
    get_embedding("king"),
    get_embedding("queen"),
)
similarity = await cosine(emb_a, emb_b)
# → ~0.85  (semantically close)`,
      },
      {
        title: 'backend/main.py — 2-D PCA (power iteration)',
        language: 'python',
        code: `def pca_2d(vecs):
    k, d = len(vecs), len(vecs[0])
    mean = [sum(v[i] for v in vecs)/k for i in range(d)]
    centred = [[v[i]-mean[i] for i in range(d)] for v in vecs]

    components = []
    residual = [row[:] for row in centred]
    for _ in range(2):                    # find 2 principal components
        pc = residual[0][:]
        for _ in range(20):               # power iteration
            new_pc = [sum(r[i]*pc[i] for i in range(d))*r[j]
                      for j in range(d)]  # simplified
            n = math.sqrt(sum(x*x for x in new_pc)) + 1e-10
            pc = [x/n for x in new_pc]
        components.append(pc)
        # deflate: remove this component from residual
        residual = [[r[i] - sum(r[j]*pc[j] for j in range(d))*pc[i]
                     for i in range(d)] for r in residual]

    return [[sum(c[i]*pc[i] for i in range(d)) for pc in components]
            for c in centred]`,
      },
    ],
  },
  hyde: {
    title: 'HyDE',
    subtitle: 'Hypothetical Document Embedding — embed a fake answer, not the question',
    color: '#d97706',
    icon: '💡',
    what: 'Standard RAG embeds the user\'s question and searches for similar documents. But questions and answers live in different semantic spaces — a question like "how does X work?" is phrased very differently from a documentation paragraph that explains X. HyDE bridges this gap: ask the LLM to write a short hypothetical answer first, then embed that answer for retrieval. The hypothetical doc uses the same vocabulary and style as real documentation, so it retrieves better matches.',
    how: [
      'User query → LLM generates a 3–5 sentence hypothetical answer',
      'Both the raw query and the hypothetical doc are embedded in parallel',
      'Two ANN vector searches run simultaneously against MDN docs',
      'Standard results (query embedding) vs HyDE results (hypothetical embedding) shown side by side',
      'Final answer generated from the HyDE-retrieved documents',
    ],
    limitations: [
      'Adds one extra LLM call before retrieval — increases latency and cost',
      'If the LLM generates a hallucinated hypothetical, retrieval quality degrades',
      'Benefit is most visible for short, keyword-sparse queries',
      'Less useful when the query is already phrased like documentation',
    ],
    stack: ['OpenAI GPT (hypothetical generation)', 'OpenAI Embeddings', 'Couchbase ANN vector search'],
    questions: [
      'How does the CSS box model work?',
      'What is the difference between let and const?',
      'Explain the Fetch API',
      'How do Promises work in JavaScript?',
    ],
    snippets: [
      {
        title: 'backend/main.py — generate hypothetical doc then embed',
        language: 'python',
        code: `# Step 1: ask the LLM to write a hypothetical answer
hyp = await client.chat.completions.create(
    model=INFERENCE_MODEL,
    messages=[{
        "role": "system",
        "content": "Write a short factual paragraph that directly answers "
                   "the question as if it were a documentation excerpt.",
    }, {"role": "user", "content": query}],
    temperature=0.3, max_tokens=200,
)
hypothetical_doc = hyp.choices[0].message.content

# Step 2: embed both in parallel and retrieve
query_emb, hyde_emb = await asyncio.gather(
    get_embedding(query),
    get_embedding(hypothetical_doc),   # ← this is what makes HyDE different
)
standard_docs, hyde_docs = await asyncio.gather(
    get_relevant_documents(query_emb),
    get_relevant_documents(hyde_emb),
)`,
      },
    ],
  },
  evaluate: {
    title: 'LLM-as-Judge',
    subtitle: 'Automatically score RAG answer quality on faithfulness, relevance, and completeness',
    color: '#059669',
    icon: '⚖️',
    what: 'Evaluating RAG quality without human labels is hard. LLM-as-Judge uses a second LLM call to score the generated answer against the retrieved documents and the original question. Three dimensions are scored 1–5: faithfulness (are all claims grounded in the docs?), relevance (does the answer address the question?), and completeness (are all key aspects covered?). The judge also provides reasoning for each score.',
    how: [
      'User query → embed → ANN vector search → retrieve docs (standard RAG)',
      'LLM generates an answer from the retrieved docs',
      'Second LLM call: judge receives query + docs + answer',
      'Judge scores faithfulness, relevance, completeness (1–5 each)',
      'Judge provides reasoning string explaining each score',
      'UI shows docs, answer, scores with gauges, and reasoning',
    ],
    limitations: [
      'The judge LLM can be biased toward its own outputs (self-evaluation bias)',
      'Scores are subjective — different judge prompts produce different scores',
      'Faithfulness scoring requires the judge to read all retrieved docs carefully',
      'Two LLM calls per query roughly doubles cost vs. plain RAG',
    ],
    stack: ['OpenAI GPT (generator + judge)', 'Couchbase ANN vector search', 'response_format: json_object'],
    questions: [
      'How does the CSS box model work?',
      'What is the difference between let and const?',
      'Explain the Fetch API',
      'What are Web Workers?',
    ],
    snippets: [
      {
        title: 'backend/main.py — RAG then judge',
        language: 'python',
        code: `# Step 1: standard RAG answer
embedding = await get_embedding(query)
docs = await get_relevant_documents(embedding)
context = "\\n\\n".join(f"[{d['filepath']}]\\n{d['content']}" for d in docs)
answer = (await client.chat.completions.create(
    model=INFERENCE_MODEL,
    messages=[
        {"role": "system", "content": "Answer using only the provided documents."},
        {"role": "user",   "content": f"Documents:\\n{context}\\n\\nQuestion: {query}"},
    ],
)).choices[0].message.content

# Step 2: LLM-as-Judge — score faithfulness, relevance, completeness
evaluation = (await client.chat.completions.create(
    model=INFERENCE_MODEL,
    messages=[{"role": "user", "content":
        f"QUESTION: {query}\\nDOCUMENTS: {context}\\nANSWER: {answer}\\n"
        "Score faithfulness, relevance, completeness 1-5. Return JSON."}],
    response_format={"type": "json_object"},
    temperature=0,
)).choices[0].message.content`,
      },
    ],
  },
  summarise: {
    title: 'Long-context Summarisation',
    subtitle: 'Map-reduce chunking for documents that exceed the context window',
    color: '#7c3aed',
    icon: '📄',
    what: 'LLMs have a finite context window. A 100-page document won\'t fit in a single prompt. Map-reduce summarisation solves this: split the document into overlapping chunks (Map), summarise each chunk independently in parallel, then combine all chunk summaries into a single final summary (Reduce). The UI shows every chunk summary so the pipeline is fully transparent.',
    how: [
      'Input text split into ~800-word overlapping chunks (50-word overlap)',
      'Map: all chunks summarised in parallel with asyncio.gather()',
      'Each chunk summary: 2–4 sentences, preserving key facts',
      'Reduce: all chunk summaries combined into one coherent final summary',
      'Optional focus instruction passed to both Map and Reduce prompts',
      'Token usage tracked across all calls',
    ],
    limitations: [
      'Information at chunk boundaries may be split awkwardly — overlap mitigates but doesn\'t eliminate this',
      'The Reduce step never sees the original text — only the chunk summaries',
      'Parallel Map calls multiply cost proportionally to chunk count',
      'Very long documents may produce too many chunk summaries for the Reduce context window',
    ],
    stack: ['OpenAI GPT', 'asyncio.gather() (parallel Map)', 'FastAPI'],
    questions: [
      'Load the sample text and try with no focus',
      'Load the sample text with focus: "technical standards"',
      'Paste any Wikipedia article or documentation page',
    ],
    snippets: [
      {
        title: 'backend/main.py — map-reduce pipeline',
        language: 'python',
        code: `def split_into_chunks(text, chunk_size=800, overlap=50):
    words = text.split()
    chunks, i = [], 0
    while i < len(words):
        chunks.append(" ".join(words[i : i + chunk_size]))
        i += chunk_size - overlap   # overlap avoids cutting mid-sentence
    return chunks

# Map: summarise every chunk in parallel
async def summarise_chunk(i, chunk):
    completion = await client.chat.completions.create(
        model=INFERENCE_MODEL,
        messages=[
            {"role": "system", "content": "Summarise in 2-4 sentences."},
            {"role": "user",   "content": chunk},
        ],
        max_tokens=200,
    )
    return {"index": i, "summary": completion.choices[0].message.content}

chunks = split_into_chunks(text)
chunk_summaries = await asyncio.gather(
    *[summarise_chunk(i, c) for i, c in enumerate(chunks)]
)

# Reduce: combine all chunk summaries into one
combined = "\\n\\n".join(f"Part {r['index']+1}: {r['summary']}"
                         for r in sorted(chunk_summaries, key=lambda x: x["index"]))
final = await client.chat.completions.create(
    model=INFERENCE_MODEL,
    messages=[
        {"role": "system", "content": "Write a single coherent summary."},
        {"role": "user",   "content": combined},
    ],
)`,
      },
    ],
  },
  stream: {
    title: 'Streaming Chat',
    subtitle: 'Token-by-token delivery via chunked HTTP — no waiting for the full response',
    color: '#059669',
    icon: '🌊',
    what: 'The LLM generates tokens one at a time. Instead of buffering the entire response and returning it as JSON, the server streams each token as it is produced using HTTP chunked transfer encoding. The browser reads the stream incrementally and renders tokens as they arrive. The time-to-first-token (TTFT) metric shows how quickly the first word appears.',
    how: [
      'User message → POST /api/chat-stream',
      'FastAPI returns a StreamingResponse (text/plain)',
      'OpenAI client.chat.completions.create(stream=True)',
      'Each chunk yielded immediately as it arrives from OpenAI',
      'Browser reads via response.body.getReader()',
      'UI updates the message bubble on every chunk',
      'TTFT measured from request start to first decoded chunk',
    ],
    limitations: [
      'Cannot return metadata (token count, cache status) in the same response — needs a separate header or trailing chunk',
      'Error handling is harder: the HTTP 200 is sent before the stream completes',
      'Streaming bypasses JSON parsing — the client must handle partial text',
    ],
    stack: ['OpenAI streaming API', 'FastAPI StreamingResponse', 'Fetch Streams API (browser)'],
    questions: [
      'Explain the history of the internet',
      'Write a short story about a robot',
      'What are the main differences between SQL and NoSQL databases?',
    ],
    snippets: [
      {
        title: 'backend/main.py — StreamingResponse',
        language: 'python',
        code: `@app.post("/api/chat-stream")
async def chat_stream(req: ChatRequest):
    async def token_generator():
        stream = await client.chat.completions.create(
            model=INFERENCE_MODEL,
            messages=[{"role": "user", "content": req.message}],
            stream=True,          # ← enables token-by-token delivery
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta       # each token sent immediately

    return StreamingResponse(token_generator(), media_type="text/plain")`,
      },
      {
        title: 'frontend — read stream with getReader()',
        language: 'javascript',
        code: `const res = await fetch('/api/chat-stream', {
  method: 'POST',
  body: JSON.stringify({ message }),
});
const reader = res.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const token = decoder.decode(value);
  setResponse(prev => prev + token);  // append each token as it arrives
}`,
      },
    ],
  },
  structured: {
    title: 'Structured Output',
    subtitle: 'Force the LLM to return typed JSON instead of free text',
    color: '#0891b2',
    icon: '🧩',
    what: 'By setting response_format: {type: "json_object"} and describing the expected schema in the system prompt, the LLM is constrained to return valid JSON every time. This makes the output directly usable by downstream code without fragile string parsing. The tab extracts sentiment, entities, topics, a summary, and a language code from any input text.',
    how: [
      'Input text → POST /api/chat-structured',
      'System prompt describes the exact JSON schema expected',
      'OpenAI called with response_format: {type: "json_object"}',
      'Response parsed with json.loads() — guaranteed valid JSON',
      'Structured fields rendered as visual components in the UI',
      'Token usage (in/out) shown to illustrate cost',
    ],
    limitations: [
      'The model may hallucinate field values if the schema is ambiguous',
      'json_object mode requires at least one "json" mention in the prompt',
      'Complex nested schemas benefit from JSON Schema / Pydantic validation on top',
      'Not all OpenAI-compatible endpoints support response_format',
    ],
    stack: ['OpenAI response_format: json_object', 'FastAPI', 'Pydantic (backend validation)'],
    questions: [
      'Apple announced record quarterly earnings today, with CEO Tim Cook calling it a landmark moment.',
      'I absolutely loved the new restaurant — the pasta was incredible but the service was slow.',
      'The earthquake measuring 6.2 struck near Tokyo, causing minor damage but no casualties.',
    ],
    snippets: [
      {
        title: 'backend/main.py — json_object mode',
        language: 'python',
        code: `completion = await client.chat.completions.create(
    model=INFERENCE_MODEL,
    messages=[
        {"role": "system", "content":
            "Analyse the text and return JSON with keys: "
            "sentiment, sentiment_score, summary, topics, entities, language. "
            "Return only valid JSON."},
        {"role": "user", "content": text},
    ],
    response_format={"type": "json_object"},  # ← forces valid JSON output
    temperature=0,
)
import json
result = json.loads(completion.choices[0].message.content)
# result["sentiment"]       → "positive"
# result["entities"]        → [{"text": "Apple", "type": "org"}, ...]
# result["sentiment_score"] → 0.91`,
      },
    ],
  },
  rerank: {
    title: 'Reranking',
    subtitle: 'Two-stage retrieval: broad ANN fetch → LLM relevance scoring',
    color: '#d97706',
    icon: '📊',
    what: 'Vector similarity (ANN distance) is a fast proxy for relevance but not a perfect one — a document can be semantically close to a query without actually answering it. Reranking adds a second pass: retrieve more candidates than needed, then ask the LLM to score each one for relevance to the specific query. Only the top-k reranked documents are used to generate the answer. The UI shows both stages side by side so you can see which documents were dropped.',
    how: [
      'Query → embedding → ANN vector search (Stage 1, broad retrieval)',
      'All candidates returned with their vector distance scores',
      'LLM asked to score each candidate 0–10 for relevance to the query',
      'Candidates sorted by rerank score; bottom ones dropped',
      'Top-k reranked documents used to generate the final answer',
      'UI shows pre- and post-rerank lists with scores for comparison',
    ],
    limitations: [
      'Reranking adds a second LLM call — roughly doubles latency',
      'LLM reranking is expensive at scale; cross-encoder models are faster alternatives',
      'The demo retrieves only 4 candidates (Couchbase index limit=4) — real pipelines fetch 20–50',
      'Reranker quality depends on the LLM\'s ability to judge relevance without reading full docs',
    ],
    stack: ['OpenAI GPT (reranker)', 'Couchbase SQL++ ANN vector search', 'FastAPI'],
    questions: [
      'How does the CSS box model work?',
      'What is the difference between let and const?',
      'Explain the Fetch API',
      'What are Web Workers?',
    ],
    snippets: [
      {
        title: 'backend/main.py — two-stage retrieval',
        language: 'python',
        code: `# Stage 1: broad ANN fetch (more candidates than needed)
rows = cluster.query("""
    SELECT id, content,
           VECTOR_DISTANCE(embedding, $vec) AS dist
    FROM   docs
    ORDER BY VECTOR_DISTANCE(embedding, $vec)
    LIMIT  $broad_k
""", QueryOptions(named_parameters={"vec": query_vec, "broad_k": 12}))
candidates = [r for r in rows]

# Stage 2: LLM reranker — score each candidate 0-10
scores = await asyncio.gather(*[
    score_relevance(query, c["content"]) for c in candidates
])
reranked = sorted(zip(candidates, scores),
                  key=lambda x: x[1], reverse=True)
top_docs = [doc for doc, _ in reranked[:top_k]]`,
      },
      {
        title: 'backend/main.py — LLM relevance scorer',
        language: 'python',
        code: `async def score_relevance(query: str, doc: str) -> float:
    resp = await client.chat.completions.create(
        model=INFERENCE_MODEL,
        messages=[{
            "role": "system",
            "content": "Rate how well the document answers the query. "
                       "Reply with a single integer 0-10.",
        }, {
            "role": "user",
            "content": f"Query: {query}\\nDocument: {doc[:400]}",
        }],
        response_format={"type": "json_object"},
        temperature=0,
    )
    data = json.loads(resp.choices[0].message.content)
    return float(data.get("score", 0))`,
      },
    ],
  },
  prompt: {
    title: 'Prompt Engineering',
    subtitle: 'Same question, five system prompts — see how wording changes everything',
    color: '#7c3aed',
    icon: '✏️',
    what: 'The system prompt is the most powerful lever you have over LLM behaviour. This tab runs the same user question through up to 5 different system prompts in parallel and displays the responses side by side. The presets range from a single-sentence terse answer to a Socratic mode that refuses to answer directly. Each card shows the system prompt used and the token count.',
    how: [
      'User selects which presets to run (1–5)',
      'POST /api/chat-prompt with message + preset list',
      'Backend runs all selected presets in parallel with asyncio.gather()',
      'Each call uses the same model, temperature, and max_tokens',
      'Results returned as an array — one entry per preset',
      'UI renders a card per preset with response + collapsible system prompt',
    ],
    limitations: [
      'Parallel calls multiply cost — 5 presets = 5× the tokens',
      'Temperature 0.7 means responses vary between runs even for the same preset',
      'The presets are illustrative; real prompt engineering is iterative and task-specific',
    ],
    stack: ['OpenAI GPT', 'asyncio.gather() (parallel calls)', 'FastAPI'],
    questions: [
      'What is recursion?',
      'How does HTTPS work?',
      'What is a database index?',
      'Explain closures in JavaScript',
    ],
    snippets: [
      {
        title: 'backend/main.py — parallel preset calls',
        language: 'python',
        code: `PRESETS = {
    "concise":   "Answer in one sentence.",
    "detailed":  "Give a thorough explanation with examples.",
    "eli5":      "Explain like I'm five years old.",
    "socratic":  "Do not answer directly. Ask guiding questions instead.",
    "adversarial": "Challenge the premise of the question.",
}

async def call_preset(preset_name: str, message: str):
    system = PRESETS[preset_name]
    resp = await client.chat.completions.create(
        model=INFERENCE_MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user",   "content": message},
        ],
        temperature=0.7,
    )
    return {"preset": preset_name, "response": resp.choices[0].message.content}

# Run all selected presets in parallel
results = await asyncio.gather(*[
    call_preset(p, req.message) for p in req.presets
])`,
      },
    ],
  },
  chat: {
    title: 'Simple Chat',
    subtitle: 'Direct LLM completion — stateless, no memory, no retrieval',
    color: '#4f46e5',
    icon: '💬',
    what: 'Every message is sent to the LLM as a standalone request. The model has no knowledge of previous turns and no access to external data. This is the baseline — the simplest possible AI integration.',
    how: [
      'User message → POST /api/chat',
      'OpenAI chat completion (single-turn)',
      'Response returned as JSON',
    ],
    limitations: [
      'No memory — each message is completely independent',
      'Identical questions always hit the LLM, costing tokens every time',
      'Answers limited to the model\'s training data cutoff',
      'Cannot answer questions about your own documents',
    ],
    stack: ['OpenAI GPT', 'FastAPI'],
    questions: [
      'What is JavaScript?',
      'Explain the difference between null and undefined',
      'What does Array.map() do?',
    ],
    snippets: [
      {
        title: 'backend/main.py — single-turn chat',
        language: 'python',
        code: `@app.post("/api/chat")
async def chat(body: ChatRequest):
    response = await client.chat.completions.create(
        model=INFERENCE_MODEL,
        messages=[
            {"role": "system", "content": body.systemPrompt},
            {"role": "user",   "content": body.message},
        ],
        temperature=0.7,
        max_tokens=1000,
    )
    return {"response": response.choices[0].message.content}`,
      },
      {
        title: 'frontend — send and display',
        language: 'jsx',
        code: `const sendMessage = async (text) => {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: text }),
  })
  const data = await res.json()
  setMessages(prev => [...prev, {
    sender: 'bot', text: data.response
  }])
}`,
      },
    ],
  },
  cached: {
    title: 'Simple Chat + Semantic Cache',
    subtitle: 'Adds a vector-similarity cache in Couchbase to avoid redundant LLM calls',
    color: '#d97706',
    icon: '⚡',
    what: 'Before calling the LLM, the query is embedded and compared against previously cached responses using ANN vector search. If a semantically similar question was already answered with the same LLM configuration, the cached response is returned instantly — no LLM call needed. The ⚡ cache hit / 🔄 generated badge on each response shows which path was taken.',
    how: [
      'User message → embedding (OpenAI)',
      'ANN vector search on semantic_cache collection (Couchbase SQL++ GSI)',
      'Cache hit: return stored response immediately (no LLM call)',
      'Cache miss: call LLM → store response + embedding in cache',
      'Cache keyed on: embedding similarity + LLM signature (model, temp, max_tokens, system prompt)',
    ],
    limitations: [
      'Still no memory — each conversation turn is independent',
      'Cache can return stale answers if the underlying data changes',
      'Similarity threshold is a trade-off: too tight = few hits, too loose = wrong answers',
    ],
    stack: ['OpenAI GPT + Embeddings', 'Couchbase SQL++ ANN vector search', 'Semantic cache (MD5 LLM signature)'],
    questions: [
      'What is JavaScript? (ask twice to see a cache hit)',
      'Explain closures in JavaScript',
      'What is a Promise?',
    ],
    snippets: [
      {
        title: 'backend/main.py — cache check before LLM call',
        language: 'python',
        code: `embedding = await get_embedding(message)
llm_sig   = create_llm_signature(model, temperature, max_tokens, system_prompt)

# Check cache first — returns stored response if similarity > threshold
cached = await cache_get(message, embedding, llm_sig)
if cached:
    return {"response": cached, "cache_hit": True}

# Cache miss — call LLM and store result
response = await generate_response(message, system_prompt)
await cache_put(message, embedding, llm_sig, response)
return {"response": response, "cache_hit": False}`,
      },
      {
        title: 'backend — cache lookup (Couchbase SQL++ ANN)',
        language: 'python',
        code: `# Semantic cache uses vector similarity, not exact string match
query = f"""
  SELECT response FROM \`{CACHE_BUCKET}\`.\`{CACHE_SCOPE}\`.\`{CACHE_COLLECTION}\`
  WHERE llm_signature = $sig
  ORDER BY ANN_DISTANCE(embedding, $vec, "L2") LIMIT 1
"""
# If the nearest cached embedding is within the similarity threshold,
# return the stored response — no LLM call needed.`,
      },
    ],
  },
  history: {
    title: 'Simple Chat + Cache + Memory',
    subtitle: 'Adds Couchbase KV conversation history so the model remembers prior turns',
    color: '#059669',
    icon: '🧠',
    what: 'Each message is stored in a Couchbase conversations collection keyed by session ID. Before calling the LLM, the full conversation history is fetched and formatted into the prompt, giving the model context of what was said earlier. The semantic cache still applies — a cache hit skips both history lookup and the LLM call.',
    how: [
      'User message → embedding → cache check',
      'Cache miss: fetch conversation history from Couchbase KV (N1QL)',
      'Format history into prompt context',
      'LLM call with history-enriched prompt',
      'Store user message + assistant response in Couchbase',
      'Store response in semantic cache',
    ],
    limitations: [
      'History grows unbounded — long sessions inflate the prompt and cost',
      'No summarization yet — the full raw history is sent each turn',
      'Cache hits skip history, so a cached response may ignore recent context',
    ],
    stack: ['OpenAI GPT + Embeddings', 'Couchbase KV (conversation history)', 'Couchbase SQL++ N1QL', 'Semantic cache'],
    questions: [
      'My name is Alex. Remember that.',
      'What is my name? (tests memory)',
      'What did I just tell you?',
    ],
    snippets: [
      {
        title: 'backend/main.py — load history, call LLM, store turn',
        language: 'python',
        code: `# Load prior turns from Couchbase KV
history = await get_conversation_history(session_id)
formatted = format_conversation_history(history)

# Inject history into the prompt
prompt = (
    f"{system_prompt}\\n\\n"
    f"CONVERSATION HISTORY:\\n{formatted}\\n\\n"
    f"CURRENT MESSAGE: {message}"
)
response = await generate_response(prompt)

# Persist both turns for next request
await add_message(session_id, message,  "user")
await add_message(session_id, response, "assistant")`,
      },
      {
        title: 'backend/services/conversation_service.py',
        language: 'python',
        code: `async def add_message(session_id: str, content: str, role: str):
    collection = get_collection()
    doc_id = f"{session_id}::{uuid.uuid4()}"
    collection.upsert(doc_id, {
        "session_id": session_id,
        "role":       role,
        "content":    content,
        "timestamp":  datetime.now(timezone.utc).isoformat(),
    })

async def get_conversation_history(session_id: str, limit: int = 20):
    result = cluster.query(
        "SELECT role, content, timestamp "
        "FROM conversations "
        "WHERE session_id = $1 "
        "ORDER BY timestamp ASC LIMIT $2",
        QueryOptions(positional_parameters=[session_id, limit]),
    )
    return [r for r in result.rows()]`,
      },
    ],
  },
  rag: {
    title: 'Simple Chat + Cache + Memory + RAG',
    subtitle: 'Adds vector retrieval over MDN docs and Capella AI summarization',
    color: '#0891b2',
    icon: '🔍',
    what: 'The full pipeline: the query is embedded, relevant MDN documentation chunks are retrieved via ANN vector search, and the conversation history is summarized using Capella\'s built-in ai_summary() SQL++ function (summarization runs inside the database). All of this is injected into the prompt before streaming the LLM response token-by-token.',
    how: [
      'User query → embedding → cache check',
      'Cache miss: store user message in Couchbase',
      'Summarize conversation history via Capella ai_summary() SQL++ function',
      'ANN vector search on MDN documentation collection',
      'Inject summary + top-k doc chunks into prompt',
      'LLM streams response token-by-token',
      'Store assistant response + cache the result',
    ],
    limitations: [
      'Retrieval quality depends on the indexed corpus (MDN docs only)',
      'ai_summary() requires the query_external_access role on Capella',
      'Streaming + caching means the full response must complete before caching',
      'Cache hits bypass retrieval — stale if docs are updated',
    ],
    stack: ['OpenAI GPT + Embeddings', 'Couchbase SQL++ ANN vector search (MDN docs)', 'Couchbase KV (conversation history)', 'Capella AI ai_summary() SQL++ function', 'Semantic cache', 'Streaming (SSE)'],
    questions: [
      'How does the CSS box model work?',
      'What is the difference between let, const, and var?',
      'Explain the Fetch API and how to handle errors',
      'What are Web Workers used for?',
    ],
    snippets: [
      {
        title: 'backend/main.py — full RAG pipeline',
        language: 'python',
        code: `embedding = await get_embedding(message)

# Cache check — hit skips retrieval and LLM entirely
cached = await cache_get(message, embedding, llm_sig)
if cached:
    async def from_cache():
        yield cached
    return StreamingResponse(from_cache(), media_type="text/plain",
                             headers={"X-Cache-Hit": "true"})

# Retrieve relevant MDN docs via ANN vector search
docs = await get_relevant_documents(embedding)
doc_context = "\\n\\n".join(
    f"[{d['filepath']}]\\n{d['content']}" for d in docs
)

# Summarise conversation history using Capella ai_summary()
history_summary = await summarize_conversation(session_id)

prompt = (
    "You are an MDN documentation expert.\\n\\n"
    f"HISTORY SUMMARY:\\n{history_summary}\\n\\n"
    f"DOCUMENTS:\\n{doc_context}\\n\\n"
    f"QUESTION: {message}"
)

# Stream response token-by-token
async def generate_and_store():
    full = ""
    async for token in stream_completion(prompt):
        full += token
        yield token                          # ← sent to browser immediately
    await add_message(session_id, full, "assistant")
    await cache_put(message, embedding, llm_sig, full)

return StreamingResponse(generate_and_store(), media_type="text/plain")`,
      },
      {
        title: 'frontend — read streaming response',
        language: 'jsx',
        code: `const res = await fetch('/api/chat-rag', {
  method: 'POST',
  body: JSON.stringify({ message, session_id }),
})
const cacheHit = res.headers.get('X-Cache-Hit') === 'true'
const reader   = res.body.getReader()
const decoder  = new TextDecoder()
let text = ''

while (true) {
  const { value, done } = await reader.read()
  if (done) break
  text += decoder.decode(value, { stream: true })
  // Update the message bubble on every chunk
  setMessages(prev => prev.map(m =>
    m.id === botId ? { ...m, text } : m
  ))
}`,
      },
    ],
  },
  agent: {
    title: 'Multi-Agent',
    subtitle: 'LangGraph router → Math / RAG / FAQ / Direct agents, with memory and reasoning trace',
    color: '#7c3aed',
    icon: '🤖',
    what: 'A router LLM classifies each message into one of four routes and dispatches to the right agent. Every agent runs a ReAct (Reason + Act) loop, calling tools and reasoning until it has a confident answer. Conversation history is stored in Couchbase so agents remember prior turns. The full reasoning trace — routing decision, tool calls, tool results — is shown inline under each response.',
    how: [
      'Load conversation history from Couchbase KV (session memory)',
      'User message → LangGraph StateGraph entry point: router',
      'Router classifies: direct / math / rag / faq',
      'direct → LLM answers immediately, no agent',
      'math → ReAct agent with arithmetic tools (add, subtract, multiply, divide, evaluate_expression)',
      'rag → ReAct agent calls rag_search tool (ANN vector search on MDN docs)',
      'faq → vector search on faq_catalog to find matching collection → ReAct agent with hybrid_faq_search',
      'Store user + assistant messages in Couchbase',
      'Return answer + routing metadata + full trace_steps to UI',
    ],
    limitations: [
      'Router can misclassify ambiguous queries (e.g. "what is pi?" → direct vs. math)',
      'FAQ search requires pre-indexed collections in Couchbase',
      'RAG agent only covers MDN Web Docs — not general knowledge',
      'No semantic cache — every turn hits the LLM at least once',
      'ReAct loops add latency proportional to the number of tool calls',
    ],
    stack: [
      'LangGraph StateGraph',
      'OpenAI GPT (router + all agents)',
      'Couchbase ANN vector search (MDN docs)',
      'Couchbase hybrid search — vector + FTS (FAQ)',
      'Couchbase KV (conversation memory)',
      'Couchbase Agent Catalog (agentc) — observability',
      'ReAct agent pattern',
    ],
    questions: [
      'What is 1337 multiplied by 42?',
      'Calculate sqrt(144) + 10',
      'How does the CSS flexbox model work?',
      'What is the vacation policy?',
      'My name is Alex — what is my name? (tests memory)',
    ],
    snippets: [
      {
        title: 'backend/agents/router_agent.py — classify intent',
        language: 'python',
        code: `class RouterDecision(BaseModel):
    route: Literal["direct", "math", "faq", "rag"]
    answer: str | None = None   # only for "direct"

async def router_node(state: AgentState) -> Command:
    decision = await llm.with_structured_output(RouterDecision).ainvoke([
        SystemMessage(_SYSTEM_PROMPT),
        HumanMessage(state["message"]),
    ])
    if decision.route == "math":
        return Command(goto="math_agent", update={"routed_to": "math_agent"})
    if decision.route == "rag":
        return Command(goto="rag_agent",  update={"routed_to": "rag_agent"})
    if decision.route == "faq":
        best = await find_best_faq_collection(embedding)
        return Command(goto="faq_search_agent",
                       update={"faq_collection": best["collection_name"]})
    # direct — answer immediately without a specialised agent
    return Command(goto="__end__", update={"answer": decision.answer})`,
      },
      {
        title: 'backend/agents/graph.py — LangGraph StateGraph',
        language: 'python',
        code: `builder = StateGraph(AgentState)
builder.add_node("router",           router_node)
builder.add_node("math_agent",       partial(math_agent_node,  catalog, span))
builder.add_node("faq_search_agent", partial(faq_agent_node,   catalog, span))
builder.add_node("rag_agent",        partial(rag_agent_node,   catalog, span))
builder.set_entry_point("router")
graph = builder.compile()

# Each agent node returns Command(goto="__end__", update={...})
# so the graph terminates after exactly one agent runs.
result = await graph.ainvoke({
    "message":              user_message,
    "conversation_history": prior_turns,
    "trace_steps":          [],
})`,
      },
    ],
  },
}

export default function InfoPanel({ tab }) {
  const [open, setOpen] = useState(true)
  const info = TAB_INFO[tab]
  if (!info) return null

  return (
    <aside className={`info-panel ${open ? 'info-panel--open' : 'info-panel--collapsed'}`}>
      <button
        className="info-panel__toggle"
        onClick={() => setOpen(v => !v)}
        title={open ? 'Hide info' : 'Show info'}
        style={{ '--accent': info.color }}
      >
        {open ? '◀' : '▶'}
      </button>

      {open && (
        <div className="info-panel__body">
          <div className="info-panel__header" style={{ '--accent': info.color }}>
            <span className="info-panel__icon">{info.icon}</span>
            <div>
              <h2 className="info-panel__title">{info.title}</h2>
              <p className="info-panel__subtitle">{info.subtitle}</p>
            </div>
          </div>

          <section className="info-section">
            <h3 className="info-section__heading">How it works</h3>
            <p className="info-section__text">{info.what}</p>
          </section>

          <section className="info-section">
            <h3 className="info-section__heading">Request flow</h3>
            <ol className="info-section__steps">
              {info.how.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </section>

          <section className="info-section">
            <h3 className="info-section__heading">Stack</h3>
            <ul className="info-section__tags">
              {info.stack.map((s, i) => (
                <li key={i} className="tag" style={{ '--accent': info.color }}>{s}</li>
              ))}
            </ul>
          </section>

          <section className="info-section">
            <h3 className="info-section__heading">Limitations</h3>
            <ul className="info-section__list info-section__list--warn">
              {info.limitations.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
          </section>

          <section className="info-section">
            <h3 className="info-section__heading">Try these questions</h3>
            <ul className="info-section__suggestions">
              {info.questions.map((q, i) => (
                <li key={i} className="suggestion">{q}</li>
              ))}
            </ul>
          </section>

          {info.snippets && info.snippets.length > 0 && (
            <section className="info-section">
              <h3 className="info-section__heading">Key code</h3>
              <div className="info-section__snippets">
                {info.snippets.map((s, i) => (
                  <CodeBlock key={i} title={s.title} language={s.language} code={s.code} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </aside>
  )
}
