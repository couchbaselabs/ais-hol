# HyDE — Hypothetical Document Embeddings

**Module:** Retrieval-Augmented Generation | **Level:** Intermediate
**Runtime:** ~7 min | **Tab:** `hyde`

---

## Hook

> 🎬 **SHOW:** HyDE tab open, query input at the top, a "Hypothetical Document" panel in the middle (empty), and two retrieval result columns below: "Standard" and "HyDE".

Here's a subtle problem with RAG: questions and answers live in different semantic spaces. *"How does the CSS box model work?"* is phrased like a question. The documentation that answers it is phrased like an explanation. Their embeddings are close, but not as close as two explanations would be. HyDE bridges this gap by asking the LLM to write a hypothetical answer first — then embedding that answer instead of the question.

---

## Concept

> 🎬 **SHOW:** Slide — two embedding paths from the same question. Path 1: question → embed → ANN search (standard). Path 2: question → LLM → hypothetical answer → embed → ANN search (HyDE). Both paths end at the same document database.

**HyDE** (Hypothetical Document Embeddings) replaces the raw question embedding with the embedding of a hypothetical answer.

The intuition: documentation is written in a certain style — declarative, explanatory, using specific vocabulary. A user's question is written in a different style — interrogative, possibly using different vocabulary. The embedding of a hypothetical answer is stylistically and semantically closer to real documentation than the embedding of the question.

> 🎬 **SHOW:** Slide — "The hypothetical answer doesn't need to be correct — it just needs to use the right vocabulary and style."

The hypothetical doesn't need to be correct — it just needs to use the right vocabulary and style to improve retrieval.

> 🎬 **SHOW:** Slide — "HyDE failure mode: if the LLM hallucinates the hypothetical, retrieval quality degrades."

The main failure mode: if the LLM generates a hallucinated hypothetical, the retrieval will be worse than standard.

---

## Demo Walkthrough

> 🎬 **SHOW:** HyDE tab, query input ready, all three panels visible.

1. Ask: *"How does the CSS box model work?"*

   > 🎬 **SHOW:** Type and send. Watch the hypothetical document panel populate first — read a few sentences aloud. Point to the vocabulary: "margin", "padding", "border", "content area". Then watch both retrieval columns populate. Compare the documents retrieved.

   Look at the hypothetical document — it should read like a documentation excerpt, using terms like "margin", "padding", "border", "content area". Compare the standard vs HyDE retrieval results.

2. Ask: *"What is the difference between let and const?"*

   > 🎬 **SHOW:** Send. Point to the hypothetical answer using JavaScript documentation vocabulary. Compare whether different chunks are retrieved in the two columns.

   The hypothetical answer will use the vocabulary of JavaScript documentation. Does HyDE retrieve more relevant chunks?

3. Ask a technical acronym: *"What is CORS?"*

   > 🎬 **SHOW:** Send. Point to the hypothetical expanding the acronym and using full terms. Compare retrieval — the expanded vocabulary should retrieve better results.

   The hypothetical answer should expand "CORS" to "Cross-Origin Resource Sharing" and use the vocabulary of HTTP documentation.

4. Ask a question already phrased like documentation.

   > 🎬 **SHOW:** Ask something like "The Fetch API provides an interface for fetching resources." Point to the hypothetical being very similar to the query — HyDE adds little value here.

   HyDE should add little value here because the query is already in documentation style.

---

## Code Deep-Dive

> 🎬 **SHOW:** Open `backend/main.py`, scrolled to the HyDE endpoint. Highlight the hypothetical generation call and the parallel embedding.

The hypothetical generation and both retrievals run in parallel:

```python
# Step 1: ask the LLM to write a hypothetical answer
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
)
```

> 🎬 **SHOW:** Highlight `get_embedding(hypothetical_doc)` — this single line is the entire HyDE technique.

This single line — embedding the hypothetical answer instead of the query — is the entire HyDE technique.

> 🎬 **SHOW:** Highlight `temperature=0.3` — explain why low but not zero.

`temperature=0.3` — low enough to be factual and documentation-like, high enough to not be completely deterministic. The hypothetical needs to use the right vocabulary, not be creative.

---

## Key Takeaways

> 🎬 **SHOW:** Return to the tab with the CSS box model query — hypothetical document visible in the middle panel, both retrieval columns showing different results.

- Questions and answers live in different semantic spaces — HyDE bridges this by embedding a hypothetical answer instead of the raw question.
- The hypothetical answer doesn't need to be correct — it just needs to use the vocabulary and style of real documentation.
- HyDE helps most for short, keyword-sparse queries. It adds less value when the query is already phrased like documentation.
- The extra LLM call can be parallelised with standard retrieval to minimise latency overhead.
- HyDE failure mode: if the LLM hallucinates the hypothetical, retrieval quality degrades.

---

## What's Next

> 🎬 **SHOW:** Click "Query Expansion" in the sidebar.

HyDE generates one better query. Query expansion generates many alternative phrasings of the same question and retrieves documents for all of them — improving recall by covering more of the embedding space.
