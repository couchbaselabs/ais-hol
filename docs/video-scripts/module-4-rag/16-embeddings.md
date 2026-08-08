# Embeddings

**Module:** Retrieval-Augmented Generation | **Level:** Intermediate
**Runtime:** ~7 min | **Tab:** `embeddings`

---

## Hook

> 🎬 **SHOW:** Embeddings tab open, phrase input fields empty, similarity matrix and scatter plot areas blank.

How does a search engine know that *"automobile"* and *"car"* mean the same thing, even though they share no letters? How does a RAG system find the right documentation chunk even when the user's question uses completely different words than the document? The answer is embeddings — and understanding them is the prerequisite for everything else in this module.

---

## Concept

> 🎬 **SHOW:** Slide — a 3D vector space with several labelled points: "king", "queen", "man", "woman". King and queen are close together, man and woman are close together, and the four form a rough parallelogram.

An **embedding** is a high-dimensional vector — a list of floating-point numbers — that encodes the semantic meaning of a piece of text. The embedding model is trained so that texts with similar meanings produce vectors that point in similar directions.

Similarity is measured by **cosine similarity**: the cosine of the angle between two vectors. A score of 1.0 means identical direction. A score of 0 means perpendicular — unrelated.

> 🎬 **SHOW:** Slide — formula: `cosine(a, b) = dot(a,b) / (|a| × |b|)`. Below it: "king − man + woman ≈ queen".

The classic demonstration: embed "king", "queen", "man", "woman". The famous analogy holds approximately: king minus man plus woman equals queen.

> 🎬 **SHOW:** Slide — RAG flow: user question → embed → ANN search → retrieve matching chunks. Highlight the embedding step.

Why does this matter for RAG? When a user asks *"How does the CSS box model work?"*, you embed that question and search for document chunks whose embeddings are close. You're not matching keywords — you're matching meaning.

---

## Demo Walkthrough

> 🎬 **SHOW:** Embeddings tab, phrase input fields ready.

1. Enter the classic analogy: *king, queen, man, woman*. Click **Embed**.

   > 🎬 **SHOW:** Type all four phrases, click Embed. Watch the similarity matrix populate — point to the king/queen cell (high similarity, green), the man/woman cell (high similarity), and the king/man cell (moderate). Then point to the 2D scatter plot showing the four points forming a parallelogram.

   King/queen should be highly similar. Man/woman should be highly similar. The 2D scatter plot should show them clustered by gender and royalty.

2. Try synonyms and antonyms: *happy, joyful, sad, miserable*.

   > 🎬 **SHOW:** Clear and enter the four words. Point to the matrix — happy/joyful cluster together (green), sad/miserable cluster together (green), but happy/sad are far apart (red). The scatter plot shows two distinct clusters.

   Happy and joyful cluster together. Sad and miserable cluster together. The two clusters are far apart.

3. Try: *"The dog ran fast"* and *"The canine moved quickly"*.

   > 🎬 **SHOW:** Enter both phrases. Point to the high similarity score despite sharing no words.

   High similarity despite sharing no words — this is semantic search in action.

4. Try: *"bank"* (financial) and *"river bank"*.

   > 🎬 **SHOW:** Enter both. Point to the moderate similarity — the embedding captures the dominant meaning but the ambiguity shows up as a lower score than true synonyms.

   Moderate similarity — the embedding captures the dominant meaning but the ambiguity shows up.

---

## Code Deep-Dive

> 🎬 **SHOW:** Open `backend/main.py`, scrolled to the embeddings endpoint. Highlight the `get_embedding` function call and `asyncio.gather`.

Embedding a phrase is a single API call:

```python
async def get_embedding(text: str) -> list[float]:
    response = await client.embeddings.create(
        model=EMBEDDING_MODEL,   # e.g. "text-embedding-3-small"
        input=text,
    )
    return response.data[0].embedding  # list of ~1536 floats
```

> 🎬 **SHOW:** Scroll to the cosine similarity function. Highlight the dot product and magnitude calculation.

Cosine similarity between two vectors:

```python
async def cosine(a, b):
    dot = sum(x * y for x, y in zip(a, b))
    na  = math.sqrt(sum(x*x for x in a))
    nb  = math.sqrt(sum(x*x for x in b))
    return dot / (na * nb)
```

> 🎬 **SHOW:** Scroll to the PCA function. Briefly show it — don't go deep, just note it's pure Python with no numpy.

The 2D scatter plot uses PCA to project the high-dimensional vectors down to 2 dimensions for visualisation. The backend implements PCA from scratch using power iteration — no numpy dependency. PCA is a linear projection — it preserves the most variance but loses non-linear structure. The 2D plot is a useful intuition-builder, not a precise representation of the full 1536-dimensional space.

---

## Key Takeaways

> 🎬 **SHOW:** Return to the tab with the king/queen/man/woman scatter plot visible — the parallelogram shape clearly showing the analogy relationship.

- An embedding is a high-dimensional vector encoding semantic meaning. Similar meanings → similar vectors.
- Cosine similarity measures the angle between vectors: 1.0 = identical direction, 0 = unrelated.
- Embeddings enable semantic search: find relevant content by meaning, not keyword matching.
- The embedding model is separate from the LLM — choose it based on retrieval quality requirements.
- PCA projects high-dimensional embeddings to 2D for visualisation, but the real space has 1536+ dimensions.

---

## What's Next

> 🎬 **SHOW:** Click "Chunking" in the sidebar.

You understand what embeddings are. Now the question is: what do you embed? A 50-page document can't be embedded as a single vector — the meaning would be too diluted. You need to split it into chunks first. The next tab covers chunking strategies and their tradeoffs.
