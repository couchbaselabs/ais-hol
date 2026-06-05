# Capella AI Completion

**Module:** Capella AI Functions | **Level:** Advanced
**Runtime:** ~6 min | **Tab:** `capella-completion`

---

## Hook

> 🎬 **SHOW:** Capella AI Completion tab open, prompt template input visible, document context input, completion output panel empty.

Every other Capella AI Function does a specific task — summarise, classify, translate. `ai_completion()` is the general-purpose escape hatch: you provide a custom prompt template, the function injects document data, and the LLM generates a completion. It's the equivalent of `chat.completions.create()` — but running inside the database, over your documents, at query time.

---

## Concept

> 🎬 **SHOW:** Slide — the SQL++ function call: `default:ai_completion({"prompt": "Summarise this in one sentence: " || doc.body})`. Below it, the result: `{"completion": "..."}`.

`ai_completion()` takes a prompt string — which can be a concatenation of a template and document fields — and returns the model's completion. Any task that doesn't have a dedicated function can be handled here.

> 🎬 **SHOW:** Slide — use cases: custom summarisation with specific constraints, Q&A over documents, data transformation, generating structured output from unstructured text.

Because the prompt is fully customisable, `ai_completion()` can do anything the other functions do — and more. It's the most flexible function in the suite.

> 🎬 **SHOW:** Slide — Q&A over documents SQL: `SELECT d.id, default:ai_completion({"prompt": "Answer this question based only on the following text. Question: " || $question || " Text: " || d.body}) AS answer FROM docs AS d WHERE d.category = "faq" LIMIT 5`.

---

## Demo Walkthrough

> 🎬 **SHOW:** Capella AI Completion tab, prompt template field and document context field visible.

1. Prompt: *"Summarise the following text in exactly one sentence, starting with 'This document covers':"* Context: paste a paragraph of technical documentation. Submit.

   > 🎬 **SHOW:** Completion appears — a single sentence starting with "This document covers". Point to the constraint being honoured.

   Custom constraints in the prompt are respected. This is more flexible than `ai_summary()` which uses a fixed summarisation style.

2. Prompt: *"Extract the three most important action items from this meeting notes text and format them as a numbered list:"* Context: paste mock meeting notes. Submit.

   > 🎬 **SHOW:** Numbered list of action items appears. Point to the structured output.

3. Prompt: *"Translate the sentiment of this review into a star rating from 1 to 5. Respond with only a number."* Context: a product review. Submit.

   > 🎬 **SHOW:** A single digit appears. Point out the constrained output format.

   Constrained output — "respond with only a number" — works the same way as in a regular chat completion.

4. Prompt: *"Does this support ticket describe a billing issue, a technical issue, or something else? Answer in one word."* Context: a support ticket. Submit.

   > 🎬 **SHOW:** Single-word classification result. Compare with `ai_classification()` — same outcome, more control over the prompt.

---

## Code Deep-Dive

> 🎬 **SHOW:** `backend/main.py`, scrolled to `/api/capella-completion`. Highlight the SQL++ query.

```python
# Combine prompt template with document context
full_prompt = f"{body.prompt}\n\n{body.context}" if body.context else body.prompt

sql = """
    SELECT default:ai_completion({
        "prompt": $prompt
    }) AS result
"""
rows = list(
    cluster.query(
        sql,
        QueryOptions(named_parameters={"prompt": full_prompt}),
    ).rows()
)
result = rows[0]["result"][0]
return {
    "completion": result.get("completion", ""),
    "source":     "capella_ai_completion",
}
```

> 🎬 **SHOW:** Slide — the Q&A over documents pattern using SQL++ string concatenation.

```sql
SELECT d.id,
       default:ai_completion({
           "prompt": "Answer the following question based only on the provided text. "
                  || "If the answer is not in the text, say 'Not found'. "
                  || "Question: " || $question
                  || " Text: " || d.body
       }).completion AS answer
FROM `bucket`.`_default`.knowledge_base AS d
WHERE d.category = $category
ORDER BY ANN_DISTANCE(d.embedding, $query_embedding)
LIMIT 3
```

> 🎬 **SHOW:** Highlight the string concatenation with `||` — building the full prompt from a template and document fields inline in SQL++.

SQL++ string concatenation (`||`) lets you build prompts inline from document fields. The prompt template is a constant; the document content is injected at query time.

---

## Key Takeaways

> 🎬 **SHOW:** Completion output panel with a custom-formatted response.

- `ai_completion()` is the general-purpose Capella AI Function — any prompt, any task.
- Build prompts inline using SQL++ string concatenation (`||`) to inject document fields into templates.
- Use it for tasks that don't have a dedicated function: custom summarisation, constrained output, data transformation.
- Combine with vector search (`ORDER BY ANN_DISTANCE`) to retrieve relevant documents and generate answers in one query.
- Requires the Completion AI Function enabled on the cluster and `query_external_access` role.

---

## What's Next

> 🎬 **SHOW:** Sidebar — highlight the next tab `capella-grammar`.

Next: Capella AI Grammar — correcting grammar and spelling in documents using `ai_corrected_grammar()`.
