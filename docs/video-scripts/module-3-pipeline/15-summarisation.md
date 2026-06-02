# Summarisation

**Module:** Building a Pipeline | **Level:** Intermediate
**Runtime:** ~6 min | **Tab:** `summarise`

---

## Hook

> 🎬 **SHOW:** Summarisation tab open, large text input area visible, chunk summary cards area empty below it.

A 100-page document won't fit in a 128k-token context window. Even if it did, sending 100 pages on every query is expensive and slow. Map-reduce summarisation is the classic solution: split the document into chunks, summarise each chunk independently in parallel, then combine all the chunk summaries into a final summary. It scales to any document length.

---

## Concept

> 🎬 **SHOW:** Slide — two-phase diagram. "Map" phase: one document splits into 5 chunks, 5 parallel arrows go to 5 LLM calls, 5 short summaries come out. "Reduce" phase: 5 summaries feed into one LLM call, one final summary comes out.

**Map-reduce summarisation** has two phases:

**Map**: Split the document into overlapping chunks. Summarise each chunk independently with a parallel LLM call. Each chunk summary is short — 100-200 words — regardless of the chunk's original length.

**Reduce**: Combine all chunk summaries into a single final summary. The reduce prompt sees only the chunk summaries, not the original text.

> 🎬 **SHOW:** Slide — highlight "overlap" between chunks with a visual showing two adjacent chunks sharing a shaded region.

The overlap between chunks is important: it prevents information loss at chunk boundaries. If a key sentence spans the boundary between chunk 3 and chunk 4, overlap ensures it appears in at least one chunk's context.

> 🎬 **SHOW:** Slide — "Use map-reduce for: executive summaries, meeting notes, long articles. Not for: legal contracts, technical specs where every detail matters."

Map-reduce is best for overviews and executive summaries. It's not suitable for use cases where fine-grained details are critical — for those, use RAG to retrieve specific relevant chunks.

---

## Demo Walkthrough

> 🎬 **SHOW:** Summarisation tab, sample document pre-loaded in the text area (or paste a long article).

1. Paste a long article — at least 1000 words. Click **Summarise**.

   > 🎬 **SHOW:** Click Summarise. Watch the chunk summary cards appear in parallel as each Map call completes — they don't appear in order, they appear as each finishes. Then the final summary appears at the top.

   Watch the chunk summaries appear in parallel as each Map call completes. Then the final summary appears.

2. Set a **focus instruction**: *"Focus on technical implementation details."* Run again.

   > 🎬 **SHOW:** Type the focus instruction in the field, click Summarise again. Compare the new final summary to the previous one — the emphasis should shift.

   The same document, different emphasis. The focus instruction is passed to both the Map and Reduce prompts.

3. Try a very short text — one paragraph.

   > 🎬 **SHOW:** Clear the text area, paste a single paragraph. Point to only one chunk card appearing — Map and Reduce are effectively the same call.

   It produces a single chunk — the overhead of map-reduce is unnecessary for short texts.

4. Try a document with a key fact buried in the middle.

   > 🎬 **SHOW:** Paste a document where an important fact appears in the middle section. After summarisation, check whether that fact appears in the final summary. Point to the relevant chunk card.

   Does the key fact appear in the final summary? This reveals what the model considers important.

---

## Code Deep-Dive

> 🎬 **SHOW:** Open `backend/main.py`, scrolled to the summarisation endpoint. Highlight `asyncio.gather` in the Map phase.

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

> 🎬 **SHOW:** Highlight `asyncio.gather` — explain that for a 10-chunk document, this takes roughly the time of one LLM call, not ten.

`asyncio.gather` runs all Map calls concurrently. For a 10-chunk document, the Map phase takes roughly the time of one LLM call, not ten.

> 🎬 **SHOW:** Scroll to the Reduce phase. Highlight that it only sees the chunk summaries, not the original text.

The Reduce phase combines the summaries — it sees only the chunk summaries, keeping the input bounded regardless of document length.

---

## Key Takeaways

> 🎬 **SHOW:** Return to the tab with chunk summary cards visible and the final summary at the top.

- Map-reduce summarisation scales to any document length by splitting, summarising in parallel, then combining.
- The Map phase runs all chunk summaries concurrently — total time is roughly one LLM call, not N.
- Overlap between chunks prevents information loss at boundaries.
- The Reduce step sees summaries of summaries — fine-grained details may be lost.
- Use map-reduce for overviews and executive summaries; use RAG for precise retrieval of specific information.

---

## What's Next

> 🎬 **SHOW:** Click "Embeddings" in the sidebar — the first tab of Module 4.

You've completed the Pipeline module. You have streaming, caching, memory, structured output, and summarisation. Now we go deeper: the RAG module. We'll start from the very foundation — what embeddings are and how they turn text into searchable vectors.
