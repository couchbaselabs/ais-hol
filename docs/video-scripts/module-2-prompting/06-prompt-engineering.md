# Prompt Engineering

**Module:** Prompting | **Level:** Beginner
**Runtime:** ~6 min | **Tab:** `prompt`

---

## Hook

> 🎬 **SHOW:** Prompt Engineering tab open, five preset cards visible side by side, all empty — waiting for a prompt.

Two developers build the same feature. One gets mediocre results and concludes the model isn't good enough. The other gets excellent results from the same model. The difference is almost always the system prompt. Prompt engineering isn't a soft skill — it's the primary interface between your application and the model.

---

## Concept

> 🎬 **SHOW:** Slide — a single user question at the top, five arrows branching down to five different system prompts, each producing a different response style.

The system prompt is evaluated before any user input. It sets the model's persona, constraints, output format, and reasoning style. A well-written system prompt can make a weak model perform like a strong one. A poorly written one can make a strong model perform poorly.

The key insight: the model is a text completion engine. It predicts what text should come next given everything it has seen. Your system prompt is the beginning of that context. If your system prompt reads like a confident, precise expert, the model will complete it like a confident, precise expert.

> 🎬 **SHOW:** Slide — two columns: "Works well" (explicit role, output format, constraints) vs "Doesn't work" (vague instructions, contradictions, negative-only rules).

Effective system prompts state the role explicitly, specify the output format, and set constraints. What doesn't work: vague instructions like "be helpful", contradictory constraints, or negative-only instructions. Tell it what to do, not just what not to do.

---

## Demo Walkthrough

> 🎬 **SHOW:** Prompt Engineering tab, all five preset checkboxes ticked, prompt input ready.

1. Enter the question: *"What is recursion?"* and run all 5 presets.

   > 🎬 **SHOW:** Type the question, click Run. Watch all five cards populate in parallel. Once done, pan slowly across each card left to right as you describe each one.

   - **Concise**: one sentence. Useful for tooltips, summaries.
   - **Detailed**: thorough explanation with examples. Useful for documentation.
   - **ELI5**: explain like I'm five. Useful for onboarding.
   - **Socratic**: refuses to answer directly, asks guiding questions instead.
   - **Adversarial**: challenges the premise of the question.

2. Notice the token counts on each card.

   > 🎬 **SHOW:** Point to the token count badge on the Concise card, then the Detailed card. The difference should be 3-5×.

   The Detailed response costs 3-5× more tokens than Concise. For a high-volume application, that difference is significant.

3. Try: *"How does HTTPS work?"*

   > 🎬 **SHOW:** Clear the input, type the new question, run. Scroll to the Socratic card and read a few of its questions aloud.

   The Socratic preset is particularly interesting here — it never answers the question directly.

4. Write your own system prompt.

   > 🎬 **SHOW:** Click the "Custom" preset option, type a custom system prompt in the text field: "You are a grumpy senior engineer who answers every question correctly but always ends with 'and that's all you need to know'." Run it.

   Does the model follow it? Try to predict what it will say before it responds.

---

## Code Deep-Dive

> 🎬 **SHOW:** Open `backend/main.py`, scrolled to the `/api/chat-prompt` endpoint. Highlight the `PRESETS` dictionary.

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

> 🎬 **SHOW:** Highlight that the only difference between the five calls is the `system` string — same model, same temperature, same user message.

The only difference between the five calls is the system prompt string. Same model, same temperature, same user message. The system prompt is doing all the work.

---

## Key Takeaways

> 🎬 **SHOW:** Return to the tab with all five cards visible for the "What is recursion?" question.

- The system prompt is the most powerful lever you have over model behaviour.
- Be specific: state the role, output format, and constraints explicitly.
- Different tasks need different prompts — there's no universal "good" system prompt.
- Parallel prompt comparison is a useful development technique for finding the best approach.
- Token cost scales with prompt length — every token in the system prompt is paid on every request.

---

## What's Next

> 🎬 **SHOW:** Click "Few-Shot" in the sidebar.

You've seen how the system prompt shapes responses. But sometimes you need the model to learn a specific pattern — not from instructions, but from examples. That's few-shot prompting, and it's often more effective than trying to describe the pattern in words.
