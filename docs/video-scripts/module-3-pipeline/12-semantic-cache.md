# Semantic Cache

**Module:** Building a Pipeline | **Level:** Intermediate
**Runtime:** ~7 min | **Tab:** `cached`

---

## Hook

A user asks: *"What is JavaScript?"* You call the LLM, pay for the tokens, wait for the response. Five minutes later, a different user asks: *"Can you explain what JavaScript is?"* You call the LLM again. Same answer, same cost, same wait. A semantic cache recognises that these two questions mean the same thing and returns the stored answer instantly — zero LLM cost, sub-millisecond latency.

---

## Concept

A **semantic cache** stores question-answer pairs as vectors. When a new question arrives, it's embedded and compared against cached questions using vector similarity. If a sufficiently similar question was already answered, the cached response is returned without calling the LLM.

This is different from a traditional exact-match cache. *"What is JavaScript?"* and *"Can you explain what JavaScript is?"* are different strings — an exact-match cache misses them. But their embeddings are very close in vector space, so a semantic cache hits.

The cache key has two components:
1. **Semantic similarity**: the embedding distance between the new question and cached questions.
2. **LLM signature**: a hash of the model name, temperature, max tokens, and system prompt. This ensures that the same question answered by GPT-4o at temperature 0 doesn't return a cached answer from GPT-4o-mini at temperature 0.7.

The similarity threshold is a critical tuning parameter:
- **Too tight** (e.g. 0.99): almost nothing hits the cache. You're paying for near-duplicate questions.
- **Too loose** (e.g. 0.70): wrong answers get returned. *"What is Java?"* might hit the cache for *"What is JavaScript?"*
- **0.85** is a reasonable starting point for most applications.

---

## Demo Walkthrough

Open the **Semantic Cache** tab. Each response shows a ⚡ cache hit or 🔄 generated badge.

1. Ask: *"What is JavaScript?"* — first time, it's a cache miss. The LLM is called, the response is stored.

2. Ask the exact same question again. ⚡ Cache hit — instant response, no LLM call.

3. Ask: *"Can you explain what JavaScript is?"* — different wording, same meaning. Does it hit the cache? It should, because the embeddings are similar.

4. Ask: *"What is TypeScript?"* — different topic. Should be a cache miss.

5. Ask: *"What is Java?"* — similar words to JavaScript but different meaning. Does it incorrectly hit the JavaScript cache? This is the threshold tuning problem in action.

6. Change the system prompt and ask the same question. Cache miss — the LLM signature changed.

---

## Code Deep-Dive

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

The LLM signature is an MD5 hash of the configuration:

```python
def create_llm_signature(model, temperature, max_tokens, system_prompt) -> str:
    raw = f"{model}:{temperature}:{max_tokens}:{system_prompt}"
    return hashlib.md5(raw.encode()).hexdigest()
```

The cache lookup uses Couchbase's ANN vector search — the same vector index used for RAG:

```python
async def cache_get(prompt, embedding, llm_signature,
                    similarity_threshold=0.85, k=3) -> str | None:
    sql = f"""
        SELECT c.llm_signature, c.response,
               ANN_DISTANCE(c.vector, $embedding, "L2") AS score
        FROM `{CACHE_BUCKET}`.`{CACHE_SCOPE}`.`{CACHE_COLLECTION}` AS c
        USE INDEX ({CACHE_INDEX} USING GSI)
        ORDER BY ANN_DISTANCE(c.vector, $embedding, "L2")
        LIMIT {k}
    """
    for row in cluster.query(sql, ...).rows():
        if row["score"] > similarity_threshold:
            continue                          # too dissimilar — skip
        if row["llm_signature"] == llm_signature:
            return row["response"]            # cache HIT
    return None                               # cache MISS
```

The L2 distance threshold of 0.85 means: if the nearest cached question is more than 0.85 units away in embedding space, it's not similar enough. Lower L2 distance = more similar.

---

## Key Takeaways

- A semantic cache stores question-answer pairs as vectors and returns cached answers for semantically similar questions.
- The cache key combines vector similarity (for semantic matching) and an LLM signature (to prevent cross-configuration hits).
- The similarity threshold is the critical tuning parameter — too tight misses savings, too loose returns wrong answers.
- Couchbase's ANN vector search serves double duty: RAG retrieval and semantic cache lookup use the same index infrastructure.
- Cache hits return instantly with zero LLM cost — high-value for applications with repeated or similar queries.

---

## What's Next

The cache eliminates redundant LLM calls. But the model still has no memory of the conversation — each turn is independent. The next tab adds conversation history stored in Couchbase, so the model remembers what was said earlier in the session.
