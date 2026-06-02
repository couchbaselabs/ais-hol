# Reranking

**Module:** Retrieval-Augmented Generation | **Level:** Intermediate
**Runtime:** ~7 min | **Tab:** `rerank`

---

## Hook

Your vector search returns the top 5 most semantically similar chunks. But "semantically similar" and "actually answers the question" are not the same thing. A chunk about CSS syntax is semantically close to a question about CSS performance — but it doesn't answer the question. Reranking adds a second pass that asks the LLM: *"Does this document actually answer this specific question?"*

---

## Concept

Standard RAG retrieval uses ANN vector search — fast, approximate, and based on embedding similarity. It's a good first filter but an imperfect relevance signal.

**Reranking** adds a second stage:

1. **Retrieve broadly**: Get more candidates than you need (e.g. top 10 instead of top 4).
2. **Score for relevance**: Ask the LLM to score each candidate on how well it answers the specific query.
3. **Select the best**: Keep only the top-K reranked documents for the final prompt.

The reranker sees both the query and the document together — it can reason about whether the document actually answers the question, not just whether it's topically similar. This catches cases where:
- A document is about the right topic but doesn't answer the specific question.
- A document uses different vocabulary but directly answers the question.
- The top vector result is a tangentially related document that happens to be close in embedding space.

The cost: one extra LLM call per candidate document. For 10 candidates, that's 10 LLM calls before the final generation call. This adds latency and cost. Reranking is worth it when retrieval precision matters more than speed — for example, in a customer support system where a wrong answer is worse than a slow one.

---

## Demo Walkthrough

Open the **Reranking** tab. It shows two columns: initial retrieval results (by vector similarity) and reranked results (by LLM relevance score).

1. Ask: *"How do I handle errors in the Fetch API?"*
   - Initial retrieval: top 5 by vector similarity. Some may be about Fetch but not about error handling specifically.
   - Reranked: the LLM scores each for relevance to error handling. Documents that directly discuss `.catch()` or `try/catch` with Fetch should rise to the top.

2. Ask a very specific question: *"What is the difference between `stopPropagation` and `preventDefault`?"*
   - Watch which documents get dropped after reranking. A document about event listeners in general might score high on vector similarity but low on reranking because it doesn't address the specific distinction.

3. Ask a broad question: *"Tell me about CSS."* — reranking may not help much here because many documents are equally relevant to a vague query.

4. Compare the final answers with and without reranking (toggle the reranking switch). Is the reranked answer more precise?

---

## Code Deep-Dive

The two-stage pipeline:

```python
# Stage 1: retrieve more candidates than needed
candidates = await get_relevant_documents(embedding, limit=10)

# Stage 2: score each candidate for relevance
async def score_document(doc: dict) -> dict:
    completion = await client.chat.completions.create(
        model=INFERENCE_MODEL,
        messages=[{
            "role": "system",
            "content": "Score how well this document answers the query. "
                       "Return JSON: {score: 0-10, reason: str}",
        }, {
            "role": "user",
            "content": f"Query: {query}\n\nDocument:\n{doc['content']}",
        }],
        response_format={"type": "json_object"},
        temperature=0,
    )
    result = json.loads(completion.choices[0].message.content)
    return {**doc, "rerank_score": result["score"], "rerank_reason": result["reason"]}

# Score all candidates in parallel
scored = await asyncio.gather(*[score_document(d) for d in candidates])

# Keep top-K by rerank score
reranked = sorted(scored, key=lambda x: x["rerank_score"], reverse=True)[:4]
```

The scoring calls run in parallel with `asyncio.gather` — 10 candidates means 10 concurrent LLM calls. The total latency is roughly one LLM call, not ten.

The UI shows both the initial vector similarity score and the rerank score for each document, so you can see exactly which documents were promoted or demoted.

---

## Key Takeaways

- Vector similarity is a fast but imperfect relevance signal — semantically similar ≠ actually answers the question.
- Reranking adds a second pass: retrieve broadly, then score each candidate with the LLM for query-specific relevance.
- Reranking calls run in parallel — latency cost is roughly one extra LLM call, not N.
- Use reranking when precision matters more than speed — customer support, legal, medical applications.
- The reranker sees query + document together, enabling reasoning that pure embedding similarity cannot.

---

## What's Next

Reranking improves what happens after retrieval. The next tab improves what happens before retrieval — by generating a better query. HyDE (Hypothetical Document Embeddings) asks the LLM to write a hypothetical answer first, then embeds that answer for retrieval instead of the raw question.
