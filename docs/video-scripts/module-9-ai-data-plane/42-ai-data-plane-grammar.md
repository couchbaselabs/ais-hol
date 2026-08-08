# Couchbase AI Data Plane Grammar

**Module:** Couchbase AI Data Plane | **Level:** Advanced
**Runtime:** ~6 min | **Tab:** `ai-data-plane-grammar`

---

## Hook

> 🎬 **SHOW:** Couchbase AI Data Plane Grammar tab open, text input visible, corrected output panel empty.

User-generated content — reviews, support tickets, forum posts — is full of spelling mistakes, grammatical errors, and awkward phrasing. Before you run sentiment analysis, classification, or search over this content, cleaning it up improves accuracy. `ai_corrected_grammar()` fixes grammar and spelling inside the database engine, in a single SQL++ query, across your entire collection.

---

## Concept

> 🎬 **SHOW:** Slide — input: "i recieved the packge yestarday but it was damged". Output: "I received the package yesterday but it was damaged."

`ai_corrected_grammar()` corrects spelling, grammar, punctuation, and capitalisation. It preserves the original meaning and phrasing — it fixes errors, it doesn't rewrite.

> 🎬 **SHOW:** Slide — the SQL++ function call: `default:ai_corrected_grammar({"text": $text})`. Below it, the result: `{"corrected": "...", "changes": [...]}`.

The function returns the corrected text and optionally a list of changes made — useful for auditing what was corrected.

> 🎬 **SHOW:** Slide — the pipeline use case: ingest raw user content → run ai_corrected_grammar() → store corrected version → run downstream AI functions on clean text.

Correcting grammar before running other AI functions improves their accuracy. A misspelled product name in a review may not be classified correctly; the corrected version will be.

---

## Demo Walkthrough

> 🎬 **SHOW:** Couchbase AI Data Plane Grammar tab, text input ready.

1. Enter: *"i recieved the packge yestarday but it was damged and the custmer servise was horible"* Submit.

   > 🎬 **SHOW:** Corrected: "I received the package yesterday but it was damaged and the customer service was horrible." Point to each correction.

   Multiple spelling errors corrected. Capitalisation fixed. Meaning preserved.

2. Enter: *"The meeting was went well and we discussed about the new project"* Submit.

   > 🎬 **SHOW:** Corrected: "The meeting went well and we discussed the new project." Point to the grammatical corrections ("was went" → "went", "discussed about" → "discussed").

   Grammar errors corrected, not just spelling. The function understands sentence structure.

3. Enter already-correct text: *"The quarterly report shows a 15% increase in revenue."* Submit.

   > 🎬 **SHOW:** Output is identical to input. No changes made.

   Correct text is returned unchanged. Safe to run on all documents regardless of quality.

4. Enter text with intentional style choices: *"gonna", "wanna", "kinda"* in a sentence. Submit.

   > 🎬 **SHOW:** Point to whether the function corrects informal contractions or preserves them. Discuss the trade-off.

   Informal contractions may or may not be corrected depending on context. For user-generated content, you may want to preserve voice — consider whether grammar correction is appropriate for your use case.

---

## Code Deep-Dive

> 🎬 **SHOW:** `backend/main.py`, scrolled to `/api/ai-data-plane-grammar`. Highlight the SQL++ query.

```python
sql = """
    SELECT default:ai_corrected_grammar({
        "text": $text
    }) AS result
"""
rows = list(
    cluster.query(
        sql,
        QueryOptions(named_parameters={"text": body.text}),
    ).rows()
)
result = rows[0]["result"][0]
return {
    "corrected": result.get("corrected", body.text),
    "changes":   result.get("changes", []),
    "source":    "ai_data_plane_ai_corrected_grammar",
}
```

> 🎬 **SHOW:** Slide — the bulk correction UPDATE pattern.

```sql
UPDATE `bucket`.`_default`.reviews AS r
SET r.body_corrected = default:ai_corrected_grammar({
        "text": r.body
    }).corrected,
    r.grammar_corrected_at = NOW_STR()
WHERE r.body_corrected IS MISSING
  AND r.body IS NOT NULL
LIMIT 100
```

> 🎬 **SHOW:** Highlight that the original `body` field is preserved — the corrected version is stored in a new field `body_corrected`. The original is never overwritten.

Always store the corrected text in a new field — preserve the original. This lets you audit corrections, revert if needed, and use the original for provenance tracking.

> 🎬 **SHOW:** Slide — the pipeline: raw review → grammar correction → sentiment analysis → classification. Each step operates on the corrected text.

```sql
SELECT r.id,
       default:ai_corrected_grammar({"text": r.body}).corrected AS clean,
       default:ai_sentiment({"text":
           default:ai_corrected_grammar({"text": r.body}).corrected
       }) AS sentiment
FROM reviews AS r
LIMIT 10
```

> 🎬 **SHOW:** Highlight the nested function calls — grammar correction feeds directly into sentiment analysis in a single query.

Couchbase AI Data Plane compose. The output of `ai_corrected_grammar()` feeds directly into `ai_sentiment()` — all in one SQL++ query, no intermediate storage needed.

---

## Key Takeaways

> 🎬 **SHOW:** Side-by-side of original and corrected text.

- `ai_corrected_grammar()` fixes spelling, grammar, punctuation, and capitalisation — preserving meaning, not rewriting.
- Correct text is returned unchanged — safe to run on all documents.
- Always store corrections in a new field; preserve the original for provenance.
- Couchbase AI Data Plane compose — pipe the output of one function into another in a single SQL++ query.
- Requires the Grammar Correction AI Function enabled on the cluster and `query_external_access` role.

---

## What's Next

> 🎬 **SHOW:** Zoom out to show the full sidebar — all tabs visible, all with visited checkmarks. Slowly scroll from top to bottom.

You've completed the full curriculum — from a stateless single API call to multi-agent systems, RAG pipelines, voice interfaces, and database-native AI functions.

> 🎬 **SHOW:** Slide — the full learning path: Foundations → Prompting → Pipeline → RAG → Capabilities → Advanced → Production → Production Patterns → Voice → Couchbase AI Data Plane.

The learning path you followed:
- **Foundations**: tokens, probabilities, temperature, context limits, parallel requests
- **Prompting**: system prompts, few-shot, chain-of-thought, personas, output format, injection attacks
- **Pipeline**: streaming, caching, memory, structured output, summarisation
- **RAG**: embeddings, chunking, ingestion, retrieval, reranking, HyDE, query expansion, metadata filtering, multi-vector
- **Capabilities**: vision, image generation, moderation, tool calling, model comparison
- **Advanced**: agentic RAG, multi-agent systems, evaluation, hallucination detection
- **Production**: cost/latency, guardrails
- **Production Patterns**: retry & fallback, token budget, observability
- **Voice**: WASM (on-device) and server-side (OpenAI APIs)
- **Couchbase AI Data Plane**: SQL++-native LLM functions — summarisation, sentiment, classification, extraction, translation, masking, similarity, completion, grammar

> 🎬 **SHOW:** Return to the app one final time — Simple Chat tab open.

Every pattern in this workshop is production-ready. The code you've seen is the same code running in the backend — not simplified pseudocode. Take it, adapt it, and build something real.
