# LLM-as-Judge

**Module:** Advanced Patterns | **Level:** Advanced
**Runtime:** ~7 min | **Tab:** `evaluate`

---

## Hook

You've built a RAG system. How do you know if it's working? You could read every response manually — but that doesn't scale. You could write unit tests — but LLM output is too variable for exact matching. LLM-as-Judge is the practical answer: use a second LLM call to evaluate the quality of the first one, at scale, automatically.

---

## Concept

**LLM-as-Judge** uses an LLM to score generated text on dimensions like:
- **Faithfulness**: does the answer stay within the provided context, or does it hallucinate?
- **Relevance**: does the answer address the question that was asked?
- **Completeness**: does the answer cover all aspects of the question?
- **Coherence**: is the answer well-structured and readable?

The judge receives the question, the context (retrieved documents), and the generated answer. It returns a structured score with reasoning. This is the foundation of automated evaluation pipelines — you can run it on thousands of question-answer pairs overnight and get a quality report.

Why use an LLM as the judge rather than a rule-based system? Because quality is semantic, not syntactic. A rule-based system can check if the answer contains certain keywords. An LLM can reason about whether the answer actually addresses the question, whether it contradicts the context, and whether it's missing important information.

Limitations to be honest about:
- The judge is itself an LLM — it can be wrong, biased, or inconsistent.
- Different judge prompts produce different scores for the same answer.
- High judge scores don't guarantee user satisfaction.
- This is a tool for relative comparison and regression detection, not absolute quality measurement.

---

## Demo Walkthrough

Open the **LLM-as-Judge** tab. It shows a question, context, and generated answer, with the judge's evaluation alongside.

1. Enter a question and context, then generate an answer. The judge scores it on faithfulness, relevance, and completeness (0-10 each) with a brief explanation for each score.

2. **Faithfulness test**: provide context about CSS flexbox. Ask a question about CSS grid. The generated answer may hallucinate grid information not in the context. The judge should flag low faithfulness.

3. **Relevance test**: provide good context. Ask a specific question. Generate a vague, generic answer. The judge should score relevance low even if the answer is technically correct.

4. **Completeness test**: ask a multi-part question. Generate an answer that only addresses one part. The judge should note the missing parts.

5. **Good answer**: provide relevant context, ask a clear question, generate a focused answer. All three scores should be high.

6. Try the same question with different generated answers. Does the judge consistently rank the better answer higher?

---

## Code Deep-Dive

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
- relevance: does the answer address the question?
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
result = json.loads(evaluation.choices[0].message.content)
```

Temperature 0 is important for the judge — you want consistent scores, not creative variation.

In a production evaluation pipeline, you'd run this over a golden dataset — a set of questions with known good answers — and track scores over time:

```python
# Batch evaluation
async def evaluate_batch(qa_pairs: list[dict]) -> list[dict]:
    return await asyncio.gather(*[
        evaluate_single(qa["question"], qa["context"], qa["answer"])
        for qa in qa_pairs
    ])

# Run nightly, alert if average faithfulness drops below threshold
results = await evaluate_batch(golden_dataset)
avg_faithfulness = sum(r["faithfulness"]["score"] for r in results) / len(results)
if avg_faithfulness < 7.0:
    alert("RAG faithfulness regression detected")
```

---

## Key Takeaways

- LLM-as-Judge uses a second LLM call to score generated text on faithfulness, relevance, and completeness.
- Use structured output and temperature 0 for consistent, parseable scores.
- This enables automated evaluation at scale — run over thousands of examples without human review.
- The judge is itself an LLM — treat scores as relative signals, not absolute ground truth.
- Build a golden dataset and track scores over time to detect quality regressions.

---

## What's Next

LLM-as-Judge detects quality issues after generation. The next tab addresses a specific quality failure: hallucination — when the model generates plausible-sounding but incorrect facts. We'll look at a two-step pattern for detecting and flagging hallucinated responses.
