# Multi-Agent Systems

**Module:** Advanced Patterns | **Level:** Advanced
**Runtime:** ~9 min | **Tab:** `agent`

---

## Hook

> 🎬 **SHOW:** Multi-Agent tab open, chat input at the bottom, routing decision badge area visible, full reasoning trace panel on the right (empty).

A single LLM trying to handle every type of query — maths, document search, FAQ lookup, general knowledge — is a generalist that's mediocre at everything. Multi-agent systems solve this by specialisation: a router classifies each query and dispatches it to the agent best equipped to handle it. Each agent has its own tools, its own reasoning loop, and its own domain expertise.

---

## Concept

> 🎬 **SHOW:** Slide — architecture diagram: user message → Router node → four branches: "direct" (answer immediately), "math agent" (arithmetic tools), "RAG agent" (vector search tool), "FAQ agent" (hybrid search tool). All branches converge to a final answer.

This tab implements a **LangGraph StateGraph** with four agents:

- **Router**: classifies the query as `direct`, `math`, `rag`, or `faq`. For `direct` queries, it answers immediately.
- **Math agent**: a ReAct agent with arithmetic tools.
- **RAG agent**: a ReAct agent with a vector search tool over MDN documentation.
- **FAQ agent**: searches a FAQ catalog using hybrid vector + full-text search.

> 🎬 **SHOW:** Slide — ReAct loop: "Reason → Act (tool call) → Observe (tool result) → Reason → Act → ... → Answer". Label it "Reason + Act = ReAct".

All agents use the **ReAct** (Reason + Act) pattern: the agent reasons about what to do, calls a tool, observes the result, reasons again, and repeats until it has a confident answer.

> 🎬 **SHOW:** Slide — LangGraph StateGraph: boxes for each node (router, math_agent, rag_agent, faq_agent, __end__), arrows showing possible transitions. The `Command` object controls which node runs next.

**LangGraph** manages the state machine: each node is a function that receives the current state and returns a `Command` specifying which node to go to next.

---

## Demo Walkthrough

> 🎬 **SHOW:** Multi-Agent tab, chat input ready, routing badge and trace panel visible.

1. **Math**: *"What is 1337 multiplied by 42?"*

   > 🎬 **SHOW:** Send. Point to the routing badge showing "math_agent". Expand the trace panel — show the tool call `multiply(1337, 42)`, the result `56154`, and the final natural language answer.

   Routed to math agent. Watch the tool call in the trace.

2. **Complex math**: *"Calculate sqrt(144) + the number of days in a non-leap year."*

   > 🎬 **SHOW:** Send. Point to the multi-step trace — the agent calls `evaluate_expression("sqrt(144)")` to get 12, then adds 365. Show each step in the trace.

   Watch the multi-step reasoning trace — the agent breaks the problem into steps.

3. **RAG**: *"How does CSS flexbox work?"*

   > 🎬 **SHOW:** Send. Point to the routing badge showing "rag_agent". Show the trace: `rag_search("CSS flexbox")` → retrieved chunks → synthesised answer.

   Routed to RAG agent. Watch it call `rag_search`, receive document chunks, and synthesise an answer.

4. **FAQ**: *"What is the vacation policy?"*

   > 🎬 **SHOW:** Send. Point to the routing badge showing "faq_agent". Show the trace: catalog search → collection identified → hybrid search → answer.

   Routed to FAQ agent. It first searches the FAQ catalog to find the right collection, then uses hybrid search.

5. **Memory test**: Say *"My name is Alex."* Then ask: *"What is my name?"*

   > 🎬 **SHOW:** Send the first message, then the second. Point to the routing badge — "direct" — and the model correctly answering "Alex" from conversation history.

   The router routes this as `direct` and the model answers from conversation history.

6. **Ambiguous query**: *"What is pi?"*

   > 🎬 **SHOW:** Send. Point to the routing decision — does it go to math or answer directly? Show the reasoning.

   Does the router send this to math or answer directly? Watch the routing decision.

---

## Code Deep-Dive

> 🎬 **SHOW:** Open `backend/agents/graph.py`. Show the `AgentState` TypedDict and the `router_node` function.

The LangGraph state definition:

```python
class AgentState(TypedDict, total=False):
    message:              str
    answer:               str
    routed_to:            str
    conversation_history: list[tuple[str, str]] | None
    trace_steps:          list[dict] | None
```

> 🎬 **SHOW:** Highlight the router using `with_structured_output` — the `RouterDecision` Pydantic model.

The router uses structured output to make a routing decision:

```python
class RouterDecision(BaseModel):
    route:  Literal["direct", "math", "faq", "rag"]
    answer: str | None = None   # populated only when route == "direct"

async def router_node(state: AgentState) -> Command:
    llm = _get_llm().with_structured_output(RouterDecision)
    decision = await llm.ainvoke([...])

    if decision.route == "direct":
        return Command(goto="__end__",
                       update={"answer": decision.answer, "routed_to": "router"})
    if decision.route == "math":
        return Command(goto="math_agent", update={"routed_to": "math_agent"})
```

> 🎬 **SHOW:** Scroll to the FAQ agent's hybrid search. Highlight the score merging logic.

The FAQ agent uses hybrid search — combining vector similarity and full-text search scores:

```python
# Merge vector and FTS results: add scores for docs in both sets
merged = {}
for doc_id, data in {**vector_hits, **fts_hits}.items():
    if doc_id in merged:
        merged[doc_id]["score"] += data.get("fts_score", data.get("vector_score", 0))
    else:
        merged[doc_id] = {"id": doc_id, "content": data["content"], "score": ...}
```

> 🎬 **SHOW:** Highlight that documents appearing in both vector and FTS results get their scores added — they rank higher than documents found by only one method.

Documents appearing in both vector and FTS results get their scores added — they rank higher than documents found by only one method.

---

## Key Takeaways

> 🎬 **SHOW:** Return to the tab with the math trace visible — routing badge, tool calls, and final answer all shown.

- Multi-agent systems route queries to specialised agents rather than using one generalist model for everything.
- LangGraph's StateGraph makes routing logic explicit: each node is a function, `Command` specifies the next node.
- ReAct agents reason and act in a loop — tool calls and results are visible in the trace.
- Hybrid search (vector + full-text) outperforms either alone for FAQ-style retrieval.
- Conversation history is shared across all agents — the router and agents all see prior turns.

---

## What's Next

> 🎬 **SHOW:** Click "LLM-as-Judge" in the sidebar.

Multi-agent systems produce answers. But how do you know if those answers are good? LLM-as-Judge uses a second LLM call to evaluate the quality of any generated text — faithfulness, relevance, and completeness — without human review.
