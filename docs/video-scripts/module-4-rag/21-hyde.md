# HyDE — Hypothetical Document Embeddings

**Module:** Retrieval-Augmented Generation | **Level:** Intermediate
**Runtime:** ~7 min | **Tab:** `hyde`

---

## Hook

Here's a subtle problem with RAG: questions and answers live in different semantic spaces. *"How does the CSS box model work?"* is phrased like a question. The documentation that answers it is phrased like an explanation. Their embeddings are close, but not as close as two explanations would be. HyDE bridges this gap by asking the LLM to write a hypothetical answer first — then embedding that answer instead of the question.

---

## Concept

**HyDE** (Hypothetical Document Embeddings) is a retrieval technique that improves the query embedding by replacing the raw question with a hypothetical answer.

The intuition: documentation is written in a certain style — declarative, explanatory, using specific vocabulary. A user's question is written in a different style — interrogative, possibly using different vocabulary. The embedding of a hypothetical answer is stylistically and semantically closer to real documentation than the embedding of the question.

The process:

1. **Generate**: Ask the LLM to write a short hypothetical answer to the question (3-5 sentences, as if it were a documentation excerpt).
2. **Embed**: Embed the hypothetical answer (not the original question).
3. **Retrieve**: Use the hypothetical answer's embedding for ANN search.
4. **Generate final answer**: Use the retrieved documents to answer the original question.

This tab runs both standard retrieval (query embedding) and HyDE retrieval (hypothetical answer embedding) in parallel, so you can compare the results side by side.

When does HyDE help most? Short, keyword-sparse queries. *"CSS box model"* as a query has a less informative embedding than a hypothetical answer that uses the vocabulary of CSS documentation. When the query is already phrased like documentation, HyDE adds less value.

The cost: one extra LLM call before retrieval. For latency-sensitive applications, this matters. Run the hypothetical generation and the standard retrieval in parallel to minimise the overhead.

---

## Demo Walkthrough

Open the **HyDE** tab. It shows the hypothetical document generated, then both retrieval results side by side.

1. Ask: *"How does the CSS box model work?"*
   - Look at the hypothetical document — it should read like a documentation excerpt, using terms like "margin", "padding", "border", "content area".
   - Compare the standard retrieval results vs HyDE results. Are different chunks retrieved?

2. Ask: *"What is the difference between let and const?"*
   - The hypothetical answer will use the vocabulary of JavaScript documentation.
   - Does HyDE retrieve more relevant chunks than standard retrieval?

3. Ask a very specific technical question: *"Explain the Fetch API"*
   - The hypothetical answer should be a mini-tutorial on Fetch.
   - Compare retrieval quality.

4. Ask a question that's already phrased like documentation: *"The Fetch API provides an interface for fetching resources."* — HyDE should add little value here because the query is already in documentation style.

---

## Code Deep-Dive

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

The hypothetical generation uses `temperature=0.3` — low enough to be factual and documentation-like, high enough to not be completely deterministic. The hypothetical doesn't need to be correct — it just needs to use the right vocabulary and style to improve retrieval.

If the LLM generates a hallucinated hypothetical (e.g. invents a CSS property that doesn't exist), the retrieval will be worse than standard. This is the main failure mode of HyDE — it's most reliable when the LLM has good knowledge of the domain.

---

## Key Takeaways

- Questions and answers live in different semantic spaces — HyDE bridges this by embedding a hypothetical answer instead of the raw question.
- The hypothetical answer doesn't need to be correct — it just needs to use the vocabulary and style of real documentation.
- HyDE helps most for short, keyword-sparse queries. It adds less value when the query is already phrased like documentation.
- The extra LLM call can be parallelised with standard retrieval to minimise latency overhead.
- HyDE failure mode: if the LLM hallucinates the hypothetical, retrieval quality degrades.

---

## What's Next

HyDE generates one better query. Query expansion generates many alternative phrasings of the same question and retrieves documents for all of them — improving recall by covering more of the embedding space.
