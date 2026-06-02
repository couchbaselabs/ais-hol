# Tool Calling

**Module:** LLM Capabilities | **Level:** Intermediate
**Runtime:** ~7 min | **Tab:** `tool-calling`

---

## Hook

An LLM that can only generate text is limited to what it knows from training. Tool calling breaks that limit: the model can signal that it needs to invoke a function — a calculator, a database query, a weather API, a code executor — and your application runs it. The result comes back to the model, which uses it to form a final answer. This is the primitive that makes agents possible.

---

## Concept

Tool calling (also called function calling) is a two-round-trip protocol:

**Round 1**: Send the user's message along with tool schemas — descriptions of available functions, their parameters, and what they do. The model either answers directly or returns a `tool_calls` object naming the function and its arguments.

**Round 2**: Your application executes the tool, gets a result, and sends it back as a `tool` role message. The model uses the result to form its final answer.

The model never executes code. It only decides *which* tool to call and *what arguments* to pass. Your application is responsible for the actual execution. This is an important security boundary — the model cannot directly access your database or filesystem.

Tool descriptions matter enormously. The model selects tools based on their `description` field. A vague description leads to wrong tool selection. A precise description — including when to use the tool and what it returns — leads to reliable selection.

`tool_choice: "auto"` lets the model decide whether to use a tool or answer directly. You can also force a specific tool with `tool_choice: {"type": "function", "function": {"name": "..."}}`, or prevent tool use with `tool_choice: "none"`.

---

## Demo Walkthrough

Open the **Tool Calling** tab. It has several tools available: a calculator, a time zone lookup, a unit converter, and a general knowledge fallback.

1. Ask: *"What is 15% of 847?"* — watch the model call the calculator tool with `{"operation": "percentage", "value": 847, "percent": 15}`. The tool returns `127.05`. The model then says *"15% of 847 is 127.05."*

2. Ask: *"What time is it in Tokyo right now?"* — the model calls the time zone tool. Watch the tool call arguments in the trace panel.

3. Ask: *"How many kilometres is 26.2 miles?"* — unit converter tool.

4. Ask: *"What is the capital of France?"* — the model answers directly without calling any tool. It knows this from training.

5. Ask: *"What is the square root of 144 plus the number of days in a leap year?"* — does the model make two tool calls in sequence, or does it compute one step mentally?

---

## Code Deep-Dive

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

# Round 1: model decides whether to call a tool
first = await client.chat.completions.create(
    model=INFERENCE_MODEL,
    messages=[{"role": "user", "content": body.message}],
    tools=tools,
    tool_choice="auto",
)
tool_calls = first.choices[0].message.tool_calls
```

If the model returns tool calls, execute them and send results back:

```python
# Round 2: execute tools and send results back
messages = [
    {"role": "user",      "content": body.message},
    {"role": "assistant", "content": None, "tool_calls": [tc.model_dump() for tc in tool_calls]},
]
for tc in tool_calls:
    result = execute_tool(tc.function.name, json.loads(tc.function.arguments))
    messages.append({
        "role": "tool",
        "tool_call_id": tc.id,
        "content": str(result),
    })

# Final call: model forms answer using tool results
second = await client.chat.completions.create(
    model=INFERENCE_MODEL,
    messages=messages,
)
final_answer = second.choices[0].message.content
```

The `tool_call_id` links each tool result to the specific call that requested it — important when multiple tools are called in parallel.

For parallel tool calls, the model may return multiple `tool_calls` in one response. Execute them all concurrently:

```python
results = await asyncio.gather(*[
    execute_tool_async(tc.function.name, json.loads(tc.function.arguments))
    for tc in tool_calls
])
```

---

## Key Takeaways

- Tool calling is a two-round-trip protocol: the model requests a tool call, your application executes it, the result goes back to the model.
- The model never executes code — it only decides which tool to call and with what arguments.
- Tool descriptions are the primary signal for tool selection — write them precisely.
- `tool_choice: "auto"` lets the model decide; you can also force or prevent tool use.
- This is the primitive underlying all agent systems — agents are just tool calling in a loop.

---

## What's Next

You've seen individual model capabilities. The next tab steps back and asks a practical question: which model should you use? Model comparison runs the same prompt across multiple models simultaneously, showing quality, latency, and cost side by side.
