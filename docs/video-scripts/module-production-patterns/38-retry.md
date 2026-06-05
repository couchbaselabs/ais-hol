# Retry & Fallback

**Module:** Production Patterns | **Level:** Advanced
**Runtime:** ~6 min | **Tab:** `retry`

---

## Hook

> 🎬 **SHOW:** Retry & Fallback tab open, attempt log panel visible (empty), controls for simulated failure rate and max retries.

LLM APIs are not 100% reliable. Rate limit errors, transient 500s, and network timeouts happen in production. An application that crashes on the first failure is not production-ready. This tab demonstrates exponential back-off with jitter — the standard pattern for handling transient failures — and a fallback strategy for when retries are exhausted.

---

## Concept

> 🎬 **SHOW:** Slide — retry timeline: attempt 1 fails → wait 1s → attempt 2 fails → wait 2s → attempt 3 fails → wait 4s → attempt 4 succeeds. Label the wait times as "exponential back-off".

Exponential back-off doubles the wait time after each failure. This prevents thundering herd — if many clients retry simultaneously after a rate limit, they'd all hit the API again at the same moment. Jitter adds a small random offset to spread the retries out.

> 🎬 **SHOW:** Slide — the formula: `wait = base * (2 ** attempt) + random(0, jitter)`. Show example values for attempts 0–4.

The wait formula: `base × 2^attempt + random jitter`. With base=0.5s and jitter=0.5s, attempt 0 waits ~0.5–1s, attempt 3 waits ~4–4.5s.

> 🎬 **SHOW:** Slide — retryable vs non-retryable errors. Retryable: 429 (rate limit), 500, 503, network timeout. Non-retryable: 400 (bad request), 401 (auth), 404.

Not all errors should be retried. A 400 Bad Request won't succeed on retry — the request itself is wrong. Only retry transient errors: rate limits (429), server errors (500/503), and network timeouts.

---

## Demo Walkthrough

> 🎬 **SHOW:** Retry tab, failure rate slider at 70%, max retries at 3.

1. Set failure rate to **70%**, max retries to **3**. Submit a prompt.

   > 🎬 **SHOW:** Attempt log populates in real time — "Attempt 1: FAILED (simulated 500)", "Waiting 1.2s...", "Attempt 2: FAILED (simulated 500)", "Waiting 2.4s...", "Attempt 3: SUCCESS". Final response appears.

   Watch the back-off in action. Each retry waits longer than the last. Eventually a successful attempt gets through.

2. Set failure rate to **100%**, max retries to **3**. Submit.

   > 🎬 **SHOW:** All 3 attempts fail. Fallback response appears — a canned message indicating the service is temporarily unavailable.

   When all retries are exhausted, the fallback activates. The user gets a degraded but graceful response rather than an unhandled exception.

3. Set failure rate to **0%**, max retries to **3**. Submit.

   > 🎬 **SHOW:** Attempt 1 succeeds immediately. No retries needed. Point to the latency — no added delay.

   When the API is healthy, retries add zero overhead. The retry logic is invisible to the user.

---

## Code Deep-Dive

> 🎬 **SHOW:** `backend/main.py`, scrolled to the retry helper function. Highlight the loop, back-off calculation, and error type check.

```python
async def call_with_retry(prompt: str, max_retries: int = 3) -> tuple[str, list]:
    attempts = []
    for attempt in range(max_retries + 1):
        try:
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
            )
            attempts.append({"attempt": attempt + 1, "status": "success"})
            return response.choices[0].message.content, attempts

        except openai.RateLimitError as e:
            wait = 0.5 * (2 ** attempt) + random.uniform(0, 0.5)
            attempts.append({
                "attempt": attempt + 1,
                "status":  "failed",
                "error":   "rate_limit",
                "wait_s":  round(wait, 2),
            })
            if attempt < max_retries:
                await asyncio.sleep(wait)

        except openai.APIStatusError as e:
            if e.status_code in (500, 503):
                wait = 0.5 * (2 ** attempt) + random.uniform(0, 0.5)
                attempts.append({"attempt": attempt + 1, "status": "failed",
                                  "error": str(e.status_code), "wait_s": round(wait, 2)})
                if attempt < max_retries:
                    await asyncio.sleep(wait)
            else:
                raise  # non-retryable

    return FALLBACK_RESPONSE, attempts  # all retries exhausted
```

> 🎬 **SHOW:** Highlight the `except openai.RateLimitError` and `except openai.APIStatusError` blocks separately. Point out that 400/401 errors re-raise immediately.

Catch specific error types. `RateLimitError` and 5xx `APIStatusError` are retryable. Everything else re-raises — retrying a bad request wastes time and quota.

> 🎬 **SHOW:** Highlight `FALLBACK_RESPONSE` — the graceful degradation path.

The fallback is a static response that tells the user the service is temporarily unavailable. It's better than an unhandled 500 error reaching the user.

---

## Key Takeaways

> 🎬 **SHOW:** Attempt log showing a successful retry sequence with back-off times visible.

- Retry only transient errors: 429, 500, 503, network timeouts. Re-raise 400, 401, 404 immediately.
- Exponential back-off with jitter prevents thundering herd — spread retries across time.
- Always define a fallback for when retries are exhausted — graceful degradation beats an unhandled exception.
- The OpenAI Python SDK has built-in retry support (`max_retries` parameter) — use it for simple cases; implement custom logic when you need attempt logging or custom fallbacks.
- Log every attempt with its error type and wait time — this data reveals API reliability patterns over time.

---

## What's Next

> 🎬 **SHOW:** Sidebar — highlight the next tab `token-budget`.

Next: Token Budget — counting tokens before sending requests to control costs and avoid context window overflows.
