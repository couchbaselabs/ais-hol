# Tool Calling

**Module:** LLM Capabilities | **Level:** Intermediate
**Runtime:** ~7 min | **Tab:** `tool-calling`

---

## Hook

> 🎬 **SHOW:** Tool Calling tab open, available tools listed on the left (calculator, time zone, unit converter), chat input at the bottom, trace panel on the right empty.

An LLM that can only generate text is limited to what it knows from training. Tool calling breaks that limit: the model can signal that it needs to invoke a function — a calculator, a database query, a weather API, a code executor — and your application runs it. The result comes back to the model, which uses it to form a final answer. This is the primitive that makes agents possible.

---

## Concept

> 🎬 **SHOW:** Slide — two-round-trip diagram. Round 1: messages + tool schemas → model → tool_calls object. Round 2: messages + tool_calls + tool results → model → final answer.

Tool calling is a two-round-trip protocol:

**Round 1**: Send the user's message along with tool schemas. The model either answers directly or returns a `tool_calls` object naming the function and its arguments.

**Round 2**: Your application executes the tool, gets a result, and sends it back as a `tool` role message. The model uses the result to form its final answer.

> 🎬 **SHOW:** Slide — security boundary: "The model never executes code. It only decides which tool to call and what arguments to pass."

The model never executes code. It only decides *which* tool to call and *what arguments* to pass. Your application is responsible for the actual execution. This is an important security boundary.

> 🎬 **SHOW:** Slide — `tool_choice` options: `"auto"` (model decides), `{"type": "function", "function": {"name": "..."}}` (force specific tool), `"none"` (prevent tool use).

`tool_choice: "auto"` lets the model decide. You can also force a specific tool or prevent tool use entirely.

---

## Demo Walkthrough

> 🎬 **SHOW:** Tool Calling tab, tools listed on the left, trace panel visible on the right.

1. Ask: *"What is 15% of 847?"*

   > 🎬 **SHOW:** Type and send. Watch the trace panel populate: first the tool call request (`calculate` with arguments), then the tool result (127.05), then the final answer. Point to each step in sequence.

   Watch the model call the calculator tool with `{"expression": "847 * 0.15"}`. The tool returns `127.05`. The model then says *"15% of 847 is 127.05."*

2. Ask: *"What time is it in Tokyo right now?"*

   > 🎬 **SHOW:** Send. Point to the trace showing the time zone tool being called with `{"timezone": "Asia/Tokyo"}`. Point to the result and the final answer.

   Watch the tool call arguments in the trace panel.

3. Ask: *"How many kilometres is 26.2 miles?"*

   > 🎬 **SHOW:** Send. Point to the unit converter tool call in the trace.

4. Ask: *"What is the capital of France?"*

   > 🎬 **SHOW:** Send. Point to the trace — no tool call. The model answers directly from training data. Highlight the absence of a tool call step.

   The model answers directly without calling any tool. It knows this from training.

5. Ask: *"What is the square root of 144 plus the number of days in a leap year?"*

   > 🎬 **SHOW:** Send. Watch the trace — does the model make one tool call with the full expression, or two sequential calls? Point to the reasoning.

   Does the model make two tool calls in sequence, or does it compute one step mentally?

---

## Code Deep-Dive

> 🎬 **SHOW:** Open `backend/main.py`, scrolled to the tool calling endpoint. Show the tool schema definition first.

Define tools as JSON schemas:

```python
tools = [{
    "type": "function",
    "function": {
        "name": "calculate",
        "description": "Perform arithmetic calculations. Use this for any maths "
                       "the user asks about, including percentages and conversions.",
        "parameters": {
            "type": "object",
            "properties": {
                "expression": {
                    "type": "string",
                    "description": "A mathematical expression to evaluate, e.g. '15 * 847 / 100'"
                },
            },
            "required": ["expression"],
        },
    },
}]
```

> 🎬 **SHOW:** Highlight the `description` field — explain this is what the model reads to decide whether to use the tool.

Tool descriptions matter enormously. The model selects tools based on their `description` field. A vague description leads to wrong tool selection.

> 🎬 **SHOW:** Scroll to the two-round-trip code. Highlight Round 1 (checking for `tool_calls`) and Round 2 (sending tool results back).

```python
# Round 1
first = await client.chat.completions.create(
    model=INFERENCE_MODEL, messages=messages,
    tools=tools, tool_choice="auto",
)
tool_calls = first.choices[0].message.tool_calls

# Round 2: execute and send results back
for tc in tool_calls:
    result = execute_tool(tc.function.name, json.loads(tc.function.arguments))
    messages.append({
        "role": "tool",
        "tool_call_id": tc.id,
        "content": str(result),
    })

second = await client.chat.completions.create(
    model=INFERENCE_MODEL, messages=messages,
)
```

> 🎬 **SHOW:** Highlight `tool_call_id` — explain it links each result to the specific call that requested it.

The `tool_call_id` links each tool result to the specific call that requested it — important when multiple tools are called in parallel.

---

## Key Takeaways

> 🎬 **SHOW:** Return to the tab with the percentage calculation trace visible — tool call, tool result, and final answer all shown in sequence.

- Tool calling is a two-round-trip protocol: the model requests a tool call, your application executes it, the result goes back to the model.
- The model never executes code — it only decides which tool to call and with what arguments.
- Tool descriptions are the primary signal for tool selection — write them precisely.
- `tool_choice: "auto"` lets the model decide; you can also force or prevent tool use.
- This is the primitive underlying all agent systems — agents are just tool calling in a loop.

---

## What's Next

> 🎬 **SHOW:** Click "Model Comparison" in the sidebar.

You've seen individual model capabilities. The next tab steps back and asks a practical question: which model should you use? Model comparison runs the same prompt across multiple models simultaneously, showing quality, latency, and cost side by side.
