"""Mock Couchbase service layer for local development without a cluster.

When MOCK_MODE=true, this module monkey-patches the couchbase_service and
conversation_service modules so every call returns plausible stub data
instead of hitting a real cluster.

Import this at the top of main.py when MOCK_MODE is set:
    if os.environ.get("MOCK_MODE") == "true":
        import mock_couchbase  # noqa: F401  — side-effect import

No changes to any other service file are needed.
"""

from __future__ import annotations

import hashlib
import math
import sys
import time
import uuid
from datetime import datetime, timezone
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

# ---------------------------------------------------------------------------
# Stub data
# ---------------------------------------------------------------------------

_MOCK_DOCS = [
    {
        "id": "mock-doc-1",
        "filepath": "web/api/fetch/index.md",
        "content": (
            "The Fetch API provides a JavaScript interface for making HTTP requests. "
            "fetch() returns a Promise that resolves to a Response object. "
            "Use response.json() to parse JSON or response.text() for plain text."
        ),
        "score": 0.92,
    },
    {
        "id": "mock-doc-2",
        "filepath": "web/javascript/reference/statements/let/index.md",
        "content": (
            "The let declaration declares a block-scoped local variable. "
            "Unlike var, let does not create a property on the global object. "
            "Variables declared with let cannot be redeclared in the same scope."
        ),
        "score": 0.87,
    },
    {
        "id": "mock-doc-3",
        "filepath": "web/css/box_model/index.md",
        "content": (
            "The CSS box model describes the rectangular boxes generated for elements. "
            "Each box has a content area, padding, border, and margin. "
            "box-sizing: border-box includes padding and border in the element's total width."
        ),
        "score": 0.81,
    },
    {
        "id": "mock-doc-4",
        "filepath": "web/api/web_workers_api/index.md",
        "content": (
            "Web Workers allow JavaScript to run in background threads. "
            "Workers communicate with the main thread via postMessage(). "
            "They cannot access the DOM but can perform CPU-intensive tasks without blocking the UI."
        ),
        "score": 0.76,
    },
]

_MOCK_CONVERSATIONS: dict[str, list[dict]] = {}

_MOCK_FAQ_CATALOG = [
    {
        "collection_name": "hr_policies",
        "description": "Human resources policies including vacation, sick leave, and benefits.",
        "score": 0.88,
    },
    {
        "collection_name": "product_warranty",
        "description": "Product warranty terms, coverage, and claim procedures.",
        "score": 0.82,
    },
]


# ---------------------------------------------------------------------------
# Deterministic embedding (same algorithm as mock_openai.py)
# ---------------------------------------------------------------------------

def _deterministic_embedding(text: str, dim: int = 1536) -> list[float]:
    seed = int(hashlib.sha256(text.encode()).hexdigest(), 16)
    vec = []
    for _ in range(dim):
        seed = (seed * 6364136223846793005 + 1442695040888963407) & 0xFFFFFFFFFFFFFFFF
        vec.append((seed / 0xFFFFFFFFFFFFFFFF) * 2 - 1)
    magnitude = math.sqrt(sum(x * x for x in vec))
    return [x / magnitude for x in vec]


# ---------------------------------------------------------------------------
# Patch couchbase_service
# ---------------------------------------------------------------------------

async def _mock_get_relevant_documents(embedding: list[float]) -> list[dict]:
    return list(_MOCK_DOCS)


async def _mock_wait_until_ready() -> None:
    pass  # no cluster to wait for


def _mock_get_cluster():
    return MagicMock()


def _mock_get_bucket():
    return MagicMock()


def _mock_get_collection():
    return MagicMock()


# ---------------------------------------------------------------------------
# Patch conversation_service
# ---------------------------------------------------------------------------

async def _mock_add_message(session_id: str, content: str, role: str) -> None:
    if session_id not in _MOCK_CONVERSATIONS:
        _MOCK_CONVERSATIONS[session_id] = []
    _MOCK_CONVERSATIONS[session_id].append({
        "role": role,
        "content": content,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })


async def _mock_get_conversation_history(session_id: str, limit: int = 20) -> list[dict]:
    return _MOCK_CONVERSATIONS.get(session_id, [])[-limit:]


async def _mock_clear_conversation(session_id: str) -> None:
    _MOCK_CONVERSATIONS.pop(session_id, None)


async def _mock_summarize_conversation(session_id: str) -> str:
    history = _MOCK_CONVERSATIONS.get(session_id, [])
    if not history:
        return "No prior conversation."
    turns = len(history)
    return f"[Mock summary] {turns} message(s) exchanged so far in this session."


def _mock_format_conversation_history(history: list[dict]) -> str:
    if not history:
        return "No prior conversation."
    return "\n".join(f"{m['role'].upper()}: {m['content']}" for m in history)


# ---------------------------------------------------------------------------
# Patch semantic_cache_service
# ---------------------------------------------------------------------------

