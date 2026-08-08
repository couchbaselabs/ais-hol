# Token Budget

**Module:** Production Patterns | **Level:** Advanced
**Runtime:** ~6 min | **Tab:** `token-budget`

---

## Hook

> 🎬 **SHOW:** Token Budget tab open, text input visible, token count display, budget slider, cost estimate panel.

Every LLM API call has two costs: latency and money. Both scale with token count. If you don't count tokens before sending a request, you risk hitting the context window limit mid-conversation, paying for more tokens than you intended, or getting truncated responses. This tab shows how to count tokens locally — before the API call — using `tiktoken`, and how to enforce a budget.

---

## Concept

> 🎬 **SHOW:** Slide — the token budget equation: `prompt_tokens + max_completion_tokens ≤ context_window`. Label each term.

Every model has a context window limit. Your prompt tokens plus the completion tokens you request must fit within it. If you don't check, the API either truncates your prompt silently or returns an error.

> 🎬 **SHOW:** Slide — `tiktoken` logo and a code snippet: `enc = tiktoken.encoding_for_model("gpt-4o-mini")` → `tokens = enc.encode(text)` → `len(tokens)`.

`tiktoken` is OpenAI's tokeniser library. It runs locally — no API call needed. You can count tokens for any text before sending it, which lets you enforce budgets, truncate inputs, and estimate costs.

> 🎬 **SHOW:** Slide — cost formula: `cost = (prompt_tokens / 1000) * input_price + (completion_tokens / 1000) * output_price`. Show example prices for gpt-4o-mini.

Token counting enables cost estimation. Multiply token counts by the per-1k-token price for the model to get a pre-call cost estimate. This is how you build cost guardrails.

---

## Demo Walkthrough

> 🎬 **SHOW:** Token Budget tab, budget slider at 500 tokens.

1. Type a short message: *"Hello, how are you?"* Watch the token count update in real time.

   > 🎬 **SHOW:** Token count shows ~5 tokens. Cost estimate shows a fraction of a cent. Budget bar shows minimal usage.

   Short messages are cheap. The token counter updates as you type — no API call needed.

2. Paste a long document (several paragraphs). Watch the counter.

   > 🎬 **SHOW:** Token count climbs. Point to the budget bar filling up. If it exceeds the budget, a warning appears.

   Long inputs consume budget quickly. The visual budget bar makes the cost tangible.

3. Set the budget to **100 tokens**. Paste the same long document. Submit.

   > 🎬 **SHOW:** The backend truncates the input to fit within the budget, sends the truncated version, and returns the response along with a truncation notice.

   When input exceeds the budget, the backend truncates to the last complete token boundary that fits. The response includes a notice that truncation occurred.

4. Set the budget to **2000 tokens**. Submit the same document.

   > 🎬 **SHOW:** No truncation. Full response returned. Point to the actual token usage in the response metadata.

   With sufficient budget, no truncation. The response metadata shows actual prompt and completion token counts from the API — compare with the pre-call estimate.

---

## Code Deep-Dive

> 🎬 **SHOW:** `backend/main.py`, scrolled to `/api/token-budget`. Highlight the tiktoken encoding and truncation logic.

```python
import tiktoken

enc = tiktoken.encoding_for_model("gpt-4o-mini")

def count_tokens(text: str) -> int:
    return len(enc.encode(text))

def truncate_to_budget(text: str, max_tokens: int) -> tuple[str, bool]:
    tokens = enc.encode(text)
    if len(tokens) <= max_tokens:
        return text, False
    truncated = enc.decode(tokens[:max_tokens])
    return truncated, True
```

> 🎬 **SHOW:** Highlight `enc.decode(tokens[:max_tokens])` — truncating at a token boundary, not a character boundary.

Truncating at a token boundary avoids splitting multi-byte characters or partial words. Always decode back from tokens rather than slicing the string directly.

> 🎬 **SHOW:** Slide — the cost estimation formula with current gpt-4o-mini prices.

```python
GPT4O_MINI_INPUT_PRICE  = 0.150 / 1_000_000  # $ per token
GPT4O_MINI_OUTPUT_PRICE = 0.600 / 1_000_000  # $ per token

def estimate_cost(prompt_tokens: int, max_completion: int) -> float:
    return (
        prompt_tokens    * GPT4O_MINI_INPUT_PRICE +
        max_completion   * GPT4O_MINI_OUTPUT_PRICE
    )
```

> 🎬 **SHOW:** Note that output price is typically higher than input price — completion tokens cost more.

Output tokens cost more than input tokens for most models. A request with a 1000-token prompt and 500-token completion costs more than a 1500-token prompt with no completion.

---

## Key Takeaways

> 🎬 **SHOW:** Token count display and cost estimate panel with a mid-length input.

- Count tokens locally with `tiktoken` before every API call — it's free and runs in microseconds.
- Truncate at token boundaries using `enc.decode(tokens[:n])`, not string slicing.
- Pre-call cost estimation enables budget guardrails — reject or truncate requests that would exceed your cost threshold.
- Output tokens cost more than input tokens; factor this into your budget calculations.
- Track actual token usage from API responses (`usage.prompt_tokens`, `usage.completion_tokens`) and compare with pre-call estimates to validate your counting logic.

---

## What's Next

> 🎬 **SHOW:** Sidebar — highlight the next tab `observability`.

Next: Observability — tracing LLM calls to understand latency, cost, and failure patterns across your application.
