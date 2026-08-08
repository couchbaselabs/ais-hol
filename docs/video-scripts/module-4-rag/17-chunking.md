# Chunking Strategies

**Module:** Retrieval-Augmented Generation | **Level:** Intermediate
**Runtime:** ~7 min | **Tab:** `chunking`

---

## Hook

> 🎬 **SHOW:** Chunking tab open, text input area with sample text pre-loaded, four strategy tabs visible (Fixed, Sentence, Paragraph, Semantic), chunk cards area empty.

You've decided to build a RAG system. You have your documents. You're about to embed them. But what exactly do you embed? The whole document? Individual sentences? Paragraphs? The answer — chunking strategy — is one of the most consequential decisions in a RAG system, and most tutorials skip it entirely.

---

## Concept

> 🎬 **SHOW:** Slide — a long document bar at the top, then four different ways of splitting it below: fixed-size (equal blocks), sentence (variable-size blocks at sentence boundaries), paragraph (larger blocks at blank lines), semantic (splits where topic changes, regardless of structure).

**Chunking** is splitting a document into pieces before embedding. Each chunk becomes one vector in your database. When a query arrives, you retrieve the most relevant chunks — not the whole document.

Why not embed the whole document? Two reasons: embedding quality degrades with length, and you can't inject a 10,000-word document into every prompt.

> 🎬 **SHOW:** Slide — "Overlap" diagram: two adjacent chunks with a shaded overlap region. A sentence that spans the boundary appears in both chunks.

The overlap between chunks is important: it ensures that information at chunk boundaries isn't lost.

> 🎬 **SHOW:** Slide — a 2×2 grid: Fixed (fast, simple, cuts mid-sentence), Sentence (clean boundaries, variable size), Paragraph (more context, needs structure), Semantic (most coherent, expensive).

The four strategies each have tradeoffs. There's no universal answer — the right strategy depends on your document type and query pattern.

---

## Demo Walkthrough

> 🎬 **SHOW:** Chunking tab, sample text loaded, default settings.

1. Run all four strategies with default settings.

   > 🎬 **SHOW:** Click each strategy tab one at a time. For each, point to: how many chunks were produced, whether sentences are cut mid-way, and the chunk size variation.

   - Fixed-size: notice how chunks cut mid-sentence.
   - Sentence: cleaner boundaries, but chunk sizes vary.
   - Paragraph: larger chunks, more context per chunk.
   - Semantic: splits where the topic changes, regardless of sentence or paragraph boundaries.

2. Try chunk size 50 vs 300.

   > 🎬 **SHOW:** Change the chunk size slider to 50, run Fixed. Count the chunks. Then change to 300, run again. Point to the dramatic difference in chunk count.

   At 50, you get many small chunks — high precision but low context. At 300, fewer larger chunks — more context but lower precision.

3. Try overlap 0 vs 50 words on fixed-size.

   > 🎬 **SHOW:** Set overlap to 0, run. Then set to 50, run. Point to consecutive chunks — with overlap 50, the last 50 words of chunk N are the first 50 words of chunk N+1.

   With overlap 0, a sentence at the boundary is in exactly one chunk. With overlap 50, it appears in two — better recall at the cost of storage.

4. Try semantic chunking on a text that switches topics mid-paragraph.

   > 🎬 **SHOW:** Paste a text that has a clear topic shift mid-paragraph (e.g. starts talking about CSS then switches to JavaScript). Run Semantic. Point to the split occurring at the topic boundary, not at the paragraph break.

   Does it split at the topic boundary even though there's no paragraph break?

---

## Code Deep-Dive

> 🎬 **SHOW:** Open `backend/main.py`, scrolled to the chunking endpoint. Show the fixed-size chunking code first.

Fixed-size chunking with overlap:

```python
words = text.split()
step = max(1, chunk_size - overlap)
chunks = []
i = 0
while i < len(words):
    chunks.append(" ".join(words[i : i + chunk_size]))
    i += step
```

> 🎬 **SHOW:** Highlight `step = chunk_size - overlap` — this is what creates the overlap.

`step = chunk_size - overlap` is what creates the overlap. Consecutive chunks start `step` words apart, so they share `overlap` words.

> 🎬 **SHOW:** Scroll to the semantic chunking code. Highlight the cosine similarity check and the threshold.

Semantic chunking — the most interesting approach:

```python
sentences = re.split(r'(?<=[.!?])\s+', text)
embeddings = [embed(s) for s in sentences]

THRESHOLD = 0.82
current = [sentences[0]]
for i in range(1, len(sentences)):
    sim = cosine(embeddings[i-1], embeddings[i])
    if sim < THRESHOLD and len(current) > 1:
        chunks.append(" ".join(current))
        current = [sentences[i]]
    else:
        current.append(sentences[i])
```

> 🎬 **SHOW:** Highlight `THRESHOLD = 0.82` — explain it's the key tuning parameter.

The threshold `0.82` is the key parameter. If adjacent sentences have cosine similarity below 0.82, they're considered a topic boundary. The cost: one embedding API call per sentence.

---

## Key Takeaways

> 🎬 **SHOW:** Return to the tab with all four strategy results visible side by side for the same text.

- Chunking splits documents into pieces before embedding — each chunk becomes one searchable vector.
- Fixed-size is simple and fast. Sentence/paragraph preserve natural boundaries. Semantic is most coherent but expensive.
- Overlap prevents information loss at chunk boundaries — consecutive chunks share some content.
- Chunk size is a precision/context tradeoff: small chunks are precise, large chunks provide more context.
- The right strategy depends on document type and query pattern — test with your actual data.

---

## What's Next

> 🎬 **SHOW:** Click "Document Ingestion" in the sidebar.

You know how to split documents into chunks. Now you need to embed each chunk and store it in Couchbase with a vector index so it can be retrieved. That's the ingestion pipeline — the write side of RAG.
