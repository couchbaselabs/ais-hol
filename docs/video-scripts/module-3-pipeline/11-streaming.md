# Streaming

**Module:** Building a Pipeline | **Level:** Intermediate
**Runtime:** ~6 min | **Tab:** `stream`

---

## Hook

The default chat API call waits until the model finishes generating the entire response, then returns it all at once. For a 500-token response at typical generation speeds, that's 3-5 seconds of a blank screen. Streaming eliminates that wait — the first word appears in under a second, and the user reads as the model writes.

---

## Concept

LLMs generate text one token at a time. The non-streaming API buffers all those tokens and returns them as a single JSON response. Streaming skips the buffer: each token is sent to the client as it's produced, using HTTP chunked transfer encoding.

Two metrics matter here:

**Time to First Token (TTFT)**: How long until the first word appears. With streaming, this is typically under a second. Without streaming, it's the full generation time.

**Time to Last Token (TTLT)**: Total time for the complete response. This is the same whether you stream or not — the model generates at the same speed either way. Streaming doesn't make the model faster; it makes the *perceived* latency dramatically lower.

The tradeoff: streaming complicates error handling. With a non-streaming call, you get a clean HTTP 200 with a complete response or an HTTP error. With streaming, the HTTP 200 is sent before generation starts — if the model errors mid-stream, you've already told the client everything is fine. You need to handle mid-stream errors explicitly.

On the frontend, the browser reads the stream using the Fetch Streams API and appends tokens to the UI as they arrive. This is the same pattern used by ChatGPT, Claude, and every other modern AI chat interface.

---

## Demo Walkthrough

Open the **Streaming** tab. It shows a chat input and a response area with a TTFT timer.

1. Ask: *"Explain the history of the internet."* — watch the response appear token by token. Note the TTFT in the top right — it should be under a second.

2. Compare mentally to the Simple Chat tab. The total time is similar, but the experience is completely different. The user is reading while the model is still writing.

3. Ask a short question: *"What is 2+2?"* — TTFT is still fast, but the response is so short that streaming barely matters. Streaming is most valuable for long responses.

4. Ask a question that produces a long structured response: *"List 20 programming languages with a one-sentence description of each."* Watch the list build line by line.

---

## Code Deep-Dive

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
        # TTFT sent as a trailer after the stream completes
        yield f"\n\n[TTFT:{ttft}]"

    return StreamingResponse(generate(), media_type="text/plain")
```

`stream=True` is the only change to the API call. The response becomes an async iterator of chunks, each containing a `delta.content` — the next token or tokens.

On the frontend, the browser reads the stream with the Fetch API:

```javascript
const response = await fetch('/api/chat-stream', { method: 'POST', body: ... })
const reader = response.body.getReader()
const decoder = new TextDecoder()

while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const token = decoder.decode(value)
    setOutput(prev => prev + token)  // append each token to state
}
```

Each `reader.read()` call returns the next available chunk — which may be one token or several, depending on network buffering. The decoder converts bytes to text, and the React state update re-renders the component with the new content.

---

## Key Takeaways

- Streaming sends tokens to the client as they're generated, eliminating the blank-screen wait.
- TTFT (time to first token) drops from seconds to under a second with streaming.
- Total generation time is unchanged — streaming improves perceived latency, not actual speed.
- Error handling is harder with streaming: the HTTP 200 is sent before generation completes.
- The Fetch Streams API on the frontend reads chunks incrementally and appends them to the UI.

---

## What's Next

Streaming makes responses feel fast. But what if the user asks the same question twice? You're still making a full LLM call each time. The next tab adds a semantic cache that detects similar questions and returns stored answers instantly — no LLM call needed.
