# Chain-of-Thought

**Module:** Prompting | **Level:** Beginner
**Runtime:** ~6 min | **Tab:** `chain-of-thought`

---

## Hook

> 🎬 **SHOW:** Chain-of-Thought tab open, two-column layout visible — "Direct" on the left, "Chain-of-Thought" on the right, both empty.

A bat and a ball cost $1.10 in total. The bat costs $1.00 more than the ball. How much does the ball cost? Most people say 10 cents — and most LLMs, asked directly, say the same. It's wrong. The answer is 5 cents. Chain-of-thought prompting is what makes the model get it right.

---

## Concept

> 🎬 **SHOW:** Slide — two paths from the same question: "Direct" jumps straight to an answer (wrong), "CoT" shows intermediate steps leading to the correct answer.

Chain-of-thought (CoT) prompting asks the model to reason through a problem step by step before giving a final answer. The instruction is simple: *"Think step by step before answering."*

Why does this work? When the model generates a reasoning trace, each step becomes part of the context for the next step. The model can catch its own errors mid-reasoning in a way it can't when jumping straight to an answer. It's the difference between mental arithmetic and writing out the working.

> 🎬 **SHOW:** Slide — "CoT helps" column: multi-step maths, logic puzzles, code analysis. "CoT doesn't help" column: factual recall, simple questions, creative writing.

CoT helps most on multi-step maths, logic, and code analysis. It adds little value for factual recall or simple questions.

The cost: CoT produces more output tokens. A reasoning trace might be 200 tokens before the 10-token answer. For high-volume applications, that's a real cost increase. Use it selectively.

---

## Demo Walkthrough

> 🎬 **SHOW:** Chain-of-Thought tab, question input ready, both columns visible.

1. Try the bat-and-ball problem: *"A bat and a ball cost $1.10 in total. The bat costs $1.00 more than the ball. How much does the ball cost?"*

   > 🎬 **SHOW:** Type the question, click Run. Watch both columns populate. Point to the Direct column — likely says "10 cents". Point to the CoT column — it should set up the equation and arrive at "5 cents".

   Direct: likely says "10 cents" — wrong. CoT: sets up the equation, solves it, arrives at "5 cents" — correct.

2. Try: *"If I have 3 apples and give away half, then buy 4 more, how many do I have?"*

   > 🎬 **SHOW:** Clear and run. Point to the CoT reasoning trace showing each arithmetic step.

   CoT shows each step clearly.

3. Try a factual question: *"What is the capital of Australia?"*

   > 🎬 **SHOW:** Clear and run. Both columns should say "Canberra". Point to the CoT column — it adds reasoning but the answer is the same.

   Both should say "Canberra". CoT adds no value here — just extra tokens.

4. Look at the token counts.

   > 🎬 **SHOW:** Point to the token count badges on both cards. The CoT card should show significantly more output tokens.

   How many extra tokens does the reasoning trace cost? Is the accuracy improvement worth it for your use case?

---

## Code Deep-Dive

> 🎬 **SHOW:** Open `backend/main.py`, scrolled to the chain-of-thought endpoint. Show the two system prompt strings side by side.

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

> 🎬 **SHOW:** Highlight the two system prompt strings — point out how minimal the CoT instruction is: just "think step by step".

The instruction is minimal — "think step by step" is enough. The model knows what to do.

> 🎬 **SHOW:** Scroll down to show how the UI splits the CoT response — looking for "Therefore," or "The answer is" to separate reasoning from conclusion.

The UI parses the CoT response to separate the reasoning trace from the final answer. In production, you'd use structured output to get them as separate JSON fields — cleaner than string parsing.

---

## Key Takeaways

> 🎬 **SHOW:** Return to the tab with the bat-and-ball problem — Direct showing "10 cents" (wrong), CoT showing the correct working and "5 cents".

- CoT prompting asks the model to show its reasoning before answering, improving accuracy on multi-step problems.
- The instruction is simple: *"Think step by step."* The model knows what to do.
- CoT helps most on maths, logic, and code analysis. It adds little value for factual recall.
- The reasoning trace costs extra output tokens — use CoT selectively based on task complexity.
- The reasoning trace is not verified — the model can reason incorrectly. CoT improves accuracy on average, not absolutely.

---

## What's Next

> 🎬 **SHOW:** Click "Personas" in the sidebar.

You've learned how to shape model behaviour through instructions and reasoning. The next technique is more subtle: using the system prompt to give the model a complete identity — a persona — that shapes not just what it says but how it says it.
