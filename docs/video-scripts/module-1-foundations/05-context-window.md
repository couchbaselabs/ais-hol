# Context Window

**Module:** Foundations | **Level:** Beginner
**Runtime:** ~6 min | **Tab:** `context-window`

---

## Hook

GPT-4o has a 128,000-token context window. That sounds enormous — and it is. But it fills up faster than you think, and when it does, the model doesn't warn you. It just silently forgets everything that no longer fits. Understanding this constraint is what separates developers who build reliable AI systems from those who wonder why their chatbot "forgot" what the user said three messages ago.

---

## Concept

The context window is the total number of tokens the model can process in a single call — input plus output combined. It's not a soft limit you can tune; it's a hard architectural constraint of the model.

Everything the model "knows" about your conversation lives in the context window. The system prompt, every prior user message, every prior assistant response, the retrieved documents, the current question — all of it must fit within that limit.

When the window fills:
- Older messages get truncated or dropped (depending on how your application handles it).
- The model literally cannot see them. It's not that it "forgets" — the tokens were never sent.
- The response quality degrades because the model is missing context it needs.

Different models have different limits:
- GPT-4o: 128,000 tokens (~96,000 words)
- GPT-4o-mini: 128,000 tokens
- GPT-4 (original): 8,192 tokens — fills up in a long conversation

The response also consumes tokens from the same window. If you have a 128k window and your input is 127k tokens, you have only 1k tokens left for the response.

This constraint drives several architectural patterns you'll see later: conversation summarisation (compress history to save space), RAG (retrieve only relevant chunks rather than indexing everything), and chunking (split documents so they fit).

---

## Demo Walkthrough

Open the **Context Window** tab. It shows a list of messages you can add and edit, with a live token counter.

1. Start with just a system prompt. Note the token count — even a short system prompt costs 20-50 tokens.

2. Add a few user and assistant messages. Watch the bar fill. Each message adds its content tokens plus 4 tokens of role framing overhead.

3. Add a very long system prompt — paste a paragraph of text. See how quickly it consumes the window. That system prompt cost is paid on every single API call.

4. Keep adding messages until the bar turns amber (70%) then red (90%). At 90% you have very little room for a response.

5. Switch the model selector to GPT-4 (8k context). The same conversation that was 10% of GPT-4o's window is now 80% of GPT-4's. This is why model selection matters for long-context applications.

---

## Code Deep-Dive

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

The `+ 4` per message accounts for the role/content framing that the API adds automatically. It's small per message but adds up in long conversations.

This is the same calculation you should run in your own applications before sending a request. If `pct_used` is above 80%, you need a strategy: truncate old messages, summarise the conversation, or switch to a larger-context model.

---

## Key Takeaways

- The context window is a hard limit — input + output tokens must fit within it.
- When the window fills, the model silently loses access to earlier content.
- System prompts, conversation history, retrieved documents, and the response all compete for the same space.
- Count tokens before sending requests — `tiktoken` does this locally with no API cost.
- The context window constraint drives the need for summarisation, RAG, and chunking strategies.

---

## What's Next

You've completed the Foundations module. You understand what tokens are, how they're sampled, how temperature controls randomness, and why the context window is a hard constraint. Now we move to the most powerful tool you have for shaping model behaviour: prompt engineering.
