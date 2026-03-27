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
    """Return a lazily-initialised Couchbase cluster connection.

    Uses wan_development profile suitable for Capella (cloud) connections.
    """
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


# ---------------------------------------------------------------------------
# Exercise 3
# ---------------------------------------------------------------------------

async def get_relevant_documents(embedding: list[float], name: str | None = None) -> list[dict]:
    """Search Couchbase for documents similar to the given embedding.

    TODO (Exercise 3):
      1. Call _get_cluster() to get the cluster
      2. Get the scope: cluster.bucket(COUCHBASE_BUCKET_NAME).scope(SCOPE_NAME)
         where COUCHBASE_BUCKET_NAME = os.environ["COUCHBASE_BUCKET_NAME"]
      3. Get the collection: scope.collection("documentation")
      4. Build a vector search request:
           request = SearchRequest.create(
               VectorSearch.from_vector_query(
                   VectorQuery("vector", embedding, num_candidates=4)
               )
           )
      5. Run: result = scope.search(os.environ["COUCHBASE_SEARCH_INDEX_NAME"], request, SearchOptions(limit=4))
      6. For each row in result.rows, fetch the document with collection.get(row.id)
         - Remove the "vector" key from the content
         - Return a list of dicts: {id, filepath, content, score}

    Docs: https://docs.couchbase.com/python-sdk/current/howtos/full-text-searching-with-sdk.html
    """
    # TODO: replace this placeholder with your implementation
    raise NotImplementedError("Implement get_relevant_documents in couchbase_service.py")
