import os
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from services.openai_service import generate_response, get_embedding, stream_completion, COMPLETION_MODEL
from services.couchbase_service import get_relevant_documents
from services.conversation_service import (
    add_message,
    get_conversation_history,
    format_conversation_history,
    clear_conversation_history,
)
from services.semantic_cache_service import cache_get, cache_put, create_llm_signature

app = FastAPI(title="AI Workshop Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?|.*\.gitpod\.dev|.*\.github\.dev",
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Content-Type"],
    allow_credentials=True,
)


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
    if not body.message or not body.message.strip():
        raise HTTPException(status_code=400, detail="Message is required.")
    response = await generate_response(body.message, body.systemPrompt)
    return {"response": response, "timestamp": datetime.now(timezone.utc).isoformat()}


# ---------------------------------------------------------------------------
# Exercises 3–5 — RAG + conversation history + semantic cache
# ---------------------------------------------------------------------------

class QueryRequest(BaseModel):
    q: str
    session_id: str | None = None


@app.post("/api/query")
async def query(body: QueryRequest):
    if not body.q or not body.q.strip():
        raise HTTPException(status_code=400, detail="Query is required.")

    session_id = body.session_id or "default-session"
    llm_sig = create_llm_signature(COMPLETION_MODEL, 0.7, 1000, "MDN expert")

    # Exercise 3: embed the query
    embedding = await get_embedding(body.q)

    # Exercise 5: check semantic cache before running the full pipeline
    cached = await cache_get(body.q, embedding, llm_sig)
    if cached:
        async def from_cache():
            yield cached
        return StreamingResponse(from_cache(), media_type="text/plain; charset=utf-8")

    # Exercise 4: store user message and retrieve history
    await add_message(session_id, body.q, "user")
    history = await get_conversation_history(session_id, limit=10)
    formatted_history = format_conversation_history(history)

    # Exercise 3: retrieve relevant documents
    documents = await get_relevant_documents(embedding)

    document_list = "\n\n".join(
        f"Document {i+1}:\n  ID: {doc['id']}\n  Filepath: {doc['filepath']}\n  Score: {doc['score']}\n  Content: {doc['content']}"
        for i, doc in enumerate(documents)
    )
    prompt = (
        "You are a Web MDN Documentation expert with access to conversation history.\n\n"
        f"CONVERSATION HISTORY:\n{formatted_history}\n\n"
        f"RELEVANT DOCUMENTS:\n{document_list}\n\n"
        f"CURRENT QUERY: {body.q}\n\n"
        "Answer using the documents and history. Reference document IDs and filepaths where relevant."
    )

    async def generate_and_store():
        full_response = ""
        async for token in stream_completion(prompt):
            full_response += token
            yield token
        # Exercise 4: store assistant response
        await add_message(session_id, full_response, "assistant")
        # Exercise 5: cache the response for future similar queries
        await cache_put(body.q, embedding, llm_sig, full_response)

    return StreamingResponse(generate_and_store(), media_type="text/plain; charset=utf-8")


# ---------------------------------------------------------------------------
# Exercise 4 — Conversation history endpoints
# ---------------------------------------------------------------------------

@app.get("/api/conversation/history")
async def get_history(session_id: str, limit: int = 10):
    messages = await get_conversation_history(session_id, limit)
    return {"session_id": session_id, "messages": messages, "count": len(messages)}


class ClearRequest(BaseModel):
    session_id: str


@app.delete("/api/conversation/clear")
async def clear_history(body: ClearRequest):
    await clear_conversation_history(body.session_id)
    return {"success": True}


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 5000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
