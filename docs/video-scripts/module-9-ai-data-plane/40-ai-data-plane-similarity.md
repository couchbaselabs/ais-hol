# Couchbase AI Data Plane Similarity

**Module:** Couchbase AI Data Plane | **Level:** Advanced
**Runtime:** ~6 min | **Tab:** `ai-data-plane-similarity`

---

## Hook

> 🎬 **SHOW:** Couchbase AI Data Plane Similarity tab open, two text inputs side by side, similarity score display area empty.

Semantic similarity — how alike two pieces of text are in *meaning*, not just in words — is the foundation of deduplication, plagiarism detection, FAQ matching, and recommendation systems. `ai_similarity()` computes a similarity score between two texts as a SQL++ built-in. No embedding pipeline, no vector index — just a function call.

---

## Concept

> 🎬 **SHOW:** Slide — the SQL++ function call: `default:ai_similarity({"text1": $t1, "text2": $t2})`. Below it, the result: `{"score": 0.87}`.

`ai_similarity()` returns a score between 0 and 1. 1.0 means identical meaning; 0.0 means completely unrelated. The score is semantic — "car" and "automobile" score high even though they share no characters.

> 🎬 **SHOW:** Slide — use cases: near-duplicate detection, FAQ matching (find the existing FAQ closest to a new question), content deduplication before ingestion.

The key use case is pairwise comparison at query time. You don't need to pre-compute embeddings or maintain a vector index — the similarity is computed on demand inside the database.

> 🎬 **SHOW:** Slide — near-duplicate detection SQL: `SELECT a.id, b.id, default:ai_similarity({"text1": a.body, "text2": b.body}) AS sim FROM articles AS a JOIN articles AS b ON a.id < b.id WHERE sim.score > 0.9`.

For near-duplicate detection, join a collection with itself and filter by high similarity scores. This surfaces pairs of documents that are semantically near-identical.

---

## Demo Walkthrough

> 🎬 **SHOW:** Couchbase AI Data Plane Similarity tab, both text inputs empty.

1. Text 1: *"The cat sat on the mat."* Text 2: *"A feline was resting on a rug."* Submit.

   > 🎬 **SHOW:** Score ~0.85–0.90. Point to the high score despite no shared words.

   Same meaning, different words → high similarity. This is semantic similarity, not lexical.

2. Text 1: *"How do I reset my password?"* Text 2: *"I forgot my login credentials, how can I recover access?"* Submit.

   > 🎬 **SHOW:** Score ~0.80–0.88. Point to the FAQ matching use case.

   Two different phrasings of the same support question → high similarity. Use this to match incoming questions to existing FAQ entries.

3. Text 1: *"Python is a programming language."* Text 2: *"The python is a large constrictor snake."* Submit.

   > 🎬 **SHOW:** Score ~0.3–0.5. Point to the lower score — same word, different meaning.

   Polysemy (same word, different meanings) reduces similarity. The model uses context, not just word overlap.

4. Text 1: *"The sky is blue."* Text 2: *"Quantum entanglement enables faster-than-light communication."* Submit.

   > 🎬 **SHOW:** Score near 0. Completely unrelated topics.

---

## Code Deep-Dive

> 🎬 **SHOW:** `backend/main.py`, scrolled to `/api/ai-data-plane-similarity`. Highlight the SQL++ query.

```python
sql = """
    SELECT default:ai_similarity({
        "text1": $text1,
        "text2": $text2
    }) AS result
"""
rows = list(
    cluster.query(
        sql,
        QueryOptions(named_parameters={
            "text1": body.text1,
            "text2": body.text2,
        }),
    ).rows()
)
result = rows[0]["result"][0]
return {
    "score":  result.get("score", 0.0),
    "source": "ai_data_plane_ai_similarity",
}
```

> 🎬 **SHOW:** Slide — the near-duplicate detection query with a self-join.

```sql
SELECT a.id AS id_a, b.id AS id_b,
       default:ai_similarity({"text1": a.body, "text2": b.body}).score AS similarity
FROM `bucket`.`_default`.articles AS a
JOIN `bucket`.`_default`.articles AS b ON a.id < b.id
WHERE default:ai_similarity({"text1": a.body, "text2": b.body}).score > 0.90
ORDER BY similarity DESC
LIMIT 20
```

> 🎬 **SHOW:** Highlight `a.id < b.id` — prevents comparing a document with itself and avoids duplicate pairs (A,B) and (B,A).

The `a.id < b.id` condition ensures each pair is compared exactly once. Without it, you'd get both (A,B) and (B,A) as separate results, plus each document compared with itself.

---

## Key Takeaways

> 🎬 **SHOW:** Similarity score display with two semantically similar texts.

- `ai_similarity()` returns a semantic similarity score (0–1) between two texts — no embedding pipeline or vector index needed.
- Semantic similarity captures meaning, not word overlap — paraphrases score high, polysemous words score lower.
- Use for FAQ matching, near-duplicate detection, and content deduplication at query time.
- For near-duplicate detection, self-join with `a.id < b.id` to compare each pair exactly once.
- Requires the Similarity AI Function enabled on the cluster and `query_external_access` role.

---

## What's Next

> 🎬 **SHOW:** Sidebar — highlight the next tab `ai-data-plane-completion`.

Next: Couchbase AI Data Plane Completion — running custom LLM prompts inside the database using `ai_completion()`.
