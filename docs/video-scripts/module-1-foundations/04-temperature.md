# Temperature & Sampling

**Module:** Foundations | **Level:** Beginner
**Runtime:** ~5 min | **Tab:** `temperature`

---

## Hook

Every LLM API call has a `temperature` parameter. Most developers set it to 0.7 and move on. But temperature is the single most impactful parameter for controlling output quality — and setting it wrong is one of the most common mistakes in production AI systems.

---

## Concept

Temperature is a scalar applied to the model's logits — the raw scores before the softmax that produces probabilities — before sampling.

At **temperature 0**, the softmax becomes a hard argmax: the model always picks the highest-probability token. The output is fully deterministic (or nearly so — floating-point non-determinism means some providers aren't perfectly reproducible at 0).

As temperature **increases toward 1.0**, lower-probability tokens get proportionally more chance to be selected. The output becomes more varied and creative.

Above **1.0**, the distribution flattens further. At 1.5 or 2.0, tokens that the model considers unlikely start appearing regularly. The output can become incoherent.

The practical rule:
- **0** — factual extraction, classification, structured output, anything where you want the same answer every time.
- **0.3–0.7** — balanced: consistent but not robotic. Good for most chat applications.
- **0.7–1.0** — creative writing, brainstorming, generating diverse options.
- **Above 1.0** — experimental. Usually not useful in production.

---

## Demo Walkthrough

Open the **Temperature & Sampling** tab. It runs the same prompt at multiple temperatures in parallel and shows all responses side by side.

1. Enter: *"Give me a word that means happy."* Run it. At temperature 0 you'll get "joyful" or "content" every time. At 1.5 you might get "elated", "blissful", "gleeful", or something unexpected.

2. Run the same prompt twice at temperature 0. Are the responses identical? They should be — or very close. Now run at temperature 1.0 twice. Different each time.

3. Enter: *"What is 2 + 2?"* — does temperature affect factual answers? At low temperatures, always "4". At very high temperatures, you might occasionally get something wrong. This is why you should use temperature 0 for anything that needs to be correct.

4. Enter a creative prompt: *"Write the opening line of a noir detective novel."* At temperature 0 you get one answer. At 1.0 you get genuine variety. Which do you prefer?

---

## Code Deep-Dive

The implementation is straightforward — the same prompt, different temperature values, all fired in parallel:

```python
async def call_at_temp(temp: float) -> dict:
    completion = await client.chat.completions.create(
        model=INFERENCE_MODEL,
        messages=[{"role": "user", "content": body.message}],
        temperature=min(temp, 2.0),  # ← the only difference between calls
        max_tokens=200,
    )
    return {"temperature": temp, "response": completion.choices[0].message.content}

# Run all temperatures in parallel
results = await asyncio.gather(*[call_at_temp(t) for t in temps])
```

The `min(temp, 2.0)` cap is there because the OpenAI API rejects values above 2.0. Some providers cap at 1.0.

`asyncio.gather` runs all calls concurrently — the total latency is roughly the slowest single call, not the sum of all calls. This pattern — parallel async calls — appears throughout this workshop wherever we need to compare multiple results.

---

## Key Takeaways

- Temperature scales the logit distribution before sampling. Higher = more random.
- Temperature 0 is deterministic (or near-deterministic). Use it for factual, structured, or classification tasks.
- Temperature 0.7 is a reasonable default for conversational applications.
- High temperature does not make the model more knowledgeable — only more random.
- Always test your chosen temperature with your actual prompts. The right value is task-specific.

---

## What's Next

You now understand tokens and how they're sampled. The next foundational concept is the context window — the hard limit on how many tokens the model can process at once, and why it forces you to make architectural decisions.
