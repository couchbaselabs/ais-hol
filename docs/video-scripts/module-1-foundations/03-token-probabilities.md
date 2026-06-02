# Token Probabilities

**Module:** Foundations | **Level:** Beginner
**Runtime:** ~6 min | **Tab:** `logprobs`

---

## Hook

When an LLM writes "The capital of France is Paris", how confident is it? Is "Paris" a near-certainty, or did it almost say "Lyon"? The logprobs API exposes exactly that — the model's probability distribution at every single token. This is the closest you can get to seeing inside the model's decision-making.

---

## Concept

At each step of generation, the model computes a probability distribution over its entire vocabulary — potentially 100,000+ tokens. It then samples from that distribution to pick the next token.

The API returns **log-probabilities** rather than raw probabilities. A logprob of `0` means 100% confident. A logprob of `-0.1` means about 90% confident. A logprob of `-5` means roughly 0.7% confident — the model was genuinely guessing.

To convert: `probability = exp(logprob)`. So `exp(-0.1) ≈ 0.90`, `exp(-5) ≈ 0.007`.

The API also returns the **top-K alternatives** at each position — the other tokens the model seriously considered before picking the one it did. This is where it gets interesting: you can see that at a particular word, the model was torn between "however" and "but", or between "positive" and "good".

Two important caveats:

**High confidence ≠ correct.** The model can be 99% confident and still be wrong. Confidence reflects the model's training distribution, not ground truth. This is why hallucination detection (a later tab) is a separate problem.

**Temperature interacts with logprobs.** At temperature 0, the model always picks the highest-probability token. At temperature 1, it samples proportionally. The logprobs themselves don't change — only the sampling behaviour does.

---

## Demo Walkthrough

Open the **Token Probabilities** tab. Enter a prompt and submit.

1. Try: *"The capital of France is"* — the response token "Paris" should be near 100% (logprob close to 0). Hover over it to see the top alternatives. "Lyon" and "Marseille" might appear with tiny probabilities.

2. Try: *"The best programming language is"* — this is subjective. Watch the first token: the model is genuinely uncertain. You'll see multiple alternatives with meaningful probabilities.

3. Try a factual question the model gets wrong. Was it confident? High confidence on a wrong answer is the hallucination signature.

4. Try: *"2 + 2 ="* — the answer token should be near 100% confident. Now try *"What is the 1000th prime number?"* — watch confidence drop on the digits.

The colour coding makes this visual: green tokens are high confidence, yellow is moderate, red means the model was guessing. The average confidence score at the top summarises the whole response.

---

## Code Deep-Dive

Requesting logprobs is a single parameter change:

```python
completion = await client.chat.completions.create(
    model=INFERENCE_MODEL,
    messages=[{"role": "user", "content": prompt}],
    logprobs=True,
    top_logprobs=5,   # up to 20 alternatives per token
    temperature=1,    # keep at 1 so probabilities are meaningful
)
for token_lp in completion.choices[0].logprobs.content:
    prob = math.exp(token_lp.logprob)   # convert log-prob → probability
    alts = token_lp.top_logprobs        # list of {token, logprob}
    print(f"{token_lp.token!r:20} {prob:.1%}")
```

Why `temperature=1` for logprobs? At temperature 0, the model always picks the top token — the alternatives are still computed, but the sampling is deterministic. At temperature 1, the sampling reflects the actual distribution. For educational purposes, temperature 1 shows you what the model genuinely considers.

The `top_logprobs` parameter is capped at 20 by the API. You're seeing the top 5 or 20 alternatives, not the full distribution over 100,000+ tokens — but the top alternatives are the ones that matter.

One thing to watch: `logprobs` is only available on certain models. Check your provider's documentation — not every model exposes this.

---

## Key Takeaways

- LLMs generate text by sampling from a probability distribution at each token position.
- Logprobs expose that distribution: `exp(logprob)` gives you the probability, 0 to 1.
- High confidence does not mean correct — the model can be confidently wrong.
- Top-K alternatives show what the model nearly said, revealing genuine uncertainty.
- This API is the foundation for uncertainty estimation, calibration research, and debugging unexpected outputs.

---

## What's Next

You've seen that the model samples from a probability distribution. The next tab shows you the one parameter that directly controls how that sampling works: temperature.
