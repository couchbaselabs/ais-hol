# Few-Shot Prompting

**Module:** Prompting | **Level:** Beginner
**Runtime:** ~6 min | **Tab:** `few-shot`

---

## Hook

> 🎬 **SHOW:** Few-Shot tab open, showing the task description field, examples editor (empty), and the two-column zero-shot vs few-shot comparison layout.

Sometimes you can't describe what you want in words. You know it when you see it — but writing instructions for it is hard. Few-shot prompting solves this: instead of describing the pattern, you show it. Three examples often outperform three paragraphs of instructions.

---

## Concept

> 🎬 **SHOW:** Slide — left column "Zero-shot": task description + query → response. Right column "Few-shot": task description + example 1 + example 2 + example 3 + query → response. Arrow pointing to the examples labelled "in-context learning".

**Zero-shot** prompting sends the model a task with no examples. The model relies entirely on its training to understand what you want.

**Few-shot** prompting provides input/output examples before the actual query. The model infers the pattern from the examples and applies it to new inputs — without any weight updates or fine-tuning. It's in-context learning.

> 🎬 **SHOW:** Slide — "When to use few-shot" checklist: output format hard to describe, domain-specific conventions, zero-shot gives inconsistent results.

When to use few-shot: the output format is hard to describe but easy to demonstrate, the task involves domain-specific conventions, or zero-shot gives inconsistent results.

When not to use it: the task is simple and zero-shot already works, you have many examples (fine-tuning is more efficient), or your examples are low quality — bad examples actively hurt performance.

---

## Demo Walkthrough

> 🎬 **SHOW:** Few-Shot tab, SQL generation preset selected, examples editor visible.

1. Use the **SQL generation** preset. Add 2-3 examples:

   > 🎬 **SHOW:** Click "Add example", type the input and output for each. Show the examples appearing in the list.

   - Input: *"Find all users over 30"* → Output: `SELECT * FROM users WHERE age > 30`
   - Input: *"Count orders from last week"* → Output: `SELECT COUNT(*) FROM orders WHERE created_at > NOW() - INTERVAL 7 DAY`

   Now query: *"Get the top 5 products by revenue"*

   > 🎬 **SHOW:** Type the query, click Run. Point to both columns — zero-shot on the left, few-shot on the right. The few-shot result should match the schema conventions from the examples.

   Few-shot should produce SQL that matches your schema conventions.

2. Try the **sentiment classification** preset.

   > 🎬 **SHOW:** Switch to the sentiment preset. Show the examples: "I love this!" → positive, "Terrible." → negative. Run with "It was okay, nothing special."

   Zero-shot might say "neutral" or "mixed". Few-shot will match your label vocabulary exactly.

3. Add a **contradictory example**.

   > 🎬 **SHOW:** Add an example that goes against the pattern — e.g. a positive sentence labelled "negative". Run the query. Point to the model following the contradictory example.

   Does the model follow it? Usually yes — which is both the power and the risk of few-shot.

4. Try with 1 example vs 3 examples.

   > 🎬 **SHOW:** Delete two examples, run, then add them back and run again. Compare the outputs side by side.

   For simple patterns, 1-2 examples is often enough.

---

## Code Deep-Dive

> 🎬 **SHOW:** Open `backend/main.py`, scrolled to the few-shot endpoint. Highlight the loop that builds the messages array.

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

> 🎬 **SHOW:** Highlight the alternating `user`/`assistant` pattern in the loop. Then highlight `temperature=0`.

The examples are formatted as a conversation: user says the input, assistant says the output. The model sees this as a conversation history and continues the pattern for the new user message.

Temperature 0 is used here because few-shot tasks usually want consistent, pattern-following output — not creative variation.

---

## Key Takeaways

> 🎬 **SHOW:** Return to the tab with the SQL generation examples visible and a successful few-shot result.

- Few-shot prompting teaches the model a pattern through examples, not instructions.
- Examples are injected as alternating user/assistant messages before the real query.
- Quality of examples matters more than quantity — 2 good examples beat 10 mediocre ones.
- Use temperature 0 for few-shot tasks that require consistent pattern-following.
- Few-shot is not fine-tuning — it's in-context learning, and it costs tokens on every request.

---

## What's Next

> 🎬 **SHOW:** Click "Chain-of-Thought" in the sidebar.

Few-shot helps with pattern and format. But for tasks that require multi-step reasoning — maths, logic, code analysis — there's a more powerful technique: asking the model to show its work before giving an answer.
