import os
import uuid
import hashlib
from datetime import timedelta
from couchbase.cluster import Cluster
from couchbase.options import ClusterOptions, SearchOptions, UpsertOptions
from couchbase.auth import PasswordAuthenticator
from couchbase.vector_search import VectorSearch, VectorQuery
from couchbase.search import SearchRequest

_cluster = None

CACHE_BUCKET = lambda: os.environ.get("CACHE_BUCKET", "semantic_cache")
CACHE_SCOPE = lambda: os.environ.get("CACHE_SCOPE", "_default")
CACHE_COLLECTION = lambda: os.environ.get("CACHE_COLLECTION", "semantic")
CACHE_INDEX = lambda: f"{CACHE_BUCKET()}.{CACHE_SCOPE()}.semantic_cache_idx"


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


def create_llm_signature(model: str, temperature: float, max_tokens: int, system_prompt: str) -> str:
    raw = f"{model}:{temperature}:{max_tokens}:{system_prompt}"
    return hashlib.md5(raw.encode()).hexdigest()


async def cache_get(
    prompt: str,
    embedding: list[float],
    llm_signature: str,
    similarity_threshold: float = 0.85,
    k: int = 3,
) -> str | None:
    cluster = _get_cluster()
    scope = cluster.bucket(CACHE_BUCKET()).scope(CACHE_SCOPE())
    collection = scope.collection(CACHE_COLLECTION())

    request = SearchRequest.create(
        VectorSearch.from_vector_query(VectorQuery("vector", embedding, num_candidates=k))
    )
    try:
        result = scope.search(CACHE_INDEX(), request, SearchOptions(limit=k))
        for row in result.rows():
            if row.score < similarity_threshold:
                continue
            doc = collection.get(row.id)
            entry = doc.content_as[dict]
            if entry.get("llm_signature") == llm_signature:
                print(f"Cache HIT (score={row.score:.3f})")
                return entry["response"]
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
    cluster = _get_cluster()
    collection = cluster.bucket(CACHE_BUCKET()).scope(CACHE_SCOPE()).collection(CACHE_COLLECTION())
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
