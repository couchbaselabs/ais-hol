# Document Ingestion

**Module:** Retrieval-Augmented Generation | **Level:** Intermediate
**Runtime:** ~6 min | **Tab:** `ingestion`

---

## Hook

> 🎬 **SHOW:** Ingestion tab open, document text area with sample content, chunk size controls, and a progress/status area below.

Most RAG tutorials show you the retrieval side — querying a pre-built vector database. But where did those vectors come from? The ingestion pipeline is the write side of RAG, and understanding it is what lets you build RAG over your own documents rather than someone else's demo data.

---

## Concept

> 🎬 **SHOW:** Slide — three-step pipeline: "1. Chunk" (document splits into pieces) → "2. Embed" (each piece gets a vector) → "3. Store" (vector + text stored in Couchbase with a vector index).

The ingestion pipeline has three steps: chunk, embed, store. The stored document structure is simple — original text, its vector, and metadata like filepath and title.

> 🎬 **SHOW:** Slide — a JSON document: `{"content": "...", "vector": [0.023, -0.041, ...], "filepath": "css/box-model.md"}`.

The `vector` field is what the ANN index operates on. When a query arrives, its embedding is compared against all stored vectors to find the closest matches.

> 🎬 **SHOW:** Slide — two performance notes: "asyncio.gather: 1000 chunks ≈ time of 1 call" and "Re-ingestion creates duplicates — implement deduplication in production."

Two performance considerations: use `asyncio.gather` to embed all chunks concurrently, and be aware that re-ingesting the same document creates duplicate chunks.

---

## Demo Walkthrough

> 🎬 **SHOW:** Ingestion tab, sample document loaded, chunk size set to 150, overlap to 20.

1. Click **Ingest**.

   > 🎬 **SHOW:** Click Ingest. Watch the progress: chunk cards appear first, then embedding progress indicators fire in parallel, then storage confirmations appear. Point to the parallel embedding — all chunks embed at roughly the same time.

   Watch the progress: chunks appear, then embedding calls fire in parallel, then storage confirmations appear.

2. Try chunk size 50 vs 300.

   > 🎬 **SHOW:** Change chunk size to 50, click Ingest again. Count the chunks. Then change to 300 and repeat. Point to how embedding time stays roughly constant (parallel) while chunk count changes dramatically.

   How does the number of chunks change? How does embedding time scale?

3. After ingestion, switch to the RAG Pipeline tab and query the document you just ingested.

   > 🎬 **SHOW:** Navigate to the RAG Pipeline tab. Ask a question about the ingested document. Point to the retrieved chunks panel — the chunks you just ingested should appear.

   You're querying your own data.

4. Ingest the same document again. Then query it.

   > 🎬 **SHOW:** Return to Ingestion, click Ingest again without changing anything. Go back to RAG Pipeline and ask the same question. Point to duplicate chunks appearing in the retrieved results.

   Do you get duplicate results? This is the deduplication problem.

---

## Code Deep-Dive

> 🎬 **SHOW:** Open `backend/main.py`, scrolled to the ingestion endpoint. Highlight the three-step structure with comments.

The full ingestion pipeline in three steps:

```python
# 1. Chunk
words = text.split()
step = chunk_size - overlap
chunks = [" ".join(words[i:i+chunk_size]) for i in range(0, len(words), step)]

# 2. Embed all chunks concurrently
embeddings = await asyncio.gather(
    *[client.embeddings.create(model=EMBEDDING_MODEL, input=c) for c in chunks]
)
vectors = [e.data[0].embedding for e in embeddings]

# 3. Store in Couchbase
for chunk, vector in zip(chunks, vectors):
    collection.upsert(str(uuid.uuid4()), {
        "content": chunk,
        "vector": vector,
        "title": title,
        "filepath": filepath,
    })
```

> 🎬 **SHOW:** Highlight `asyncio.gather` in step 2 — draw attention to all embedding calls firing simultaneously.

`asyncio.gather` runs all embedding calls concurrently. For 50 chunks, the total embedding time is roughly the time of one call.

> 🎬 **SHOW:** Show the vector index creation SQL on a slide or in a comment.

The Couchbase vector index is created once, not per-document:

```sql
CREATE INDEX idx_documentation_vector
ON `bucket`.`scope`.documentation(vector VECTOR)
WITH {"dimension": 1536, "similarity": "L2", "nprobes": 3};
```

> 🎬 **SHOW:** Highlight `dimension: 1536` matching the embedding model output size, and `similarity: "L2"`.

`dimension: 1536` matches `text-embedding-3-small`'s output size. Once the index exists, all ingested documents are immediately queryable.

---

## Key Takeaways

> 🎬 **SHOW:** Return to the tab showing the completed ingestion — chunk cards with green storage confirmations.

- Ingestion is the write side of RAG: chunk → embed → store.
- Use `asyncio.gather` to embed all chunks concurrently — linear scaling in time, not sequential.
- Each stored document contains the original text, its vector, and metadata (filepath, title).
- The Couchbase vector index is created once and serves all subsequent queries.
- Re-ingestion creates duplicates — implement deduplication by filepath or content hash in production.

---

## What's Next

> 🎬 **SHOW:** Click "RAG Pipeline" in the sidebar.

You've built the write side of RAG. Now the read side: the full RAG pipeline that takes a user question, retrieves relevant chunks, and generates a grounded answer. This is where everything from the last three tabs comes together.
