# Couchbase AI Data Plane Translation

**Module:** Couchbase AI Data Plane | **Level:** Advanced
**Runtime:** ~6 min | **Tab:** `ai-data-plane-translation`

---

## Hook

> 🎬 **SHOW:** Couchbase AI Data Plane Translation tab open, text input visible, target language selector, translated output panel empty.

Localising a product database — translating product descriptions, support articles, or user reviews into multiple languages — traditionally requires an ETL pipeline, a translation service integration, and a data sync job. With `ai_translation()`, you write one SQL++ query. The translation runs inside the database, and you can write the result back to the document in the same operation.

---

## Concept

> 🎬 **SHOW:** Slide — the SQL++ function call: `default:ai_translation({"text": $text, "target_language": "French"})`. Below it, the result: `{"translation": "Bonjour le monde", "source_language": "English"}`.

`ai_translation()` takes a text and a target language. It returns the translated text and the detected source language. You don't need to specify the source language — it's detected automatically.

> 🎬 **SHOW:** Slide — bulk translation SQL: `SELECT p.id, default:ai_translation({"text": p.description, "target_language": "Spanish"}) AS es FROM products AS p WHERE p.description_es IS MISSING LIMIT 100`.

The bulk pattern translates all untranslated documents in one query. The result can be stored as a new field on each document — `description_es`, `description_fr`, etc.

---

## Demo Walkthrough

> 🎬 **SHOW:** Couchbase AI Data Plane Translation tab, target language set to French.

1. Enter: *"The new software update includes performance improvements and bug fixes."* Submit.

   > 🎬 **SHOW:** Translation appears in French. Source language detected as English.

2. Switch target language to **Japanese**. Same text. Submit.

   > 🎬 **SHOW:** Japanese translation appears. Point to the character set change.

3. Enter text already in Spanish: *"El gato está en el tejado."* Target: English. Submit.

   > 🎬 **SHOW:** English translation appears. Source language detected as Spanish.

   Source language detection is automatic — you don't need to know the input language.

4. Enter a technical text with domain-specific terms: *"The API endpoint accepts a JSON payload with a Bearer token in the Authorization header."* Target: German. Submit.

   > 🎬 **SHOW:** German translation appears. Point to technical terms — "API", "JSON", "Bearer token" — which are typically preserved untranslated.

   Technical terms and proper nouns are generally preserved. The model understands domain context.

---

## Code Deep-Dive

> 🎬 **SHOW:** `backend/main.py`, scrolled to `/api/ai-data-plane-translation`. Highlight the SQL++ query.

```python
sql = """
    SELECT default:ai_translation({
        "text":            $text,
        "target_language": $target_language
    }) AS result
"""
rows = list(
    cluster.query(
        sql,
        QueryOptions(named_parameters={
            "text":            body.text,
            "target_language": body.target_language,
        }),
    ).rows()
)
result = rows[0]["result"][0]
return {
    "translation":     result.get("translation", ""),
    "source_language": result.get("source_language", "unknown"),
    "source":          "ai_data_plane_ai_translation",
}
```

> 🎬 **SHOW:** Slide — the multi-language bulk pattern: translating into multiple languages in a single query using multiple function calls.

```sql
UPDATE `bucket`.`_default`.products AS p
SET p.description_fr = default:ai_translation({
        "text": p.description, "target_language": "French"
    }).translation,
    p.description_de = default:ai_translation({
        "text": p.description, "target_language": "German"
    }).translation,
    p.translated_at = NOW_STR()
WHERE p.description_fr IS MISSING
LIMIT 50
```

> 🎬 **SHOW:** Highlight that multiple `ai_translation()` calls in one UPDATE statement translate into multiple languages in a single query execution.

One UPDATE statement, multiple target languages. Each document gets all translations in a single pass — no need to run separate queries per language.

---

## Key Takeaways

> 🎬 **SHOW:** Translation result with source language detection visible.

- `ai_translation()` translates text and detects the source language automatically — no need to specify the input language.
- Bulk translation over a collection is a single SQL++ query; combine with UPDATE to store translations as new document fields.
- Multiple target languages can be handled in one UPDATE statement — one pass per document, all translations written simultaneously.
- Technical terms and proper nouns are generally preserved untranslated.
- Requires the Translation AI Function enabled on the cluster and `query_external_access` role.

---

## What's Next

> 🎬 **SHOW:** Sidebar — highlight the next tab `ai-data-plane-masking`.

Next: Couchbase AI Data Plane Masking — redacting PII from documents using `ai_masked()` for compliance and privacy.
