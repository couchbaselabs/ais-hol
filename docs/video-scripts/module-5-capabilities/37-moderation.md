# Moderation

**Module:** LLM Capabilities | **Level:** Intermediate
**Runtime:** ~6 min | **Tab:** `moderation`

---

## Hook

> 🎬 **SHOW:** Moderation tab open, text input visible, empty category scores panel below.

Every user-facing AI application needs a content safety layer. The OpenAI moderation API is a free, fast endpoint that classifies text across 11 harm categories — hate, harassment, violence, self-harm, sexual content, and more. It returns a flag and per-category scores in milliseconds. This tab shows how to use it as a pre-filter before your main LLM call.

---

## Concept

> 🎬 **SHOW:** Slide — the moderation pipeline: user input → moderation check → if flagged: reject; if clean: proceed to LLM.

The moderation API is designed to run *before* your main LLM call. If the input is flagged, you reject it immediately — no tokens consumed on the main model, no harmful content processed.

> 🎬 **SHOW:** Slide — the 11 categories: hate, hate/threatening, harassment, harassment/threatening, self-harm, self-harm/intent, self-harm/instructions, sexual, sexual/minors, violence, violence/graphic.

Each category returns a boolean `flagged` and a float `score` (0–1). The top-level `flagged` is `true` if *any* category exceeds its threshold.

> 🎬 **SHOW:** Slide — two use cases: (1) pre-filter user input before sending to LLM; (2) post-filter LLM output before showing to users.

You can use moderation in both directions: filter what users send *in*, and filter what the model sends *out*. Both are valid safety layers.

---

## Demo Walkthrough

> 🎬 **SHOW:** Moderation tab, text input ready.

1. Enter clearly safe text: *"How do I bake a chocolate cake?"* Submit.

   > 🎬 **SHOW:** All category scores near zero, `flagged: false`. Green indicator.

   Clean input. All scores well below thresholds. This is the expected path for the vast majority of real user inputs.

2. Enter text with mild violence: *"I want to punch my computer when it crashes."*

   > 🎬 **SHOW:** Violence score elevated but below threshold — `flagged: false`. Point to the score value.

   Colloquial expressions of frustration score low on violence but don't cross the threshold. The model distinguishes hyperbole from genuine intent.

3. Enter text that should be flagged — something clearly harmful (use a placeholder in the demo).

   > 🎬 **SHOW:** One or more category scores spike above threshold, `flagged: true`. Red indicator. Point to the specific category that triggered.

   The flagged category tells you *why* the content was rejected — useful for logging and for crafting appropriate user-facing error messages.

4. Enter text that tests the self-harm category: *"I've been feeling really hopeless lately and I don't know what to do."*

   > 🎬 **SHOW:** Self-harm score may be elevated. Point out the nuance — this is a cry for help, not harmful content. Discuss the trade-off.

   This is a nuanced case. The moderation API may flag it; your application should respond with empathy and resources, not a generic "content rejected" error. Moderation scores are signals, not binary decisions — your application logic decides what to do with them.

---

## Code Deep-Dive

> 🎬 **SHOW:** `backend/main.py`, scrolled to `/api/moderation`. Highlight the `moderations.create()` call.

```python
response = client.moderations.create(input=body.text)
result   = response.results[0]

categories = result.categories.model_dump()   # dict of category → bool
scores     = result.category_scores.model_dump()  # dict of category → float

return {
    "flagged":    result.flagged,
    "categories": categories,
    "scores":     scores,
}
```

> 🎬 **SHOW:** Highlight that `moderations.create()` is free and not billed per token.

The moderation endpoint is free — it doesn't count against your token usage. There's no reason not to run it on every user input.

> 🎬 **SHOW:** Slide — the pre-filter pattern in a chat endpoint.

```python
@app.post("/api/chat")
async def chat(body: ChatRequest):
    # Pre-filter user input
    mod = client.moderations.create(input=body.message)
    if mod.results[0].flagged:
        flagged_cats = [
            k for k, v in mod.results[0].categories.model_dump().items() if v
        ]
        raise HTTPException(
            status_code=400,
            detail=f"Content flagged: {', '.join(flagged_cats)}"
        )
    # Proceed with main LLM call
    ...
```

> 🎬 **SHOW:** Highlight the specific category extraction — returning *which* categories triggered, not just a boolean.

Log the specific categories that triggered. This data is valuable for understanding your user base and tuning your safety thresholds over time.

---

## Key Takeaways

> 🎬 **SHOW:** Results panel showing category scores with the flagged indicator visible.

- The moderation API is free, fast, and covers 11 harm categories — run it on every user input.
- Use it as a pre-filter before your main LLM call to avoid processing harmful content.
- `flagged` is a boolean; `category_scores` are floats — use the scores for nuanced decisions, not just the boolean.
- Log which categories triggered, not just whether content was flagged — this data improves your safety posture over time.
- Moderation is a signal, not a complete safety solution — combine it with system prompt guardrails and output filtering.

---

## What's Next

> 🎬 **SHOW:** Sidebar — highlight the next tab `tool-calling`.

Next: Tool Calling — giving the LLM the ability to invoke functions in your application and act on the results.
