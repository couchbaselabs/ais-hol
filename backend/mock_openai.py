"""Mock OpenAI-compatible API server for local development without API keys.

Implements the subset of the OpenAI REST API used by this demo:
  POST /v1/chat/completions        — non-streaming and streaming
  POST /v1/embeddings              — returns deterministic unit vectors

Run alongside the main backend:
  python mock_openai.py            # listens on http://localhost:9999

Then point the main backend at it via .env.mock:
  INFERENCE_MODEL_BASE_URL=http://localhost:9999/v1
  EMBEDDING_MODEL_BASE_URL=http://localhost:9999/v1

The mock produces realistic-looking responses so every demo tab works:
  - Chat: echoes the last user message with a canned prefix
  - Streaming: streams the same response token by token with a small delay
  - Embeddings: deterministic 1536-dim unit vector derived from text hash
  - json_object mode: returns a valid JSON object matching common schemas
  - Structured scoring (LLM-as-Judge): returns plausible 1-5 scores
  - Tokenisation: handled entirely by tiktoken in the main backend (no mock needed)
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import math
import os
import time
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, StreamingResponse

app = FastAPI(title="Mock OpenAI API")

PORT = int(os.environ.get("MOCK_PORT", 9999))

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _now() -> int:
    return int(time.time())


def _make_id(prefix: str = "chatcmpl") -> str:
    return f"{prefix}-mock{uuid.uuid4().hex[:12]}"


def _deterministic_embedding(text: str, dim: int = 1536) -> list[float]:
    """Return a deterministic unit vector derived from the text's SHA-256 hash.

    Semantically similar texts will NOT cluster (this is a mock), but the
    vector is stable across calls for the same input, which keeps cache
    lookups consistent within a single session.
    """
    seed = int(hashlib.sha256(text.encode()).hexdigest(), 16)
    vec = []
    for i in range(dim):
        # LCG-style deterministic float in [-1, 1]
        seed = (seed * 6364136223846793005 + 1442695040888963407) & 0xFFFFFFFFFFFFFFFF
        vec.append((seed / 0xFFFFFFFFFFFFFFFF) * 2 - 1)
    # Normalise to unit length
    magnitude = math.sqrt(sum(x * x for x in vec))
    return [x / magnitude for x in vec]


def _chat_reply(messages: list[dict], response_format: dict | None = None) -> str:
    """Generate a mock reply appropriate for the request context."""
    last_user = next(
        (m["content"] for m in reversed(messages) if m.get("role") == "user"), ""
    )
    system = next(
        (m["content"] for m in messages if m.get("role") == "system"), ""
    )

    # json_object mode — detect schema from system prompt keywords
    if response_format and response_format.get("type") == "json_object":
        return _json_reply(system, last_user)

    # Streaming / plain chat
    return _plain_reply(system, last_user)


def _plain_reply(system: str, user: str) -> str:
    sys_lower = system.lower()

    # Routing assistant
    if "routing assistant" in sys_lower or '"direct"' in system:
        # Detect math
        if any(op in user for op in ["+", "-", "*", "/", "×", "÷", "sqrt", "calculate", "compute", "multiply", "add", "subtract", "divide"]):
            return json.dumps({"route": "math", "answer": None})
        # Detect web dev
        if any(kw in user.lower() for kw in ["css", "html", "javascript", "js", "dom", "fetch", "promise", "async", "web", "browser"]):
            return json.dumps({"route": "rag", "answer": None})
        return json.dumps({"route": "direct", "answer": f"Mock answer: {user[:80]}"})

    # Hypothetical document generation
    if "hypothetical answer" in sys_lower or "documentation excerpt" in sys_lower:
        return (
            f"This is a mock hypothetical document about: {user[:60]}. "
            "It describes the concept in detail using technical terminology "
            "similar to what would appear in official documentation. "
            "The implementation follows standard patterns and best practices."
        )

    # Summarisation
    if "summarise" in sys_lower or "summary" in sys_lower or "summarize" in sys_lower:
        words = user.split()
        snippet = " ".join(words[:20]) + ("…" if len(words) > 20 else "")
        return f"[Mock summary] This excerpt covers: {snippet}"

    # Reranking scorer
    if "score each document" in sys_lower or "relevance" in sys_lower and "0–10" in system:
        # Return a JSON array of scores
        import re
        count = len(re.findall(r"^\[(\d+)\]", user, re.MULTILINE))
        count = max(count, 1)
        scores = [{"index": i, "score": round(8.0 - i * 1.5, 1)} for i in range(count)]
        return json.dumps(scores)

    # Topic labeller
    if "snake_case" in sys_lower or "3-5 words" in sys_lower:
        words = user.lower().split()[:3]
        return "_".join(w.strip(".,!?") for w in words if w.isalpha()) or "general_topic"

    # Math agent
    if "math assistant" in sys_lower or "calculation" in sys_lower:
        return f"The result of your calculation is 42. (Mock math agent — no real computation.)"

    # FAQ / RAG agent
    if "faq" in sys_lower or "documentation expert" in sys_lower or "mdn" in sys_lower:
        return (
            f"[Mock RAG answer] Based on the retrieved documents, here is what I found "
            f"about '{user[:60]}': This is a placeholder response from the mock backend. "
            "In production, this would contain content retrieved from your Couchbase vector index."
        )

    # Default
    return (
        f"[Mock response] You asked: \"{user[:100]}\". "
        "This is a dummy reply from the local mock OpenAI server. "
        "No API key is required — configure a real endpoint to get actual LLM responses."
    )


def _json_reply(system: str, user: str) -> str:
    sys_lower = system.lower()

    # Structured output / text analysis schema
    if "sentiment" in sys_lower and "entities" in sys_lower:
        return json.dumps({
            "sentiment": "neutral",
            "sentiment_score": 0.72,
            "summary": f"Mock summary of: {user[:60]}",
            "topics": ["technology", "demonstration"],
            "entities": [
                {"text": "mock server", "type": "concept"},
                {"text": "OpenAI", "type": "org"},
            ],
            "language": "en",
        })

    # LLM-as-Judge evaluation schema
    if "faithfulness" in sys_lower or "evaluator" in sys_lower:
        return json.dumps({
            "faithfulness": 4,
            "relevance": 4,
            "completeness": 3,
            "reasoning": (
                "Faithfulness: the answer stays close to the provided documents with no obvious hallucinations. "
                "Relevance: the answer addresses the question directly. "
                "Completeness: some secondary aspects of the question are not fully covered."
            ),
        })

    # Reranking scores (json_object fallback)
    if "score" in sys_lower and "relevance" in sys_lower:
        return json.dumps({"scores": [
            {"index": 0, "score": 8.5},
            {"index": 1, "score": 6.0},
            {"index": 2, "score": 4.5},
            {"index": 3, "score": 3.0},
        ]})

    # Router decision
    if "route" in sys_lower:
        return json.dumps({"route": "direct", "answer": f"Mock: {user[:80]}"})

    # Generic fallback
    return json.dumps({"response": f"Mock JSON reply for: {user[:80]}", "status": "ok"})


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.post("/v1/chat/completions")
async def chat_completions(request: Request):
    body = await request.json()
    messages = body.get("messages", [])
    stream = body.get("stream", False)
    response_format = body.get("response_format")
    model = body.get("model", "mock-model")

    reply = _chat_reply(messages, response_format)
    created = _now()
    cid = _make_id()

    if stream:
        async def token_stream():
            # Split reply into word-sized chunks to simulate streaming
            words = reply.split(" ")
            for i, word in enumerate(words):
                chunk_text = word + (" " if i < len(words) - 1 else "")
                chunk = {
                    "id": cid,
                    "object": "chat.completion.chunk",
                    "created": created,
                    "model": model,
                    "choices": [{
                        "index": 0,
                        "delta": {"content": chunk_text},
                        "finish_reason": None,
                    }],
                }
                yield f"data: {json.dumps(chunk)}\n\n"
                await asyncio.sleep(0.02)  # 20 ms per token — realistic feel
            # Final chunk
            done_chunk = {
                "id": cid,
                "object": "chat.completion.chunk",
                "created": created,
                "model": model,
                "choices": [{"index": 0, "delta": {}, "finish_reason": "stop"}],
            }
            yield f"data: {json.dumps(done_chunk)}\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(token_stream(), media_type="text/event-stream")

    n_prompt = sum(len(m.get("content", "").split()) for m in messages)
    n_completion = len(reply.split())

    return JSONResponse({
        "id": cid,
        "object": "chat.completion",
        "created": created,
        "model": model,
        "choices": [{
            "index": 0,
            "message": {"role": "assistant", "content": reply},
            "finish_reason": "stop",
        }],
        "usage": {
            "prompt_tokens": n_prompt,
            "completion_tokens": n_completion,
            "total_tokens": n_prompt + n_completion,
        },
    })


@app.post("/v1/embeddings")
async def embeddings(request: Request):
    body = await request.json()
    model = body.get("model", "mock-embedding")
    inp = body.get("input", "")

    # Accept both string and list[string]
    texts = [inp] if isinstance(inp, str) else inp

    data = [
        {
            "object": "embedding",
            "index": i,
            "embedding": _deterministic_embedding(text),
        }
        for i, text in enumerate(texts)
    ]

    total_tokens = sum(len(t.split()) for t in texts)

    return JSONResponse({
        "object": "list",
        "data": data,
        "model": model,
        "usage": {"prompt_tokens": total_tokens, "total_tokens": total_tokens},
    })


@app.get("/v1/models")
async def list_models():
    return JSONResponse({
        "object": "list",
        "data": [
            {"id": "mock-gpt-4o-mini", "object": "model", "created": _now(), "owned_by": "mock"},
            {"id": "mock-embedding",   "object": "model", "created": _now(), "owned_by": "mock"},
        ],
    })


@app.get("/health")
async def health():
    return {"status": "ok", "server": "mock-openai"}


@app.get("/key/info")
async def key_info():
    """Mock LiteLLM virtual-key self-lookup, for the header budget widget."""
    reset_at = datetime.now(timezone.utc) + timedelta(hours=6)
    return JSONResponse({
        "key": "mock-virtual-key",
        "info": {
            "key_alias": "workshop-mock-key",
            "spend": 1.85,
            "max_budget": 5.0,
            "budget_duration": "24h",
            "budget_reset_at": reset_at.isoformat(),
        },
    })


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    print(f"Starting mock OpenAI server on http://localhost:{PORT}")
    print("Set INFERENCE_MODEL_BASE_URL=http://localhost:9999/v1")
    print("Set EMBEDDING_MODEL_BASE_URL=http://localhost:9999/v1")
    uvicorn.run("mock_openai:app", host="0.0.0.0", port=PORT, reload=False)
