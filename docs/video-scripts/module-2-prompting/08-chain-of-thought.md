# Chain-of-Thought

**Module:** Prompting | **Level:** Beginner
**Runtime:** ~6 min | **Tab:** `chain-of-thought`

---

## Hook

A bat and a ball cost $1.10 in total. The bat costs $1.00 more than the ball. How much does the ball cost? Most people say 10 cents — and most LLMs, asked directly, say the same. It's wrong. The answer is 5 cents. Chain-of-thought prompting is what makes the model get it right.

---

## Concept

Chain-of-thought (CoT) prompting asks the model to reason through a problem step by step before giving a final answer. The instruction is simple: *"Think step by step before answering."*

Why does this work? When the model generates a reasoning trace, each step becomes part of the context for the next step. The model can catch its own errors mid-reasoning in a way it can't when jumping straight to an answer. It's the difference between mental arithmetic and writing out the working.

CoT helps most on:
- Multi-step maths and logic problems
- Code analysis and debugging
- Problems where the answer depends on intermediate conclusions

CoT helps least on:
- Simple factual recall — the model knows the answer or it doesn't
- Tasks where the reasoning trace itself is the output (e.g. writing)
- Very short, obvious questions

The cost: CoT produces more output tokens. A reasoning trace might be 200 tokens before the 10-token answer. For high-volume applications, that's a real cost increase. Use it selectively.

One important caveat: **the reasoning trace is not verified**. The model can reason incorrectly and still reach a wrong answer. CoT improves accuracy on average, but it's not a guarantee. Some newer models (o1, o3) do chain-of-thought internally — explicit CoT prompting is less necessary for those.

---

## Demo Walkthrough

Open the **Chain-of-Thought** tab. It runs the same question with two system prompts in parallel: direct (answer only) and CoT (think step by step).

1. Try the bat-and-ball problem: *"A bat and a ball cost $1.10 in total. The bat costs $1.00 more than the ball. How much does the ball cost?"*
   - Direct: likely says "10 cents" — wrong.
   - CoT: sets up the equation, solves it, arrives at "5 cents" — correct.

2. Try: *"If I have 3 apples and give away half, then buy 4 more, how many do I have?"*
   - Direct: might get this right or wrong depending on the model.
   - CoT: shows each step clearly.

3. Try a factual question: *"What is the capital of Australia?"*
   - Both should say "Canberra". CoT adds no value here — just extra tokens.

4. Look at the token counts. How many extra tokens does the reasoning trace cost? Is the accuracy improvement worth it for your use case?

---

## Code Deep-Dive

The implementation is two parallel calls with different system prompts:

```python
direct_system = (
    "Answer the question directly and concisely. "
    "Give only the final answer."
)
cot_system = (
    "Think through the problem step by step before giving "
    "your final answer. Show your reasoning explicitly, "
    "then state the answer clearly at the end."
)

# Both calls run in parallel:
direct, cot = await asyncio.gather(
    call(direct_system, question),
    call(cot_system, question),
)
```

The UI then parses the CoT response to separate the reasoning trace from the final answer. It looks for patterns like "Therefore," or "The answer is" to split the response. This parsing is heuristic — in production, you'd use structured output (a later tab) to get the reasoning and answer as separate JSON fields.

A production pattern for CoT with structured output:

```python
# Ask for reasoning + answer as structured JSON
completion = await client.chat.completions.create(
    model=INFERENCE_MODEL,
    messages=[{"role": "user", "content": question}],
    response_format={"type": "json_object"},
    # system prompt asks for: {"reasoning": "...", "answer": "..."}
)
result = json.loads(completion.choices[0].message.content)
reasoning = result["reasoning"]
answer = result["answer"]
```

This gives you clean separation without fragile string parsing.

---

## Key Takeaways

- CoT prompting asks the model to show its reasoning before answering, improving accuracy on multi-step problems.
- The instruction is simple: *"Think step by step."* The model knows what to do.
- CoT helps most on maths, logic, and code analysis. It adds little value for factual recall.
- The reasoning trace costs extra output tokens — use CoT selectively based on task complexity.
- The reasoning trace is not verified — the model can reason incorrectly. CoT improves accuracy on average, not absolutely.

---

## What's Next

You've learned how to shape model behaviour through instructions and reasoning. The next technique is more subtle: using the system prompt to give the model a complete identity — a persona — that shapes not just what it says but how it says it.
