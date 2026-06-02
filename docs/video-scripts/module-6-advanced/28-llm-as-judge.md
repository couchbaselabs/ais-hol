# LLM-as-Judge

**Module:** Advanced Patterns | **Level:** Advanced
**Runtime:** ~7 min | **Tab:** `evaluate`

---

## Hook

> 🎬 **SHOW:** LLM-as-Judge tab open, three input fields visible: question, context (retrieved documents), and generated answer. Score cards area below empty.

You've built a RAG system. How do you know if it's working? You could read every response manually — but that doesn't scale. You could write unit tests — but LLM output is too variable for exact matching. LLM-as-Judge is the practical answer: use a second LLM call to evaluate the quality of the first one, at scale, automatically.

---

## Concept

> 🎬 **SHOW:** Slide — three evaluation dimensions with icons: "Faithfulness" (answer stays within context), "Relevance" (answer addresses the question), "Completeness" (answer covers all aspects). Each scored 0-10.

**LLM-as-Judge** uses an LLM to score generated text on dimensions like faithfulness, relevance, and completeness. The judge receives the question, the context, and the generated answer, and returns a structured score with reasoning.

> 🎬 **SHOW:** Slide — "Why LLM judge vs rule-based? Quality is semantic, not syntactic. An LLM can reason about whether the answer actually addresses the question."

Why use an LLM as the judge rather than a rule-based system? Because quality is semantic, not syntactic. A rule-based system can check keywords. An LLM can reason about whether the answer actually addresses the question.

> 🎬 **SHOW:** Slide — limitations: "The judge is itself an LLM — it can be wrong. Use scores for relative comparison and regression detection, not absolute quality measurement."

Limitations: the judge can be wrong, different judge prompts produce different scores, and high scores don't guarantee user satisfaction. Use this for relative comparison and regression detection.

---

## Demo Walkthrough

> 🎬 **SHOW:** LLM-as-Judge tab, all three input fields visible.

1. Enter a question, relevant context, and a good answer. Click **Evaluate**.

   > 🎬 **SHOW:** Fill in all three fields with a well-matched question/context/answer. Click Evaluate. Watch the three score cards populate with scores and explanations. Point to each score and read the explanation aloud.

   The judge scores it on faithfulness, relevance, and completeness (0-10 each) with a brief explanation for each score.

2. **Faithfulness test**: provide context about CSS flexbox. Ask a question about CSS grid. Generate an answer that mentions grid properties not in the context.

   > 🎬 **SHOW:** Set up the mismatch — flexbox context, grid question, hallucinated answer. Click Evaluate. Point to the low faithfulness score and the explanation identifying the hallucinated claims.

   The judge should flag low faithfulness — the answer contains information not in the context.

3. **Relevance test**: provide good context. Ask a specific question. Enter a vague, generic answer.

   > 🎬 **SHOW:** Enter a vague answer like "CSS is a styling language used for web pages." for a specific question. Point to the low relevance score.

   The judge should score relevance low even if the answer is technically correct.

4. **Completeness test**: ask a multi-part question. Enter an answer that only addresses one part.

   > 🎬 **SHOW:** Ask "What are flexbox and grid, and when should I use each?" Enter an answer that only explains flexbox. Point to the completeness score and the explanation noting the missing grid coverage.

   The judge should note the missing parts.

5. **Good answer**: provide relevant context, ask a clear question, enter a focused answer.

   > 🎬 **SHOW:** Set up a well-matched scenario. Point to all three scores being high (8-10). Read the positive explanations.

   All three scores should be high.

---

## Code Deep-Dive

> 🎬 **SHOW:** Open `backend/main.py`, scrolled to the evaluation endpoint. Highlight the evaluation prompt and `response_format`.

The evaluation prompt uses structured output:

```python
eval_prompt = f"""
You are evaluating an AI-generated answer.

Question: {question}
Context provided to the AI:
{context}

Generated answer:
{answer}

Score the answer on three dimensions (0-10 each):
- faithfulness: does the answer stay within the provided context?
- relevance:    does the answer address the question?
- completeness: does the answer cover all aspects of the question?

Return JSON:
{{
  "faithfulness": {{"score": int, "reason": str}},
  "relevance":    {{"score": int, "reason": str}},
  "completeness": {{"score": int, "reason": str}},
  "overall":      {{"score": int, "summary": str}}
}}
"""

evaluation = await client.chat.completions.create(
    model=INFERENCE_MODEL,
    messages=[{"role": "user", "content": eval_prompt}],
    response_format={"type": "json_object"},
    temperature=0,   # deterministic scoring
)
```

> 🎬 **SHOW:** Highlight `temperature=0` — explain why determinism matters for consistent scoring.

Temperature 0 is important for the judge — you want consistent scores, not creative variation.

> 🎬 **SHOW:** Show a slide or code snippet of a batch evaluation loop — the production use case.

In a production evaluation pipeline, you'd run this over a golden dataset and track scores over time:

```python
async def evaluate_batch(qa_pairs: list[dict]) -> list[dict]:
    return await asyncio.gather(*[
        evaluate_single(qa["question"], qa["context"], qa["answer"])
        for qa in qa_pairs
    ])

# Alert if average faithfulness drops below threshold
results = await evaluate_batch(golden_dataset)
avg_faithfulness = sum(r["faithfulness"]["score"] for r in results) / len(results)
if avg_faithfulness < 7.0:
    alert("RAG faithfulness regression detected")
```

---

## Key Takeaways

> 🎬 **SHOW:** Return to the tab with the faithfulness test — low faithfulness score visible with the explanation identifying the hallucinated claims.

- LLM-as-Judge uses a second LLM call to score generated text on faithfulness, relevance, and completeness.
- Use structured output and temperature 0 for consistent, parseable scores.
- This enables automated evaluation at scale — run over thousands of examples without human review.
- The judge is itself an LLM — treat scores as relative signals, not absolute ground truth.
- Build a golden dataset and track scores over time to detect quality regressions.

---

## What's Next

> 🎬 **SHOW:** Click "Hallucination Detection" in the sidebar.

LLM-as-Judge detects quality issues after generation. The next tab addresses a specific quality failure: hallucination — when the model generates plausible-sounding but incorrect facts. We'll look at a two-step pattern for detecting and flagging hallucinated responses.
