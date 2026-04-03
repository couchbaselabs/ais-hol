import os
from datetime import datetime, timedelta, timezone
from couchbase.cluster import Cluster
from couchbase.options import ClusterOptions, QueryOptions
from couchbase.auth import PasswordAuthenticator

_cluster = None

BUCKET_NAME = os.environ["COUCHBASE_BUCKET_NAME"]
SCOPE = os.environ.get("COUCHBASE_CONVERSATION_SCOPE", "_default")
COLLECTION = os.environ.get("COUCHBASE_CONVERSATION_COLLECTION", "conversations")


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


# ---------------------------------------------------------------------------
# Exercise 4
# ---------------------------------------------------------------------------

async def add_message(session_id: str, content: str, role: str) -> None:
    """Store a single chat message in Couchbase.

    TODO (Exercise 4):
      1. Get the cluster with _get_cluster()
      2. Get the collection: cluster.bucket(BUCKET_NAME()).scope(SCOPE()).collection(COLLECTION())
      3. Build a document dict:
           {
             "session_id": session_id,
             "role": role,          # "user" or "assistant"
             "content": content,
             "timestamp": datetime.now(timezone.utc).isoformat(),
             "type": "chat_message"
           }
      4. Insert with a unique key, e.g.:
           f"{session_id}_{int(datetime.now().timestamp() * 1000)}_{role}"
         Use collection.insert(key, doc)

    Docs: https://docs.couchbase.com/python-sdk/current/howtos/kv-operations.html
    """
    # TODO: replace this placeholder with your implementation
    raise NotImplementedError("Implement add_message in conversation_service.py")


async def get_conversation_history(session_id: str, limit: int = 10) -> list[dict]:
    """Retrieve the most recent messages for a session, in chronological order.

    TODO (Exercise 4):
      1. Get the cluster with _get_cluster()
      2. Run a N1QL query:
           SELECT content, `role`, timestamp
           FROM `<bucket>`.`<scope>`.`<collection>`
           WHERE session_id = $session_id AND type = "chat_message"
           ORDER BY timestamp DESC
           LIMIT $limit
         Use cluster.query(sql, QueryOptions(named_parameters={...}))
      3. Map result.rows() to dicts with keys: role, content, timestamp
      4. Reverse the list so it is in chronological order and return it

    Docs: https://docs.couchbase.com/python-sdk/current/howtos/n1ql-queries-with-sdk.html
    """
    # TODO: replace this placeholder with your implementation
    raise NotImplementedError("Implement get_conversation_history in conversation_service.py")


def format_conversation_history(messages: list[dict]) -> str:
    """Format a list of message dicts into a prompt-ready string.

    TODO (Exercise 4):
      - If messages is empty, return "No previous conversation history."
      - Otherwise join each message as:
          "User: <content>"  or  "Assistant: <content>"
        separated by newlines.
    """
    # TODO: replace this placeholder with your implementation
    raise NotImplementedError("Implement format_conversation_history in conversation_service.py")


async def clear_conversation_history(session_id: str) -> None:
    """Delete all messages for a session.

    TODO (Exercise 4):
      1. Get the cluster with _get_cluster()
      2. Run a N1QL DELETE:
           DELETE FROM `<bucket>`.`<scope>`.`<collection>`
           WHERE session_id = $session_id AND type = "chat_message"

    Docs: https://docs.couchbase.com/python-sdk/current/howtos/n1ql-queries-with-sdk.html
    """
    # TODO: replace this placeholder with your implementation
    raise NotImplementedError("Implement clear_conversation_history in conversation_service.py")


async def summarize_conversation(session_id: str, max_words: int = 150) -> str:
    """Summarize the conversation history for a session using Couchbase Capella AI Functions.

    Capella's built-in `ai_summary` SQL++ function runs the summarization inside the
    database — no extra API call from the backend is needed.

    TODO (Exercise 4 — Step 6):
      1. Get the cluster with _get_cluster()
      2. Fetch the conversation history with get_conversation_history(session_id)
         If there are fewer than 2 messages, return "No conversation to summarize." early.
      3. Format the history into a single text block:
           "User: ...\nAssistant: ...\nUser: ..."
      4. Run a N1QL query that calls the Capella AI summarization function:

           SELECT default:ai_summary({
               "text": $text,
               "max_words": $max_words,
               "temperature": 0.3
           }) AS summary

         Use cluster.query(sql, QueryOptions(named_parameters={"text": ..., "max_words": ...}))
      5. Extract and return the summary string:
           result.rows()[0]["summary"][0]["response"]
      6. Wrap the query in a try/except — if ai_summary fails (e.g. the user
         lacks the query_external_access role), fall back to returning
         format_conversation_history(history) instead.

    Prerequisites:
      - Capella AI Functions must be enabled on your cluster with the Summarization
        function active. See: https://docs.couchbase.com/ai/build/ai-functions.html#summarization
      - The LLM model (OpenAI, Bedrock, or Capella Model Service) must be configured
        in your Capella AI Functions settings.

    Docs: https://docs.couchbase.com/ai/build/ai-functions.html#summarization
    """
    # TODO: replace this placeholder with your implementation
    raise NotImplementedError("Implement summarize_conversation in conversation_service.py")
