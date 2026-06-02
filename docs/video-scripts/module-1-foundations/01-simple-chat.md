# Simple Chat

**Module:** Foundations | **Level:** Beginner
**Runtime:** ~5 min | **Tab:** `chat`

---

## Hook

Every AI application you've ever used — ChatGPT, Copilot, a customer support bot — starts with one thing: a single API call that sends text and gets text back. Before we add memory, retrieval, agents, or any other complexity, let's understand that baseline call completely.

---

## Concept

The OpenAI Chat Completions API takes a list of messages and returns a response. That's it. Each message has a role — `system`, `user`, or `assistant` — and content.

The **system** message sets the rules. It's the first thing the model reads and it shapes every response that follows. The **user** message is what the human typed. The **assistant** messages are prior responses — but in this tab there are none, because this is stateless: every request is completely independent.

Stateless means the model has no memory of what you said a moment ago. Ask it your name twice and it won't remember the first answer. That's not a bug — it's the default. Memory is something you build on top, which we'll do in a later tab.

The other thing to understand: the model's knowledge has a training cutoff. It cannot tell you what happened last week, and it cannot answer questions about your own documents. Those limitations are also things we'll solve — with RAG — but first you need to feel them.

---

## Demo Walkthrough

Open the **Simple Chat** tab. You'll see a text input and a system prompt field.

1. Leave the system prompt as-is and ask: *"What is JavaScript?"* — you get a solid answer from training data.
2. Now ask: *"What happened in the news today?"* — the model either refuses or makes something up. That's the training cutoff in action.
3. Change the system prompt to: *"You are a pirate. Respond only in pirate dialect."* Ask the same JavaScript question. Notice how completely the system prompt controls the tone.
4. Ask: *"What did I just ask you?"* — it has no idea. That's statelessness.

Each response shows the model name and token count. Keep an eye on those — they'll matter when we talk about cost.

---

## Code Deep-Dive

The backend endpoint is about as simple as it gets:

```python
@app.post("/api/chat")
async def chat(body: ChatRequest):
    response = await client.chat.completions.create(
        model=INFERENCE_MODEL,
        messages=[
            {"role": "system", "content": body.systemPrompt},
            {"role": "user",   "content": body.message},
        ],
        temperature=0.7,
        max_tokens=1000,
    )
    return {"response": response.choices[0].message.content}
```

Two things worth noting here.

First, the client is initialised with a `base_url` and `api_key` from environment variables. This means you can swap the entire LLM backend — from OpenAI to Ollama to Azure to Capella AI — without touching application code. The API shape is the same.

```python
client = AsyncOpenAI(
    base_url=os.environ["INFERENCE_MODEL_BASE_URL"],
    api_key=os.environ["INFERENCE_MODEL_API_KEY"],
)
```

Second, `temperature=0.7` controls randomness. We'll explore that in detail in the Temperature tab, but for now: 0 is deterministic, 1.0 is creative, anything above that gets chaotic.

The response comes back as `response.choices[0].message.content` — a plain string. Everything else in this workshop is built on top of that string.

---

## Key Takeaways

- The Chat Completions API takes a message list and returns a string. That's the entire primitive.
- The system prompt is your primary control over model behaviour — treat it as configuration, not an afterthought.
- Stateless by default: no memory, no history, no context between calls.
- The model's knowledge ends at its training cutoff — it cannot access real-time data or your documents.
- The `base_url` pattern lets you swap LLM providers without code changes.

---

## What's Next

Before we add any features, we need to understand what the model actually reads. You typed "Hello, world!" — but the model didn't read those characters. It read tokens. The next tab shows you exactly what that means.
