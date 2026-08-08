# Cost & Latency

**Module:** Production | **Level:** Advanced
**Runtime:** ~6 min | **Tab:** `cost-latency`

---

## Hook

> 🎬 **SHOW:** Cost & Latency tab open, model checkboxes visible, prompt input ready, response cards area empty with latency and cost columns visible.

Your prototype works. Now you need to ship it. The first question every engineering manager asks: *"What does it cost to run?"* The second: *"How fast is it?"* These aren't afterthoughts — they determine whether your AI feature is economically viable and whether users will actually use it. This tab makes both measurable.

---

## Concept

> 🎬 **SHOW:** Slide — cost formula: `(input_tokens × input_price + output_tokens × output_price) / 1,000,000`. Below it: a worked example showing the dramatic difference between GPT-4o-mini and GPT-4o at 1M requests/month.

**Cost** in LLM applications is almost entirely token cost. At scale, small differences compound dramatically:

- 1 million requests/day × 500 tokens/request = 500 million tokens/day
- At $0.15/M (GPT-4o-mini): $75/day = $2,250/month
- At $2.50/M (GPT-4o): $1,250/day = $37,500/month

The same feature, 17× different cost. Model selection is a business decision, not just a technical one.

> 🎬 **SHOW:** Slide — two latency metrics: "TTFT (Time to First Token)" and "TTLT (Time to Last Token)". TTFT dominates user perception. Streaming exploits this.

**Latency** has two components: TTFT (time to first token) and TTLT (total response time). For user-facing applications, TTFT matters most — users perceive a fast start as a fast response.

> 🎬 **SHOW:** Slide — latency optimisation strategies: smaller model, semantic cache (skip LLM entirely), reduce output length, streaming.

The semantic cache from Module 3 is the most effective latency optimisation — it eliminates LLM calls entirely.

---

## Demo Walkthrough

> 🎬 **SHOW:** Cost & Latency tab, all models checked, prompt input ready.

1. **Simple factual question**: *"What is the capital of France?"*

   > 🎬 **SHOW:** Type and send. Watch all model cards populate. Point to the latency column — smaller models respond faster. Point to the cost column — dramatically cheaper. Point to the quality — all correct.

   All should answer correctly. Compare latency and cost. The cheaper model wins on both.

2. **Complex prompt**: *"Explain the CAP theorem with examples and discuss its implications for distributed database design."*

   > 🎬 **SHOW:** Clear and send. Compare quality across models — point to any differences in depth or accuracy. Then point to the cost column — the expensive model costs more and may not be worth it for this task.

   Does the quality gap between models widen for complex tasks?

3. Calculate the monthly cost at scale.

   > 🎬 **SHOW:** Point to the cost column. Do the maths on screen: "If we expect 100,000 requests/day, multiply the per-request cost by 100,000 × 30." Show the monthly cost difference between cheapest and most expensive.

   If you expect 100,000 requests/day, what's the monthly cost for each model?

4. Compare a very short prompt vs a very long one.

   > 🎬 **SHOW:** Send a one-word prompt, note the latency. Then send a 500-word prompt, note the latency. Point to how input token count affects latency.

   How does input token count affect latency?

---

## Code Deep-Dive

> 🎬 **SHOW:** Open `backend/main.py`, scrolled to the cost-latency endpoint. Highlight `time.perf_counter()` and the cost formula.

Measuring latency and computing cost from actual token counts:

```python
MODEL_PRICING = {
    "gpt-4o-mini":   {"input": 0.15,  "output": 0.60},   # USD per 1M tokens
    "gpt-4o":        {"input": 2.50,  "output": 10.00},
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

> 🎬 **SHOW:** Highlight `completion.usage.prompt_tokens` and `completion.usage.completion_tokens` — these are the actual token counts from the API response, not estimates.

These are the actual token counts from the API response — not estimates. Always use actual counts for cost tracking, not pre-call estimates.

> 🎬 **SHOW:** Show a slide with a production metrics snippet — logging token counts to an observability platform.

For production cost tracking, log token counts on every request and aggregate in your metrics system. This lets you track cost trends, detect regressions, and identify which features are driving spend.

---

## Key Takeaways

> 🎬 **SHOW:** Return to the tab with the complex prompt results — all model cards visible, showing the cost column with the dramatic price difference highlighted.

- LLM cost = input tokens × input price + output tokens × output price. Small per-request differences become large at scale.
- Model selection is the highest-leverage cost decision — a 10-17× price difference between models is common.
- Latency has two components: TTFT (time to first token) and TTLT (total time). TTFT dominates user perception.
- The semantic cache is the most effective latency optimisation — it eliminates LLM calls entirely.
- Track token counts and latency in production metrics to detect cost regressions early.

---

## What's Next

> 🎬 **SHOW:** Click "Guardrails" in the sidebar.

Cost and latency are operational concerns. The next tab addresses safety: guardrails that classify and block harmful inputs before they reach the LLM, and harmful outputs before they reach the user.
