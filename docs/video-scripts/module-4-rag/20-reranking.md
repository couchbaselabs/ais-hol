# Reranking

**Module:** Retrieval-Augmented Generation | **Level:** Intermediate
**Runtime:** ~7 min | **Tab:** `rerank`

---

## Hook

> 🎬 **SHOW:** Reranking tab open, two columns visible: "Initial Retrieval" on the left (empty) and "Reranked" on the right (empty). Query input at the top.

Your vector search returns the top 5 most semantically similar chunks. But "semantically similar" and "actually answers the question" are not the same thing. A chunk about CSS syntax is semantically close to a question about CSS performance — but it doesn't answer the question. Reranking adds a second pass that asks the LLM: *"Does this document actually answer this specific question?"*

---

## Concept

> 🎬 **SHOW:** Slide — two-stage diagram. Stage 1: query → ANN search → 10 candidates (fast, approximate). Stage 2: each candidate + query → LLM scorer → relevance score → top 4 selected (slow, precise).

Standard RAG retrieval uses ANN vector search — fast, approximate, and based on embedding similarity. It's a good first filter but an imperfect relevance signal.

**Reranking** adds a second stage: retrieve broadly (top 10 instead of top 4), score each candidate with the LLM for query-specific relevance, then keep only the top-K reranked documents.

> 🎬 **SHOW:** Slide — "The reranker sees query + document together — it can reason about whether the document actually answers the question."

The reranker sees both the query and the document together — it can reason about whether the document actually answers the question, not just whether it's topically similar.

> 🎬 **SHOW:** Slide — cost note: "10 parallel LLM calls ≈ latency of 1 call. Worth it when precision matters more than speed."

The cost: one extra LLM call per candidate, run in parallel. For 10 candidates, that's 10 concurrent calls — roughly the latency of one call.

---

## Demo Walkthrough

> 🎬 **SHOW:** Reranking tab, both columns visible, query input ready.

1. Ask: *"How do I handle errors in the Fetch API?"*

   > 🎬 **SHOW:** Type and send. Watch the left column populate with initial retrieval results — point to their vector similarity scores. Then watch the right column populate with reranked results — point to the rerank scores. Highlight any documents that moved up or down.

   Initial retrieval: top 5 by vector similarity. Reranked: the LLM scores each for relevance to error handling. Documents that directly discuss `.catch()` or `try/catch` with Fetch should rise to the top.

2. Ask: *"What is the difference between `stopPropagation` and `preventDefault`?"*

   > 🎬 **SHOW:** Send. Point to a document in the left column that's about event listeners generally (high vector similarity) but gets demoted in the right column (low rerank score) because it doesn't address the specific distinction.

   Watch which documents get dropped after reranking. A document about event listeners in general might score high on vector similarity but low on reranking.

3. Ask a broad question: *"Tell me about CSS."*

   > 🎬 **SHOW:** Send. Point to the left and right columns being similar — reranking doesn't help much for vague queries.

   Reranking may not help much here because many documents are equally relevant to a vague query.

4. Toggle the reranking switch off and compare the final answer.

   > 🎬 **SHOW:** If the tab has a toggle, switch reranking off and resend the error-handling question. Compare the two answers side by side.

   Is the reranked answer more precise?

---

## Code Deep-Dive

> 🎬 **SHOW:** Open `backend/main.py`, scrolled to the reranking endpoint. Highlight the two-stage structure.

The two-stage pipeline:

```python
# Stage 1: retrieve more candidates than needed
candidates = await get_relevant_documents(embedding, limit=10)

# Stage 2: score each candidate for relevance — all in parallel
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

scored = await asyncio.gather(*[score_document(d) for d in candidates])

# Keep top-K by rerank score
reranked = sorted(scored, key=lambda x: x["rerank_score"], reverse=True)[:4]
```

> 🎬 **SHOW:** Highlight `asyncio.gather` — 10 scoring calls run simultaneously. Then highlight `temperature=0` — consistent scoring.

The scoring calls run in parallel with `asyncio.gather` — 10 candidates means 10 concurrent LLM calls. Temperature 0 ensures consistent scores.

> 🎬 **SHOW:** Point to the `rerank_reason` field — explain it's what populates the reason text shown in the UI for each document.

The `rerank_reason` field explains why each document was scored the way it was — visible in the UI and useful for debugging retrieval quality.

---

## Key Takeaways

> 🎬 **SHOW:** Return to the tab with the error-handling query — left column showing initial results, right column showing reranked results with the most relevant document at the top.

- Vector similarity is a fast but imperfect relevance signal — semantically similar ≠ actually answers the question.
- Reranking adds a second pass: retrieve broadly, then score each candidate with the LLM for query-specific relevance.
- Reranking calls run in parallel — latency cost is roughly one extra LLM call, not N.
- Use reranking when precision matters more than speed — customer support, legal, medical applications.
- The reranker sees query + document together, enabling reasoning that pure embedding similarity cannot.

---

## What's Next

> 🎬 **SHOW:** Click "HyDE" in the sidebar.

Reranking improves what happens after retrieval. The next tab improves what happens before retrieval — by generating a better query. HyDE asks the LLM to write a hypothetical answer first, then embeds that answer for retrieval instead of the raw question.
