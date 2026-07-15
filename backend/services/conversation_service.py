import os
import threading
import time
from datetime import datetime, timedelta, timezone
from couchbase.cluster import Cluster
from couchbase.options import ClusterOptions, QueryOptions
from couchbase.auth import PasswordAuthenticator

_cluster = None
_cluster_lock = threading.Lock()
_last_connect_attempt: float = 0.0
_RECONNECT_COOLDOWN = 30.0

# Read at call time, not import time, to avoid KeyError before .env is loaded.
def _bucket_name() -> str:
    return os.environ.get("COUCHBASE_BUCKET_NAME", "")

SCOPE = os.environ.get("COUCHBASE_CONVERSATION_SCOPE", "_default")
COLLECTION = os.environ.get("COUCHBASE_CONVERSATION_COLLECTION", "conversations")


def _get_cluster() -> Cluster:
    global _cluster, _last_connect_attempt
    with _cluster_lock:
        if _cluster is not None:
            try:
                _cluster.ping()
                return _cluster
            except Exception:
                print("[conversation_service] Ping failed — reconnecting.")
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


# ---------------------------------------------------------------------------
# Exercise 4
# ---------------------------------------------------------------------------

async def add_message(session_id: str, content: str, role: str) -> None:
    """Store a single chat message in Couchbase."""
    try:
        cluster = _get_cluster()
        collection = cluster.bucket(_bucket_name()).scope(SCOPE).collection(COLLECTION)
        doc = {
            "session_id": session_id,
            "role": role,
            "content": content,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "type": "chat_message",
        }
        key = f"{session_id}_{int(datetime.now().timestamp() * 1000)}_{role}"
        collection.insert(key, doc)
    except RuntimeError as e:
        print(f"[conversation_service] add_message skipped: {e}")


async def get_conversation_history(session_id: str, limit: int = 10) -> list[dict]:
    """Retrieve the most recent messages for a session, in chronological order."""
    try:
        cluster = _get_cluster()
    except RuntimeError as e:
        print(f"[conversation_service] get_conversation_history skipped: {e}")
        return []
    sql = f"""
        SELECT `role`, content, timestamp
        FROM `{_bucket_name()}`.`{SCOPE}`.`{COLLECTION}`
        WHERE session_id = $session_id AND type = "chat_message"
        ORDER BY timestamp DESC
        LIMIT 20
    """
    result = cluster.query(
        sql, QueryOptions(named_parameters={"session_id": session_id})
    )
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
    try:
        cluster = _get_cluster()
    except RuntimeError as e:
        print(f"[conversation_service] clear_conversation_history skipped: {e}")
        return
    sql = f"""
        DELETE FROM `{_bucket_name()}`.`{SCOPE}`.`{COLLECTION}`
        WHERE session_id = $session_id AND type = "chat_message"
    """
    cluster.query(
        sql, QueryOptions(named_parameters={"session_id": session_id})
    ).execute()


async def summarize_conversation(session_id: str, max_words: int = 150) -> str:
    """Summarize the conversation history using Couchbase AI Data Plane."""
    try:
        cluster = _get_cluster()
    except RuntimeError:
        return "No conversation to summarize."

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
    try:
        result = cluster.query(
            sql, QueryOptions(named_parameters={"text": text, "max_words": max_words})
        )
        rows = list(result.rows())
        return rows[0]["summary"][0]["response"]
    except Exception:
        return format_conversation_history(history)
