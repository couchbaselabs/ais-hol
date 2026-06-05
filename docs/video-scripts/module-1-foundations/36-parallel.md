# Parallel Requests

**Module:** Foundations | **Level:** Beginner
**Runtime:** ~6 min | **Tab:** `parallel`

---

## Hook

> 🎬 **SHOW:** Parallel Requests tab open, prompt input visible, three response panels side by side (empty), a total latency indicator at the top.

If you need three LLM responses — say, three different phrasings of the same content — the naive approach calls the API three times in sequence. Each call takes 1–2 seconds. Total: 3–6 seconds. With `asyncio.gather()`, all three calls run concurrently. Total: the time of the *slowest* single call. This tab demonstrates the difference.

---

## Concept

> 🎬 **SHOW:** Slide — sequential timeline: Call 1 (1.2s) → Call 2 (1.4s) → Call 3 (0.9s) = 3.5s total. Then parallel timeline: all three overlap, total = 1.4s (the slowest).

Sequential calls add latency. Parallel calls bound latency to the slowest individual call. For N independent calls, parallelism gives you an N× speedup in the best case.

> 🎬 **SHOW:** Slide — `asyncio.gather()` code snippet. Highlight that all coroutines are submitted before any result is awaited.

`asyncio.gather()` submits all coroutines to the event loop simultaneously. The event loop interleaves their I/O waits — while one call is waiting for the network response, the others are also in flight.

> 🎬 **SHOW:** Slide — when to use parallel calls: multiple independent prompts, A/B testing variants, multi-perspective analysis, fan-out then aggregate patterns.

Parallelism is appropriate when the calls are *independent* — the result of one doesn't affect the input of another. If call B depends on the output of call A, they must remain sequential.

---

## Demo Walkthrough

> 🎬 **SHOW:** Parallel Requests tab, prompt input ready.

1. Enter a prompt: *"Explain what a REST API is."* Submit.

   > 🎬 **SHOW:** All three response panels populate simultaneously (or near-simultaneously). Point to the total latency indicator — it should be close to the time of a single call, not three times it.

   Three responses arrive in roughly the same time as one. Each panel shows a different perspective or phrasing of the same explanation.

2. Note the three system prompts used — each panel has a different instruction: "explain to a beginner", "explain technically", "explain with an analogy".

   > 🎬 **SHOW:** Expand or hover to show the system prompt for each panel. Point out how the same user prompt produces three distinct responses.

   The same user question, three different system prompts, three different responses — all in parallel.

3. Try a longer prompt to make the latency difference more visible: *"Write a detailed explanation of how TCP/IP works."*

   > 🎬 **SHOW:** Watch the latency indicator. All three panels still populate in roughly the same time as one would take alone.

   Longer responses take longer per call, but parallelism still bounds total time to the slowest single call.

---

## Code Deep-Dive

> 🎬 **SHOW:** `backend/main.py`, scrolled to `/api/parallel`. Highlight the `asyncio.gather()` call.

The three calls are submitted simultaneously with `asyncio.gather()`:

```python
async def call_llm(system: str, user: str) -> str:
    response = await asyncio.to_thread(
        client.chat.completions.create,
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system},
            {"role": "user",   "content": user},
        ],
    )
    return response.choices[0].message.content

results = await asyncio.gather(
    call_llm(SYSTEM_BEGINNER, body.prompt),
    call_llm(SYSTEM_TECHNICAL, body.prompt),
    call_llm(SYSTEM_ANALOGY,   body.prompt),
)
```

> 🎬 **SHOW:** Highlight `asyncio.to_thread()` — wrapping the synchronous OpenAI client call so it doesn't block the event loop.

`asyncio.to_thread()` runs the synchronous OpenAI SDK call in a thread pool, making it awaitable without blocking the event loop. This is the correct pattern when using a synchronous client in an async FastAPI handler.

> 🎬 **SHOW:** Slide — alternative: use the async OpenAI client (`AsyncOpenAI`) directly with `await client.chat.completions.create(...)` — no `to_thread` needed.

If you use `AsyncOpenAI` instead of `OpenAI`, you can `await` the call directly — no thread pool needed. Either approach works; the async client is cleaner for async-first codebases.

---

## Key Takeaways

> 🎬 **SHOW:** The three populated response panels with the latency indicator showing near-single-call time.

- `asyncio.gather()` runs independent coroutines concurrently — total time is bounded by the slowest call, not the sum.
- Use parallelism for independent calls: multi-perspective generation, A/B variants, fan-out aggregation.
- Wrap synchronous SDK calls with `asyncio.to_thread()` to avoid blocking the event loop, or use the async client directly.
- Parallelism does not help when calls are sequential by nature (output of one feeds input of the next).
- Rate limits apply per-account, not per-request — parallel calls consume your rate limit faster; monitor usage.

---

## What's Next

> 🎬 **SHOW:** Sidebar — highlight the next tab `output-format`.

Next: Output Format — controlling the shape of LLM responses with explicit format instructions in the system prompt.
