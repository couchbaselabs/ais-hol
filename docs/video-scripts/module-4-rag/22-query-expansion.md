# Query Expansion

**Module:** Retrieval-Augmented Generation | **Level:** Intermediate
**Runtime:** ~6 min | **Tab:** `query-expansion`

---

## Hook

> 🎬 **SHOW:** Query Expansion tab open, query input at the top, an "Expansions" panel in the middle (empty), and merged retrieval results below.

A user types: *"db performance"*. Your RAG system searches for chunks similar to that embedding. But the relevant documentation uses words like "query optimisation", "index efficiency", "execution plan". The embeddings are close but not identical — and you might miss the best chunks. Query expansion generates multiple phrasings of the same intent and retrieves documents for all of them, dramatically improving recall.

---

## Concept

> 🎬 **SHOW:** Slide — one original query at the top, branching into 4 alternative phrasings, each with its own ANN search arrow going into the database, all results merging into one deduplicated list at the bottom.

**Query expansion** addresses the vocabulary mismatch problem: the user's query and the relevant documents may use different words to express the same concept.

The approach: expand the query into N alternative phrasings, embed all of them in parallel, retrieve documents for each, then merge — keeping the best score for each document across all queries.

> 🎬 **SHOW:** Slide — "Expansion improves recall. Combine with reranking to also improve precision."

Query expansion improves **recall** — you find more relevant documents. It doesn't directly improve **precision** — you may also retrieve more irrelevant documents. Combining expansion with reranking gives you both.

> 🎬 **SHOW:** Slide — cost note: "1 LLM call for expansion + N parallel embedding calls + N parallel ANN searches. Total latency ≈ 2 LLM calls."

The cost: one LLM call to generate expansions, then all embeddings and retrievals run in parallel. Total latency is roughly two LLM calls.

---

## Demo Walkthrough

> 🎬 **SHOW:** Query Expansion tab, query input ready.

1. Try: *"db performance"*

   > 🎬 **SHOW:** Type and send. Watch the expansions panel populate — read the generated alternatives aloud: "database query optimisation", "improving SQL query speed", "database index performance". Then watch the merged results appear below.

   Watch the LLM generate expansions like *"database query optimisation"*, *"improving SQL query speed"*, *"database index performance"*. Each expansion covers a different vocabulary cluster.

2. Try a technical acronym: *"CORS"*

   > 🎬 **SHOW:** Send. Point to the expansions including the full form "Cross-Origin Resource Sharing" and related terms. Compare the merged results to what a single-query search would return.

   Expansions might include *"Cross-Origin Resource Sharing"*, *"browser security policy"*, *"HTTP headers for cross-origin requests"*. The acronym alone has a poor embedding; the expanded forms retrieve much better.

3. Point to the `matched_query` field in the results.

   > 🎬 **SHOW:** Hover over or expand a result card to show which expansion found it. Point to results that were found by an expansion but not by the original query.

   The `matched_query` field shows which expansion found each document — useful for understanding which phrasings are most effective.

4. Compare merged results to standard retrieval.

   > 🎬 **SHOW:** If the tab has a toggle for standard vs expanded, switch between them. Point to documents in the expanded results that wouldn't have been found by the original query alone.

   Are there documents in the expanded results that wouldn't have been found otherwise?

---

## Code Deep-Dive

> 🎬 **SHOW:** Open `backend/main.py`, scrolled to the query expansion endpoint. Walk through the four steps.

```python
# Step 1: generate alternative phrasings
completion = await client.chat.completions.create(
    model=INFERENCE_MODEL,
    messages=[{"role": "system", "content":
        f"Generate {n} alternative phrasings of this query. "
        f"Return JSON: {{queries: [...]}}"},
              {"role": "user", "content": body.query}],
    response_format={"type": "json_object"},
    temperature=0.8,   # some variation in phrasings
)
expansions = json.loads(completion.choices[0].message.content)["queries"]
all_queries = [body.query] + expansions

# Step 2: embed all in parallel
embeddings = await asyncio.gather(*[get_embedding(q) for q in all_queries])

# Step 3: retrieve for each embedding in parallel
all_results = await asyncio.gather(*[
    get_relevant_documents(emb) for emb in embeddings
])

# Step 4: merge — keep best (lowest L2) score per document
merged: dict[str, dict] = {}
for query, results in zip(all_queries, all_results):
    for doc in results:
        if doc["id"] not in merged or doc["score"] < merged[doc["id"]]["score"]:
            merged[doc["id"]] = {**doc, "matched_query": query}

final = sorted(merged.values(), key=lambda x: x["score"])
```

> 🎬 **SHOW:** Highlight `temperature=0.8` for expansion generation — explain you want genuine variation, not near-identical alternatives.

`temperature=0.8` for expansion generation — you want genuine variation in phrasings, not near-identical alternatives.

> 🎬 **SHOW:** Highlight the merge step — specifically `doc["score"] < merged[doc["id"]]["score"]` — explain this keeps the best score across all queries.

The merge step deduplicates results, keeping the best score for each document across all queries.

---

## Key Takeaways

> 🎬 **SHOW:** Return to the tab with the "db performance" query — expansions visible in the middle panel, merged results showing documents found by different expansions.

- Query expansion generates multiple phrasings of the same intent to cover vocabulary mismatches between queries and documents.
- All embeddings and retrievals run in parallel — the latency cost is roughly two LLM calls (expansion + generation), not N+1.
- The merge step deduplicates results, keeping the best score for each document across all queries.
- Expansion improves recall; combine with reranking to also improve precision.
- Diminishing returns beyond 4-5 expansions — more phrasings don't always find more relevant documents.

---

## What's Next

> 🎬 **SHOW:** Click "Vision" in the sidebar — the first tab of Module 5.

You've completed the RAG module. You can build, ingest, retrieve, rerank, and improve queries. Now we move to LLM capabilities — features that go beyond text: vision, tool calling, and model comparison.
