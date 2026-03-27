"""FAQ hybrid search tool — Exercise 7.

Registered in the Agent Catalog. Combines vector search and FTS to retrieve
the most relevant chunks from a given FAQ collection.
"""

from __future__ import annotations

import asyncio
import concurrent.futures
import os

import agentc
from couchbase.auth import PasswordAuthenticator
from couchbase.cluster import Cluster
from couchbase.options import ClusterOptions, SearchOptions
from couchbase.search import MatchQuery, SearchRequest
from couchbase.vector_search import VectorQuery, VectorSearch

_cluster: Cluster | None = None

BUCKET_NAME = lambda: os.environ.get("COUCHBASE_BUCKET_NAME", "shared")
SCOPE_NAME = "public"
TOP_K = 5


def _get_cluster() -> Cluster:
    global _cluster
    if _cluster is None:
        conn_str = os.environ["COUCHBASE_CONNECTION_STRING"]
        username = os.environ["COUCHBASE_USERNAME"]
        password = os.environ["COUCHBASE_PASSWORD"]
        auth = PasswordAuthenticator(username, password)
        options = ClusterOptions(auth)
        options.apply_profile("wan_development")
        _cluster = Cluster(conn_str, options)
        _cluster.wait_until_ready(timeout=timedelta(seconds=15))
    return _cluster


def _run_async(coro):
    """Run an async coroutine from a sync context safely.

    LangGraph's ReAct executor calls tools synchronously, but the tool needs
    to call async functions (get_embedding). Running the coroutine in a
    dedicated thread with its own event loop avoids conflicts with the
    already-running uvicorn event loop.
    """
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
        future = pool.submit(asyncio.run, coro)
        return future.result()


def _vector_search(
    scope,
    collection_name: str,
    embedding: list[float],
    index_name: str,
) -> dict[str, dict]:
    """Run a vector search and return {doc_id: {content, score}} map."""
    request = SearchRequest.create(
        VectorSearch.from_vector_query(
            VectorQuery("vector", embedding, num_candidates=TOP_K * 2)
        )
    )
    result = scope.search(index_name, request, SearchOptions(limit=TOP_K))
    collection = scope.collection(collection_name)

    hits: dict[str, dict] = {}
    for row in result.rows():
        try:
            doc = collection.get(row.id)
            content = dict(doc.content_as[dict])
            content.pop("vector", None)
            hits[row.id] = {"content": content.get("content", ""), "vector_score": row.score}
        except Exception as e:
            print(f"Vector fetch error for {row.id}: {e}")
    return hits


def _fts_search(
    scope,
    collection_name: str,
    query: str,
    index_name: str,
) -> dict[str, dict]:
    """Run a full-text search and return {doc_id: {content, score}} map."""
    request = SearchRequest.create(MatchQuery(query))
    result = scope.search(index_name, request, SearchOptions(limit=TOP_K))
    collection = scope.collection(collection_name)

    hits: dict[str, dict] = {}
    for row in result.rows():
        try:
            doc = collection.get(row.id)
            content = dict(doc.content_as[dict])
            content.pop("vector", None)
            hits[row.id] = {"content": content.get("content", ""), "fts_score": row.score}
        except Exception as e:
            print(f"FTS fetch error for {row.id}: {e}")
    return hits


def _merge_results(
    vector_hits: dict[str, dict],
    fts_hits: dict[str, dict],
) -> list[dict]:
    """Merge and deduplicate results, combining scores for shared hits."""
    merged: dict[str, dict] = {}

    for doc_id, data in vector_hits.items():
        merged[doc_id] = {
            "id": doc_id,
            "content": data["content"],
            "score": data["vector_score"],
        }

    for doc_id, data in fts_hits.items():
        if doc_id in merged:
            merged[doc_id]["score"] += data["fts_score"]
        else:
            merged[doc_id] = {
                "id": doc_id,
                "content": data["content"],
                "score": data["fts_score"],
            }

    return sorted(merged.values(), key=lambda x: x["score"], reverse=True)[:TOP_K]


@agentc.tool
def hybrid_faq_search(query: str, collection_name: str) -> list[dict]:
    """Search a FAQ collection using both vector similarity and full-text search.

    Combines results from a vector index and an FTS index on the given
    Couchbase collection, deduplicates by document ID, and returns the
    top-5 most relevant chunks with their content and combined score.

    Index naming convention (must match what was created in cbsh):
      - Vector index: <bucket>.<scope>.<collection_name>_vector_idx
      - FTS index:    <bucket>.<scope>.<collection_name>_fts_idx

    Args:
        query:           The user's question or search string.
        collection_name: The Couchbase collection to search (e.g. 'hr_policy').

    Returns:
        List of dicts with keys: id, content, score.

    TODO (Exercise 7 — Step 7):
      1. Embed the query using _run_async(get_embedding(query)).
         Import get_embedding inside the function:
           from services.openai_service import get_embedding
      2. Get the cluster and scope:
           cluster = _get_cluster()
           scope = cluster.bucket(BUCKET_NAME()).scope(SCOPE_NAME)
      3. Build the index names:
           vector_index = f"{BUCKET_NAME()}.{SCOPE_NAME}.{collection_name}_vector_idx"
           fts_index    = f"{BUCKET_NAME()}.{SCOPE_NAME}.{collection_name}_fts_idx"
      4. Call _vector_search(scope, collection_name, embedding, vector_index)
      5. Call _fts_search(scope, collection_name, query, fts_index)
      6. Return _merge_results(vector_hits, fts_hits)
    """
    raise NotImplementedError("Implement hybrid_faq_search() in faq_search_tools.py")
