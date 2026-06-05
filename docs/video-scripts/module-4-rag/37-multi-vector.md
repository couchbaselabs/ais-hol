# Multi-Vector Search

**Module:** Retrieval-Augmented Generation | **Level:** Intermediate
**Runtime:** ~6 min | **Tab:** `multi-vector`

---

## Hook

> 🎬 **SHOW:** Multi-Vector Search tab open, query input visible, mode selector showing Dense / Sparse / Hybrid options, empty results area.

Dense vector search is great at semantic similarity — it finds documents that *mean* the same thing even if they use different words. But it can miss exact keyword matches. Sparse search (BM25) is great at exact terms but misses paraphrases. Hybrid search combines both signals. This tab lets you compare all three modes side by side on the same query.

---

## Concept

> 🎬 **SHOW:** Slide — three columns: Dense (semantic), Sparse (keyword), Hybrid (combined). Each with a short description and example use case.

**Dense** embeddings capture meaning. Query "car" retrieves documents about "automobile" and "vehicle". Good for natural language questions.

**Sparse** (BM25) captures exact term frequency. Query "car" retrieves documents that literally contain the word "car" ranked by how often and how uniquely it appears. Good for technical terms, product names, identifiers.

**Hybrid** combines both scores — typically a weighted sum. You get semantic breadth *and* keyword precision.

> 🎬 **SHOW:** Slide — the hybrid score formula: `score = α × dense_score + (1 − α) × sparse_score`. Label α as the "fusion weight".

The fusion weight α controls the balance. α=1.0 is pure dense; α=0.0 is pure sparse; α=0.5 gives equal weight to both.

---

## Demo Walkthrough

> 🎬 **SHOW:** Multi-Vector tab, mode selector on Dense.

1. Query: *"array methods"* — mode: **Dense**. Submit.

   > 🎬 **SHOW:** Results appear. Note the documents — likely semantically related content about lists, collections, iteration.

   Dense retrieves semantically related content. "Array methods" might surface documents about loops and iterators even if they don't use the exact phrase.

2. Switch to **Sparse**. Same query. Submit.

   > 🎬 **SHOW:** Results change. Point to documents that literally contain "array" and "methods". Compare with the dense results.

   Sparse retrieves documents that contain the exact terms. More precise for technical vocabulary.

3. Switch to **Hybrid**. Same query. Submit.

   > 🎬 **SHOW:** Results blend both sets. Point to the score breakdown if shown — dense score + sparse score → combined score.

   Hybrid combines both. You typically get the best of both: semantically related documents *and* exact-match documents, ranked by a combined score.

4. Try a query where the modes diverge: *"TypeError: cannot read property of undefined"* — an exact error message.

   > 🎬 **SHOW:** Run all three modes. Dense may return general JavaScript error-handling docs. Sparse returns documents containing that exact error string. Hybrid balances both.

   For exact error messages, sparse wins. For conceptual questions, dense wins. Hybrid is the safe default.

---

## Code Deep-Dive

> 🎬 **SHOW:** `backend/main.py`, scrolled to `/api/multi-vector-search`. Highlight the mode branching logic.

The endpoint branches on the requested mode:

```python
if body.mode == "dense":
    results = await dense_search(embedding, body.k)
elif body.mode == "sparse":
    results = await sparse_search(body.query, body.k)
else:  # hybrid
    dense_results  = await dense_search(embedding, body.k * 2)
    sparse_results = await sparse_search(body.query, body.k * 2)
    results = fuse_results(dense_results, sparse_results, alpha=body.alpha)
```

> 🎬 **SHOW:** Scroll to `fuse_results`. Highlight the score combination logic.

The fusion function normalises both score lists to [0, 1] then combines them:

```python
def fuse_results(dense, sparse, alpha=0.5):
    scores = {}
    for r in dense:
        scores[r["id"]] = {"doc": r, "dense": r["score"], "sparse": 0.0}
    for r in sparse:
        if r["id"] in scores:
            scores[r["id"]]["sparse"] = r["score"]
        else:
            scores[r["id"]] = {"doc": r, "dense": 0.0, "sparse": r["score"]}
    for v in scores.values():
        v["combined"] = alpha * v["dense"] + (1 - alpha) * v["sparse"]
    return sorted(scores.values(), key=lambda x: x["combined"], reverse=True)
```

> 🎬 **SHOW:** Highlight the `alpha` parameter. Point out that documents appearing in only one result set get a 0.0 for the missing signal.

Documents that appear in only one result set get a zero for the missing signal — they can still rank well if their single-signal score is high enough.

---

## Key Takeaways

> 🎬 **SHOW:** Hybrid results panel with score breakdown visible.

- Dense search excels at semantic similarity; sparse search excels at exact term matching.
- Hybrid search combines both signals via a weighted fusion — the default for production RAG.
- The fusion weight α is a tunable parameter; start at 0.5 and adjust based on your query distribution.
- Retrieve more candidates (k×2) before fusion to avoid losing good results from either signal.
- For technical corpora with precise terminology, lean sparse (α < 0.5); for conversational queries, lean dense (α > 0.5).

---

## What's Next

> 🎬 **SHOW:** Sidebar — highlight the next module (LLM Capabilities) and the `image-generation` tab.

Next: Image Generation — using DALL-E 3 to generate images from text prompts, and the practical considerations for production use.
