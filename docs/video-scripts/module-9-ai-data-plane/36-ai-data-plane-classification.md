# Couchbase AI Data Plane Classification

**Module:** Couchbase AI Data Plane | **Level:** Advanced
**Runtime:** ~6 min | **Tab:** `ai-data-plane-classification`

---

## Hook

> 🎬 **SHOW:** Couchbase AI Data Plane Classification tab open, text input visible, optional categories field, result panel empty.

Classifying documents into categories is a common data enrichment task — tagging support tickets, routing emails, labelling product reviews. With `ai_classification()`, you write one SQL++ query and the classification runs inside the database engine. No application loop, no separate ML pipeline, no ETL job.

---

## Concept

> 🎬 **SHOW:** Slide — the SQL++ function call: `default:ai_classification({"text": $text, "categories": ["billing", "technical", "general"]})`. Below it, the result: `{"label": "billing", "score": 0.91}`.

`ai_classification()` takes a text and an optional list of candidate categories. It returns the best-matching label and a confidence score. If you omit the categories, the model uses its own judgement.

> 🎬 **SHOW:** Slide — bulk classification SQL: `SELECT t.id, default:ai_classification({"text": t.body, "categories": $cats}) AS category FROM tickets AS t WHERE t.category IS MISSING LIMIT 100`.

The bulk pattern classifies unprocessed documents in a single query. Combine with `WHERE ... IS MISSING` to process only new documents incrementally.

> 🎬 **SHOW:** Slide — UPDATE pattern to write the label back to each document.

```sql
UPDATE `bucket`.`_default`.tickets AS t
SET t.category = default:ai_classification({"text": t.body, "categories": $cats}).label,
    t.classified_at = NOW_STR()
WHERE t.category IS MISSING
LIMIT 100
```

---

## Demo Walkthrough

> 🎬 **SHOW:** Couchbase AI Data Plane Classification tab, categories field pre-filled with "billing, technical, general, feedback".

1. Enter a support ticket: *"My invoice shows a charge I don't recognise from last month."* Submit.

   > 🎬 **SHOW:** Result shows label: "billing", score near 0.9. Point to the confidence score.

   Clear billing language → high-confidence billing classification.

2. Enter: *"The app crashes every time I try to upload a file larger than 10MB."* Submit.

   > 🎬 **SHOW:** Result shows label: "technical", high score.

3. Enter: *"I love the new dashboard design, it's much easier to navigate."* Submit.

   > 🎬 **SHOW:** Result shows label: "feedback", high score.

4. Clear the categories field and enter: *"Can you add dark mode to the mobile app?"* Submit.

   > 🎬 **SHOW:** Without explicit categories, the model returns its own label — likely "feature request" or similar. Point out the difference.

   Without explicit categories, the model uses its own taxonomy. Explicit categories give you control over the label space.

---

## Code Deep-Dive

> 🎬 **SHOW:** `backend/main.py`, scrolled to `/api/ai-data-plane-classification`. Highlight the SQL++ query.

```python
categories_param = body.categories or []
sql = """
    SELECT default:ai_classification({
        "text":       $text,
        "categories": $categories
    }) AS result
"""
rows = list(
    cluster.query(
        sql,
        QueryOptions(named_parameters={
            "text":       body.text,
            "categories": categories_param,
        }),
    ).rows()
)
result = rows[0]["result"][0]
return {
    "label":  result.get("label", "unknown"),
    "score":  result.get("score", 0.0),
    "source": "ai_data_plane_ai_classification",
}
```

> 🎬 **SHOW:** Highlight that there is no `client.chat.completions.create` — the LLM call is inside the database.

The classification runs inside Couchbase. Your application code issues a SQL++ query and receives a structured result — no LLM SDK call in the application layer.

---

## Key Takeaways

> 🎬 **SHOW:** Result panel showing label and confidence score.

- `ai_classification()` classifies text into categories as a SQL++ built-in — no application-layer LLM call.
- Providing explicit categories constrains the label space and improves consistency.
- Bulk classification over entire collections is a single SQL++ query with `WHERE ... IS MISSING`.
- Combine with UPDATE to write labels back to documents at query time — no ETL pipeline needed.
- Requires the Classification AI Function enabled on the cluster and `query_external_access` role.

---

## What's Next

> 🎬 **SHOW:** Sidebar — highlight the next tab `ai-data-plane-extraction`.

Next: Couchbase AI Data Plane Extraction — pulling structured entities from unstructured text using `ai_extraction()`.
