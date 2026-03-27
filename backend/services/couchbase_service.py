import json
import os
from datetime import timedelta
from couchbase.cluster import Cluster
from couchbase.options import ClusterOptions, QueryOptions
from couchbase.auth import PasswordAuthenticator

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
    """Retrieve the most relevant documents using a SQL++ vector index (ANN search).

    The index is a SQL++ VECTOR INDEX created with CREATE VECTOR INDEX, so it
    must be queried via SQL++ using ORDER BY ANN_DISTANCE(), not via the FTS API.
    """
    cluster = _get_cluster()
    bucket_name = os.environ["COUCHBASE_BUCKET_NAME"]
    index_name = os.environ["COUCHBASE_SEARCH_INDEX_NAME"]

    sql = f"""
        SELECT META(d).id AS id,
               d.filepath,
               d.content,
               ANN_DISTANCE(d.vector, $embedding, "L2") AS score
        FROM `{bucket_name}`.`{SCOPE_NAME}`.`documentation` AS d
        ORDER BY ANN_DISTANCE(d.vector, $embedding, "L2")
        LIMIT 4
        USE INDEX ({index_name} USING GSI)
    """
    result = cluster.query(
        sql,
        QueryOptions(named_parameters={"embedding": embedding}),
    )
    documents = []
    for row in result.rows():
        documents.append({
            "id": row.get("id", ""),
            "filepath": row.get("filepath", ""),
            "content": row.get("content", ""),
            "score": row.get("score", 0.0),
        })
    return documents
