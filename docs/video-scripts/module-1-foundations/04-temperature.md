# Temperature & Sampling

**Module:** Foundations | **Level:** Beginner
**Runtime:** ~5 min | **Tab:** `temperature`

---

## Hook

> 🎬 **SHOW:** Temperature tab open, showing the multi-column response layout with temperature values across the top (0, 0.5, 1.0, 1.5) and empty response cards below.

Every LLM API call has a `temperature` parameter. Most developers set it to 0.7 and move on. But temperature is the single most impactful parameter for controlling output quality — and setting it wrong is one of the most common mistakes in production AI systems.

---

## Concept

> 🎬 **SHOW:** Slide — a softmax distribution at three temperatures: temp=0 (one bar dominates, near 100%), temp=1 (bars spread out proportionally), temp=2 (bars nearly flat, almost uniform).

Temperature is a scalar applied to the model's logits — the raw scores before the softmax that produces probabilities — before sampling.

At **temperature 0**, the softmax becomes a hard argmax: the model always picks the highest-probability token. The output is fully deterministic.

As temperature **increases toward 1.0**, lower-probability tokens get proportionally more chance to be selected. The output becomes more varied and creative.

Above **1.0**, the distribution flattens further. At 1.5 or 2.0, tokens that the model considers unlikely start appearing regularly. The output can become incoherent.

> 🎬 **SHOW:** Slide — a simple table: temp 0 → "factual/structured tasks", 0.3–0.7 → "conversational", 0.7–1.0 → "creative", >1.0 → "experimental".

The practical rule: use 0 for factual extraction and classification, 0.7 for most chat, and higher only for creative tasks.

---

## Demo Walkthrough

> 🎬 **SHOW:** Temperature tab, prompt input ready. All four temperature columns visible.

1. Enter: *"Give me a word that means happy."* Run it.

   > 🎬 **SHOW:** Submit and wait for all four columns to populate. Point left-to-right: temp 0 gives the same word every time, temp 1.5 gives something unexpected.

   At temperature 0 you'll get "joyful" or "content" every time. At 1.5 you might get "elated", "blissful", "gleeful", or something unexpected.

2. Run the same prompt again at temperature 0.

   > 🎬 **SHOW:** Hit submit again without changing anything. Point to the temp-0 column — the answer should be identical. Point to the temp-1.5 column — different from the first run.

   Temperature 0 is deterministic. Temperature 1.5 varies every run.

3. Enter: *"What is 2 + 2?"*

   > 🎬 **SHOW:** Clear and submit. Point to all columns — all should say "4". Then zoom into the temp-1.5 column and note it still says "4" — temperature doesn't make the model wrong on obvious facts.

   Does temperature affect factual answers? For obvious facts, no. But at very high temperatures, errors start appearing on harder questions.

4. Enter a creative prompt: *"Write the opening line of a noir detective novel."*

   > 🎬 **SHOW:** Submit. Read the temp-0 response aloud, then the temp-1.0 response. Point out the genuine variety in the higher-temperature responses.

   At temperature 0 you get one answer. At 1.0 you get genuine variety. Which do you prefer?

---

## Code Deep-Dive

> 🎬 **SHOW:** Open `backend/main.py`, scrolled to the temperature endpoint. Highlight `asyncio.gather` and the `call_at_temp` function.

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

> 🎬 **SHOW:** Highlight `min(temp, 2.0)` — explain the API cap.

The `min(temp, 2.0)` cap is there because the OpenAI API rejects values above 2.0. Some providers cap at 1.0.

> 🎬 **SHOW:** Highlight `asyncio.gather` — draw a mental model of four concurrent arrows going to the API simultaneously.

`asyncio.gather` runs all calls concurrently — the total latency is roughly the slowest single call, not the sum of all calls. This pattern appears throughout this workshop wherever we need to compare multiple results.

---

## Key Takeaways

> 🎬 **SHOW:** Return to the tab with the creative prompt results visible — all four columns showing different opening lines.

- Temperature scales the logit distribution before sampling. Higher = more random.
- Temperature 0 is deterministic (or near-deterministic). Use it for factual, structured, or classification tasks.
- Temperature 0.7 is a reasonable default for conversational applications.
- High temperature does not make the model more knowledgeable — only more random.
- Always test your chosen temperature with your actual prompts. The right value is task-specific.

---

## What's Next

> 🎬 **SHOW:** Click "Context Window" in the sidebar.

You now understand tokens and how they're sampled. The next foundational concept is the context window — the hard limit on how many tokens the model can process at once, and why it forces you to make architectural decisions.
