# Model Comparison

**Module:** LLM Capabilities | **Level:** Intermediate
**Runtime:** ~6 min | **Tab:** `model-comparison`

---

## Hook

> 🎬 **SHOW:** Model Comparison tab open, model checkboxes visible (GPT-4o, GPT-4o-mini, and others), prompt input ready, response cards area empty.

GPT-4o costs roughly 17× more per token than GPT-4o-mini. Is it 17× better? For some tasks, yes. For others, the cheaper model is indistinguishable. The only way to know which model is right for your use case is to run them side by side on your actual prompts and compare quality, latency, and cost together.

---

## Concept

> 🎬 **SHOW:** Slide — a table: model name, input price per 1M tokens, output price per 1M tokens. GPT-4o-mini at $0.15/$0.60, GPT-4o at $2.50/$10.00. The price difference is highlighted.

Model selection is one of the most impactful cost decisions in an AI application. The difference between using GPT-4o and GPT-4o-mini for a high-volume task can be 10-20× in monthly API spend.

> 🎬 **SHOW:** Slide — "Simple tasks: smaller models often match larger ones. Complex reasoning: larger models have a meaningful quality advantage."

The tradeoffs are not linear. For simple tasks — classification, extraction, short Q&A — smaller models often match larger ones. For complex reasoning — multi-step maths, code generation, nuanced analysis — larger models have a meaningful quality advantage.

> 🎬 **SHOW:** Slide — "The right strategy: use the smallest model that meets your quality bar. Route simple queries to cheap models, escalate complex ones."

The right strategy: use the smallest model that meets your quality bar for each task. Many production systems use a tiered approach.

---

## Demo Walkthrough

> 🎬 **SHOW:** Model Comparison tab, all available models checked, prompt input ready.

1. **Simple factual question**: *"What is the capital of France?"*

   > 🎬 **SHOW:** Type and send. Watch all model cards populate in parallel. Point to the latency column — smaller models respond faster. Point to the cost column — dramatically cheaper. Point to the quality — all correct.

   All should answer correctly. Compare latency and cost. The cheaper model wins on both.

2. **Reasoning problem**: *"A train leaves Chicago at 60 mph. Another leaves New York at 80 mph. They're 800 miles apart. When do they meet?"*

   > 🎬 **SHOW:** Clear and send. Compare the reasoning quality across models. Point to any model that gets it wrong or shows weaker working.

   Does the cheaper model get it right? Does the expensive model? Compare the reasoning quality.

3. **Code generation**: *"Write a Python function that finds all prime numbers up to N using the Sieve of Eratosthenes."*

   > 🎬 **SHOW:** Clear and send. Compare code quality — correctness, style, comments. Point to any differences.

   Compare correctness and code quality across models.

4. Calculate the monthly cost at scale.

   > 🎬 **SHOW:** Point to the cost column. Do the maths on screen or on a slide: "100,000 requests/day × cost per request × 30 days". Show the monthly cost difference between the cheapest and most expensive model.

   If you expect 100,000 requests/day, what's the monthly cost for each model? The cost column shows per-request cost — multiply by your expected volume.

---

## Code Deep-Dive

> 🎬 **SHOW:** Open `backend/main.py`, scrolled to the model comparison endpoint. Highlight `asyncio.gather` and the `MODEL_PRICING` dictionary.

All model calls run concurrently:

```python
MODEL_PRICING = {
    "gpt-4o-mini":   {"input": 0.15,  "output": 0.60},   # USD per 1M tokens
    "gpt-4o":        {"input": 2.50,  "output": 10.00},
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

> 🎬 **SHOW:** Highlight `time.perf_counter()` — explain this measures real wall-clock latency including network round-trip.

`time.perf_counter()` measures wall-clock time including network round-trip. This is real-world latency, not just model inference time.

> 🎬 **SHOW:** Highlight the cost formula — walk through it: input tokens × input price + output tokens × output price, divided by 1 million.

The cost formula: `(input_tokens × input_price + output_tokens × output_price) / 1_000_000`. Prices are per million tokens.

---

## Key Takeaways

> 🎬 **SHOW:** Return to the tab with the reasoning problem — all model cards visible, showing different quality levels and dramatically different costs.

- Model selection is a cost decision as much as a quality decision — the gap can be 10-20× in spend.
- Smaller models match larger ones on simple tasks; larger models have a meaningful advantage on complex reasoning.
- Measure real latency and cost on your actual prompts — benchmarks on generic tasks don't predict your use case.
- A tiered routing strategy (cheap model for simple queries, powerful model for complex ones) is common in production.
- Prices change frequently — check your provider's current pricing before making architectural decisions.

---

## What's Next

> 🎬 **SHOW:** Click "Agentic RAG" in the sidebar — the first tab of Module 6.

You've completed the LLM Capabilities module. Now we move to Advanced Patterns — starting with Agentic RAG, where the model doesn't just retrieve once but decides iteratively whether it has enough context to answer.
