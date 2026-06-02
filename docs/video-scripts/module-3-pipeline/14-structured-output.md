# Structured Output

**Module:** Building a Pipeline | **Level:** Intermediate
**Runtime:** ~6 min | **Tab:** `structured`

---

## Hook

Free-form text is great for humans. It's terrible for code. If your application needs to extract entities from text, classify sentiment, or parse any structured data from an LLM response, you've probably written fragile string parsing that breaks the moment the model changes its phrasing. Structured output eliminates that entirely — the model returns valid JSON, every time.

---

## Concept

The OpenAI API's `response_format: {"type": "json_object"}` mode constrains the model to return valid JSON. Combined with a schema description in the system prompt, you get predictable, parseable output that downstream code can use directly.

This matters because:
- **Reliability**: no more `json.loads()` wrapped in try/except because the model occasionally adds a preamble.
- **Consistency**: the same fields, the same types, every time.
- **Integration**: the output can be passed directly to a database, a UI component, or another API.

One important constraint: the system prompt must mention "json" at least once. The API enforces this to prevent accidental JSON mode activation.

There's also a newer, stricter mode: **structured outputs with JSON Schema**. Instead of describing the schema in the prompt, you pass a formal JSON Schema object and the API guarantees the response matches it exactly — including field names, types, and required fields. This is the production-grade approach for critical integrations.

---

## Demo Walkthrough

Open the **Structured Output** tab. It extracts sentiment, entities, topics, a summary, and a language code from any input text.

1. Paste a news headline: *"Apple announced record quarterly earnings today, driven by strong iPhone sales in Asia."*
   - Sentiment: positive
   - Entities: Apple, Asia
   - Topics: earnings, iPhone, technology
   - Summary: one sentence
   - Language: en

2. Try a mixed-sentiment text: *"I loved the food but the service was terrible and the prices were outrageous."*
   - Sentiment: mixed
   - Entities: (none named)
   - The model should capture the nuance.

3. Try text in another language. Does the language code field correctly identify it?

4. Try deliberately ambiguous text. How does the model handle uncertainty in the structured fields?

---

## Code Deep-Dive

The system prompt describes the exact schema:

```python
system_prompt = """
Analyse the input text and return a JSON object with exactly these fields:
{
  "sentiment": "positive" | "negative" | "neutral" | "mixed",
  "sentiment_score": float between 0 and 1,
  "entities": list of named entities (people, places, organisations),
  "topics": list of main topics,
  "summary": one-sentence summary,
  "language": ISO 639-1 language code
}
"""

completion = await client.chat.completions.create(
    model=INFERENCE_MODEL,
    messages=[
        {"role": "system", "content": system_prompt},
        {"role": "user",   "content": body.text},
    ],
    response_format={"type": "json_object"},
    temperature=0,   # ← deterministic for structured extraction
)
result = json.loads(completion.choices[0].message.content)
```

Temperature 0 is important here. Structured extraction is not a creative task — you want the same fields extracted the same way every time.

For production use, the stricter JSON Schema mode gives you compile-time guarantees:

```python
completion = await client.chat.completions.create(
    model="gpt-4o",
    messages=[...],
    response_format={
        "type": "json_schema",
        "json_schema": {
            "name": "text_analysis",
            "strict": True,
            "schema": {
                "type": "object",
                "properties": {
                    "sentiment": {"type": "string", "enum": ["positive","negative","neutral","mixed"]},
                    "entities":  {"type": "array", "items": {"type": "string"}},
                    # ...
                },
                "required": ["sentiment", "entities", "topics", "summary", "language"],
                "additionalProperties": False,
            }
        }
    }
)
```

With `strict: True`, the API rejects any response that doesn't match the schema — you never get a malformed response.

---

## Key Takeaways

- `response_format: {"type": "json_object"}` constrains the model to return valid JSON.
- Describe the schema in the system prompt — field names, types, and allowed values.
- Use temperature 0 for structured extraction — consistency matters more than creativity.
- The stricter JSON Schema mode (`strict: True`) gives compile-time guarantees on field names and types.
- Structured output is the foundation for any LLM integration where the output feeds into code.

---

## What's Next

You've seen how to extract structured data from short texts. But what about long documents — a 50-page report that doesn't fit in the context window? The next tab covers map-reduce summarisation: splitting the document, summarising each chunk in parallel, then combining the summaries.
