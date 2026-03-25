import os
from datetime import datetime, timezone
from couchbase.cluster import Cluster
from couchbase.options import ClusterOptions, QueryOptions
from couchbase.auth import PasswordAuthenticator

_cluster = None

BUCKET_NAME = lambda: os.environ["COUCHBASE_BUCKET_NAME"]
SCOPE = lambda: os.environ.get("COUCHBASE_CONVERSATION_SCOPE", "_default")
COLLECTION = lambda: os.environ.get("COUCHBASE_CONVERSATION_COLLECTION", "conversations")


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


async def add_message(session_id: str, content: str, role: str) -> None:
    cluster = _get_cluster()
    collection = cluster.bucket(BUCKET_NAME()).scope(SCOPE()).collection(COLLECTION())
    doc = {
        "session_id": session_id,
        "role": role,
        "content": content,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "type": "chat_message",
    }
    key = f"{session_id}_{int(datetime.now().timestamp() * 1000)}_{role}"
    collection.insert(key, doc)


async def get_conversation_history(session_id: str, limit: int = 10) -> list[dict]:
    cluster = _get_cluster()
    sql = f"""
        SELECT content, `role`, timestamp
        FROM `{BUCKET_NAME()}`.`{SCOPE()}`.`{COLLECTION()}`
        WHERE session_id = $session_id AND type = "chat_message"
        ORDER BY timestamp DESC LIMIT $limit
    """
    result = cluster.query(sql, QueryOptions(named_parameters={"session_id": session_id, "limit": limit}))
    messages = [{"role": r["role"], "content": r["content"], "timestamp": r["timestamp"]} for r in result.rows()]
    messages.reverse()
    return messages


def format_conversation_history(messages: list[dict]) -> str:
    if not messages:
        return "No previous conversation history."
    return "\n".join(
        f"{'User' if m['role'] == 'user' else 'Assistant'}: {m['content']}"
        for m in messages
    )


async def clear_conversation_history(session_id: str) -> None:
    cluster = _get_cluster()
    sql = f"""
        DELETE FROM `{BUCKET_NAME()}`.`{SCOPE()}`.`{COLLECTION()}`
        WHERE session_id = $session_id AND type = "chat_message"
    """
    cluster.query(sql, QueryOptions(named_parameters={"session_id": session_id}))
