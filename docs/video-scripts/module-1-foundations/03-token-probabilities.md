# Token Probabilities

**Module:** Foundations | **Level:** Beginner
**Runtime:** ~6 min | **Tab:** `logprobs`

---

## Hook

> 🎬 **SHOW:** Token Probabilities tab open, prompt input empty, response area blank.

When an LLM writes "The capital of France is Paris", how confident is it? Is "Paris" a near-certainty, or did it almost say "Lyon"? The logprobs API exposes exactly that — the model's probability distribution at every single token. This is the closest you can get to seeing inside the model's decision-making.

---

## Concept

> 🎬 **SHOW:** Slide — a softmax distribution bar chart over a vocabulary, with one bar much taller than the rest, labelled "Paris 97%". Other bars: "Lyon 1.2%", "Marseille 0.8%", etc.

At each step of generation, the model computes a probability distribution over its entire vocabulary — potentially 100,000+ tokens. It then samples from that distribution to pick the next token.

The API returns **log-probabilities** rather than raw probabilities. A logprob of `0` means 100% confident. A logprob of `-0.1` means about 90% confident. A logprob of `-5` means roughly 0.7% confident — the model was genuinely guessing.

> 🎬 **SHOW:** Slide — formula: `probability = exp(logprob)`, with three worked examples: `exp(0) = 1.0`, `exp(-0.1) ≈ 0.90`, `exp(-5) ≈ 0.007`.

To convert: `probability = exp(logprob)`.

The API also returns the **top-K alternatives** at each position — the other tokens the model seriously considered before picking the one it did.

> 🎬 **SHOW:** Slide — a single token position showing the chosen token "Paris" and a dropdown of alternatives: "Lyon", "Nice", "Bordeaux" with their probabilities.

This is where it gets interesting: you can see that at a particular word, the model was torn between "however" and "but", or between "positive" and "good".

Two important caveats: high confidence does not mean correct — the model can be 99% confident and still be wrong. And temperature interacts with logprobs: at temperature 0, the model always picks the highest-probability token, but the logprobs themselves don't change.

---

## Demo Walkthrough

> 🎬 **SHOW:** Token Probabilities tab, cursor in the prompt input.

1. Try: *"The capital of France is"*

   > 🎬 **SHOW:** Submit the prompt. Point to the response tokens rendered with colour coding — green for high confidence, yellow for moderate, red for low. Hover over "Paris" to show the tooltip with its logprob and top alternatives.

   The response token "Paris" should be near 100% — logprob close to 0. Hover over it to see the top alternatives. "Lyon" and "Marseille" might appear with tiny probabilities.

2. Try: *"The best programming language is"*

   > 🎬 **SHOW:** Clear and submit. Point to the first response token — show that multiple alternatives have meaningful probabilities, making the bar chart spread out rather than dominated by one token.

   This is subjective. Watch the first token: the model is genuinely uncertain.

3. Try a factual question the model gets wrong.

   > 🎬 **SHOW:** Submit a question with a known wrong answer from the model. Point to the high-confidence (green) tokens on the wrong answer — this is the hallucination signature.

   Was it confident? High confidence on a wrong answer is the hallucination signature.

4. Try: *"2 + 2 ="*

   > 🎬 **SHOW:** Submit. Point to the "4" token being near 100% green. Then clear and try a harder maths question — point to the digits having lower confidence (more yellow/red).

   The answer token should be near 100% confident. Now try a harder calculation — watch confidence drop on the digits.

> 🎬 **SHOW:** Point to the average confidence score displayed at the top of the response area.

The average confidence score at the top summarises the whole response — a useful single-number quality signal.

---

## Code Deep-Dive

> 🎬 **SHOW:** Open `backend/main.py`, scrolled to the logprobs endpoint. Highlight `logprobs=True` and `top_logprobs=5`.

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

> 🎬 **SHOW:** Highlight `temperature=1` and the comment explaining why.

Why `temperature=1` for logprobs? At temperature 0, the model always picks the top token — the alternatives are still computed, but the sampling is deterministic. At temperature 1, the sampling reflects the actual distribution. For educational purposes, temperature 1 shows you what the model genuinely considers.

> 🎬 **SHOW:** Highlight `top_logprobs=5` — note the cap of 20.

The `top_logprobs` parameter is capped at 20 by the API. You're seeing the top 5 or 20 alternatives, not the full distribution over 100,000+ tokens — but the top alternatives are the ones that matter.

---

## Key Takeaways

> 🎬 **SHOW:** Return to the tab with the "The best programming language is" response visible — colour-coded tokens showing genuine uncertainty.

- LLMs generate text by sampling from a probability distribution at each token position.
- Logprobs expose that distribution: `exp(logprob)` gives you the probability, 0 to 1.
- High confidence does not mean correct — the model can be confidently wrong.
- Top-K alternatives show what the model nearly said, revealing genuine uncertainty.
- This API is the foundation for uncertainty estimation, calibration research, and debugging unexpected outputs.

---

## What's Next

> 🎬 **SHOW:** Click "Temperature" in the sidebar.

You've seen that the model samples from a probability distribution. The next tab shows you the one parameter that directly controls how that sampling works: temperature.
