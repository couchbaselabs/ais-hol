# Prompt Engineering

**Module:** Prompting | **Level:** Beginner
**Runtime:** ~6 min | **Tab:** `prompt`

---

## Hook

Two developers build the same feature. One gets mediocre results and concludes the model isn't good enough. The other gets excellent results from the same model. The difference is almost always the system prompt. Prompt engineering isn't a soft skill — it's the primary interface between your application and the model.

---

## Concept

The system prompt is evaluated before any user input. It sets the model's persona, constraints, output format, and reasoning style. A well-written system prompt can make a weak model perform like a strong one. A poorly written one can make a strong model perform poorly.

The key insight: **the model is a text completion engine**. It predicts what text should come next given everything it has seen. Your system prompt is the beginning of that context. If your system prompt reads like a confident, precise expert, the model will complete it like a confident, precise expert.

Effective system prompts tend to:
- State the role explicitly: *"You are a senior Python engineer."*
- Specify the output format: *"Respond in bullet points."* or *"Return only valid JSON."*
- Set constraints: *"Never mention competitor products."*
- Provide examples of good responses (that's few-shot, covered next tab).

What doesn't work well:
- Vague instructions: *"Be helpful."* (the model already tries to be helpful)
- Contradictory constraints: *"Be concise but thorough."*
- Negative-only instructions: *"Don't be rude."* — tell it what to do, not just what not to do.

---

## Demo Walkthrough

Open the **Prompt Engineering** tab. It runs the same user question through up to 5 different system prompts in parallel and shows all responses side by side.

1. Enter the question: *"What is recursion?"* and run all 5 presets.
   - **Concise**: one sentence. Useful for tooltips, summaries.
   - **Detailed**: thorough explanation with examples. Useful for documentation.
   - **ELI5**: explain like I'm five. Useful for onboarding.
   - **Socratic**: refuses to answer directly, asks guiding questions instead. Useful for tutoring.
   - **Adversarial**: challenges the premise of the question. Useful for stress-testing assumptions.

2. Notice the token counts on each card. The Detailed response costs 3-5x more tokens than Concise. For a high-volume application, that difference is significant.

3. Try: *"How does HTTPS work?"* — the Socratic preset is particularly interesting here. It never answers the question directly.

4. Now write your own system prompt. Try: *"You are a grumpy senior engineer who answers every question with exactly one sentence and always ends with 'and that's all you need to know'."* Does the model follow it?

---

## Code Deep-Dive

The backend runs all selected presets concurrently:

```python
PRESETS = {
    "concise":    "Answer in one sentence.",
    "detailed":   "Give a thorough explanation with examples.",
    "eli5":       "Explain like I'm five years old.",
    "socratic":   "Do not answer directly. Ask guiding questions instead.",
    "adversarial":"Challenge the premise of the question.",
}

async def call_preset(preset_name: str, message: str):
    system = PRESETS[preset_name]
    resp = await client.chat.completions.create(
        model=INFERENCE_MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user",   "content": message},
        ],
        temperature=0.7,
    )
    return {"preset": preset_name, "response": resp.choices[0].message.content}

results = await asyncio.gather(*[
    call_preset(p, req.message) for p in req.presets
])
```

The only difference between the five calls is the system prompt string. Same model, same temperature, same user message. The system prompt is doing all the work.

One cost note: 5 parallel calls means 5× the input tokens. In production, you'd pick one system prompt and stick with it. This tab is for exploration — to help you find the right one.

---

## Key Takeaways

- The system prompt is the most powerful lever you have over model behaviour.
- Be specific: state the role, output format, and constraints explicitly.
- Different tasks need different prompts — there's no universal "good" system prompt.
- Parallel prompt comparison is a useful development technique for finding the best approach.
- Token cost scales with prompt length — every token in the system prompt is paid on every request.

---

## What's Next

You've seen how the system prompt shapes responses. But sometimes you need the model to learn a specific pattern — not from instructions, but from examples. That's few-shot prompting, and it's often more effective than trying to describe the pattern in words.
