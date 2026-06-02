# Summarisation

**Module:** Building a Pipeline | **Level:** Intermediate
**Runtime:** ~6 min | **Tab:** `summarise`

---

## Hook

A 100-page document won't fit in a 128k-token context window. Even if it did, sending 100 pages on every query is expensive and slow. Map-reduce summarisation is the classic solution: split the document into chunks, summarise each chunk independently in parallel, then combine all the chunk summaries into a final summary. It scales to any document length.

---

## Concept

**Map-reduce summarisation** has two phases:

**Map**: Split the document into overlapping chunks. Summarise each chunk independently with a parallel LLM call. Each chunk summary is short — 100-200 words — regardless of the chunk's original length.

**Reduce**: Combine all chunk summaries into a single final summary. The reduce prompt sees only the chunk summaries, not the original text — so the total input is manageable regardless of document length.

The overlap between chunks is important: it prevents information loss at chunk boundaries. If a key sentence spans the boundary between chunk 3 and chunk 4, overlap ensures it appears in at least one chunk's context.

This pattern has a limitation: the reduce step sees summaries of summaries. Information that was in the original but not captured in any chunk summary is permanently lost. For documents where every detail matters, you need a different approach — like RAG, which retrieves specific relevant chunks rather than summarising everything.

Map-reduce is best for: executive summaries, meeting notes, long articles, documentation overviews. It's not suitable for: legal contracts (where specific clauses matter), technical specifications (where details are critical), or any use case where precision outweighs brevity.

---

## Demo Walkthrough

Open the **Summarisation** tab. It accepts any text and shows each chunk summary alongside the final combined summary.

1. Paste a long article — at least 1000 words. Watch the chunk summaries appear in parallel as each Map call completes.

2. Set a **focus instruction**: *"Focus on technical implementation details."* Run again. The same document, different emphasis. The focus instruction is passed to both the Map and Reduce prompts.

3. Try a very short text — one paragraph. It produces a single chunk, so Map and Reduce are the same call. The overhead is unnecessary for short texts.

4. Try a document with a key fact buried in the middle. Does it appear in the final summary? Does it appear in the chunk summary for that section? This reveals what the model considers important.

---

## Code Deep-Dive

The Map phase runs all chunk summaries in parallel:

```python
# Split into overlapping chunks
words = text.split()
chunk_size, overlap = 500, 50
step = chunk_size - overlap
chunks = [" ".join(words[i:i+chunk_size]) for i in range(0, len(words), step)]

# Map: summarise every chunk in parallel
async def summarise_chunk(i, chunk):
    completion = await client.chat.completions.create(
        model=INFERENCE_MODEL,
        messages=[{
            "role": "system",
            "content": f"Summarise this section concisely.{focus_instruction}",
        }, {"role": "user", "content": chunk}],
        max_tokens=200,
    )
    return {"index": i, "summary": completion.choices[0].message.content}

chunk_summaries = await asyncio.gather(
    *[summarise_chunk(i, c) for i, c in enumerate(chunks)]
)
```

`asyncio.gather` runs all Map calls concurrently. For a 10-chunk document, the Map phase takes roughly the time of one LLM call, not ten.

The Reduce phase combines the summaries:

```python
combined = "\n\n".join(
    f"[Section {s['index']+1}]\n{s['summary']}"
    for s in sorted(chunk_summaries, key=lambda x: x["index"])
)

final = await client.chat.completions.create(
    model=INFERENCE_MODEL,
    messages=[{
        "role": "system",
        "content": f"Combine these section summaries into a coherent final summary.{focus_instruction}",
    }, {"role": "user", "content": combined}],
    max_tokens=500,
)
```

The Reduce prompt sees only the chunk summaries — typically 200 words × N chunks — not the original document. This keeps the Reduce call's input bounded regardless of document length.

---

## Key Takeaways

- Map-reduce summarisation scales to any document length by splitting, summarising in parallel, then combining.
- The Map phase runs all chunk summaries concurrently — total time is roughly one LLM call, not N.
- Overlap between chunks prevents information loss at boundaries.
- The Reduce step sees summaries of summaries — fine-grained details may be lost.
- Use map-reduce for overviews and executive summaries; use RAG for precise retrieval of specific information.

---

## What's Next

You've completed the Pipeline module. You have streaming, caching, memory, structured output, and summarisation. Now we go deeper: the RAG module. We'll start from the very foundation — what embeddings are and how they turn text into searchable vectors.
