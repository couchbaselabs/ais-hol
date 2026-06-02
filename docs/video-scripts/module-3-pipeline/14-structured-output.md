# Structured Output

**Module:** Building a Pipeline | **Level:** Intermediate
**Runtime:** ~6 min | **Tab:** `structured`

---

## Hook

> 🎬 **SHOW:** Structured Output tab open, text input area visible, the JSON output panel on the right empty and waiting.

Free-form text is great for humans. It's terrible for code. If your application needs to extract entities from text, classify sentiment, or parse any structured data from an LLM response, you've probably written fragile string parsing that breaks the moment the model changes its phrasing. Structured output eliminates that entirely — the model returns valid JSON, every time.

---

## Concept

> 🎬 **SHOW:** Slide — left side: free-form response "The sentiment is positive and the main entities are Apple and Asia." Right side: clean JSON `{"sentiment": "positive", "entities": ["Apple", "Asia"]}`. Arrow from left to right labelled "response_format: json_object".

The OpenAI API's `response_format: {"type": "json_object"}` mode constrains the model to return valid JSON. Combined with a schema description in the system prompt, you get predictable, parseable output that downstream code can use directly.

This matters because: no more `json.loads()` wrapped in try/except, consistent fields and types every time, and the output can be passed directly to a database, UI component, or another API.

> 🎬 **SHOW:** Slide — a warning: "The system prompt must mention 'json' at least once — the API enforces this."

One important constraint: the system prompt must mention "json" at least once. The API enforces this to prevent accidental JSON mode activation.

> 🎬 **SHOW:** Slide — two modes: `json_object` (describe schema in prompt) vs `json_schema` with `strict: true` (formal schema, compile-time guarantee).

There's also a stricter mode: structured outputs with JSON Schema. Instead of describing the schema in the prompt, you pass a formal JSON Schema object and the API guarantees the response matches it exactly.

---

## Demo Walkthrough

> 🎬 **SHOW:** Structured Output tab, text input ready, JSON output panel visible on the right.

1. Paste a news headline: *"Apple announced record quarterly earnings today, driven by strong iPhone sales in Asia."*

   > 🎬 **SHOW:** Paste the text, click Analyse. Watch the JSON panel populate with the structured fields. Point to each field: sentiment, entities, topics, summary, language.

   - Sentiment: positive
   - Entities: Apple, Asia
   - Topics: earnings, iPhone, technology
   - Summary: one sentence
   - Language: en

2. Try a mixed-sentiment text: *"I loved the food but the service was terrible and the prices were outrageous."*

   > 🎬 **SHOW:** Clear and paste the new text. Point to the sentiment field showing "mixed". Read the explanation if present.

   The model should capture the nuance — sentiment: mixed.

3. Try text in another language.

   > 🎬 **SHOW:** Paste a sentence in French or Spanish. Point to the language field correctly identifying the language code.

   Does the language code field correctly identify it?

4. Try deliberately ambiguous text.

   > 🎬 **SHOW:** Paste something ambiguous. Point to how the model handles uncertainty — does it pick a sentiment or return "neutral"?

   How does the model handle uncertainty in the structured fields?

---

## Code Deep-Dive

> 🎬 **SHOW:** Open `backend/main.py`, scrolled to the structured output endpoint. Highlight the system prompt describing the schema, and `response_format`.

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

> 🎬 **SHOW:** Highlight `temperature=0` — explain why determinism matters for extraction tasks.

Temperature 0 is important here. Structured extraction is not a creative task — you want the same fields extracted the same way every time.

> 🎬 **SHOW:** Show the stricter JSON Schema mode on a slide or in a code comment.

For production use, the stricter JSON Schema mode gives you compile-time guarantees — the API rejects any response that doesn't match the schema exactly. You never get a malformed response.

---

## Key Takeaways

> 🎬 **SHOW:** Return to the tab with the Apple earnings headline — clean JSON output visible in the right panel.

- `response_format: {"type": "json_object"}` constrains the model to return valid JSON.
- Describe the schema in the system prompt — field names, types, and allowed values.
- Use temperature 0 for structured extraction — consistency matters more than creativity.
- The stricter JSON Schema mode (`strict: True`) gives compile-time guarantees on field names and types.
- Structured output is the foundation for any LLM integration where the output feeds into code.

---

## What's Next

> 🎬 **SHOW:** Click "Summarisation" in the sidebar.

You've seen how to extract structured data from short texts. But what about long documents — a 50-page report that doesn't fit in the context window? The next tab covers map-reduce summarisation: splitting the document, summarising each chunk in parallel, then combining the summaries.
