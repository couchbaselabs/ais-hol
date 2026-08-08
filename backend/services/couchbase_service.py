import json
import os
import threading
import time
from datetime import timedelta
from couchbase.cluster import Cluster
from couchbase.options import ClusterOptions, SearchOptions
from couchbase.auth import PasswordAuthenticator
from couchbase.search import SearchRequest
from couchbase.vector_search import VectorQuery, VectorSearch
from couchbase.exceptions import UnAmbiguousTimeoutException, AmbiguousTimeoutException

_cluster = None
_cluster_lock = threading.Lock()
_last_connect_attempt: float = 0.0
_RECONNECT_COOLDOWN = 30.0   # seconds between reconnect attempts after failure
SCOPE_NAME = "public"


def _get_cluster() -> Cluster:
    """Return a live Cluster, reconnecting if the previous connection is stale.

    Uses a cooldown to avoid hammering the server on repeated failures.
    Raises RuntimeError with a clear message if the DB is unavailable so
    callers can return a graceful degraded response instead of a 500.
    """
    global _cluster, _last_connect_attempt
    with _cluster_lock:
        if _cluster is not None:
            # Cheap liveness probe — ping the cluster
            try:
                _cluster.ping()
                return _cluster
            except Exception:
                print("[couchbase] Ping failed — will attempt reconnect.")
                _cluster = None

        now = time.monotonic()
        if now - _last_connect_attempt < _RECONNECT_COOLDOWN:
            raise RuntimeError(
                "Couchbase is unavailable. Reconnect cooldown in effect — "
                f"retry in {int(_RECONNECT_COOLDOWN - (now - _last_connect_attempt))}s."
            )

        _last_connect_attempt = now
        try:
            conn_str = os.environ["COUCHBASE_CONNECTION_STRING"]
            username = os.environ["COUCHBASE_USERNAME"]
            password = os.environ["COUCHBASE_PASSWORD"]
            auth = PasswordAuthenticator(username, password)
            options = ClusterOptions(auth)
            options.apply_profile("wan_development")
            cluster = Cluster(conn_str, options)
            cluster.wait_until_ready(timeout=timedelta(seconds=15))
            _cluster = cluster
            print("[couchbase] Connected.")
            return _cluster
        except Exception as e:
            _cluster = None
            raise RuntimeError(f"Couchbase connection failed: {e}") from e


async def get_relevant_documents(embedding: list[float], name: str | None = None) -> list[dict]:
    """Retrieve the most relevant documents using FTS vector search.

    Returns an empty list (graceful degradation) if Couchbase is unavailable,
    so the RAG pipeline can still respond without grounding documents.
    """
    try:
        cluster = _get_cluster()
    except RuntimeError as e:
        print(f"[couchbase] get_relevant_documents skipped: {e}")
        return []

    bucket_name = os.environ["COUCHBASE_BUCKET_NAME"]
    index_name = os.environ["COUCHBASE_SEARCH_INDEX_NAME"]

    try:
        scope = cluster.bucket(bucket_name).scope(SCOPE_NAME)
        search_req = SearchRequest.create(
            VectorSearch.from_vector_query(
                VectorQuery("vector", embedding, num_candidates=4)
            )
        )
        result = scope.search(index_name, search_req, SearchOptions(limit=4, fields=["filepath", "content"]))

        documents = []
        for row in result.rows():
            fields = row.fields or {}
            documents.append({
                "id": row.id,
                "filepath": fields.get("filepath", ""),
                "content": fields.get("content", ""),
                "score": row.score,
            })
        return documents
    except (UnAmbiguousTimeoutException, AmbiguousTimeoutException) as e:
        print(f"[couchbase] Search timeout: {e}")
        global _cluster
        _cluster = None   # force reconnect on next call
        return []
    except Exception as e:
        print(f"[couchbase] Search error: {e}")
        return []
