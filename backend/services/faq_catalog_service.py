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
        _cluster.wait_until_ready(timeout=15)
    return _cluster


def get_available_faqs() -> list[dict]:
    """Return all registered FAQ metadata documents.

    TODO (Exercise 7 — Step 6):
      1. Get the cluster with _get_cluster()
      2. Run a SQL++ query:
           SELECT collection_name, display_name, description
           FROM `<bucket>`.`<scope>`.`<faq_catalog_collection>`
           WHERE type = "faq_meta"
      3. Return [row for row in result.rows()]

    Docs: https://docs.couchbase.com/python-sdk/current/howtos/n1ql-queries-with-sdk.html
    """
    raise NotImplementedError("Implement get_available_faqs() in faq_catalog_service.py")


async def find_best_faq(question_embedding: list[float]) -> dict | None:
    """Find the FAQ whose description is most semantically similar to the question.

    Returns the FAQ metadata dict if the top score meets the threshold,
    otherwise returns None.

    TODO (Exercise 7 — Step 6):
      1. Get the cluster with _get_cluster()
      2. Get the scope: cluster.bucket(BUCKET_NAME()).scope(SCOPE_NAME)
      3. Get the collection: scope.collection(FAQ_CATALOG_COLLECTION())
      4. Build a VectorSearch request on the "vector" field with num_candidates=3
      5. Run: scope.search(FAQ_CATALOG_INDEX(), request, SearchOptions(limit=1))
      6. If no rows, return None
      7. If top row score < FAQ_SIMILARITY_THRESHOLD(), return None
      8. Fetch and return the document: collection.get(top.id) -> dict

    Docs: https://docs.couchbase.com/python-sdk/current/howtos/full-text-searching-with-sdk.html
    """
    raise NotImplementedError("Implement find_best_faq() in faq_catalog_service.py")


async def register_faq(
    collection_name: str,
    display_name: str,
    description: str,
) -> None:
    """Register a new FAQ in the catalog with an embedding of its description.

    Call this after running the Capella AI Services S3 ingestion workflow
    for a new FAQ PDF collection.

    TODO (Exercise 7 — Step 5):
      1. Import and call get_embedding(description) to generate the vector.
      2. Build a document dict:
           {
             "type": "faq_meta",
             "collection_name": collection_name,
             "display_name": display_name,
             "description": description,
             "vector": embedding,
           }
      3. Upsert with key f"faq_meta::{collection_name}" into the
         faq_catalog collection.

    Docs: https://docs.couchbase.com/python-sdk/current/howtos/kv-operations.html
    """
    raise NotImplementedError("Implement register_faq() in faq_catalog_service.py")
