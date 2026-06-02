# Tokenisation

**Module:** Foundations | **Level:** Beginner
**Runtime:** ~6 min | **Tab:** `tokens`

---

## Hook

You've been thinking about LLMs in terms of words. The model doesn't. It thinks in tokens — and the difference matters for cost, context limits, and why some things are surprisingly expensive to process.

---

## Concept

A **token** is the unit of text that an LLM's vocabulary recognises. It's not a character, and it's not always a word. It's a chunk determined by a compression algorithm called Byte Pair Encoding, or BPE.

BPE works by finding the most common sequences of characters in a large corpus and assigning them a single ID. Common English words like "the" or "is" become one token. Less common words get split: "tokenisation" might be two tokens — "token" and "isation". A word in a low-resource language might be split into individual characters, each costing a token.

Why does this matter?

**Cost.** Every API call is billed per token — input tokens and output tokens separately. If you're processing a million documents, the difference between 1.2 tokens per word and 1.8 tokens per word is real money.

**Context limits.** Every model has a maximum number of tokens it can process at once — its context window. When you hit that limit, the model literally cannot see earlier content. We'll explore this in the Context Window tab, but you need to understand tokens first.

**Encoding varies by model.** GPT-4 uses `cl100k_base` — a 100,000-token vocabulary. GPT-4o uses `o200k_base` — 200,000 tokens. The same text tokenises differently depending on which model you're using.

---

## Demo Walkthrough

Open the **Tokenisation** tab. Type text in the input and watch it tokenise live.

1. Type: *"Hello, world!"* — count the tokens. Probably 4: `Hello`, `,`, ` world`, `!`.
2. Now type the same greeting in French: *"Bonjour, le monde!"* — more tokens, because French words are less common in the training corpus.
3. Try Japanese: *"こんにちは世界"* — each character may be its own token. Non-Latin scripts are expensive.
4. Paste a code snippet with indentation. Notice how leading spaces tokenise — each indent level may be a separate token.
5. Try numbers: `1234` vs `1,234` vs `$1,234.56`. Punctuation and formatting add tokens.

The tab colour-codes each token in the original text and shows you the token ID, decoded text, and raw bytes. The token ID is what actually gets sent to the model — the model never sees your original characters.

At the bottom you'll see the context window usage percentage and an estimated cost. These are live — watch them change as you type.

---

## Code Deep-Dive

The backend uses `tiktoken`, the same tokeniser library OpenAI uses internally:

```python
import tiktoken

enc = tiktoken.get_encoding("cl100k_base")  # or o200k_base for gpt-4o
token_ids = enc.encode("Hello, world!")

for tid in token_ids:
    raw_bytes = enc.decode_single_token_bytes(tid)
    text = raw_bytes.decode("utf-8")
    print(f"id={tid}  bytes={list(raw_bytes)}  text={repr(text)}")
# id=9906  bytes=[72, 101, 108, 108, 111]  text='Hello'
# id=11   bytes=[44]                        text=','
# id=1917 bytes=[32, 119, 111, 114, 108]   text=' worl'
# id=0    bytes=[100, 33]                  text='d!'
```

Notice that `' worl'` and `'d!'` are separate tokens — the word "world" is split across a token boundary. The leading space is part of the token, not a separate character. This is how BPE works.

The model selection matters:

```python
MODEL_ENCODINGS = {
    "gpt-4o":      "o200k_base",   # 200k token vocabulary
    "gpt-4o-mini": "o200k_base",
    "gpt-4":       "cl100k_base",  # 100k token vocabulary
    "gpt-3.5-turbo": "cl100k_base",
}
```

One more thing: when you send a chat message, the API adds overhead beyond your raw text. Every message costs 3 extra tokens for role and content framing, plus 3 tokens for the reply primer. A conversation with 10 messages has at least 33 tokens of overhead before any content.

---

## Key Takeaways

- Tokens are not words. They're BPE chunks — common sequences get one token, rare sequences get split.
- Non-English text and code are generally more expensive per word than English prose.
- The same text tokenises differently on different models — always use the right encoding.
- API cost and context window usage are both measured in tokens, not characters or words.
- `tiktoken` lets you count tokens locally before making an API call — use it to estimate cost.

---

## What's Next

You've seen that the model assigns a token ID to each chunk. But what the model actually does with those IDs is probabilistic — it predicts the most likely next token at each step. The next tab makes that probability visible.
