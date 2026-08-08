"""RAG search tool for the RAG agent.

Registered in the Agent Catalog. Embeds the query and retrieves the most
relevant MDN documentation chunks via SQL++ ANN vector search on Couchbase.
"""

from __future__ import annotations

import asyncio
import concurrent.futures

from agentc_core.tool import tool as agentc_tool


def _run_async(coro):
    """Run an async coroutine from a sync context without conflicting with uvicorn's loop."""
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
        future = pool.submit(asyncio.run, coro)
        return future.result()


@agentc_tool
def rag_search(query: str) -> list[dict]:
    """Search MDN Web documentation for content relevant to the query.

    Embeds the query and runs an ANN vector search against the documentation
    collection in Couchbase. Returns the top matching chunks with their
    filepath and content.

    Args:
        query: The user's question or search string.

    Returns:
        List of dicts with keys: id, filepath, content, score.
    """
    from services.openai_service import get_embedding
    from services.couchbase_service import get_relevant_documents

    embedding = _run_async(get_embedding(query))
    docs = _run_async(get_relevant_documents(embedding))
    return docs
