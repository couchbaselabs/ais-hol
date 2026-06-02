# Chunking Strategies

**Module:** Retrieval-Augmented Generation | **Level:** Intermediate
**Runtime:** ~7 min | **Tab:** `chunking`

---

## Hook

You've decided to build a RAG system. You have your documents. You're about to embed them. But what exactly do you embed? The whole document? Individual sentences? Paragraphs? The answer — chunking strategy — is one of the most consequential decisions in a RAG system, and most tutorials skip it entirely.

---

## Concept

**Chunking** is splitting a document into pieces before embedding. Each chunk becomes one vector in your database. When a query arrives, you retrieve the most relevant chunks — not the whole document.

Why not embed the whole document? Two reasons:

1. **Embedding quality degrades with length.** A 10,000-word document produces one vector that tries to capture everything. A query about one specific paragraph will score poorly against that diluted vector.

2. **Context window limits.** Even if retrieval worked perfectly, you can't inject a 10,000-word document into every prompt. You need to inject only the relevant parts.

The four main strategies:

**Fixed-size**: Split every N words with optional overlap. Simple, fast, predictable. The overlap ensures that information at chunk boundaries isn't lost — a sentence that spans the boundary between chunk 3 and chunk 4 appears in both.

**Sentence**: Split at sentence boundaries (`.!?`), group up to N words. Keeps sentences intact, which is better for embedding quality. A sentence is a natural unit of meaning.

**Paragraph**: Split at blank lines, group up to N words. Keeps related sentences together. Good for documents with clear paragraph structure.

**Semantic**: Embed each sentence, split where cosine similarity between adjacent sentences drops below a threshold. The most expensive approach (one embedding call per sentence) but produces the most semantically coherent chunks.

The right strategy depends on your document type and query pattern. There's no universal answer.

---

## Demo Walkthrough

Open the **Chunking** tab. Paste any text and compare all four strategies side by side.

1. Use the sample text (a few paragraphs of technical documentation). Run all four strategies with default settings.
   - Fixed-size: notice how chunks cut mid-sentence.
   - Sentence: cleaner boundaries, but chunk sizes vary.
   - Paragraph: larger chunks, more context per chunk.
   - Semantic: splits where the topic changes, regardless of sentence or paragraph boundaries.

2. Try chunk size 50 vs 300. At 50, you get many small chunks — high precision but low context. At 300, fewer larger chunks — more context but lower precision.

3. Try overlap 0 vs 50 words on fixed-size. With overlap 0, a sentence at the boundary is in exactly one chunk. With overlap 50, it appears in two — better recall at the cost of storage.

4. Try semantic chunking on a text that switches topics mid-paragraph. Does it split at the topic boundary even though there's no paragraph break?

---

## Code Deep-Dive

Fixed-size chunking with overlap:

```python
words = text.split()
step = max(1, chunk_size - overlap)
chunks = []
i = 0
while i < len(words):
    chunks.append(" ".join(words[i : i + chunk_size]))
    i += step
# overlap means consecutive chunks share 'overlap' words,
# so a query matching the boundary region retrieves both chunks.
```

Semantic chunking — the most interesting approach:

```python
sentences = re.split(r'(?<=[.!?])\s+', text)
embeddings = [embed(s) for s in sentences]

THRESHOLD = 0.82
current = [sentences[0]]
for i in range(1, len(sentences)):
    sim = cosine(embeddings[i-1], embeddings[i])
    if sim < THRESHOLD and len(current) > 1:
        # Topic shift detected — start a new chunk
        chunks.append(" ".join(current))
        current = [sentences[i]]
    else:
        current.append(sentences[i])
```

The threshold `0.82` is the key parameter. If adjacent sentences have cosine similarity below 0.82, they're considered a topic boundary. Too high a threshold and you split too aggressively. Too low and you never split.

The cost of semantic chunking: one embedding API call per sentence. For a 100-sentence document, that's 100 embedding calls. At `text-embedding-3-small` pricing (~$0.02 per million tokens), this is cheap — but it's 100x more expensive than fixed-size chunking, which needs zero embedding calls at chunk time.

---

## Key Takeaways

- Chunking splits documents into pieces before embedding — each chunk becomes one searchable vector.
- Fixed-size is simple and fast. Sentence/paragraph preserve natural boundaries. Semantic is most coherent but expensive.
- Overlap prevents information loss at chunk boundaries — consecutive chunks share some content.
- Chunk size is a precision/context tradeoff: small chunks are precise, large chunks provide more context.
- The right strategy depends on document type and query pattern — test with your actual data.

---

## What's Next

You know how to split documents into chunks. Now you need to embed each chunk and store it in Couchbase with a vector index so it can be retrieved. That's the ingestion pipeline — the write side of RAG.
