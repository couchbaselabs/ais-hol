# Query Expansion

**Module:** Retrieval-Augmented Generation | **Level:** Intermediate
**Runtime:** ~6 min | **Tab:** `query-expansion`

---

## Hook

A user types: *"db performance"*. Your RAG system searches for chunks similar to that embedding. But the relevant documentation uses words like "query optimisation", "index efficiency", "execution plan". The embeddings are close but not identical — and you might miss the best chunks. Query expansion generates multiple phrasings of the same intent and retrieves documents for all of them, dramatically improving recall.

---

## Concept

**Query expansion** addresses the vocabulary mismatch problem: the user's query and the relevant documents may use different words to express the same concept.

The approach:

1. **Expand**: Ask the LLM to generate N alternative phrasings of the original query.
2. **Embed all**: Embed the original query and all expansions in parallel.
3. **Retrieve all**: Run ANN search for each embedding in parallel.
4. **Merge**: Combine all result sets, keeping the best (lowest L2 distance) score for each document ID.

The merge step is important: the same document may appear in multiple result sets. You keep it once, with the best score across all queries. This prevents the final list from being dominated by one query's results.

Query expansion improves **recall** — you find more relevant documents. It doesn't directly improve **precision** — you may also retrieve more irrelevant documents. Combining expansion with reranking (previous tab) gives you both: high recall from expansion, high precision from reranking.

The cost: N+1 embedding calls and N+1 ANN queries per request. At typical embedding prices, this is cheap. The LLM call to generate expansions is the main cost — one extra call per request.

---

## Demo Walkthrough

Open the **Query Expansion** tab. It shows the original query, the generated expansions, and the merged retrieval results.

1. Try: *"db performance"* — watch the LLM generate expansions like *"database query optimisation"*, *"improving SQL query speed"*, *"database index performance"*. Each expansion covers a different vocabulary cluster.

2. Try a technical acronym: *"CORS"* — expansions might include *"Cross-Origin Resource Sharing"*, *"browser security policy"*, *"HTTP headers for cross-origin requests"*. The acronym alone has a poor embedding; the expanded forms retrieve much better.

3. Try a query in a different language. Does the LLM expand it in the same language? Does it also generate English expansions?

4. Compare the merged results to what standard retrieval (just the original query) would return. Are there documents in the expanded results that wouldn't have been found otherwise?

---

## Code Deep-Dive

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

`temperature=0.8` for expansion generation — you want genuine variation in phrasings, not near-identical alternatives. The `matched_query` field in the result tells you which expansion found each document, which is useful for debugging retrieval quality.

The `response_format: json_object` ensures the expansions come back as a parseable list, not free-form text.

---

## Key Takeaways

- Query expansion generates multiple phrasings of the same intent to cover vocabulary mismatches between queries and documents.
- All embeddings and retrievals run in parallel — the latency cost is roughly two LLM calls (expansion + generation), not N+1.
- The merge step deduplicates results, keeping the best score for each document across all queries.
- Expansion improves recall; combine with reranking to also improve precision.
- Diminishing returns beyond 4-5 expansions — more phrasings don't always find more relevant documents.

---

## What's Next

You've completed the RAG module. You can build, ingest, retrieve, rerank, and improve queries. Now we move to LLM capabilities — features that go beyond text: vision, tool calling, and model comparison.