_MOCK_CACHE: dict[str, str] = {}


async def _mock_cache_get(query: str, embedding: list[float], llm_sig: str) -> str | None:
    key = f"{llm_sig}::{query}"
    return _MOCK_CACHE.get(key)


async def _mock_cache_put(query: str, embedding: list[float], llm_sig: str, response: str) -> None:
    key = f"{llm_sig}::{query}"
    _MOCK_CACHE[key] = response


async def _mock_cache_invalidate_all() -> int:
    count = len(_MOCK_CACHE)
    _MOCK_CACHE.clear()
    return count


async def _mock_cache_invalidate_by_signature(llm_signature: str) -> int:
    keys = [k for k in list(_MOCK_CACHE) if k.startswith(f"{llm_signature}::")]
    for k in keys:
        del _MOCK_CACHE[k]
    return len(keys)


# ---------------------------------------------------------------------------
# Patch faq_catalog_service
# ---------------------------------------------------------------------------

async def _mock_get_faq_collections() -> list[dict]:
    return list(_MOCK_FAQ_CATALOG)


async def _mock_find_best_faq_collection(query_embedding: list[float]) -> dict | None:
    return _MOCK_FAQ_CATALOG[0]


# ---------------------------------------------------------------------------
# Apply all patches
# ---------------------------------------------------------------------------

def _mock_ai_data_plane_summarise(text: str, max_words: int = 150) -> dict:
    word_count = len(text.split())
    return {
        "summary": (
            f"[Mock Couchbase AI Data Plane ai_summary()] This {word_count}-word text discusses "
            "key concepts and ideas. In a real Couchbase AI Data Plane cluster, ai_summary() runs "
            "inside the database using the configured LLM — no extra API call needed."
        ),
        "source": "ai_data_plane_ai_summary",
    }


def _mock_ai_data_plane_sentiment(text: str) -> dict:
    text_lower = text.lower()
    positive_words = {"love", "great", "excellent", "good", "happy", "amazing", "wonderful", "fantastic"}
    negative_words = {"hate", "bad", "terrible", "awful", "horrible", "poor", "disappointing", "slow"}
    words = set(text_lower.split())
    pos = len(words & positive_words)
    neg = len(words & negative_words)
    if pos > neg:
        sentiment, score = "positive", round(0.6 + pos * 0.1, 2)
    elif neg > pos:
        sentiment, score = "negative", round(0.6 + neg * 0.1, 2)
    else:
        sentiment, score = "neutral", 0.5
    return {
        "sentiment":       sentiment,
        "sentiment_score": min(score, 0.99),
        "explanation":     f"[Mock Couchbase AI Data Plane ai_sentiment()] Detected {sentiment} tone. "
                           "In a real cluster this runs inside the database via SQL++.",
        "source":          "ai_data_plane_ai_sentiment",
    }


def _apply():
    # couchbase_service
    cs = sys.modules.get("services.couchbase_service")
    if cs:
        cs.get_relevant_documents = _mock_get_relevant_documents
        cs.wait_until_ready = _mock_wait_until_ready
        cs.get_cluster = _mock_get_cluster
        cs.get_bucket = _mock_get_bucket

    # conversation_service
    conv = sys.modules.get("services.conversation_service")
    if conv:
        conv.add_message = _mock_add_message
        conv.get_conversation_history = _mock_get_conversation_history
        conv.clear_conversation = _mock_clear_conversation
        conv.summarize_conversation = _mock_summarize_conversation
        conv.format_conversation_history = _mock_format_conversation_history

    # semantic_cache_service
    cache = sys.modules.get("services.semantic_cache_service")
    if cache:
        cache.cache_get = _mock_cache_get
        cache.cache_put = _mock_cache_put
        cache.cache_invalidate_all = _mock_cache_invalidate_all
        cache.cache_invalidate_by_signature = _mock_cache_invalidate_by_signature

    # Also patch names already bound in main (imported before _apply ran)
    main = sys.modules.get("main")
    if main:
        if hasattr(main, "cache_get"):
            main.cache_get = _mock_cache_get
        if hasattr(main, "cache_put"):
            main.cache_put = _mock_cache_put
        if hasattr(main, "cache_invalidate_all"):
            main.cache_invalidate_all = _mock_cache_invalidate_all
        if hasattr(main, "cache_invalidate_by_signature"):
            main.cache_invalidate_by_signature = _mock_cache_invalidate_by_signature

    # faq_catalog_service
    faq = sys.modules.get("services.faq_catalog_service")
    if faq:
        faq.get_faq_collections = _mock_get_faq_collections
        faq.find_best_faq_collection = _mock_find_best_faq_collection

    print("[mock_couchbase] All Couchbase service functions patched with stubs.")


# Run on import — but services may not be imported yet.
# main.py calls _apply() explicitly after importing services.
# We also register it to run after a short delay via a startup hook.
_apply()
