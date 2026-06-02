# Multi-Agent Systems

**Module:** Advanced Patterns | **Level:** Advanced
**Runtime:** ~9 min | **Tab:** `agent`

---

## Hook

A single LLM trying to handle every type of query — maths, document search, FAQ lookup, general knowledge — is a generalist that's mediocre at everything. Multi-agent systems solve this by specialisation: a router classifies each query and dispatches it to the agent best equipped to handle it. Each agent has its own tools, its own reasoning loop, and its own domain expertise.

---

## Concept

This tab implements a **LangGraph StateGraph** with four agents:

- **Router**: classifies the query as `direct`, `math`, `rag`, or `faq`. For `direct` queries (general knowledge), it answers immediately without dispatching.
- **Math agent**: a ReAct agent with arithmetic tools (add, subtract, multiply, divide, evaluate_expression). Handles any calculation.
- **RAG agent**: a ReAct agent with a vector search tool over MDN documentation. Handles web development questions.
- **FAQ agent**: searches a FAQ catalog to find the right collection, then uses hybrid vector + full-text search to answer HR/policy questions.

All agents use the **ReAct** (Reason + Act) pattern: the agent reasons about what to do, calls a tool, observes the result, reasons again, and repeats until it has a confident answer. The full reasoning trace — routing decision, tool calls, tool results, thoughts — is shown in the UI.

Conversation history is stored in Couchbase and injected into every agent call, so agents remember prior turns. The router sees the history too — it can route *"What's the answer to that?"* correctly because it knows what "that" refers to.

**LangGraph** manages the state machine: each node is a function that receives the current state and returns an update. The `Command` object specifies which node to go to next (`goto`) and what state to update. This makes the routing logic explicit and testable.

---

## Demo Walkthrough

Open the **Multi-Agent** tab. Each response shows the routing decision and the full reasoning trace.

1. **Math**: *"What is 1337 multiplied by 42?"* — routed to math agent. Watch the tool call: `multiply(1337, 42)`. The agent returns the result and forms a natural language answer.

2. **Complex math**: *"Calculate sqrt(144) + the number of days in a non-leap year."* — the agent may call `evaluate_expression("sqrt(144)")` then add 365. Watch the multi-step reasoning trace.

3. **RAG**: *"How does CSS flexbox work?"* — routed to RAG agent. Watch it call `rag_search("CSS flexbox")`, receive document chunks, and synthesise an answer.

4. **FAQ**: *"What is the vacation policy?"* — routed to FAQ agent. It first searches the FAQ catalog to find the right collection, then uses hybrid search (vector + full-text) to find the answer.

5. **Memory test**: Say *"My name is Alex."* Then ask: *"What is my name?"* — the router should route this as `direct` and the model should answer from conversation history.

6. **Ambiguous query**: *"What is pi?"* — does the router send this to math or answer directly? Watch the routing decision.

---

## Code Deep-Dive

The LangGraph state definition:

```python
class AgentState(TypedDict, total=False):
    message:              str
    answer:               str
    routed_to:            str        # which agent handled this
    faq_collection:       str | None
    conversation_history: list[tuple[str, str]] | None
    trace_steps:          list[dict] | None
```

The router uses structured output to make a routing decision:

```python
class RouterDecision(BaseModel):
    route:  Literal["direct", "math", "faq", "rag"]
    answer: str | None = None   # populated only when route == "direct"

async def router_node(state: AgentState) -> Command:
    llm = _get_llm().with_structured_output(RouterDecision)
    decision = await llm.ainvoke([
        {"role": "system", "content": _SYSTEM_PROMPT},
        {"role": "user",   "content": state["message"]},
    ])

    if decision.route == "direct":
        return Command(goto="__end__",
                       update={"answer": decision.answer, "routed_to": "router"})
    if decision.route == "math":
        return Command(goto="math_agent", update={"routed_to": "math_agent"})
    # ... etc
```

The math agent is a ReAct agent managed by the Couchbase Agent Catalog (`agentc`):

```python
class MathAgent(agentc_langgraph.agent.ReActAgent):
    async def _ainvoke(self, span, state, config) -> Command:
        agent = self.create_react_agent(span)
        result = await agent.ainvoke({"messages": [("user", state["message"])]})
        # Collect tool_call / tool_result steps for the trace
        steps = []
        for msg in result["messages"]:
            for tc in getattr(msg, "tool_calls", []):
                steps.append({"type": "tool_call", "tool": tc["name"], "input": tc["args"]})
            if msg.__class__.__name__ == "ToolMessage":
                steps.append({"type": "tool_result", "content": msg.content})
        return Command(goto="__end__",
                       update={"answer": result["messages"][-1].content,
                               "trace_steps": steps})
```

The FAQ agent uses hybrid search — combining vector similarity and full-text search scores:

```python
# Merge vector and FTS results: add scores for docs in both sets
merged = {}
for doc_id, data in {**vector_hits, **fts_hits}.items():
    if doc_id in merged:
        merged[doc_id]["score"] += data.get("fts_score", data.get("vector_score", 0))
    else:
        merged[doc_id] = {"id": doc_id, "content": data["content"], "score": ...}
return sorted(merged.values(), key=lambda x: x["score"], reverse=True)[:5]
```

---

## Key Takeaways

- Multi-agent systems route queries to specialised agents rather than using one generalist model for everything.
- LangGraph's StateGraph makes routing logic explicit: each node is a function, `Command` specifies the next node.
- ReAct agents reason and act in a loop — tool calls and results are visible in the trace.
- Hybrid search (vector + full-text) outperforms either alone for FAQ-style retrieval.
- Conversation history is shared across all agents — the router and agents all see prior turns.

---

## What's Next

Multi-agent systems produce answers. But how do you know if those answers are good? LLM-as-Judge uses a second LLM call to evaluate the quality of any generated text — faithfulness, relevance, and completeness — without human review.
