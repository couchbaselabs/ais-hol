# Capella AI Sentiment

**Module:** Capella AI Functions | **Level:** Advanced
**Runtime:** ~6 min | **Tab:** `capella-sentiment`

---

## Hook

> 🎬 **SHOW:** Capella AI Sentiment tab open, text input area visible, sentiment result cards area below (empty) showing placeholders for label, score, and explanation.

You have a database with a million product reviews. You want to know which ones are positive, which are negative, and which are mixed. The traditional approach: write application code, loop over every document, call an LLM API for each one, store the result. With Capella AI Functions, you write one SQL++ query. The sentiment analysis runs inside the database engine, over every document, without a single line of application code.

---

## Concept

> 🎬 **SHOW:** Slide — the SQL++ function call: `default:ai_sentiment({"text": $text})`. Below it, the result structure: `{sentiment: "positive", score: 0.91, explanation: "..."}`.

`default:ai_sentiment()` returns sentiment analysis for any text — label, confidence score, and explanation — as a SQL++ built-in function.

> 🎬 **SHOW:** Slide — bulk enrichment SQL: `SELECT r.id, default:ai_sentiment({"text": r.text}) AS sentiment FROM reviews WHERE r.analysed IS MISSING LIMIT 100`. Highlight "no application loop".

The bulk enrichment use case is where this really shines. Instead of writing an application loop, you write one query that analyses 100 unprocessed reviews in a single execution.

> 🎬 **SHOW:** Slide — UPDATE pattern: `UPDATE reviews SET r.sentiment = default:ai_sentiment(...), r.analysed = NOW_STR() WHERE r.analysed IS MISSING LIMIT 100`. Label it "Enrich documents at query time".

Combine with an UPDATE statement to write the sentiment back to each document — enriching the collection at query time, no ETL pipeline needed.

---

## Demo Walkthrough

> 🎬 **SHOW:** Capella AI Sentiment tab, text input ready.

1. Try a clearly positive text: *"Apple announced record quarterly earnings today, driven by strong iPhone sales in Asia."*

   > 🎬 **SHOW:** Paste the text, click Analyse. Watch the result card populate: sentiment badge showing "positive" in green, confidence score near 0.9, explanation text below.

   Should return `positive` with high confidence. Read the explanation aloud.

2. Try a mixed-sentiment text: *"I absolutely loved the new restaurant — the pasta was incredible but the service was slow and the prices were outrageous."*

   > 🎬 **SHOW:** Clear and paste. Point to the "mixed" badge. Read the explanation — it should identify both the positive (pasta) and negative (service, prices) elements.

   Should return `mixed`. Read the explanation — does it capture the nuance?

3. Try a neutral text: *"The earthquake caused minor damage but no casualties."*

   > 🎬 **SHOW:** Clear and paste. Point to the "neutral" badge and the lower confidence score — neutral is harder to classify confidently.

   Factual, no clear sentiment. Should return `neutral`.

4. Try a strongly negative text: *"This software update is terrible — it broke everything and the company hasn't responded to support tickets in two weeks."*

   > 🎬 **SHOW:** Clear and paste. Point to the "negative" badge with high confidence. Read the explanation.

   Should return `negative` with high confidence.

5. Try an ambiguous or sarcastic text.

   > 🎬 **SHOW:** Paste something sarcastic like "Oh great, another software update that breaks everything. Just what I needed." Point to the result — does it detect sarcasm or take it at face value?

   Does the model detect sarcasm, or does it take the text at face value?

---

## Code Deep-Dive

> 🎬 **SHOW:** Open `backend/main.py`, scrolled to the Capella sentiment endpoint. Highlight the SQL++ query — specifically `default:ai_sentiment()`. Point out there is no `client.chat.completions.create` call.

The backend issues a SQL++ query — identical pattern to `ai_summary()`:

```python
sql = """
    SELECT default:ai_sentiment({
        "text": $text
    }) AS result
"""
rows = list(
    cluster.query(
        sql,
        QueryOptions(named_parameters={"text": body.text}),
    ).rows()
)
result = rows[0]["result"][0]
return {
    "sentiment":       result.get("sentiment", "unknown"),
    "sentiment_score": result.get("score", 0.0),
    "explanation":     result.get("explanation", ""),
    "source":          "capella_ai_sentiment",
}
# The LLM call happens inside Couchbase — no openai.chat.completions here
```

> 🎬 **SHOW:** Show the bulk enrichment UPDATE query on a slide.

For bulk enrichment, combine with an UPDATE:

```sql
UPDATE `my-bucket`.`_default`.reviews AS r
SET r.sentiment = default:ai_sentiment({"text": r.text}),
    r.analysed  = NOW_STR()
WHERE r.type = "product_review"
  AND r.analysed IS MISSING
LIMIT 100
```

> 🎬 **SHOW:** Highlight `WHERE r.analysed IS MISSING` — incremental processing. Then highlight `LIMIT 100` — batch size control.

`WHERE r.analysed IS MISSING` ensures incremental processing — only unanalysed documents are touched. `LIMIT 100` controls the batch size.

---

## Key Takeaways

> 🎬 **SHOW:** Return to the tab with the mixed-sentiment result — "mixed" badge visible, explanation identifying both positive and negative elements.

- `default:ai_sentiment()` returns sentiment label, confidence score, and explanation as a SQL++ built-in.
- The LLM call runs inside the Couchbase query engine — no application-level LLM SDK needed.
- Bulk enrichment over entire collections is a single SQL++ query — no application loop required.
- Combine with UPDATE to write sentiment results back to documents at query time.
- Requires the Sentiment Analysis AI Function enabled on the cluster and `query_external_access` role.

---

## What's Next

> 🎬 **SHOW:** Zoom out to show the full sidebar — all 35 tabs visible, all with visited checkmarks. Then slowly scroll through the sidebar from top to bottom.

You've completed the full curriculum — all 35 tabs, from a stateless single API call to multi-agent systems, RAG pipelines, voice interfaces, and database-native AI functions.

> 🎬 **SHOW:** Slide — the full learning path listed: Foundations → Prompting → Pipeline → RAG → Capabilities → Advanced → Production → Voice → Capella AI.

The learning path you followed:
- **Foundations**: tokens, probabilities, temperature, context limits
- **Prompting**: system prompts, few-shot, chain-of-thought, personas, injection attacks
- **Pipeline**: streaming, caching, memory, structured output, summarisation
- **RAG**: embeddings, chunking, ingestion, retrieval, reranking, HyDE, query expansion
- **Capabilities**: vision, tool calling, model comparison
- **Advanced**: agentic RAG, multi-agent systems, evaluation, hallucination detection
- **Production**: cost/latency, guardrails
- **Voice**: WASM (on-device) and server-side (OpenAI APIs)
- **Capella AI**: SQL++-native LLM functions

> 🎬 **SHOW:** Return to the app one final time — Simple Chat tab open. The beginning of the journey.

Every pattern in this workshop is production-ready. The code you've seen is the same code running in the backend — not simplified pseudocode. Take it, adapt it, and build something real.
