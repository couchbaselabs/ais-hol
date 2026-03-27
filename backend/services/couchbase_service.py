import os
from datetime import timedelta
from couchbase.cluster import Cluster
from couchbase.options import ClusterOptions, SearchOptions
from couchbase.auth import PasswordAuthenticator
from couchbase.vector_search import VectorSearch, VectorQuery
from couchbase.search import SearchRequest

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
    cluster = _get_cluster()
    bucket_name = os.environ["COUCHBASE_BUCKET_NAME"]
    index_name = os.environ["COUCHBASE_SEARCH_INDEX_NAME"]
    scope = cluster.bucket(bucket_name).scope(SCOPE_NAME)
    collection = scope.collection("documentation")

    request = SearchRequest.create(
        VectorSearch.from_vector_query(
            VectorQuery("vector", embedding, num_candidates=4)
        )
    )
    result = scope.search(index_name, request, SearchOptions(limit=4))
    doc_refs = [{"id": row.id, "score": row.score} for row in result.rows]

    documents = []
    for ref in doc_refs:
        try:
            doc = collection.get(ref["id"])
            content = dict(doc.content_as[dict])
            content.pop("vector", None)
            documents.append({
                "id": ref["id"],
                "filepath": content.get("filepath", ""),
                "content": content,
                "score": ref["score"],
            })
        except Exception as e:
            print(f"Error fetching {ref['id']}: {e}")
    return documents
