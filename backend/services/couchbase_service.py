import json
import os
from datetime import timedelta
from couchbase.cluster import Cluster
from couchbase.options import ClusterOptions, SearchOptions
from couchbase.auth import PasswordAuthenticator
from couchbase.search import SearchRequest
from couchbase.vector_search import VectorQuery, VectorSearch

_cluster = None
SCOPE_NAME = "public"


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


async def get_relevant_documents(embedding: list[float], name: str | None = None) -> list[dict]:
    """Retrieve the most relevant documents using FTS vector search."""
    cluster = _get_cluster()
    bucket_name = os.environ["COUCHBASE_BUCKET_NAME"]
    index_name = os.environ["COUCHBASE_SEARCH_INDEX_NAME"]

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
