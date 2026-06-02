# Few-Shot Prompting

**Module:** Prompting | **Level:** Beginner
**Runtime:** ~6 min | **Tab:** `few-shot`

---

## Hook

Sometimes you can't describe what you want in words. You know it when you see it — but writing instructions for it is hard. Few-shot prompting solves this: instead of describing the pattern, you show it. Three examples often outperform three paragraphs of instructions.

---

## Concept

**Zero-shot** prompting sends the model a task with no examples. The model relies entirely on its training to understand what you want.

**Few-shot** prompting provides input/output examples before the actual query. The model infers the pattern from the examples and applies it to new inputs — without any weight updates or fine-tuning. It's in-context learning.

Why does it work? The model has seen enormous amounts of text during training, including many examples of "here are some examples, now do the same thing". It's learned to recognise and continue that pattern.

When to use few-shot:
- The output format is hard to describe but easy to demonstrate (e.g. a specific JSON structure, a particular writing style).
- The task involves a domain-specific convention the model might not know.
- Zero-shot gives inconsistent results and you need more reliability.

When not to use few-shot:
- The task is simple and zero-shot already works well — examples add tokens for no benefit.
- You have many examples — at some point, fine-tuning is more efficient than a very long prompt.
- Your examples are low quality — bad examples actively hurt performance.

---

## Demo Walkthrough

Open the **Few-Shot** tab. It shows a task description, an examples editor, and a query input. It runs zero-shot and few-shot in parallel.

1. Use the **SQL generation** preset. The task is: convert natural language to SQL. Add 2-3 examples like:
   - Input: *"Find all users over 30"* → Output: `SELECT * FROM users WHERE age > 30`
   - Input: *"Count orders from last week"* → Output: `SELECT COUNT(*) FROM orders WHERE created_at > NOW() - INTERVAL 7 DAY`

   Now query: *"Get the top 5 products by revenue"*. Compare zero-shot vs few-shot. Few-shot should produce SQL that matches your schema conventions.

2. Try the **sentiment classification** preset. Examples:
   - *"I love this product!"* → `positive`
   - *"Terrible experience."* → `negative`

   Query: *"It was okay, nothing special."* Zero-shot might say "neutral" or "mixed". Few-shot will match your label vocabulary exactly.

3. Add a **contradictory example** — one that goes against the pattern. Does the model follow it? Usually yes, which is both the power and the risk of few-shot.

4. Try with 1 example vs 3 examples. Does quality improve? For simple patterns, 1-2 examples is often enough.

---

## Code Deep-Dive

The key is how examples are injected into the message list:

```python
messages = [{"role": "system", "content": f"Task: {task}"}]

# Inject examples as alternating user/assistant turns
for example in examples:
    messages.append({"role": "user",      "content": example["input"]})
    messages.append({"role": "assistant", "content": example["output"]})

# Append the real query last
messages.append({"role": "user", "content": user_input})

completion = await client.chat.completions.create(
    model=INFERENCE_MODEL,
    messages=messages,
    temperature=0,
)
```

The examples are formatted as a conversation: user says the input, assistant says the output. The model sees this as a conversation history and continues the pattern for the new user message.

Temperature 0 is used here because few-shot tasks usually want consistent, pattern-following output — not creative variation.

The zero-shot call is identical but with the examples list empty:

```python
# Zero-shot: same structure, no examples
messages = [
    {"role": "system", "content": f"Task: {task}"},
    {"role": "user",   "content": user_input},
]
```

Both calls run in parallel with `asyncio.gather` so you see the comparison immediately.

---

## Key Takeaways

- Few-shot prompting teaches the model a pattern through examples, not instructions.
- Examples are injected as alternating user/assistant messages before the real query.
- Quality of examples matters more than quantity — 2 good examples beat 10 mediocre ones.
- Use temperature 0 for few-shot tasks that require consistent pattern-following.
- Few-shot is not fine-tuning — it's in-context learning, and it costs tokens on every request.

---

## What's Next

Few-shot helps with pattern and format. But for tasks that require multi-step reasoning — maths, logic, code analysis — there's a more powerful technique: asking the model to show its work before giving an answer.
