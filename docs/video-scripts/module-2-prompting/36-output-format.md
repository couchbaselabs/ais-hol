# Output Format

**Module:** Prompting | **Level:** Beginner
**Runtime:** ~6 min | **Tab:** `output-format`

---

## Hook

> 🎬 **SHOW:** Output Format tab open, prompt input visible, format selector showing JSON / Markdown / Plain Text options, empty output area.

The same prompt can produce very different output depending on how you ask for it to be formatted. A response that works perfectly in a chat UI is useless if your downstream code expects JSON. This tab demonstrates how explicit format instructions in the system prompt control the shape of the model's output — and why that matters for building reliable pipelines.

---

## Concept

> 🎬 **SHOW:** Slide — three output shapes for the same question: raw prose, markdown with headers, structured JSON object.

LLMs are format-agnostic by default — they produce whatever shape seems natural given the conversation. You control the format by being explicit in the system prompt: "respond only with valid JSON", "use markdown headers and bullet points", "respond in plain text with no formatting".

> 🎬 **SHOW:** Slide — system prompt examples for each format. Highlight the instruction specificity: "valid JSON", "no markdown", "use ## headers".

The more specific the instruction, the more reliable the output. "Respond in JSON" is weaker than "Respond with a JSON object containing exactly these keys: title, summary, tags".

> 🎬 **SHOW:** Slide — downstream pipeline diagram: LLM output → JSON.parse() → application logic. Label the failure point: "SyntaxError if format is wrong".

Format reliability matters most when the output feeds into code. A stray markdown fence around JSON breaks `JSON.parse()`. A missing field breaks your schema validation. Explicit format instructions reduce these failures.

---

## Demo Walkthrough

> 🎬 **SHOW:** Output Format tab, format selector on JSON.

1. Enter a prompt: *"Summarise the key features of Python as a programming language."* — format: **JSON**. Submit.

   > 🎬 **SHOW:** Response appears as a JSON object — keys like `language`, `features`, `use_cases`. Point to the structure.

   The model returns structured data. This is directly parseable — no regex extraction needed.

2. Switch to **Markdown**. Same prompt. Submit.

   > 🎬 **SHOW:** Response appears with `##` headers, bullet lists, bold text. Point to the rendered markdown.

   Markdown format is ideal for documentation, README generation, or any UI that renders markdown.

3. Switch to **Plain Text**. Same prompt. Submit.

   > 🎬 **SHOW:** Response is clean prose — no asterisks, no backticks, no headers. Point to the absence of formatting characters.

   Plain text is what you want for voice output, email body text, or any context where markdown characters would appear as literal symbols.

4. Try a prompt that naturally resists JSON: *"Write a haiku about recursion."* — format: **JSON**. Submit.

   > 🎬 **SHOW:** The model wraps the haiku in a JSON object — e.g. `{"haiku": "..."}`. Point out that the model complies even for creative content.

   The model will comply with format instructions even for content that doesn't naturally fit — it wraps the creative output in the requested structure.

---

## Code Deep-Dive

> 🎬 **SHOW:** `backend/main.py`, scrolled to `/api/output-format`. Highlight the system prompt construction.

The format instruction is injected into the system prompt:

```python
FORMAT_INSTRUCTIONS = {
    "json": (
        "Respond ONLY with a valid JSON object. "
        "No markdown fences, no explanation — raw JSON only."
    ),
    "markdown": (
        "Respond using markdown formatting. "
        "Use ## for section headers, bullet lists for enumerations, "
        "and **bold** for key terms."
    ),
    "plain": (
        "Respond in plain text only. "
        "No markdown, no bullet points, no special characters."
    ),
}

system_prompt = FORMAT_INSTRUCTIONS[body.format]

response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[
        {"role": "system", "content": system_prompt},
        {"role": "user",   "content": body.prompt},
    ],
)
```

> 🎬 **SHOW:** Highlight the `response_format` parameter option — `{"type": "json_object"}` — as an alternative for JSON.

For JSON specifically, the OpenAI API offers a `response_format` parameter that enforces valid JSON at the API level — more reliable than a prompt instruction alone:

```python
response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[...],
    response_format={"type": "json_object"},  # API-level enforcement
)
```

> 🎬 **SHOW:** Highlight the difference: prompt instruction is a request; `response_format` is a constraint enforced by the API.

Prompt instructions are a request. `response_format=json_object` is a hard constraint — the API will not return malformed JSON. Use both together for maximum reliability.

---

## Key Takeaways

> 🎬 **SHOW:** Side-by-side comparison of the three format outputs for the same prompt.

- Format instructions belong in the system prompt — be specific about structure, keys, and what to omit.
- For JSON output in production, combine a prompt instruction with `response_format={"type": "json_object"}`.
- Plain text is the right choice for voice, email, and any context where markdown renders as literal characters.
- The model will comply with format instructions even for content that doesn't naturally fit the format.
- Format reliability is a prerequisite for any pipeline where LLM output feeds into downstream code.

---

## What's Next

> 🎬 **SHOW:** Sidebar — highlight the next tab `prompt-injection`.

Next: Prompt Injection — how malicious input can hijack your system prompt, and the defences available.
