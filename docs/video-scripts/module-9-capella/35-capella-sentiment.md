# Capella AI Sentiment

**Module:** Capella AI Functions | **Level:** Advanced
**Runtime:** ~6 min | **Tab:** `capella-sentiment`

---

## Hook

You have a database with a million product reviews. You want to know which ones are positive, which are negative, and which are mixed. The traditional approach: write application code, loop over every document, call an LLM API for each one, store the result. With Capella AI Functions, you write one SQL++ query. The sentiment analysis runs inside the database engine, over every document, without a single line of application code.

---

## Concept

`default:ai_sentiment()` is a Capella AI Function that returns sentiment analysis for any text — label, confidence score, and explanation — as a SQL++ built-in function.

```sql
SELECT default:ai_sentiment({"text": $text}) AS result
```

The result contains:
- `sentiment`: `"positive"` | `"negative"` | `"neutral"` | `"mixed"`
- `score`: confidence float between 0 and 1
- `explanation`: a brief natural-language explanation of the verdict

Like `ai_summary()`, this runs inside the Couchbase query engine. The LLM provider is configured in Capella — the application just issues SQL++.

The bulk enrichment use case is where this really shines. Instead of writing an application loop that calls an LLM API for each document, you write one query:

```sql
SELECT r.id, r.text,
       default:ai_sentiment({"text": r.text}) AS sentiment
FROM `bucket`.`_default`.reviews AS r
WHERE r.analysed IS MISSING
LIMIT 100
```

This runs sentiment analysis on 100 unanalysed reviews in a single query execution. The results can be written back to the documents with an UPDATE statement, enriching the collection at query time.

The same requirements apply as `ai_summary()`: the Sentiment Analysis AI Function must be enabled on the Capella cluster, and the database user needs the `query_external_access` role.

---

## Demo Walkthrough

Open the **Capella AI Sentiment** tab.

1. Try a clearly positive text: *"Apple announced record quarterly earnings today, driven by strong iPhone sales in Asia."* — should return `positive` with high confidence.

2. Try a mixed-sentiment text: *"I absolutely loved the new restaurant — the pasta was incredible but the service was slow and the prices were outrageous."* — should return `mixed`. Read the explanation — does it capture the nuance?

3. Try a neutral text: *"The earthquake caused minor damage but no casualties."* — factual, no clear sentiment. Should return `neutral`.

4. Try a strongly negative text: *"This software update is terrible — it broke everything and the company hasn't responded to support tickets in two weeks."* — should return `negative` with high confidence.

5. Try an ambiguous text — something that could be read as sarcastic. Does the model detect sarcasm, or does it take the text at face value?

6. Compare the explanation field across examples. Does it correctly identify the sentiment drivers?

---

## Code Deep-Dive

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

For bulk enrichment, the same function works over an entire collection:

```sql
-- Analyse sentiment for every unprocessed review
SELECT
    r.id,
    r.text,
    default:ai_sentiment({"text": r.text}) AS sentiment
FROM `my-bucket`.`_default`.reviews AS r
WHERE r.type = "product_review"
  AND r.analysed IS MISSING
LIMIT 100;

-- The result rows include the full sentiment object:
-- { "sentiment": "positive", "score": 0.91, "explanation": "..." }
```

You can combine this with an UPDATE to write the sentiment back to each document:

```sql
UPDATE `my-bucket`.`_default`.reviews AS r
SET r.sentiment = default:ai_sentiment({"text": r.text}),
    r.analysed  = NOW_STR()
WHERE r.type = "product_review"
  AND r.analysed IS MISSING
LIMIT 100
```

This enriches documents at query time — no application loop, no separate ETL pipeline, no extra infrastructure.

---

## Key Takeaways

- `default:ai_sentiment()` returns sentiment label, confidence score, and explanation as a SQL++ built-in.
- The LLM call runs inside the Couchbase query engine — no application-level LLM SDK needed.
- Bulk enrichment over entire collections is a single SQL++ query — no application loop required.
- Combine with UPDATE to write sentiment results back to documents at query time.
- Requires the Sentiment Analysis AI Function enabled on the cluster and `query_external_access` role.

---

## What's Next

You've completed the full curriculum — all 35 tabs, from a stateless single API call to multi-agent systems, RAG pipelines, voice interfaces, and database-native AI functions.

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

Every pattern in this workshop is production-ready. The code you've seen is the same code running in the backend — not simplified pseudocode. Take it, adapt it, and build something real.
