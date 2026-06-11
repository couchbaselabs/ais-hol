import os
import uuid
import hashlib
import threading
import time
from datetime import timedelta
from couchbase.cluster import Cluster
from couchbase.options import ClusterOptions, SearchOptions, UpsertOptions
from couchbase.auth import PasswordAuthenticator
from couchbase.search import SearchRequest
from couchbase.vector_search import VectorQuery, VectorSearch

_cluster = None
_cluster_lock = threading.Lock()
_last_connect_attempt: float = 0.0
_RECONNECT_COOLDOWN = 30.0

CACHE_BUCKET = os.environ.get("CACHE_BUCKET", "semantic_cache")
CACHE_SCOPE = os.environ.get("CACHE_SCOPE", "_default")
CACHE_COLLECTION = os.environ.get("CACHE_COLLECTION", "semantic")
CACHE_INDEX = "semantic_cache_vector_idx"


def _get_cluster() -> Cluster:
    global _cluster, _last_connect_attempt
    with _cluster_lock:
        if _cluster is not None:
            try:
                _cluster.ping()
                return _cluster
            except Exception:
                print("[semantic_cache] Ping failed — reconnecting.")
                _cluster = None

        now = time.monotonic()
        if now - _last_connect_attempt < _RECONNECT_COOLDOWN:
            raise RuntimeError(
                f"Couchbase unavailable. Retry in "
                f"{int(_RECONNECT_COOLDOWN - (now - _last_connect_attempt))}s."
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
            return _cluster
        except Exception as e:
            _cluster = None
            raise RuntimeError(f"Couchbase connection failed: {e}") from e


def create_llm_signature(
    model: str, temperature: float, max_tokens: int, system_prompt: str
) -> str:
    raw = f"{model}:{temperature}:{max_tokens}:{system_prompt}"
    return hashlib.md5(raw.encode()).hexdigest()



async def cache_get(
    prompt: str,
    embedding: list[float],
    llm_signature: str,
    similarity_threshold: float = 0.85,
    k: int = 3,
) -> str | None:
    try:
        cluster = _get_cluster()
    except RuntimeError as e:
        print(f"[semantic_cache] cache_get skipped: {e}")
        return None
    try:
        scope = cluster.bucket(CACHE_BUCKET).scope(CACHE_SCOPE)
        search_req = SearchRequest.create(
            VectorSearch.from_vector_query(
                VectorQuery("vector", embedding, num_candidates=k)
            )
        )
        result = scope.search(
            CACHE_INDEX, search_req,
            SearchOptions(limit=k, fields=["llm_signature", "response"])
        )
        rows = list(result.rows())
        if not rows:
            return None

        # The index uses dot_product similarity. OpenAI embeddings are unit
        # vectors, so dot_product == cosine similarity and scores are in [0,1].
        for row in rows:
            fields = row.fields or {}
            if row.score < similarity_threshold:
                continue
            if fields.get("llm_signature") == llm_signature:
                print(f"Cache HIT (score={row.score:.3f})")
                return fields.get("response")
    except Exception as e:
        print(f"Cache lookup error: {e}")
    return None


async def cache_put(
    prompt: str,
    embedding: list[float],
    llm_signature: str,
    response: str,
    ttl_minutes: int = 1440,
) -> None:
    try:
        cluster = _get_cluster()
    except RuntimeError as e:
        print(f"[semantic_cache] cache_put skipped: {e}")
        return
    collection = (
        cluster.bucket(CACHE_BUCKET).scope(CACHE_SCOPE).collection(CACHE_COLLECTION)
    )
    doc = {
        "prompt": prompt,
        "response": response,
        "llm_signature": llm_signature,
        "vector": embedding,
    }
    collection.upsert(
        str(uuid.uuid4()),
        doc,
        UpsertOptions(expiry=timedelta(minutes=ttl_minutes)),
    )


async def cache_invalidate_all() -> int:
    """Delete every document in the semantic cache collection via a single DELETE query.

    Returns the number of documents deleted.
    Use after a knowledge-base update to prevent stale cached answers.
    """
    try:
        cluster = _get_cluster()
    except RuntimeError as e:
        print(f"[semantic_cache] cache_invalidate_all skipped: {e}")
        return 0
    scope = cluster.bucket(CACHE_BUCKET).scope(CACHE_SCOPE)
    try:
        # COUNT first so we can return the number deleted
        count_result = scope.query(f"SELECT COUNT(*) AS n FROM `{CACHE_COLLECTION}`")
        count = list(count_result.rows())[0].get("n", 0)
        scope.query(f"DELETE FROM `{CACHE_COLLECTION}`").execute()
        return count
    except Exception as e:
        print(f"Cache invalidation error: {e}")
        return 0


async def cache_invalidate_by_signature(llm_signature: str) -> int:
    """Delete cache entries matching a specific LLM signature via a single DELETE query.

    Use when the model, temperature, or system prompt changes — old cached
    responses were generated under different conditions and should not be served.
    """
    try:
        cluster = _get_cluster()
    except RuntimeError as e:
        print(f"[semantic_cache] cache_invalidate_by_signature skipped: {e}")
        return 0
    scope = cluster.bucket(CACHE_BUCKET).scope(CACHE_SCOPE)
    try:
        from couchbase.options import QueryOptions as _QO
        count_result = scope.query(
            f"SELECT COUNT(*) AS n FROM `{CACHE_COLLECTION}` WHERE llm_signature = $sig",
            _QO(named_parameters={"sig": llm_signature}),
        )
        count = list(count_result.rows())[0].get("n", 0)
        scope.query(
            f"DELETE FROM `{CACHE_COLLECTION}` WHERE llm_signature = $sig",
            _QO(named_parameters={"sig": llm_signature}),
        ).execute()
        return count
    except Exception as e:
        print(f"Cache invalidation error: {e}")
        return 0
