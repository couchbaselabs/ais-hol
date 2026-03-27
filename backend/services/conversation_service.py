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


# ---------------------------------------------------------------------------
# Exercise 4
# ---------------------------------------------------------------------------

async def add_message(session_id: str, content: str, role: str) -> None:
    """Store a single chat message in Couchbase."""
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
    """Retrieve the most recent messages for a session, in chronological order."""
    cluster = _get_cluster()
    sql = f"""
        SELECT role, content, timestamp
        FROM `{BUCKET_NAME()}`.`{SCOPE()}`.`{COLLECTION()}`
        WHERE session_id = $session_id AND type = "chat_message"
        ORDER BY timestamp DESC
        LIMIT 20
    """
    result = cluster.query(sql, QueryOptions(named_parameters={"session_id": session_id}))
    rows = [row for row in result.rows()]
    rows.reverse()
    return rows


def format_conversation_history(messages: list[dict]) -> str:
    """Format a list of message dicts into a prompt-ready string."""
    if not messages:
        return "No previous conversation history."
    return "\n".join(
        f"{'User' if m['role'] == 'user' else 'Assistant'}: {m['content']}"
        for m in messages
    )


async def clear_conversation_history(session_id: str) -> None:
    """Delete all messages for a session."""
    cluster = _get_cluster()
    sql = f"""
        DELETE FROM `{BUCKET_NAME()}`.`{SCOPE()}`.`{COLLECTION()}`
        WHERE session_id = $session_id AND type = "chat_message"
    """
    cluster.query(sql, QueryOptions(named_parameters={"session_id": session_id})).execute()


async def summarize_conversation(session_id: str, max_words: int = 150) -> str:
    """Summarize the conversation history using Couchbase Capella AI Functions.

    Calls default:ai_summary() as a SQL++ query — summarization runs inside
    the database with no extra API call from the backend.

    Requires the Summarization AI Function to be enabled on the Capella cluster.
    See: https://docs.couchbase.com/ai/build/ai-functions.html#summarization
    """
    cluster = _get_cluster()

    history = await get_conversation_history(session_id)
    if len(history) < 2:
        return "No conversation to summarize."

    text = "\n".join(
        f"{'User' if m['role'] == 'user' else 'Assistant'}: {m['content']}"
        for m in history
    )

    sql = """
        SELECT default:ai_summary({
            "text": $text,
            "max_words": $max_words,
            "temperature": 0.3
        }) AS summary
    """
    result = cluster.query(
        sql,
        QueryOptions(named_parameters={"text": text, "max_words": max_words})
    )
    rows = list(result.rows())
    return rows[0]["summary"][0]["response"]
