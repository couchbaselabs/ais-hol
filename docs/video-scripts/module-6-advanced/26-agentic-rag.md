# Agentic RAG

**Module:** Advanced Patterns | **Level:** Advanced
**Runtime:** ~7 min | **Tab:** `agentic-rag`

---

## Hook

Standard RAG retrieves once and answers. But what if one retrieval isn't enough? What if the first search returns tangentially related documents, and the model needs to refine its query and search again? Agentic RAG gives the model agency over the retrieval process — it decides when it has enough context to answer, and when it needs to search again.

---

## Concept

In standard RAG, retrieval is a fixed step: embed the query, fetch top-K documents, generate. The model has no say in whether those documents are sufficient.

**Agentic RAG** turns retrieval into a loop:

1. The model receives the question and any context retrieved so far.
2. It decides: **answer** (I have enough context) or **retrieve** (I need more information).
3. If retrieve: it generates a refined search query — often different from the original question — and fetches more documents.
4. The loop repeats until the model decides to answer or hits a maximum iteration limit.

This produces better answers for complex questions because:
- The model can refine its search based on what it found in the first retrieval.
- It can search for multiple sub-topics and combine the results.
- It stops when it has enough context, not after a fixed number of retrievals.

The cost: each iteration adds one LLM call plus one vector search. A question that requires 3 iterations costs 3× the retrieval overhead of standard RAG. The `max_iterations` cap prevents runaway loops.

The decision step uses structured output — the model returns `{"action": "answer" | "retrieve", "query": "...", "reason": "..."}` — so the application can parse it reliably.

---

## Demo Walkthrough

Open the **Agentic RAG** tab. It shows the iteration trace — each retrieval step, the refined query, and the decision.

1. Ask a broad question: *"How do I build a responsive layout in CSS?"* — watch the iteration trace. The model may retrieve once on "responsive layout", find general information, then retrieve again on "CSS flexbox" or "CSS grid" for specifics.

2. Ask a very specific question: *"What is the `box-sizing` property?"* — the model should answer in one iteration. The first retrieval is sufficient.

3. Ask a multi-part question: *"What are the differences between flexbox and grid, and when should I use each?"* — this likely requires multiple retrievals to cover both topics adequately.

4. Set `max_iterations` to 1. Ask the broad question again. Does quality drop? Compare the answer to the multi-iteration version.

5. Compare the agentic answer to the standard RAG tab answer for the same question. Is the agentic answer more complete?

---

## Code Deep-Dive

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

# Generate final answer from all accumulated context
answer = await generate(question, context_so_far)
```

The refined query in `result["query"]` is often different from the original question. For *"How do I build a responsive layout?"*, the model might generate *"CSS flexbox tutorial"* as its first retrieval query, then *"CSS grid vs flexbox comparison"* as its second. These targeted queries retrieve more relevant documents than the original question would.

The `reason` field in the decision is logged to the trace — it shows the model's reasoning for each decision, which is useful for debugging retrieval quality.

---

## Key Takeaways

- Agentic RAG lets the model decide when it has enough context, rather than retrieving a fixed number of times.
- The model generates refined search queries at each iteration — often more targeted than the original question.
- Each iteration costs one LLM call plus one vector search — cap iterations to control cost.
- Structured output (`json_object`) makes the decision step reliably parseable.
- Agentic RAG is most valuable for complex, multi-part questions. For simple questions, standard RAG is faster and cheaper.

---

## What's Next

Agentic RAG is one agent with one tool. The next tab scales this up: a multi-agent system where a router classifies each query and dispatches it to a specialised agent — math, RAG, FAQ — each with its own tools and reasoning loop.
