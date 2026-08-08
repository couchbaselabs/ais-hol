# Context Window

**Module:** Foundations | **Level:** Beginner
**Runtime:** ~6 min | **Tab:** `context-window`

---

## Hook

> 🎬 **SHOW:** Context Window tab open, showing the message editor with a few placeholder messages and a token usage bar at the top.

GPT-4o has a 128,000-token context window. That sounds enormous — and it is. But it fills up faster than you think, and when it does, the model doesn't warn you. It just silently forgets everything that no longer fits. Understanding this constraint is what separates developers who build reliable AI systems from those who wonder why their chatbot "forgot" what the user said three messages ago.

---

## Concept

> 🎬 **SHOW:** Slide — a horizontal bar labelled "Context Window (128k tokens)" divided into segments: System Prompt, Message 1, Message 2, ..., Response. An arrow points to the right end labelled "Hard limit".

The context window is the total number of tokens the model can process in a single call — input plus output combined. It's not a soft limit you can tune; it's a hard architectural constraint of the model.

Everything the model "knows" about your conversation lives in the context window. The system prompt, every prior user message, every prior assistant response, the retrieved documents, the current question — all of it must fit within that limit.

> 🎬 **SHOW:** Slide — same bar, but now the right portion is filled in red labelled "Response tokens". Shrinks the available input space.

When the window fills, older messages get truncated or dropped. The model literally cannot see them. It's not that it "forgets" — the tokens were never sent.

> 🎬 **SHOW:** Slide — table: `gpt-4o: 128k`, `gpt-4o-mini: 128k`, `gpt-4 (original): 8,192`.

Different models have different limits. GPT-4's original 8,192-token limit fills up in a long conversation. This constraint drives the need for summarisation, RAG, and chunking — all of which we'll cover in later modules.

---

## Demo Walkthrough

> 🎬 **SHOW:** Context Window tab, message list visible, token usage bar at 0%.

1. Start with just a system prompt.

   > 🎬 **SHOW:** Click the system prompt field, type a short sentence. Point to the token counter — even a short system prompt costs 20-50 tokens.

   Note the token count — even a short system prompt costs tokens.

2. Add a few user and assistant messages.

   > 🎬 **SHOW:** Click "Add message", type a user message, add an assistant reply. Repeat 3-4 times. Watch the usage bar fill incrementally with each addition.

   Watch the bar fill. Each message adds its content tokens plus 4 tokens of role framing overhead.

3. Add a very long system prompt — paste a paragraph of text.

   > 🎬 **SHOW:** Replace the system prompt with a long paragraph. Point to the bar jumping significantly. Emphasise: this cost is paid on every single API call.

   See how quickly it consumes the window. That system prompt cost is paid on every single API call.

4. Keep adding messages until the bar turns amber, then red.

   > 🎬 **SHOW:** Keep adding messages. When the bar hits 70% it turns amber — point to it. When it hits 90% it turns red — point to it and say "at this point you have very little room for a response".

5. Switch the model selector to GPT-4 (8k context).

   > 🎬 **SHOW:** Click the model dropdown, select GPT-4. Watch the bar jump dramatically — the same conversation that was 10% of GPT-4o's window is now 80% of GPT-4's.

   The same conversation that was 10% of GPT-4o's window is now 80% of GPT-4's. This is why model selection matters for long-context applications.

---

## Code Deep-Dive

> 🎬 **SHOW:** Open `backend/main.py`, scrolled to the context window counting logic. Highlight the `tiktoken` import and `MODEL_LIMITS` dictionary.

Token counting uses `tiktoken` locally — no API call needed:

```python
import tiktoken

MODEL_LIMITS = {
    "gpt-4o":      128_000,
    "gpt-4o-mini": 128_000,
    "gpt-4":         8_192,
}

enc = tiktoken.get_encoding("cl100k_base")

def count_tokens(text: str) -> int:
    return len(enc.encode(text))

total = 0
for msg in body.messages:
    tokens = count_tokens(msg["content"]) + 4  # role framing overhead
    total += tokens

pct_used = round(total / MODEL_LIMITS[body.model] * 100, 2)
```

> 🎬 **SHOW:** Highlight `+ 4` — explain the per-message overhead.

The `+ 4` per message accounts for the role/content framing that the API adds automatically. It's small per message but adds up in long conversations.

> 🎬 **SHOW:** Highlight the `pct_used` calculation — this is what drives the colour of the bar in the UI.

This is the same calculation you should run in your own applications before sending a request. If `pct_used` is above 80%, you need a strategy: truncate old messages, summarise the conversation, or switch to a larger-context model.

---

## Key Takeaways

> 🎬 **SHOW:** Return to the tab with the red usage bar visible — a clear visual of the constraint.

- The context window is a hard limit — input + output tokens must fit within it.
- When the window fills, the model silently loses access to earlier content.
- System prompts, conversation history, retrieved documents, and the response all compete for the same space.
- Count tokens before sending requests — `tiktoken` does this locally with no API cost.
- The context window constraint drives the need for summarisation, RAG, and chunking strategies.

---

## What's Next

> 🎬 **SHOW:** Click "Prompt Engineering" in the sidebar — the first tab of Module 2.

You've completed the Foundations module. You understand what tokens are, how they're sampled, how temperature controls randomness, and why the context window is a hard constraint. Now we move to the most powerful tool you have for shaping model behaviour: prompt engineering.
