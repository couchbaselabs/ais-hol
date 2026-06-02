# RAG Pipeline

**Module:** Retrieval-Augmented Generation | **Level:** Intermediate
**Runtime:** ~8 min | **Tab:** `rag`

---

## Hook

The model's training data has a cutoff. It doesn't know about your internal documentation, your product specs, or anything that happened after its training ended. RAG — Retrieval-Augmented Generation — solves this by giving the model access to your documents at query time. It's the most important pattern in applied AI engineering.

---

## Concept

RAG has a simple core loop:

1. **Embed the query**: Convert the user's question into a vector.
2. **Retrieve**: Find the document chunks whose vectors are closest to the query vector.
3. **Augment**: Inject the retrieved chunks into the prompt as context.
4. **Generate**: The LLM answers the question using the provided context.

The model doesn't search the database — your application does. The model only sees the retrieved chunks, formatted as context in the prompt. This means the model's answer is grounded in your documents, not its training data.

This tab shows the full assembled pipeline: semantic cache + conversation memory + vector retrieval + streaming. Each component was covered in earlier tabs — here they work together.

The retrieval step uses Couchbase's ANN vector search with a SQL++ query. The conversation history is summarised using Capella's `ai_summary()` function — an LLM call that runs inside the database engine. Both the summary and the retrieved chunks are injected into the prompt before streaming the response.

**What RAG doesn't solve**: hallucination. If the retrieved chunks don't contain the answer, the model may still hallucinate one. The quality of your RAG system is bounded by the quality of your retrieval — garbage in, garbage out. The remaining tabs in this module cover techniques to improve retrieval quality.

---

## Demo Walkthrough

Open the **RAG Pipeline** tab. It's backed by an index of MDN Web documentation.

1. Ask: *"How does the CSS box model work?"* — the response should cite specific MDN content. Look at the retrieved documents panel to see which chunks were used.

2. Ask: *"What is the difference between let, const, and var?"* — again, grounded in MDN docs.

3. Ask: *"What happened in the news today?"* — the model should say it doesn't have that information, or answer from training data. The retrieved chunks won't be relevant, so the model falls back to its training.

4. Ask a question that's in the docs but phrased very differently from the documentation. Does retrieval still find the right chunk? This is where embedding quality matters.

5. Have a multi-turn conversation. Ask a follow-up that references the previous answer: *"Can you give me an example of that?"* — the model should use the conversation history to understand what "that" refers to.

---

## Code Deep-Dive

The full pipeline in one function:

```python
embedding = await get_embedding(message)

# Cache check — hit skips retrieval and LLM entirely
cached = await cache_get(message, embedding, llm_sig)
if cached:
    return StreamingResponse(iter([cached]), headers={"X-Cache-Hit": "true"})

# Retrieve relevant MDN docs via ANN vector search
docs = await get_relevant_documents(embedding)
doc_context = "\n\n".join(
    f"[{d['filepath']}]\n{d['content']}" for d in docs
)

# Summarise conversation history using Capella ai_summary()
history_summary = await summarize_conversation(session_id)

prompt = (
    "You are an MDN documentation expert.\n\n"
    f"HISTORY SUMMARY:\n{history_summary}\n\n"
    f"DOCUMENTS:\n{doc_context}\n\n"
    f"QUESTION: {message}"
)

# Stream response token-by-token
async def generate_and_store():
    full = ""
    async for token in stream_completion(prompt):
        full += token
        yield token                          # ← sent to browser immediately
    await add_message(session_id, full, "assistant")
    await cache_put(message, embedding, llm_sig, full)

return StreamingResponse(generate_and_store(), media_type="text/plain")
```

The ANN retrieval query:

```python
sql = f"""
    SELECT META(d).id AS id, d.filepath, d.content,
           ANN_DISTANCE(d.vector, $embedding, "L2") AS score
    FROM `{bucket}`.`{scope}`.documentation AS d
    USE INDEX ({index_name} USING GSI)
    ORDER BY ANN_DISTANCE(d.vector, $embedding, "L2")
    LIMIT 4
"""
```

`ANN_DISTANCE` with `"L2"` is Euclidean distance — lower score means more similar. The `LIMIT 4` retrieves the top 4 most relevant chunks. Increasing this gives the model more context but costs more tokens.

---

## Key Takeaways

- RAG grounds LLM responses in your documents by retrieving relevant chunks at query time.
- The pipeline: embed query → ANN search → inject chunks into prompt → stream response.
- The model only sees retrieved chunks — it doesn't search the database directly.
- RAG quality is bounded by retrieval quality — if the wrong chunks are retrieved, the answer will be wrong or hallucinated.
- The full pipeline combines cache + memory + retrieval + streaming — each component is independently valuable.

---

## What's Next

Basic RAG retrieves the top-K chunks by vector similarity. But vector similarity is a proxy for relevance, not a perfect measure. The next tab adds reranking: a second pass that uses the LLM itself to score each candidate for relevance to the specific query.
