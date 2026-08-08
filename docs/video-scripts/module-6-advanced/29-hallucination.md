# Hallucination Detection

**Module:** Advanced Patterns | **Level:** Advanced
**Runtime:** ~7 min | **Tab:** `hallucination`

---

## Hook

> 🎬 **SHOW:** Hallucination Detection tab open, question input, optional context field, generated answer area, and verdict panel — all empty.

LLMs are fluent liars. They generate confident, well-structured, grammatically perfect text about things that never happened, people who don't exist, and facts that are simply wrong. This is hallucination — and it's not a bug that will be fixed in the next model version. It's a fundamental property of how these models work. The question isn't how to eliminate it; it's how to detect it.

---

## Concept

> 🎬 **SHOW:** Slide — two categories: "Intrinsic hallucination" (model contradicts the provided context — detectable) vs "Extrinsic hallucination" (model adds information not in context — harder to detect).

**Hallucination** occurs when an LLM generates text that is factually incorrect or unsupported by the provided context. Two categories:

**Intrinsic**: the model contradicts information in the provided context. Detectable by comparing the answer to the context.

**Extrinsic**: the model adds information not present in the context — information that may or may not be true. Harder to detect without external knowledge.

> 🎬 **SHOW:** Slide — two-step pattern: "1. Generate answer → 2. Verify answer against context". Verdict: grounded / hallucinated / uncertain.

The two-step detection pattern: generate an answer, then use a second LLM call to fact-check it against the context. The verifier returns a verdict: `grounded`, `hallucinated`, or `uncertain`.

> 🎬 **SHOW:** Slide — "This pattern detects hallucination, it doesn't eliminate it. The application decides what to do: show with warning, regenerate, or refuse."

This pattern doesn't eliminate hallucination — it detects it. The application can then decide what to do.

---

## Demo Walkthrough

> 🎬 **SHOW:** Hallucination Detection tab, all fields visible.

1. **No context, obscure fact**: ask about a real but obscure historical event.

   > 🎬 **SHOW:** Leave context empty, ask about something obscure. Submit. Point to the generated answer — does it sound confident? Point to the verdict — is the verifier confident it's hallucinated or uncertain?

   Does the model hallucinate details? Is the verifier confident in its verdict?

2. **With correct context**: provide a paragraph about CSS flexbox. Ask a question answered by the context.

   > 🎬 **SHOW:** Paste a CSS flexbox paragraph in the context field. Ask "What does `flex-direction: row` do?" Submit. Point to the `grounded` verdict — the answer is supported by the context.

   The answer should be grounded — the verifier should say `grounded` with high confidence.

3. **With correct context, off-topic question**: provide the same CSS context. Ask about CSS grid.

   > 🎬 **SHOW:** Keep the flexbox context, change the question to ask about CSS grid. Submit. Point to the `hallucinated` or `uncertain` verdict — the model added information not in the context.

   The model may hallucinate grid information. The verifier should flag `hallucinated` or `uncertain`.

4. **Deliberately wrong context**: provide a paragraph with intentionally incorrect information.

   > 🎬 **SHOW:** Paste a context that says something factually wrong (e.g. "CSS flexbox was invented in 2020"). Ask when flexbox was invented. Point to whether the model follows the wrong context or corrects it from training.

   Does the model follow the wrong context or correct it from training? What does the verifier say?

5. **Fictional person**: ask about a fictional person as if they were real.

   > 🎬 **SHOW:** Ask about a made-up person with a plausible name. Point to the model inventing a biography. Point to the verifier flagging it as hallucinated.

   What does the model invent? Is the verifier confident it's hallucinated?

---

## Code Deep-Dive

> 🎬 **SHOW:** Open `backend/main.py`, scrolled to the hallucination detection endpoint. Show the two-step structure clearly.

The two-step generate-then-verify pattern:

```python
# Step 1: generate
answer_completion = await client.chat.completions.create(
    model=INFERENCE_MODEL,
    messages=[{
        "role": "system",
        "content": (
            f"Answer based on this context:\n{context}\n\n"
            if context else "Answer the question."
        ),
    }, {"role": "user", "content": question}],
    temperature=0.3,
)
answer = answer_completion.choices[0].message.content

# Step 2: fact-check
check_prompt = (
    f"Question: {question}\n"
    f"Answer to verify: {answer}\n"
    + (f"Grounding context:\n{context}\n" if context else "")
    + "Return JSON: {verdict, confidence, issues, explanation}"
)
check = await client.chat.completions.create(
    model=INFERENCE_MODEL,
    messages=[{"role": "user", "content": check_prompt}],
    response_format={"type": "json_object"},
    temperature=0,
)
result = json.loads(check.choices[0].message.content)
```

> 🎬 **SHOW:** Highlight `temperature=0` for the verifier — consistent verdicts. Highlight `temperature=0.3` for generation — slightly creative but still grounded.

The verifier uses temperature 0 for consistent verdicts. Generation uses 0.3 — slightly creative but still grounded.

> 🎬 **SHOW:** Highlight the `issues` field in the result — explain it identifies specific claims that are problematic.

The `issues` list identifies specific claims that are problematic — useful for showing the user exactly what to be skeptical of.

---

## Key Takeaways

> 🎬 **SHOW:** Return to the tab with the off-topic question — `hallucinated` verdict visible, issues list showing the specific claims that weren't in the context.

- Hallucination is a fundamental property of LLMs — they generate plausible text, not necessarily true text.
- Intrinsic hallucination (contradicts context) is detectable; extrinsic hallucination (adds unsupported information) is harder.
- The two-step pattern: generate an answer, then use a second LLM call to verify it against the context.
- The verifier is itself an LLM — it can also be wrong. Treat verdicts as signals, not guarantees.
- RAG reduces hallucination by grounding answers in retrieved context, but doesn't eliminate it.

---

## What's Next

> 🎬 **SHOW:** Click "Cost & Latency" in the sidebar — the first tab of Module 7.

You've completed the Advanced Patterns module. Now we move to Production — the concerns that matter when your system handles real traffic: cost and latency optimisation, and safety guardrails that protect both users and your application.
