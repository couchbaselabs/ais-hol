# Streaming

**Module:** Building a Pipeline | **Level:** Intermediate
**Runtime:** ~6 min | **Tab:** `stream`

---

## Hook

> 🎬 **SHOW:** Simple Chat tab — send a long question and watch the blank screen for the full 3-4 seconds before the response appears. Then switch to the Streaming tab.

The default chat API call waits until the model finishes generating the entire response, then returns it all at once. For a 500-token response at typical generation speeds, that's 3-5 seconds of a blank screen. Streaming eliminates that wait — the first word appears in under a second, and the user reads as the model writes.

---

## Concept

> 🎬 **SHOW:** Slide — two timelines side by side. "Non-streaming": flat line then a sudden full response at t=4s. "Streaming": tokens appearing one by one from t=0.8s onwards, finishing at t=4s. Both end at the same time.

LLMs generate text one token at a time. The non-streaming API buffers all those tokens and returns them as a single JSON response. Streaming skips the buffer: each token is sent to the client as it's produced, using HTTP chunked transfer encoding.

Two metrics matter here:

**Time to First Token (TTFT)**: How long until the first word appears. With streaming, this is typically under a second. Without streaming, it's the full generation time.

**Time to Last Token (TTLT)**: Total time for the complete response. This is the same whether you stream or not — the model generates at the same speed either way.

> 🎬 **SHOW:** Slide — a warning icon: "Streaming complicates error handling — HTTP 200 is sent before generation completes."

The tradeoff: streaming complicates error handling. With a non-streaming call, you get a clean HTTP 200 with a complete response or an HTTP error. With streaming, the HTTP 200 is sent before generation starts — if the model errors mid-stream, you've already told the client everything is fine.

---

## Demo Walkthrough

> 🎬 **SHOW:** Streaming tab open, TTFT timer visible in the top right, response area empty.

1. Ask: *"Explain the history of the internet."*

   > 🎬 **SHOW:** Type and send. Watch the first token appear almost immediately. Point to the TTFT counter as it locks in — should be under 1 second. Keep the camera on the response area as tokens stream in.

   Watch the response appear token by token. Note the TTFT in the top right — it should be under a second.

2. Compare mentally to the Simple Chat tab.

   > 🎬 **SHOW:** Open Simple Chat in a second browser tab or split screen. Send the same question. Show the blank wait vs the streaming experience side by side.

   The total time is similar, but the experience is completely different. The user is reading while the model is still writing.

3. Ask a short question: *"What is 2+2?"*

   > 🎬 **SHOW:** Send the short question. Point to the TTFT — still fast, but the response is so short that streaming barely matters.

   TTFT is still fast, but the response is so short that streaming barely matters. Streaming is most valuable for long responses.

4. Ask: *"List 20 programming languages with a one-sentence description of each."*

   > 🎬 **SHOW:** Send. Watch the list build line by line — point to each language appearing as it's generated.

   Watch the list build line by line — this is where streaming shines.

---

## Code Deep-Dive

> 🎬 **SHOW:** Open `backend/main.py`, scrolled to the `/api/chat-stream` endpoint. Highlight `stream=True`.

The backend uses FastAPI's `StreamingResponse` with an async generator:

```python
@app.post("/api/chat-stream")
async def chat_stream(req: ChatRequest):
    stream = await client.chat.completions.create(
        model=INFERENCE_MODEL,
        messages=[{"role": "user", "content": req.message}],
        stream=True,          # ← enables token-by-token delivery
        max_tokens=1000,
    )
    async def generate():
        ttft = None
        t0 = time.perf_counter()
        async for chunk in stream:
            token = chunk.choices[0].delta.content or ""
            if token and ttft is None:
                ttft = round(time.perf_counter() - t0, 3)
            yield token

    return StreamingResponse(generate(), media_type="text/plain")
```

> 🎬 **SHOW:** Highlight `stream=True` — the only change from the non-streaming call. Then highlight `chunk.choices[0].delta.content`.

`stream=True` is the only change to the API call. The response becomes an async iterator of chunks, each containing a `delta.content` — the next token or tokens.

> 🎬 **SHOW:** Switch to the frontend code — `AppChatStream.jsx` — and show the `reader.read()` loop.

On the frontend, the browser reads the stream with the Fetch API:

```javascript
const reader = response.body.getReader()
const decoder = new TextDecoder()

while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const token = decoder.decode(value)
    setOutput(prev => prev + token)  // append each token to state
}
```

> 🎬 **SHOW:** Highlight `setOutput(prev => prev + token)` — each token triggers a React re-render, which is what makes the text appear progressively.

Each `reader.read()` call returns the next available chunk. The React state update re-renders the component with the new content — that's the live typing effect.

---

## Key Takeaways

> 🎬 **SHOW:** Return to the Streaming tab with the long list response still streaming or recently completed. TTFT badge visible.

- Streaming sends tokens to the client as they're generated, eliminating the blank-screen wait.
- TTFT (time to first token) drops from seconds to under a second with streaming.
- Total generation time is unchanged — streaming improves perceived latency, not actual speed.
- Error handling is harder with streaming: the HTTP 200 is sent before generation completes.
- The Fetch Streams API on the frontend reads chunks incrementally and appends them to the UI.

---

## What's Next

> 🎬 **SHOW:** Click "Semantic Cache" in the sidebar.

Streaming makes responses feel fast. But what if the user asks the same question twice? You're still making a full LLM call each time. The next tab adds a semantic cache that detects similar questions and returns stored answers instantly — no LLM call needed.
