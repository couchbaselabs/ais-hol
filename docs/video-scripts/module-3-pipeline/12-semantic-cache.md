# Semantic Cache

**Module:** Building a Pipeline | **Level:** Intermediate
**Runtime:** ~7 min | **Tab:** `cached`

---

## Hook

> 🎬 **SHOW:** Semantic Cache tab open, chat input ready, response area empty. The ⚡/🔄 badge area is visible but empty.

A user asks: *"What is JavaScript?"* You call the LLM, pay for the tokens, wait for the response. Five minutes later, a different user asks: *"Can you explain what JavaScript is?"* You call the LLM again. Same answer, same cost, same wait. A semantic cache recognises that these two questions mean the same thing and returns the stored answer instantly — zero LLM cost, sub-millisecond latency.

---

## Concept

> 🎬 **SHOW:** Slide — flow diagram: new question → embed → ANN search against cache → similarity check → if hit: return cached response; if miss: call LLM → store in cache → return response.

A **semantic cache** stores question-answer pairs as vectors. When a new question arrives, it's embedded and compared against cached questions using vector similarity. If a sufficiently similar question was already answered, the cached response is returned without calling the LLM.

This is different from a traditional exact-match cache. *"What is JavaScript?"* and *"Can you explain what JavaScript is?"* are different strings — an exact-match cache misses them. But their embeddings are very close in vector space, so a semantic cache hits.

> 🎬 **SHOW:** Slide — the cache key shown as two components: a vector similarity circle and an LLM signature hash. Both must match for a cache hit.

The cache key has two components: semantic similarity (embedding distance) and an LLM signature (hash of model, temperature, max tokens, system prompt). This ensures that the same question answered by different models or configurations doesn't cross-contaminate.

> 🎬 **SHOW:** Slide — a dial labelled "Similarity threshold" with three zones: too tight (few hits), sweet spot (~0.85), too loose (wrong answers).

The similarity threshold is the critical tuning parameter. 0.85 is a reasonable starting point.

---

## Demo Walkthrough

> 🎬 **SHOW:** Semantic Cache tab, chat input ready.

1. Ask: *"What is JavaScript?"*

   > 🎬 **SHOW:** Send. Point to the 🔄 "generated" badge — this is a cache miss, the LLM was called.

   First time — cache miss. The LLM is called, the response is stored.

2. Ask the exact same question again.

   > 🎬 **SHOW:** Send the identical question. Point to the ⚡ "cache hit" badge appearing almost instantly — no loading delay.

   ⚡ Cache hit — instant response, no LLM call.

3. Ask: *"Can you explain what JavaScript is?"*

   > 🎬 **SHOW:** Send the rephrased question. Point to whether it hits or misses. If it hits, highlight that different wording still matched.

   Different wording, same meaning. Does it hit the cache? It should, because the embeddings are similar.

4. Ask: *"What is TypeScript?"*

   > 🎬 **SHOW:** Send. Point to the 🔄 badge — different topic, cache miss.

   Different topic — cache miss.

5. Ask: *"What is Java?"*

   > 🎬 **SHOW:** Send. Watch carefully — does it incorrectly hit the JavaScript cache? Point to the result either way and explain the threshold tradeoff.

   Similar words to JavaScript but different meaning. This is the threshold tuning problem in action.

6. Change the system prompt and ask the same question.

   > 🎬 **SHOW:** Edit the system prompt field, then resend "What is JavaScript?". Point to the 🔄 badge — the LLM signature changed, so it's a cache miss.

   Cache miss — the LLM signature changed.

---

## Code Deep-Dive

> 🎬 **SHOW:** Open `backend/main.py`, scrolled to the cached chat endpoint. Highlight the cache check before the LLM call.

The cache check happens before every LLM call:

```python
embedding = await get_embedding(message)
llm_sig   = create_llm_signature(model, temperature, max_tokens, system_prompt)

# Check cache first
cached = await cache_get(message, embedding, llm_sig)
if cached:
    return {"response": cached, "cache_hit": True}

# Cache miss — call LLM and store result
response = await generate_response(message, system_prompt)
await cache_put(message, embedding, llm_sig, response)
return {"response": response, "cache_hit": False}
```

> 🎬 **SHOW:** Open `backend/services/semantic_cache_service.py`. Highlight the `create_llm_signature` function.

The LLM signature is an MD5 hash of the configuration:

```python
def create_llm_signature(model, temperature, max_tokens, system_prompt) -> str:
    raw = f"{model}:{temperature}:{max_tokens}:{system_prompt}"
    return hashlib.md5(raw.encode()).hexdigest()
```

> 🎬 **SHOW:** Scroll to the `cache_get` function. Highlight the ANN query and the `similarity_threshold` check.

The cache lookup uses Couchbase's ANN vector search — the same vector index infrastructure used for RAG:

```python
async def cache_get(prompt, embedding, llm_signature,
                    similarity_threshold=0.85, k=3) -> str | None:
    # ANN search against the cache collection
    for row in cluster.query(sql, ...).rows():
        if row["score"] > similarity_threshold:
            continue                          # too dissimilar — skip
        if row["llm_signature"] == llm_signature:
            return row["response"]            # cache HIT
    return None                               # cache MISS
```

---

## Key Takeaways

> 🎬 **SHOW:** Return to the tab showing a ⚡ cache hit response — instant, no loading indicator.

- A semantic cache stores question-answer pairs as vectors and returns cached answers for semantically similar questions.
- The cache key combines vector similarity (for semantic matching) and an LLM signature (to prevent cross-configuration hits).
- The similarity threshold is the critical tuning parameter — too tight misses savings, too loose returns wrong answers.
- Couchbase's ANN vector search serves double duty: RAG retrieval and semantic cache lookup use the same index infrastructure.
- Cache hits return instantly with zero LLM cost — high-value for applications with repeated or similar queries.

---

## What's Next

> 🎬 **SHOW:** Click "Conversation Memory" in the sidebar.

The cache eliminates redundant LLM calls. But the model still has no memory of the conversation — each turn is independent. The next tab adds conversation history stored in Couchbase, so the model remembers what was said earlier in the session.
