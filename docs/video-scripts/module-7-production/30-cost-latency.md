# Cost & Latency

**Module:** Production | **Level:** Advanced
**Runtime:** ~6 min | **Tab:** `cost-latency`

---

## Hook

Your prototype works. Now you need to ship it. The first question every engineering manager asks: *"What does it cost to run?"* The second: *"How fast is it?"* These aren't afterthoughts — they determine whether your AI feature is economically viable and whether users will actually use it. This tab makes both measurable.

---

## Concept

**Cost** in LLM applications is almost entirely token cost: input tokens × input price + output tokens × output price. The prices vary enormously by model and provider — from $0.15 per million tokens for GPT-4o-mini to $10+ per million for the most capable models.

At scale, small differences compound:
- 1 million requests/day × 500 tokens/request = 500 million tokens/day
- At $0.15/M: $75/day = $2,250/month
- At $2.50/M: $1,250/day = $37,500/month

The same feature, 17× different cost. Model selection is a business decision, not just a technical one.

**Latency** has two components:
- **Time to First Token (TTFT)**: how long until the response starts. Dominated by model size and server load.
- **Time to Last Token (TTLT)**: total response time. Dominated by output length.

For user-facing applications, TTFT matters most — users perceive a fast start as a fast response even if the total time is similar. Streaming (covered earlier) exploits this.

Latency optimisation strategies:
- Use a smaller model for simple queries (routing).
- Use the semantic cache to skip LLM calls entirely for repeated queries.
- Reduce output length with a tighter system prompt.
- Use streaming to improve perceived latency without changing actual latency.

---

## Demo Walkthrough

Open the **Cost & Latency** tab. Select models and enter a prompt.

1. Run a simple prompt: *"What is JavaScript?"* across GPT-4o, GPT-4o-mini, and a smaller model. Compare:
   - Latency: how much faster is the smaller model?
   - Cost: what's the per-request cost difference?
   - Quality: is the cheaper model's answer acceptable for this task?

2. Run a complex prompt: *"Explain the CAP theorem with examples and discuss its implications for distributed database design."* Does the quality gap between models widen for complex tasks?

3. Calculate the monthly cost at scale. If you expect 100,000 requests/day, what's the monthly cost for each model? The tab shows per-request cost — multiply by your expected volume.

4. Try a very short prompt vs a very long one. How does input token count affect latency? (It should be roughly linear.)

5. Compare the same model at different output lengths (adjust `max_tokens`). How does output length affect latency?

---

## Code Deep-Dive

Measuring latency and computing cost from actual token counts:

```python
MODEL_PRICING = {
    "gpt-4o-mini":   {"input": 0.15,  "output": 0.60},   # USD per 1M tokens
    "gpt-4o":        {"input": 2.50,  "output": 10.00},
    "llama-3.1-70b": {"input": 0.88,  "output": 0.88},
}

async def call_model(model: str) -> dict:
    pricing = MODEL_PRICING[model]
    t0 = time.perf_counter()
    completion = await client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": body.message}],
    )
    latency = time.perf_counter() - t0

    cost = (
        completion.usage.prompt_tokens     * pricing["input"]  +
        completion.usage.completion_tokens * pricing["output"]
    ) / 1_000_000

    return {
        "model":      model,
        "latency_s":  round(latency, 2),
        "cost_usd":   round(cost, 6),
        "tokens_in":  completion.usage.prompt_tokens,
        "tokens_out": completion.usage.completion_tokens,
    }

results = await asyncio.gather(*[call_model(m) for m in valid_models])
```

For production cost tracking, log token counts on every request and aggregate in your metrics system:

```python
# Log to your observability platform
metrics.increment("llm.tokens.input",  completion.usage.prompt_tokens,     tags={"model": model})
metrics.increment("llm.tokens.output", completion.usage.completion_tokens, tags={"model": model})
metrics.histogram("llm.latency",       latency,                            tags={"model": model})
```

This lets you track cost trends, detect regressions, and identify which features are driving spend.

---

## Key Takeaways

- LLM cost = input tokens × input price + output tokens × output price. Small per-request differences become large at scale.
- Model selection is the highest-leverage cost decision — a 10-17× price difference between models is common.
- Latency has two components: TTFT (time to first token) and TTLT (total time). TTFT dominates user perception.
- The semantic cache (earlier tab) is the most effective latency optimisation — it eliminates LLM calls entirely.
- Track token counts and latency in production metrics to detect cost regressions early.

---

## What's Next

Cost and latency are operational concerns. The next tab addresses safety: guardrails that classify and block harmful inputs before they reach the LLM, and harmful outputs before they reach the user.
