# Model Comparison

**Module:** LLM Capabilities | **Level:** Intermediate
**Runtime:** ~6 min | **Tab:** `model-comparison`

---

## Hook

GPT-4o costs roughly 17× more per token than GPT-4o-mini. Is it 17× better? For some tasks, yes. For others, the cheaper model is indistinguishable. The only way to know which model is right for your use case is to run them side by side on your actual prompts and compare quality, latency, and cost together.

---

## Concept

Model selection is one of the most impactful cost decisions in an AI application. The difference between using GPT-4o and GPT-4o-mini for a high-volume task can be 10-20× in monthly API spend.

The tradeoffs are not linear:
- **Simple tasks** (classification, extraction, short Q&A): smaller models often match larger ones. The quality gap is small, the cost gap is large.
- **Complex reasoning** (multi-step maths, code generation, nuanced analysis): larger models have a meaningful quality advantage.
- **Latency-sensitive applications**: smaller models are faster. GPT-4o-mini typically responds in 1-2 seconds; GPT-4o in 3-5 seconds for the same prompt.

The right strategy: use the smallest model that meets your quality bar for each task. Many production systems use a tiered approach — route simple queries to a cheap model, escalate complex ones to a powerful model.

This tab measures real wall-clock latency and estimates cost from actual token counts. The latency numbers vary with server load — they're not stable benchmarks, but they give you a realistic sense of the difference.

---

## Demo Walkthrough

Open the **Model Comparison** tab. Select up to 4 models and enter a prompt.

1. **Simple factual question**: *"What is the capital of France?"* — run on GPT-4o, GPT-4o-mini, and a smaller model. All should answer correctly. Compare latency and cost. The cheaper model wins on both.

2. **Reasoning problem**: *"A train leaves Chicago at 60 mph. Another leaves New York at 80 mph. They're 800 miles apart. When do they meet?"* — does the cheaper model get it right? Does the expensive model? Compare the reasoning quality.

3. **Creative writing**: *"Write the opening paragraph of a thriller novel set in Tokyo."* — quality differences are subjective here. Which model do you prefer? Is the quality gap worth the cost difference?

4. **Code generation**: *"Write a Python function that finds all prime numbers up to N using the Sieve of Eratosthenes."* — compare correctness and code quality across models.

5. Look at the cost column. For a task you'd run 1 million times per month, what's the monthly cost difference between the cheapest and most expensive model?

---

## Code Deep-Dive

All model calls run concurrently:

```python
MODEL_PRICING = {
    "gpt-4o-mini":   {"input": 0.15,  "output": 0.60},   # USD per 1M tokens
    "gpt-4o":        {"input": 2.50,  "output": 10.00},
    "llama-3.1-70b": {"input": 0.88,  "output": 0.88},
}

async def call_model(model: str) -> dict:
    pricing = MODEL_PRICING.get(model, {"input": 1.0, "output": 1.0})
    t0 = time.perf_counter()
    completion = await client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": prompt},
        ],
        max_tokens=512,
    )
    latency = round(time.perf_counter() - t0, 2)
    usage = completion.usage
    cost = (
        usage.prompt_tokens     * pricing["input"]  +
        usage.completion_tokens * pricing["output"]
    ) / 1_000_000
    return {
        "model":      model,
        "response":   completion.choices[0].message.content,
        "latency_s":  latency,
        "cost_usd":   round(cost, 6),
        "tokens_in":  usage.prompt_tokens,
        "tokens_out": usage.completion_tokens,
    }

results = await asyncio.gather(*[call_model(m) for m in valid_models])
```

`time.perf_counter()` measures wall-clock time including network round-trip. This is real-world latency, not just model inference time. Network conditions affect the numbers — run multiple times for a more stable estimate.

The cost formula: `(input_tokens × input_price + output_tokens × output_price) / 1_000_000`. Prices are per million tokens. A typical 500-token response on GPT-4o-mini costs about $0.0003 — less than a tenth of a cent. At 1 million requests per month, that's $300/month vs $5,000/month for GPT-4o.

---

## Key Takeaways

- Model selection is a cost decision as much as a quality decision — the gap can be 10-20× in spend.
- Smaller models match larger ones on simple tasks; larger models have a meaningful advantage on complex reasoning.
- Measure real latency and cost on your actual prompts — benchmarks on generic tasks don't predict your use case.
- A tiered routing strategy (cheap model for simple queries, powerful model for complex ones) is common in production.
- Prices change frequently — check your provider's current pricing before making architectural decisions.

---

## What's Next

You've completed the LLM Capabilities module. Now we move to Advanced Patterns — starting with Agentic RAG, where the model doesn't just retrieve once but decides iteratively whether it has enough context to answer.
