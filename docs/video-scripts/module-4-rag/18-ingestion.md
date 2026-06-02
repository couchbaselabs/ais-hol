# Document Ingestion

**Module:** Retrieval-Augmented Generation | **Level:** Intermediate
**Runtime:** ~6 min | **Tab:** `ingestion`

---

## Hook

Most RAG tutorials show you the retrieval side — querying a pre-built vector database. But where did those vectors come from? The ingestion pipeline is the write side of RAG, and understanding it is what lets you build RAG over your own documents rather than someone else's demo data.

---

## Concept

The ingestion pipeline has three steps:

1. **Chunk**: Split the document into pieces (covered in the previous tab).
2. **Embed**: Call the embedding model for each chunk to get a vector.
3. **Store**: Write each chunk and its vector to Couchbase, where a vector index makes it searchable.

The stored document structure is simple:

```json
{
  "content": "The CSS box model defines how elements are sized...",
  "vector": [0.023, -0.041, 0.118, ...],  // 1536 floats
  "filepath": "css/box-model.md",
  "title": "CSS Box Model"
}
```

The `vector` field is what the ANN (Approximate Nearest Neighbour) index operates on. When a query arrives, its embedding is compared against all stored vectors to find the closest matches.

Two performance considerations:

**Embedding cost scales linearly.** 1000 chunks = 1000 embedding API calls. Use `asyncio.gather` to run them concurrently — the total time is roughly the time of one call, not 1000.

**Re-ingestion creates duplicates.** If you ingest the same document twice, you get duplicate chunks in the database. The retrieval system will return both, wasting context window space. In production, you'd check for existing documents by filepath before ingesting, or use `upsert` with a deterministic document ID derived from the content hash.

---

## Demo Walkthrough

Open the **Ingestion** tab. It shows a document input, chunk size controls, and a progress display.

1. Use the sample document (MDN documentation excerpt). Set chunk size to 150 words, overlap to 20. Click **Ingest**.

2. Watch the progress: chunks appear as they're created, then embedding calls fire in parallel, then storage confirmations appear. The parallel embedding is fast — all chunks embed in roughly the time of one call.

3. Try chunk size 50 vs 300. How does the number of chunks change? How does embedding time scale?

4. After ingestion, switch to the **RAG Pipeline** tab and query the document you just ingested. You're querying your own data.

5. Ingest the same document again. Then query it — do you get duplicate results? This is the deduplication problem.

---

## Code Deep-Dive

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

The Couchbase vector index is created once, not per-document. It's a SQL++ GSI (Global Secondary Index) with a vector type:

```sql
CREATE INDEX idx_documentation_vector
ON `bucket`.`scope`.documentation(vector VECTOR)
WITH {"dimension": 1536, "similarity": "L2", "nprobes": 3};
```

`dimension: 1536` matches `text-embedding-3-small`'s output size. `similarity: "L2"` uses Euclidean distance (lower = more similar). `nprobes: 3` controls the ANN search accuracy/speed tradeoff — higher values are more accurate but slower.

Once the index exists, retrieval is a SQL++ query:

```sql
SELECT content, filepath,
       ANN_DISTANCE(vector, $embedding, "L2") AS score
FROM `bucket`.`scope`.documentation
USE INDEX (idx_documentation_vector USING GSI)
ORDER BY ANN_DISTANCE(vector, $embedding, "L2")
LIMIT 4
```

---

## Key Takeaways

- Ingestion is the write side of RAG: chunk → embed → store.
- Use `asyncio.gather` to embed all chunks concurrently — linear scaling in time, not sequential.
- Each stored document contains the original text, its vector, and metadata (filepath, title).
- The Couchbase vector index is created once and serves all subsequent queries.
- Re-ingestion creates duplicates — implement deduplication by filepath or content hash in production.

---

## What's Next

You've built the write side of RAG. Now the read side: the full RAG pipeline that takes a user question, retrieves relevant chunks, and generates a grounded answer. This is where everything from the last three tabs comes together.
