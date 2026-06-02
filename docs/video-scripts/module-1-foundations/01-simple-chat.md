# Simple Chat

**Module:** Foundations | **Level:** Beginner
**Runtime:** ~5 min | **Tab:** `chat`

---

## Hook

> 🎬 **SHOW:** Full browser window on the app's landing page, sidebar visible with "Simple Chat" highlighted as the first item.

Every AI application you've ever used — ChatGPT, Copilot, a customer support bot — starts with one thing: a single API call that sends text and gets text back. Before we add memory, retrieval, agents, or any other complexity, let's understand that baseline call completely.

---

## Concept

> 🎬 **SHOW:** Slide or diagram — three boxes labelled `system`, `user`, `assistant` with arrows flowing into an "LLM" box, and a response arrow coming out.

The OpenAI Chat Completions API takes a list of messages and returns a response. That's it. Each message has a role — `system`, `user`, or `assistant` — and content.

The **system** message sets the rules. It's the first thing the model reads and it shapes every response that follows. The **user** message is what the human typed. The **assistant** messages are prior responses — but in this tab there are none, because this is stateless: every request is completely independent.

> 🎬 **SHOW:** Zoom into the system prompt field in the UI, highlight it with a cursor hover.

Stateless means the model has no memory of what you said a moment ago. Ask it your name twice and it won't remember the first answer. That's not a bug — it's the default. Memory is something you build on top, which we'll do in a later tab.

The other thing to understand: the model's knowledge has a training cutoff. It cannot tell you what happened last week, and it cannot answer questions about your own documents. Those limitations are also things we'll solve — with RAG — but first you need to feel them.

---

## Demo Walkthrough

> 🎬 **SHOW:** Switch to the live app, **Simple Chat** tab open, system prompt field and message input both visible.

1. Leave the system prompt as-is and ask: *"What is JavaScript?"*

   > 🎬 **SHOW:** Type the question, hit send, watch the response appear. Point out the model name and token count badge below the response.

   You get a solid answer from training data.

2. Now ask: *"What happened in the news today?"*

   > 🎬 **SHOW:** Type and send. Let the response fully render before speaking.

   The model either refuses or makes something up. That's the training cutoff in action.

3. Change the system prompt to: *"You are a pirate. Respond only in pirate dialect."* Ask the same JavaScript question.

   > 🎬 **SHOW:** Clear the system prompt field, type the pirate persona, then send the JavaScript question. Highlight the changed tone in the response.

   Notice how completely the system prompt controls the tone — same model, same question, completely different output.

4. Ask: *"What did I just ask you?"*

   > 🎬 **SHOW:** Send the question. Point to the response showing the model has no idea what was asked before.

   It has no idea. That's statelessness.

---

## Code Deep-Dive

> 🎬 **SHOW:** Split screen — app on the left, `backend/main.py` open in editor on the right, scrolled to the `/api/chat` endpoint.

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

> 🎬 **SHOW:** Highlight the `messages` array — draw attention to the two role entries.

Two things worth noting here.

First, the client is initialised with a `base_url` and `api_key` from environment variables.

> 🎬 **SHOW:** Scroll up to show the `AsyncOpenAI` client initialisation block.

```python
client = AsyncOpenAI(
    base_url=os.environ["INFERENCE_MODEL_BASE_URL"],
    api_key=os.environ["INFERENCE_MODEL_API_KEY"],
)
```

This means you can swap the entire LLM backend — from OpenAI to Ollama to Azure to Capella AI — without touching application code. The API shape is the same.

> 🎬 **SHOW:** Highlight `temperature=0.7` in the endpoint code.

Second, `temperature=0.7` controls randomness. We'll explore that in detail in the Temperature tab, but for now: 0 is deterministic, 1.0 is creative, anything above that gets chaotic.

The response comes back as `response.choices[0].message.content` — a plain string. Everything else in this workshop is built on top of that string.

---

## Key Takeaways

> 🎬 **SHOW:** Return to the app, Simple Chat tab visible in full screen.

- The Chat Completions API takes a message list and returns a string. That's the entire primitive.
- The system prompt is your primary control over model behaviour — treat it as configuration, not an afterthought.
- Stateless by default: no memory, no history, no context between calls.
- The model's knowledge ends at its training cutoff — it cannot access real-time data or your documents.
- The `base_url` pattern lets you swap LLM providers without code changes.

---

## What's Next

> 🎬 **SHOW:** Click the "Tokenisation" tab in the sidebar to navigate to it, so viewers see the transition.

Before we add any features, we need to understand what the model actually reads. You typed "Hello, world!" — but the model didn't read those characters. It read tokens. The next tab shows you exactly what that means.
