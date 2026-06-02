# Embeddings

**Module:** Retrieval-Augmented Generation | **Level:** Intermediate
**Runtime:** ~7 min | **Tab:** `embeddings`

---

## Hook

How does a search engine know that *"automobile"* and *"car"* mean the same thing, even though they share no letters? How does a RAG system find the right documentation chunk even when the user's question uses completely different words than the document? The answer is embeddings — and understanding them is the prerequisite for everything else in this module.

---

## Concept

An **embedding** is a high-dimensional vector — a list of floating-point numbers — that encodes the semantic meaning of a piece of text. The embedding model is trained so that texts with similar meanings produce vectors that point in similar directions in that high-dimensional space.

Similarity is measured by **cosine similarity**: the cosine of the angle between two vectors. A score of 1.0 means identical direction (same meaning). A score of 0 means perpendicular (unrelated). A score of -1 means opposite directions (antonyms, in theory — though in practice most text embeddings stay positive).

The classic demonstration: embed "king", "queen", "man", "woman". The vectors for "king" and "queen" are close. The vectors for "man" and "woman" are close. And the famous analogy holds approximately: `king - man + woman ≈ queen`.

Why does this matter for RAG?

When a user asks *"How does the CSS box model work?"*, you embed that question and search for document chunks whose embeddings are close to the question's embedding. You're not matching keywords — you're matching meaning. A chunk that says *"The box model defines how elements are sized and spaced"* will score high even though it doesn't contain the words "how does" or "work".

The embedding model is separate from the LLM. Common choices: `text-embedding-3-small` (OpenAI, fast and cheap), `text-embedding-3-large` (higher quality), or open-source models like `nomic-embed-text`. The choice affects retrieval quality — a better embedding model means better RAG.

---

## Demo Walkthrough

Open the **Embeddings** tab. Enter up to 8 phrases and see the similarity matrix and 2D projection.

1. Enter the classic analogy: *king, queen, man, woman*. Look at the similarity matrix — king/queen should be highly similar, man/woman should be highly similar, and king/man should be moderately similar. The 2D scatter plot should show them clustered by gender and royalty.

2. Try synonyms and antonyms: *happy, joyful, sad, miserable*. Happy and joyful should cluster together. Sad and miserable should cluster together. The two clusters should be far apart.

3. Try programming languages: *Python, JavaScript, Rust, SQL*. Python and JavaScript should be closer (both general-purpose) than either is to SQL (query language).

4. Try: *"The dog ran fast"* and *"The canine moved quickly"*. High similarity despite sharing no words.

5. Try: *"bank"* (financial institution) and *"river bank"*. Moderate similarity — the embedding captures the dominant meaning but the ambiguity shows up as a lower score than true synonyms.

---

## Code Deep-Dive

Embedding a phrase is a single API call:

```python
async def get_embedding(text: str) -> list[float]:
    response = await client.embeddings.create(
        model=EMBEDDING_MODEL,   # e.g. "text-embedding-3-small"
        input=text,
    )
    return response.data[0].embedding  # list of ~1536 floats
```

Cosine similarity between two vectors:

```python
import math

async def cosine(a, b):
    dot = sum(x * y for x, y in zip(a, b))
    na  = math.sqrt(sum(x*x for x in a))
    nb  = math.sqrt(sum(x*x for x in b))
    return dot / (na * nb)

# Embed two phrases in parallel
emb_a, emb_b = await asyncio.gather(
    get_embedding("king"),
    get_embedding("queen"),
)
similarity = await cosine(emb_a, emb_b)
# → ~0.85  (semantically close)
```

The 2D scatter plot uses PCA — Principal Component Analysis — to project the high-dimensional vectors down to 2 dimensions for visualisation. The backend implements PCA from scratch using power iteration (no numpy dependency):

```python
def pca_2d(vecs):
    # Centre the vectors
    mean = [sum(v[i] for v in vecs)/len(vecs) for i in range(len(vecs[0]))]
    centred = [[v[i]-mean[i] for i in range(len(v))] for v in vecs]
    # Find 2 principal components via power iteration
    # ... (see InfoPanel for full implementation)
    return 2d_coordinates
```

PCA is a linear projection — it preserves the most variance but loses non-linear structure. The 2D plot is a useful intuition-builder, not a precise representation of the full embedding space.

---

## Key Takeaways

- An embedding is a high-dimensional vector encoding semantic meaning. Similar meanings → similar vectors.
- Cosine similarity measures the angle between vectors: 1.0 = identical direction, 0 = unrelated.
- Embeddings enable semantic search: find relevant content by meaning, not keyword matching.
- The embedding model is separate from the LLM — choose it based on retrieval quality requirements.
- PCA projects high-dimensional embeddings to 2D for visualisation, but the real space has 1536+ dimensions.

---

## What's Next

You understand what embeddings are. Now the question is: what do you embed? A 50-page document can't be embedded as a single vector — the meaning would be too diluted. You need to split it into chunks first. The next tab covers chunking strategies and their tradeoffs.
