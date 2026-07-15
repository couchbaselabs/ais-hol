# RAG Pipeline

**Module:** Retrieval-Augmented Generation | **Level:** Intermediate
**Runtime:** ~8 min | **Tab:** `rag`

---

## Hook

> 🎬 **SHOW:** RAG Pipeline tab open, chat input ready, retrieved documents panel visible on the right (empty), streaming response area below.

The model's training data has a cutoff. It doesn't know about your internal documentation, your product specs, or anything that happened after its training ended. RAG — Retrieval-Augmented Generation — solves this by giving the model access to your documents at query time. It's the most important pattern in applied AI engineering.

---

## Concept

> 🎬 **SHOW:** Slide — four-step loop with icons: "1. Embed query" → "2. ANN search" → "3. Inject chunks into prompt" → "4. Stream response". A database cylinder sits between steps 2 and 3.

RAG has a simple core loop: embed the query, retrieve the closest document chunks, inject them into the prompt as context, generate the answer.

The model doesn't search the database — your application does. The model only sees the retrieved chunks, formatted as context in the prompt. This means the model's answer is grounded in your documents, not its training data.

> 🎬 **SHOW:** Slide — the full assembled pipeline showing all components: semantic cache → conversation memory → vector retrieval → streaming. Each component labelled with the tab where it was introduced.

This tab shows the full assembled pipeline: semantic cache + conversation memory + vector retrieval + streaming. Each component was covered in earlier tabs — here they work together.

> 🎬 **SHOW:** Slide — warning: "RAG quality is bounded by retrieval quality. If the wrong chunks are retrieved, the answer will be wrong or hallucinated."

What RAG doesn't solve: hallucination. If the retrieved chunks don't contain the answer, the model may still hallucinate one. The remaining tabs in this module cover techniques to improve retrieval quality.

---

## Demo Walkthrough

> 🎬 **SHOW:** RAG Pipeline tab, chat input ready. The retrieved documents panel is visible on the right side.

1. Ask: *"How does the CSS box model work?"*

   > 🎬 **SHOW:** Type and send. Watch the retrieved documents panel populate first — point to the MDN doc chunks that were fetched. Then watch the streaming response appear, citing the retrieved content.

   The response should cite specific MDN content. Look at the retrieved documents panel to see which chunks were used.

2. Ask: *"What is the difference between let, const, and var?"*

   > 🎬 **SHOW:** Send. Point to the retrieved chunks — they should be MDN JavaScript documentation. Point to the response referencing the retrieved content.

   Again, grounded in MDN docs.

3. Ask: *"What happened in the news today?"*

   > 🎬 **SHOW:** Send. Point to the retrieved chunks — they won't be relevant (MDN docs about CSS/JS). Point to the response — the model either says it doesn't know or falls back to training data.

   The retrieved chunks won't be relevant, so the model falls back to its training. This is the retrieval quality problem.

4. Ask a question phrased very differently from the documentation.

   > 🎬 **SHOW:** Ask something like "How do I make things sit next to each other in CSS?" — phrased colloquially. Point to whether the flexbox/grid chunks are still retrieved despite the different vocabulary.

   Does retrieval still find the right chunk? This is where embedding quality matters.

5. Have a multi-turn conversation.

   > 🎬 **SHOW:** Ask a follow-up: "Can you give me an example of that?" Point to the model correctly understanding "that" from the conversation history summary in the debug panel.

   The model should use the conversation history to understand what "that" refers to.

---

## Code Deep-Dive

> 🎬 **SHOW:** Open `backend/main.py`, scrolled to the full RAG pipeline function. Walk through it top to bottom.

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

# Summarise conversation history using Couchbase AI Data Plane ai_summary()
history_summary = await summarize_conversation(session_id)

prompt = (
    "You are an MDN documentation expert.\n\n"
    f"HISTORY SUMMARY:\n{history_summary}\n\n"
    f"DOCUMENTS:\n{doc_context}\n\n"
    f"QUESTION: {message}"
)

async def generate_and_store():
    full = ""
    async for token in stream_completion(prompt):
        full += token
        yield token
    await add_message(session_id, full, "assistant")
    await cache_put(message, embedding, llm_sig, full)

return StreamingResponse(generate_and_store(), media_type="text/plain")
```

> 🎬 **SHOW:** Highlight the cache check at the top — "if cached, skip everything". Then highlight the `doc_context` construction — show how chunks are formatted with their filepath as a citation.

The cache check at the top skips retrieval and the LLM entirely on a hit. The `doc_context` formats each chunk with its filepath — the model can cite the source.

> 🎬 **SHOW:** Scroll to the ANN retrieval SQL query. Highlight `ANN_DISTANCE` and `LIMIT 4`.

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

> 🎬 **SHOW:** Highlight `LIMIT 4` — explain the tradeoff between more context and more tokens.

`LIMIT 4` retrieves the top 4 most relevant chunks. Increasing this gives the model more context but costs more tokens.

---

## Key Takeaways

> 🎬 **SHOW:** Return to the tab with the CSS box model response visible — retrieved chunks panel showing the MDN source documents, streaming response citing them.

- RAG grounds LLM responses in your documents by retrieving relevant chunks at query time.
- The pipeline: embed query → ANN search → inject chunks into prompt → stream response.
- The model only sees retrieved chunks — it doesn't search the database directly.
- RAG quality is bounded by retrieval quality — if the wrong chunks are retrieved, the answer will be wrong or hallucinated.
- The full pipeline combines cache + memory + retrieval + streaming — each component is independently valuable.

---

## What's Next

> 🎬 **SHOW:** Click "Reranking" in the sidebar.

Basic RAG retrieves the top-K chunks by vector similarity. But vector similarity is a proxy for relevance, not a perfect measure. The next tab adds reranking: a second pass that uses the LLM itself to score each candidate for relevance to the specific query.
