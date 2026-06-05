# Capella AI Extraction

**Module:** Capella AI Functions | **Level:** Advanced
**Runtime:** ~6 min | **Tab:** `capella-extraction`

---

## Hook

> 🎬 **SHOW:** Capella AI Extraction tab open, text input visible, entity types field, result panel showing extracted entities area.

Extracting structured data from unstructured text — names, dates, amounts, addresses, product codes — is one of the most common data engineering tasks. `ai_extraction()` does this inside the database engine. You define the entity types you want, and the function returns a structured object for each document, ready to be stored or queried.

---

## Concept

> 🎬 **SHOW:** Slide — the SQL++ function call: `default:ai_extraction({"text": $text, "entities": ["person", "date", "amount"]})`. Below it, the result: `{"person": ["Alice Smith"], "date": ["2024-03-15"], "amount": ["$1,250"]}`.

`ai_extraction()` takes a text and a list of entity types to extract. It returns a JSON object where each key is an entity type and the value is an array of extracted instances.

> 🎬 **SHOW:** Slide — bulk extraction SQL: `SELECT d.id, default:ai_extraction({"text": d.body, "entities": ["person", "company", "date"]}) AS entities FROM documents AS d WHERE d.entities IS MISSING LIMIT 50`.

The bulk pattern extracts entities from all unprocessed documents in one query. The extracted entities can then be stored back into each document for indexing and querying.

---

## Demo Walkthrough

> 🎬 **SHOW:** Capella AI Extraction tab, entity types pre-filled with "person, company, date, amount".

1. Enter a contract excerpt: *"This agreement is entered into on March 15, 2024, between Acme Corp and Jane Smith. The total contract value is $50,000."* Submit.

   > 🎬 **SHOW:** Result shows extracted entities: person: ["Jane Smith"], company: ["Acme Corp"], date: ["March 15, 2024"], amount: ["$50,000"].

   All four entity types extracted correctly from a single sentence.

2. Enter a news article snippet: *"Apple CEO Tim Cook announced on Tuesday that the company will invest $1 billion in a new data centre in Ireland."*

   > 🎬 **SHOW:** Result: person: ["Tim Cook"], company: ["Apple"], date: ["Tuesday"], amount: ["$1 billion"], location: ["Ireland"] (if location is in the entity list).

3. Try text with no matching entities: *"The quick brown fox jumps over the lazy dog."*

   > 🎬 **SHOW:** Result shows empty arrays for all entity types. Point out the graceful empty result.

   No entities found → empty arrays, not an error. Your application code handles this cleanly.

4. Add "email" and "phone" to the entity types. Enter: *"Contact support at help@example.com or call +1-800-555-0100."*

   > 🎬 **SHOW:** email and phone entities extracted correctly.

---

## Code Deep-Dive

> 🎬 **SHOW:** `backend/main.py`, scrolled to `/api/capella-extraction`. Highlight the SQL++ query.

```python
sql = """
    SELECT default:ai_extraction({
        "text":     $text,
        "entities": $entities
    }) AS result
"""
rows = list(
    cluster.query(
        sql,
        QueryOptions(named_parameters={
            "text":     body.text,
            "entities": body.entities,
        }),
    ).rows()
)
result = rows[0]["result"][0]
return {"entities": result, "source": "capella_ai_extraction"}
```

> 🎬 **SHOW:** Slide — the bulk UPDATE pattern to write extracted entities back to documents.

```sql
UPDATE `bucket`.`_default`.contracts AS c
SET c.extracted = default:ai_extraction({
        "text":     c.body,
        "entities": ["person", "company", "date", "amount"]
    }),
    c.extracted_at = NOW_STR()
WHERE c.extracted IS MISSING
LIMIT 50
```

> 🎬 **SHOW:** Highlight that once entities are stored in the document, they become queryable with standard SQL++ — `WHERE c.extracted.company = "Acme Corp"`.

After extraction, the entities are first-class document fields. You can index them, query them, and join on them — turning unstructured text into structured, queryable data.

---

## Key Takeaways

> 🎬 **SHOW:** Result panel showing extracted entity arrays.

- `ai_extraction()` pulls named entities from text as a SQL++ built-in — define the entity types you need.
- Results are JSON objects with entity type keys and array values — directly storable and queryable.
- Bulk extraction over a collection is a single SQL++ query; combine with UPDATE to enrich documents in place.
- Extracted entities become queryable fields — enabling structured queries over previously unstructured data.
- Requires the Extraction AI Function enabled on the cluster and `query_external_access` role.

---

## What's Next

> 🎬 **SHOW:** Sidebar — highlight the next tab `capella-translation`.

Next: Capella AI Translation — translating document content into other languages using `ai_translation()`.
