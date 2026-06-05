# Metadata Filtering

**Module:** Retrieval-Augmented Generation | **Level:** Intermediate
**Runtime:** ~6 min | **Tab:** `metadata-filtering`

---

## Hook

> 🎬 **SHOW:** Metadata Filtering tab open, query input visible, filter controls (category dropdown, date range, min-score slider) below it, empty results area.

You've built a RAG pipeline that retrieves the top-k most similar documents. But what happens when your corpus spans multiple categories, languages, or time periods? A user asking about JavaScript shouldn't get CSS results — even if the CSS document has a slightly higher vector similarity score. Metadata filtering solves this by combining a SQL++ `WHERE` clause with vector search so only documents matching your criteria are even considered as candidates.

---

## Concept

> 🎬 **SHOW:** Slide — SQL++ query with both `WHERE` clause and `ORDER BY ANN_DISTANCE(...)`. Highlight the `WHERE` conditions in one colour and the `ANN_DISTANCE` in another.

Standard vector search ranks all documents by similarity and returns the top-k. Metadata filtering adds a `WHERE` clause that eliminates non-matching documents *before* the similarity ranking runs — this is pre-filtering, not post-filtering.

> 🎬 **SHOW:** Slide — two diagrams side by side: "Post-filter" (search all → rank → filter → fewer results) vs "Pre-filter" (filter first → search subset → rank). Label the pre-filter path "fewer candidates, faster, more precise".

Pre-filtering is more efficient and more precise. Post-filtering can silently reduce your result count — you ask for 5 results but only 2 survive the filter. Pre-filtering guarantees the result set is drawn entirely from matching documents.

> 🎬 **SHOW:** Slide — the dynamic filter builder in Python: building a `WHERE` clause string from optional request parameters.

The backend builds the `WHERE` clause dynamically from whichever filters the request includes — category, date range, minimum score. Filters not provided are simply omitted.

---

## Demo Walkthrough

> 🎬 **SHOW:** Metadata Filtering tab, all filter controls at defaults (no filters active).

1. Enter a query: *"How do arrays work?"* — leave all filters at defaults. Submit.

   > 🎬 **SHOW:** Results appear — multiple categories visible (JavaScript, CSS, HTML). Point out the mix.

   Without filters, results come from across the entire corpus.

2. Set the category filter to **JavaScript**. Submit the same query.

   > 🎬 **SHOW:** Results now show only JavaScript documents. Point to the filter summary badge showing "category: javascript".

   Only JavaScript documents are candidates now. The similarity scores may shift slightly because the pool changed.

3. Add a date range — set `date_from` to a recent year. Submit.

   > 🎬 **SHOW:** Results narrow further. Point to the filter summary showing both active filters.

   Stacking filters narrows the candidate pool further. Useful for "only show me content updated in the last year".

4. Raise the minimum score slider to 0.85. Submit.

   > 🎬 **SHOW:** Fewer results, all with scores above the threshold. Point to the score badges.

   The minimum score filter removes low-confidence matches — useful when you'd rather return nothing than return a poor match.

---

## Code Deep-Dive

> 🎬 **SHOW:** `backend/main.py`, scrolled to the `/api/metadata-filter-search` endpoint. Highlight the dynamic WHERE clause construction.

The filter is built as a list of conditions joined with `AND`:

```python
conditions = ["1=1"]
params = {"query_embedding": embedding, "k": body.k}

if body.filters.category:
    conditions.append("meta.category = $category")
    params["category"] = body.filters.category

if body.filters.date_from:
    conditions.append("meta.updated >= $date_from")
    params["date_from"] = body.filters.date_from

where_clause = " AND ".join(conditions)

sql = f"""
    SELECT meta().id, content, meta,
           ANN_DISTANCE(embedding, $query_embedding) AS score
    FROM `{BUCKET}`.`_default`.`{COLLECTION}`
    WHERE {where_clause}
    ORDER BY ANN_DISTANCE(embedding, $query_embedding)
    LIMIT $k
"""
```

> 🎬 **SHOW:** Highlight `WHERE {where_clause}` — the dynamic injection. Then point to `ORDER BY ANN_DISTANCE(...)` — the vector ranking that follows.

The `WHERE` clause runs first, reducing the candidate set. `ANN_DISTANCE` then ranks only the surviving documents.

> 🎬 **SHOW:** Slide — the trade-off: "Very narrow filters → very small candidate pool → ANN index may not be used efficiently. Balance filter selectivity with result quality."

One trade-off to be aware of: extremely narrow filters can reduce the candidate pool so much that the ANN index loses its efficiency advantage. For very selective filters, a hybrid approach — filtering on a partitioned index — may perform better.

---

## Key Takeaways

> 🎬 **SHOW:** Results panel showing filtered results with the filter summary badge visible.

- Pre-filtering with `WHERE` ensures all returned results satisfy your criteria — post-filtering can silently under-deliver.
- Build the `WHERE` clause dynamically so unused filters add no overhead.
- Stacking filters (category + date + score) is additive — each narrows the candidate pool further.
- Very selective filters can reduce ANN efficiency; monitor result counts and adjust `LIMIT` accordingly.
- Metadata filtering is essential for multi-tenant RAG, time-sensitive corpora, and domain-scoped retrieval.

---

## What's Next

> 🎬 **SHOW:** Sidebar — highlight the next tab `multi-vector`.

Next: Multi-Vector Search — combining dense embeddings, sparse keyword signals, and hybrid retrieval in a single query.
