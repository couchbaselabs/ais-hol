# Couchbase AI Data Plane Masking

**Module:** Couchbase AI Data Plane | **Level:** Advanced
**Runtime:** ~6 min | **Tab:** `ai-data-plane-masking`

---

## Hook

> 🎬 **SHOW:** Couchbase AI Data Plane Masking tab open, text input visible, mask types selector, masked output panel empty.

GDPR, HIPAA, PCI-DSS — compliance regulations require that personally identifiable information is not stored or processed in plain text in certain contexts. `ai_masked()` redacts PII from text inside the database engine. You can create a masked copy of a document for analytics, logging, or sharing — without exposing the original sensitive data.

---

## Concept

> 🎬 **SHOW:** Slide — input: "John Smith's credit card 4111-1111-1111-1111 expires 12/26." Output: "[PERSON]'s credit card [CREDIT_CARD] expires [DATE]."

`ai_masked()` replaces detected PII with type-labelled placeholders. The structure of the text is preserved — only the sensitive values are replaced. This makes the masked output useful for analytics and logging while remaining compliant.

> 🎬 **SHOW:** Slide — the SQL++ function call: `default:ai_masked({"text": $text, "mask_types": ["person", "email", "phone", "credit_card"]})`.

You specify which PII types to mask. Types not in the list are left unchanged — useful when you want to mask names but preserve dates, for example.

> 🎬 **SHOW:** Slide — the compliance use case: original document stored encrypted; masked copy stored in analytics database for querying without PII exposure.

A common pattern: store the original document with encryption at rest, and store a masked copy in your analytics or logging system. The masked copy can be queried freely without PII exposure risk.

---

## Demo Walkthrough

> 🎬 **SHOW:** Couchbase AI Data Plane Masking tab, mask types: person, email, phone, credit_card, ssn.

1. Enter: *"Please contact John Smith at john.smith@example.com or call 555-867-5309 to discuss his account."* Submit.

   > 🎬 **SHOW:** Masked output: "Please contact [PERSON] at [EMAIL] or call [PHONE] to discuss his account." Point to each replaced value.

   Name, email, and phone all masked. The sentence structure is intact.

2. Enter a medical note: *"Patient Jane Doe, DOB 1985-03-22, SSN 123-45-6789, presented with chest pain."*

   > 🎬 **SHOW:** Masked: "Patient [PERSON], DOB [DATE], SSN [SSN], presented with chest pain." Point to the SSN masking.

   Medical records contain multiple PII types. All are masked in one call.

3. Remove "person" from the mask types. Same text. Submit.

   > 🎬 **SHOW:** "Patient Jane Doe, DOB [DATE], SSN [SSN], presented with chest pain." — name preserved, other PII masked.

   Selective masking: you control which types are redacted. Useful when names are needed for routing but other PII must be hidden.

4. Enter text with no PII: *"The quarterly revenue increased by 12% compared to last year."*

   > 🎬 **SHOW:** Output is identical to input — no masking applied. Point out the clean pass-through.

   No PII detected → text returned unchanged. The function is safe to run on all documents regardless of content.

---

## Code Deep-Dive

> 🎬 **SHOW:** `backend/main.py`, scrolled to `/api/ai-data-plane-masking`. Highlight the SQL++ query.

```python
sql = """
    SELECT default:ai_masked({
        "text":       $text,
        "mask_types": $mask_types
    }) AS result
"""
rows = list(
    cluster.query(
        sql,
        QueryOptions(named_parameters={
            "text":       body.text,
            "mask_types": body.mask_types,
        }),
    ).rows()
)
result = rows[0]["result"][0]
return {
    "masked_text":   result.get("masked_text", body.text),
    "entities_found": result.get("entities_found", []),
    "source":        "ai_data_plane_ai_masked",
}
```

> 🎬 **SHOW:** Slide — the compliance pipeline: ingest raw document → store encrypted original → run ai_masked() → store masked copy in analytics collection.

```sql
-- Create masked copies for analytics
INSERT INTO `bucket`.`_default`.analytics_logs (KEY UUID(), VALUE {
    "original_id": l.id,
    "masked_text": default:ai_masked({
        "text":       l.body,
        "mask_types": ["person", "email", "phone", "ssn", "credit_card"]
    }).masked_text,
    "created_at": NOW_STR()
})
SELECT l FROM `bucket`.`_default`.raw_logs AS l
WHERE l.masked IS MISSING
LIMIT 100
```

> 🎬 **SHOW:** Highlight that the original document is never modified — a new masked copy is inserted into a separate collection.

The original is never touched. The masked copy lives in a separate collection — you can query it freely, share it with analytics teams, or use it for LLM training data without PII exposure.

---

## Key Takeaways

> 🎬 **SHOW:** Masked output with placeholder labels visible.

- `ai_masked()` replaces PII with type-labelled placeholders — text structure is preserved, sensitive values are not.
- Specify which PII types to mask; unspecified types are left unchanged.
- The compliance pattern: store encrypted originals, store masked copies in analytics — query the masked copies freely.
- The function is safe to run on all documents — no PII detected means text is returned unchanged.
- Requires the Masking AI Function enabled on the cluster and `query_external_access` role.

---

## What's Next

> 🎬 **SHOW:** Sidebar — highlight the next tab `ai-data-plane-similarity`.

Next: Couchbase AI Data Plane Similarity — computing semantic similarity between two texts using `ai_similarity()`.
