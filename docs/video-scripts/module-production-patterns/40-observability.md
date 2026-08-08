# Observability

**Module:** Production Patterns | **Level:** Advanced
**Runtime:** ~6 min | **Tab:** `observability`

---

## Hook

> 🎬 **SHOW:** Observability tab open, chat input visible, trace list panel on the right (empty), a "View Traces" button.

You've deployed an LLM application. Users are complaining it's slow sometimes. You don't know which calls are slow, how many tokens they're consuming, or whether failures are happening silently. Observability is the practice of instrumenting your LLM calls so you can answer these questions. This tab shows a minimal tracing implementation — capturing latency, token usage, model, and outcome for every call.

---

## Concept

> 🎬 **SHOW:** Slide — a trace record: `{ trace_id, timestamp, model, prompt_tokens, completion_tokens, latency_ms, status, error? }`.

A trace is a structured record of a single LLM call. At minimum, capture: when it happened, how long it took, how many tokens it used, whether it succeeded, and what model was called.

> 🎬 **SHOW:** Slide — the three questions observability answers: (1) Where is latency coming from? (2) What is my token spend per endpoint? (3) Which calls are failing and why?

Traces answer operational questions that logs alone can't. Logs tell you *that* something happened; traces tell you *how long* it took and *what it cost*.

> 🎬 **SHOW:** Slide — the instrumentation pattern: wrap every LLM call with a timer, capture the response metadata, write a trace record.

The pattern is simple: record start time, make the call, record end time, extract token counts from the response, write the trace. No external service required for a basic implementation.

---

## Demo Walkthrough

> 🎬 **SHOW:** Observability tab, trace list empty.

1. Send a chat message: *"What is a closure in JavaScript?"* Submit.

   > 🎬 **SHOW:** Response appears in the chat panel. A new trace record appears in the trace list — showing latency, token counts, model, status: success.

   Every call is automatically traced. The trace appears immediately after the response.

2. Send several more messages with varying lengths.

   > 🎬 **SHOW:** Trace list grows. Point to the latency variation across calls — longer prompts take longer. Point to the token count variation.

   Latency correlates with response length, not just prompt length. Longer completions take more time.

3. Click on a trace record to expand it.

   > 🎬 **SHOW:** Expanded trace shows full detail: prompt preview, completion preview, all token counts, latency breakdown.

   The full trace includes a prompt preview — useful for debugging unexpected responses without having to reproduce the exact input.

4. Click "Clear Traces". Then send a message that would trigger a simulated error (if the demo supports it).

   > 🎬 **SHOW:** Error trace appears — status: failed, error message captured. Point to the error field.

   Failed calls are traced too. The error type and message are captured — essential for understanding failure patterns.

---

## Code Deep-Dive

> 🎬 **SHOW:** `backend/main.py`, scrolled to the `/api/observed-chat` endpoint. Highlight the timing and trace capture logic.

```python
import time, uuid

_traces: list[dict] = []  # in-memory store; use a DB in production

@app.post("/api/observed-chat")
async def observed_chat(body: ObservedChatRequest):
    trace_id  = str(uuid.uuid4())
    start     = time.perf_counter()
    status    = "success"
    error_msg = None

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": body.message}],
        )
        content = response.choices[0].message.content
        usage   = response.usage

    except Exception as e:
        status    = "error"
        error_msg = str(e)
        content   = None
        usage     = None
        raise
    finally:
        latency_ms = round((time.perf_counter() - start) * 1000)
        _traces.append({
            "trace_id":          trace_id,
            "timestamp":         time.time(),
            "model":             "gpt-4o-mini",
            "prompt_tokens":     usage.prompt_tokens     if usage else None,
            "completion_tokens": usage.completion_tokens if usage else None,
            "latency_ms":        latency_ms,
            "status":            status,
            "error":             error_msg,
        })

    return {"content": content, "trace_id": trace_id}
```

> 🎬 **SHOW:** Highlight the `finally` block — the trace is written whether the call succeeds or fails.

The `finally` block ensures the trace is always written — even if the call raises an exception. This is critical: failed calls are often the most important ones to trace.

> 🎬 **SHOW:** Slide — production upgrade path: replace `_traces` list with a time-series database (ClickHouse, TimescaleDB) or an observability platform (Langfuse, Helicone, OpenTelemetry).

The in-memory list is for demonstration. In production, write traces to a time-series store or an LLM observability platform. The trace structure is the same — only the sink changes.

---

## Key Takeaways

> 🎬 **SHOW:** Trace list with several records visible, latency and token counts shown.

- Instrument every LLM call with a trace: timestamp, latency, token counts, model, status, error.
- Use a `finally` block to guarantee trace writes even on failure — failed calls are the most important to capture.
- Token counts come from `response.usage` — always log them, not just latency.
- The in-memory pattern shown here is a starting point; production systems need a persistent, queryable trace store.
- Traces enable cost attribution per endpoint, latency percentile analysis, and failure rate monitoring — the foundation of LLM operations.

---

## What's Next

> 🎬 **SHOW:** Sidebar — highlight the next module (Voice) and the `voice-wasm` tab.

Next: Voice (WASM) — running speech recognition entirely in the browser using WebAssembly, with no server-side audio processing.
