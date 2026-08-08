# Agentic RAG

**Module:** Advanced Patterns | **Level:** Advanced
**Runtime:** ~7 min | **Tab:** `agentic-rag`

---

## Hook

> 🎬 **SHOW:** Agentic RAG tab open, query input at the top, iteration trace panel below (empty), final answer area at the bottom.

Standard RAG retrieves once and answers. But what if one retrieval isn't enough? What if the first search returns tangentially related documents, and the model needs to refine its query and search again? Agentic RAG gives the model agency over the retrieval process — it decides when it has enough context to answer, and when it needs to search again.

---

## Concept

> 🎬 **SHOW:** Slide — a loop diagram: question → model decides (answer or retrieve?) → if retrieve: generate refined query → ANN search → add to context → loop back to model. If answer: generate final response.

In standard RAG, retrieval is a fixed step. **Agentic RAG** turns retrieval into a loop: the model decides whether it has enough context to answer, or whether it needs to search again with a refined query.

> 🎬 **SHOW:** Slide — "Why it produces better answers": model can refine search based on what it found, can search for multiple sub-topics, stops when it has enough context.

This produces better answers for complex questions because the model can refine its search based on what it found, search for multiple sub-topics, and stop when it has enough context.

> 🎬 **SHOW:** Slide — cost note: "Each iteration = 1 LLM call + 1 vector search. Cap max_iterations to control cost."

The cost: each iteration adds one LLM call plus one vector search. The `max_iterations` cap prevents runaway loops.

---

## Demo Walkthrough

> 🎬 **SHOW:** Agentic RAG tab, query input ready, iteration trace panel visible.

1. Ask a broad question: *"How do I build a responsive layout in CSS?"*

   > 🎬 **SHOW:** Type and send. Watch the iteration trace populate step by step. Point to: iteration 1 query, retrieved docs, model's decision ("retrieve again"), iteration 2 refined query, retrieved docs, model's decision ("answer"), final answer.

   Watch the iteration trace. The model may retrieve once on "responsive layout", find general information, then retrieve again on "CSS flexbox" or "CSS grid" for specifics.

2. Ask a very specific question: *"What is the `box-sizing` property?"*

   > 🎬 **SHOW:** Send. Point to the trace showing only one iteration — the model decides to answer immediately after the first retrieval.

   The model should answer in one iteration. The first retrieval is sufficient.

3. Ask a multi-part question: *"What are the differences between flexbox and grid, and when should I use each?"*

   > 🎬 **SHOW:** Send. Point to multiple iterations — the model searches for flexbox, then grid, then perhaps a comparison. Point to the refined queries getting more specific with each iteration.

   This likely requires multiple retrievals to cover both topics adequately.

4. Set `max_iterations` to 1. Ask the broad question again.

   > 🎬 **SHOW:** Change the max iterations control to 1, resend the broad question. Compare the answer to the multi-iteration version — point to what's missing.

   Does quality drop? Compare the answer to the multi-iteration version.

---

## Code Deep-Dive

> 🎬 **SHOW:** Open `backend/main.py`, scrolled to the agentic RAG endpoint. Highlight the for loop and the structured output decision.

The decide-retrieve loop:

```python
context_so_far = ""
iterations = []

for iteration in range(max_iterations):
    # Ask the model: do I have enough context?
    decision = await client.chat.completions.create(
        model=INFERENCE_MODEL,
        messages=[{
            "role": "system",
            "content": "Decide whether you have enough context to answer. "
                       "Return JSON: {action: 'answer'|'retrieve', query: str, reason: str}",
        }, {
            "role": "user",
            "content": f"Question: {question}\n\nContext so far:\n{context_so_far}",
        }],
        response_format={"type": "json_object"},
        temperature=0,
    )
    result = json.loads(decision.choices[0].message.content)
    iterations.append(result)

    if result["action"] == "answer":
        break

    # Retrieve more documents using the refined query
    docs = await get_relevant_documents(
        await get_embedding(result["query"]), limit=3
    )
    context_so_far += "\n\n" + format_docs(docs)

answer = await generate(question, context_so_far)
```

> 🎬 **SHOW:** Highlight `result["query"]` — explain this is the refined query the model generates, often different from the original question.

The refined query in `result["query"]` is often different from the original question. For *"How do I build a responsive layout?"*, the model might generate *"CSS flexbox tutorial"* as its first retrieval query, then *"CSS grid vs flexbox comparison"* as its second.

> 🎬 **SHOW:** Highlight `result["reason"]` — explain it's logged to the trace and shown in the UI.

The `reason` field shows the model's reasoning for each decision — visible in the iteration trace panel.

---

## Key Takeaways

> 🎬 **SHOW:** Return to the tab with the multi-part question trace — multiple iterations visible, each with a different refined query.

- Agentic RAG lets the model decide when it has enough context, rather than retrieving a fixed number of times.
- The model generates refined search queries at each iteration — often more targeted than the original question.
- Each iteration costs one LLM call plus one vector search — cap iterations to control cost.
- Structured output (`json_object`) makes the decision step reliably parseable.
- Agentic RAG is most valuable for complex, multi-part questions. For simple questions, standard RAG is faster and cheaper.

---

## What's Next

> 🎬 **SHOW:** Click "Multi-Agent" in the sidebar.

Agentic RAG is one agent with one tool. The next tab scales this up: a multi-agent system where a router classifies each query and dispatches it to a specialised agent — math, RAG, FAQ — each with its own tools and reasoning loop.
