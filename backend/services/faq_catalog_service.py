"""FAQ catalog service — Exercise 7.

Manages FAQ metadata stored in the `faq_catalog` Couchbase collection.
Each document represents one ingested FAQ PDF and holds a description
embedding used by the router to match user questions to the right FAQ.

Data model (one document per FAQ):
{
    "type": "faq_meta",
    "collection_name": "hr_policy",
    "display_name": "HR Policy FAQ",
    "description": "Answers to common HR questions about leave, benefits, and conduct.",
    "vector": [...]   # embedding of the description field
}
"""

from __future__ import annotations

import os
from datetime import timedelta

from couchbase.auth import PasswordAuthenticator
from couchbase.cluster import Cluster
from couchbase.options import ClusterOptions, SearchOptions
from couchbase.search import SearchRequest
from couchbase.vector_search import VectorQuery, VectorSearch

_cluster: Cluster | None = None

BUCKET_NAME = lambda: os.environ.get("COUCHBASE_BUCKET_NAME", "shared")
SCOPE_NAME = "public"
FAQ_CATALOG_COLLECTION = lambda: os.environ.get("FAQ_CATALOG_COLLECTION", "faq_catalog")
FAQ_CATALOG_INDEX = lambda: f"{BUCKET_NAME()}.{SCOPE_NAME}.faq_catalog_idx"
FAQ_SIMILARITY_THRESHOLD = lambda: float(
    os.environ.get("FAQ_SIMILARITY_THRESHOLD", "0.75")
)


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


def get_available_faqs() -> list[dict]:
    """Return all registered FAQ metadata documents."""
    cluster = _get_cluster()
    sql = f"""
        SELECT collection_name, display_name, description
        FROM `{BUCKET_NAME()}`.`{SCOPE_NAME}`.`{FAQ_CATALOG_COLLECTION()}`
        WHERE type = "faq_meta"
    """
    result = cluster.query(sql)
    return [row for row in result.rows()]


async def find_best_faq(question_embedding: list[float]) -> dict | None:
    """Find the FAQ whose description is most semantically similar to the question.

    Returns the FAQ metadata dict if the top score meets the threshold,
    otherwise returns None.
    """
    cluster = _get_cluster()
    scope = cluster.bucket(BUCKET_NAME()).scope(SCOPE_NAME)
    collection = scope.collection(FAQ_CATALOG_COLLECTION())

    request = SearchRequest.create(
        VectorSearch.from_vector_query(
            VectorQuery("vector", question_embedding, num_candidates=3)
        )
    )

    try:
        result = scope.search(
            FAQ_CATALOG_INDEX(), request, SearchOptions(limit=1)
        )
        rows = list(result.rows)
        if not rows:
            return None

        top = rows[0]
        if top.score < FAQ_SIMILARITY_THRESHOLD():
            return None

        doc = collection.get(top.id)
        return dict(doc.content_as[dict])
    except Exception as e:
        print(f"FAQ catalog lookup error: {e}")
        return None


async def register_faq(
    collection_name: str,
    display_name: str,
    description: str,
) -> None:
    """Register a new FAQ in the catalog with an embedding of its description.

    Call this after running the Capella AI Services S3 ingestion workflow
    for a new FAQ PDF collection.
    """
    from services.openai_service import get_embedding

    cluster = _get_cluster()
    collection = (
        cluster.bucket(BUCKET_NAME())
        .scope(SCOPE_NAME)
        .collection(FAQ_CATALOG_COLLECTION())
    )

    embedding = await get_embedding(description)

    doc = {
        "type": "faq_meta",
        "collection_name": collection_name,
        "display_name": display_name,
        "description": description,
        "vector": embedding,
    }
    collection.upsert(f"faq_meta::{collection_name}", doc)
    print(f"Registered FAQ: {display_name} -> collection '{collection_name}'")
