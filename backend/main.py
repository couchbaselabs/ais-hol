import os
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from services.openai_service import generate_response, get_embedding, stream_completion
from services.couchbase_service import get_relevant_documents
from services.conversation_service import (
    add_message,
    get_conversation_history,
    format_conversation_history,
    clear_conversation_history,
    summarize_conversation,
)
from services.semantic_cache_service import cache_get, cache_put, create_llm_signature

app = FastAPI(title="AI Workshop Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?|.*\.gitpod\.dev|.*\.github\.dev|.*\.ona\.app",
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Content-Type"],
    allow_credentials=True,
)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/health")
async def health():
    return {"status": "OK", "message": "Server is running"}


# ---------------------------------------------------------------------------
# Exercise 1 — Simple Chatbot
# ---------------------------------------------------------------------------

class ChatRequest(BaseModel):
    message: str
    systemPrompt: str | None = None


@app.post("/api/chat")
async def chat(body: ChatRequest):
    """Simple chatbot endpoint — calls OpenAI and returns a JSON response.

    TODO (Exercise 1):
      This route is already wired up. Your task is to implement
      generate_response() in services/openai_service.py.

      Once done, this endpoint will:
        1. Call generate_response(body.message, body.systemPrompt)
        2. Return { "response": <text>, "timestamp": <iso string> }
    """
    if not body.message or not body.message.strip():
        raise HTTPException(status_code=400, detail="Message is required.")

    response = await generate_response(body.message, body.systemPrompt)
    return {"response": response, "timestamp": datetime.now(timezone.utc).isoformat()}


# ---------------------------------------------------------------------------
# Exercise 3 — RAG query
# ---------------------------------------------------------------------------

class QueryRequest(BaseModel):
    q: str
    session_id: str | None = None  # used in Exercise 4


@app.post("/api/query")
async def query(body: QueryRequest):
    """RAG endpoint — embeds the query, retrieves docs, streams the response.

    TODO (Exercise 3 — step 1): implement get_embedding() in openai_service.py
    TODO (Exercise 3 — step 2): implement get_relevant_documents() in couchbase_service.py
    TODO (Exercise 3 — step 3): implement stream_completion() in openai_service.py
    TODO (Exercise 3 — step 4): fill in the body of this route below

    Once all TODOs are done, this route should:
      1. Embed the query with get_embedding(body.q)
      2. Retrieve relevant docs with get_relevant_documents(embedding)
      3. Build an augmented prompt from the docs and the query
      4. Return StreamingResponse(stream_completion(prompt), media_type="text/plain; charset=utf-8")

    TODO (Exercise 4 — Steps 2-5): after implementing conversation_service.py, also:
      - Call add_message(session_id, body.q, "user") before generating
      - Call get_conversation_history(session_id) and prepend it to the prompt
      - Call add_message(session_id, full_response, "assistant") after streaming

    TODO (Exercise 4 — Step 6): after implementing summarize_conversation(), use the
      summary instead of raw history in the prompt:
      - Call summary = await summarize_conversation(session_id) to get a compact summary
      - Replace the raw formatted_history with summary in the prompt
      This keeps the prompt compact as conversations grow long.

    TODO (Exercise 5): after implementing semantic_cache_service.py, also:
      - Call cache_get() before the RAG pipeline; return cached response if hit
      - Call cache_put() after generating a fresh response
    """
    if not body.q or not body.q.strip():
        raise HTTPException(status_code=400, detail="Query is required.")

    # TODO (Exercise 3): replace this placeholder with your implementation
    async def placeholder():
        yield "[RAG response will appear here. Implement the /api/query route in main.py]"

    return StreamingResponse(placeholder(), media_type="text/plain; charset=utf-8")


# ---------------------------------------------------------------------------
# Exercise 4 — Conversation history endpoints
# ---------------------------------------------------------------------------

@app.get("/api/conversation/history")
async def get_history(session_id: str, limit: int = 10):
    """Return recent messages for a session.

    TODO (Exercise 4):
      This route is already wired up. Your task is to implement
      get_conversation_history() in services/conversation_service.py.

      Once done, call:
        messages = await get_conversation_history(session_id, limit)
        return {"session_id": session_id, "messages": messages, "count": len(messages)}
    """
    # TODO: replace this placeholder with your implementation
    raise HTTPException(status_code=501, detail="Implement get_conversation_history in conversation_service.py")


class ClearRequest(BaseModel):
    session_id: str


@app.delete("/api/conversation/clear")
async def clear_history(body: ClearRequest):
    """Delete all messages for a session.

    TODO (Exercise 4):
      This route is already wired up. Your task is to implement
      clear_conversation_history() in services/conversation_service.py.

      Once done, call:
        await clear_conversation_history(body.session_id)
        return {"success": True}
    """
    # TODO: replace this placeholder with your implementation
    raise HTTPException(status_code=501, detail="Implement clear_conversation_history in conversation_service.py")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 5000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
