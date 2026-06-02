# Hallucination Detection

**Module:** Advanced Patterns | **Level:** Advanced
**Runtime:** ~7 min | **Tab:** `hallucination`

---

## Hook

LLMs are fluent liars. They generate confident, well-structured, grammatically perfect text about things that never happened, people who don't exist, and facts that are simply wrong. This is hallucination — and it's not a bug that will be fixed in the next model version. It's a fundamental property of how these models work. The question isn't how to eliminate it; it's how to detect it.

---

## Concept

**Hallucination** occurs when an LLM generates text that is factually incorrect or unsupported by the provided context. It happens because the model is a text predictor, not a fact database — it generates the most plausible-sounding continuation, which is not always the true one.

Two categories:

**Intrinsic hallucination**: the model contradicts information in the provided context. *"The document says X, but the model says not-X."* This is detectable by comparing the answer to the context.

**Extrinsic hallucination**: the model adds information not present in the context — information that may or may not be true. *"The document doesn't mention Y, but the model asserts Y."* This is harder to detect without external knowledge.

The two-step detection pattern:

1. **Generate**: produce an answer (with or without grounding context).
2. **Verify**: use a second LLM call to fact-check the answer against the context (or against the model's own knowledge).

The verifier returns a verdict: `grounded` (answer is supported by context), `hallucinated` (answer contradicts or extends beyond context), or `uncertain` (can't determine).

This pattern doesn't eliminate hallucination — it detects it. The application can then decide: show the answer with a warning, regenerate, or refuse to answer.

---

## Demo Walkthrough

Open the **Hallucination Detection** tab. It shows the question, optional grounding context, the generated answer, and the verifier's verdict.

1. **No context, obscure fact**: ask about a real but obscure historical event. Does the model hallucinate details? Is the verifier confident in its verdict?

2. **With correct context**: provide a paragraph about CSS flexbox. Ask a question answered by the context. The answer should be grounded — the verifier should say `grounded` with high confidence.

3. **With correct context, off-topic question**: provide the same CSS context. Ask about CSS grid (not in the context). The model may hallucinate grid information. The verifier should flag `hallucinated` or `uncertain`.

4. **Deliberately wrong context**: provide a paragraph with intentionally incorrect information (e.g. *"CSS flexbox was invented in 2020"*). Ask when flexbox was invented. Does the model follow the wrong context or correct it from training? What does the verifier say?

5. **Fictional person**: ask about a fictional person as if they were real. What does the model invent? Is the verifier confident it's hallucinated?

---

## Code Deep-Dive

The two-step generate-then-verify pattern:

```python
# Step 1: generate
answer_completion = await client.chat.completions.create(
    model=INFERENCE_MODEL,
    messages=[{
        "role": "system",
        "content": (
            f"Answer based on this context:\n{context}\n\n"
            if context else
            "Answer the question."
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
# result = {
#   "verdict": "grounded" | "hallucinated" | "uncertain",
#   "confidence": 0.0-1.0,
#   "issues": ["specific claim X is not in context", ...],
#   "explanation": "..."
# }
```

The verifier uses temperature 0 for consistent verdicts. The `issues` list identifies specific claims that are problematic — useful for showing the user exactly what to be skeptical of.

In production, you'd combine this with RAG: if the verifier flags `hallucinated`, regenerate with a stricter system prompt that says *"Only answer from the provided context. If the context doesn't contain the answer, say so."*

---

## Key Takeaways

- Hallucination is a fundamental property of LLMs — they generate plausible text, not necessarily true text.
- Intrinsic hallucination (contradicts context) is detectable; extrinsic hallucination (adds unsupported information) is harder.
- The two-step pattern: generate an answer, then use a second LLM call to verify it against the context.
- The verifier is itself an LLM — it can also be wrong. Treat verdicts as signals, not guarantees.
- RAG reduces hallucination by grounding answers in retrieved context, but doesn't eliminate it.

---

## What's Next

You've completed the Advanced Patterns module. Now we move to Production — the concerns that matter when your system handles real traffic: cost and latency optimisation, and safety guardrails that protect both users and your application.
