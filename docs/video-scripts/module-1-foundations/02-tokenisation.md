# Tokenisation

**Module:** Foundations | **Level:** Beginner
**Runtime:** ~6 min | **Tab:** `tokens`

---

## Hook

> 🎬 **SHOW:** Tokenisation tab open, the text input empty and the token display area blank — a clean starting state.

You've been thinking about LLMs in terms of words. The model doesn't. It thinks in tokens — and the difference matters for cost, context limits, and why some things are surprisingly expensive to process.

---

## Concept

> 🎬 **SHOW:** Slide or diagram — the string "Hello, world!" broken into coloured segments: `Hello` / `,` / ` world` / `!`, each with an ID number below it.

A **token** is the unit of text that an LLM's vocabulary recognises. It's not a character, and it's not always a word. It's a chunk determined by a compression algorithm called Byte Pair Encoding, or BPE.

BPE works by finding the most common sequences of characters in a large corpus and assigning them a single ID. Common English words like "the" or "is" become one token. Less common words get split: "tokenisation" might be two tokens — "token" and "isation". A word in a low-resource language might be split into individual characters, each costing a token.

Why does this matter?

> 🎬 **SHOW:** Slide — two columns: "Cost" and "Context limits", each with a one-line explanation.

**Cost.** Every API call is billed per token — input tokens and output tokens separately. If you're processing a million documents, the difference between 1.2 tokens per word and 1.8 tokens per word is real money.

**Context limits.** Every model has a maximum number of tokens it can process at once — its context window. When you hit that limit, the model literally cannot see earlier content. We'll explore this in the Context Window tab, but you need to understand tokens first.

> 🎬 **SHOW:** Slide — table of model names and their encoding names: `gpt-4o → o200k_base`, `gpt-4 → cl100k_base`.

**Encoding varies by model.** GPT-4 uses `cl100k_base` — a 100,000-token vocabulary. GPT-4o uses `o200k_base` — 200,000 tokens. The same text tokenises differently depending on which model you're using.

---

## Demo Walkthrough

> 🎬 **SHOW:** Tokenisation tab, cursor in the text input, ready to type.

1. Type: *"Hello, world!"*

   > 🎬 **SHOW:** Watch the colour-coded token highlights appear in real time as you type. Point to the token table below showing ID, decoded text, and raw bytes for each token.

   Count the tokens — probably 4: `Hello`, `,`, ` world`, `!`.

2. Now type the same greeting in French: *"Bonjour, le monde!"*

   > 🎬 **SHOW:** Clear the input, type the French text, let the tokenisation update. Point to the higher token count.

   More tokens, because French words are less common in the training corpus.

3. Try Japanese: *"こんにちは世界"*

   > 🎬 **SHOW:** Type the Japanese text. Point to each character being its own token in the table.

   Each character may be its own token. Non-Latin scripts are expensive.

4. Paste a code snippet with indentation.

   > 🎬 **SHOW:** Paste a short Python function. Zoom into the token table to show how leading spaces tokenise as separate tokens.

   Notice how indentation tokenises — each indent level may be a separate token.

5. Try numbers: `1234` vs `1,234` vs `$1,234.56`

   > 🎬 **SHOW:** Type each variant one at a time, pointing to the token count changing with each format.

   Punctuation and formatting add tokens.

> 🎬 **SHOW:** Point to the context window usage bar and estimated cost display at the bottom of the tab.

The tab shows context window usage percentage and estimated cost live — watch them change as you type.

---

## Code Deep-Dive

> 🎬 **SHOW:** Open `backend/main.py` in the editor, scrolled to the tokenise endpoint. Highlight the `tiktoken` import at the top.

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

> 🎬 **SHOW:** Highlight the output comment lines — specifically that `' worl'` and `'d!'` are separate tokens, and that the space is part of the token.

Notice that `' worl'` and `'d!'` are separate tokens — the word "world" is split across a token boundary. The leading space is part of the token, not a separate character.

> 🎬 **SHOW:** Scroll to the `MODEL_ENCODINGS` dictionary in the code.

The model selection matters:

```python
MODEL_ENCODINGS = {
    "gpt-4o":      "o200k_base",   # 200k token vocabulary
    "gpt-4o-mini": "o200k_base",
    "gpt-4":       "cl100k_base",  # 100k token vocabulary
    "gpt-3.5-turbo": "cl100k_base",
}
```

> 🎬 **SHOW:** Highlight the comment about chat overhead — the `CHAT_OVERHEAD_PER_MSG` constant.

One more thing: when you send a chat message, the API adds overhead beyond your raw text. Every message costs 3 extra tokens for role and content framing, plus 3 tokens for the reply primer. A conversation with 10 messages has at least 33 tokens of overhead before any content.

---

## Key Takeaways

> 🎬 **SHOW:** Return to the Tokenisation tab with "Hello, world!" still in the input, colour-coded tokens visible.

- Tokens are not words. They're BPE chunks — common sequences get one token, rare sequences get split.
- Non-English text and code are generally more expensive per word than English prose.
- The same text tokenises differently on different models — always use the right encoding.
- API cost and context window usage are both measured in tokens, not characters or words.
- `tiktoken` lets you count tokens locally before making an API call — use it to estimate cost.

---

## What's Next

> 🎬 **SHOW:** Click "Token Probabilities" in the sidebar.

You've seen that the model assigns a token ID to each chunk. But what the model actually does with those IDs is probabilistic — it predicts the most likely next token at each step. The next tab makes that probability visible.
