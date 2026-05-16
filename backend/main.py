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

EMBEDDING_MODEL = os.environ.get("EMBEDDING_MODEL", "text-embedding-3-small")
INFERENCE_MODEL = os.environ.get("INFERENCE_MODEL", "gpt-4o-mini")

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


INFERENCE_MODEL = os.environ.get("INFERENCE_MODEL", "gpt-4o-mini")


@app.post("/api/chat")
async def chat(body: ChatRequest):
    """Simple chatbot endpoint — calls OpenAI and returns a JSON response."""
    if not body.message or not body.message.strip():
        raise HTTPException(status_code=400, detail="Message is required.")

    response = await generate_response(body.message, body.systemPrompt)
    return {"response": response, "timestamp": datetime.now(timezone.utc).isoformat()}


# ---------------------------------------------------------------------------
# Demo: Simple Chat + Semantic Cache
# ---------------------------------------------------------------------------


class CachedChatRequest(BaseModel):
    message: str
    systemPrompt: str | None = None


@app.post("/api/chat-cached")
async def chat_cached(body: CachedChatRequest):
    """Simple chat with semantic cache — returns JSON with cache_hit flag."""
    if not body.message or not body.message.strip():
        raise HTTPException(status_code=400, detail="Message is required.")

    system_prompt = body.systemPrompt or "You are a helpful AI assistant. Be concise and friendly."
    llm_sig = create_llm_signature(INFERENCE_MODEL, 0.7, 1000, system_prompt)
    embedding = await get_embedding(body.message)

    cached = await cache_get(body.message, embedding, llm_sig)
    if cached:
        return {
            "response": cached,
            "cache_hit": True,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    response = await generate_response(body.message, system_prompt)
    await cache_put(body.message, embedding, llm_sig, response)
    return {
        "response": response,
        "cache_hit": False,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# ---------------------------------------------------------------------------
# Demo: Simple Chat + Cache + Conversation History
# ---------------------------------------------------------------------------


class HistoryChatRequest(BaseModel):
    message: str
    session_id: str | None = None
    systemPrompt: str | None = None


@app.post("/api/chat-history")
async def chat_history(body: HistoryChatRequest):
    """Chat with semantic cache and Couchbase conversation history."""
    if not body.message or not body.message.strip():
        raise HTTPException(status_code=400, detail="Message is required.")

    session_id = body.session_id or "default-session"
    system_prompt = body.systemPrompt or "You are a helpful AI assistant. Be concise and friendly."
    llm_sig = create_llm_signature(INFERENCE_MODEL, 0.7, 1000, system_prompt)
    embedding = await get_embedding(body.message)

    cached = await cache_get(body.message, embedding, llm_sig)
    if cached:
        return {
            "response": cached,
            "cache_hit": True,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    await add_message(session_id, body.message, "user")
    history = await get_conversation_history(session_id)
    formatted = format_conversation_history(history)

    prompt = (
        f"{system_prompt}\n\n"
        f"CONVERSATION HISTORY:\n{formatted}\n\n"
        f"CURRENT MESSAGE: {body.message}"
    )
    response = await generate_response(prompt)
    await add_message(session_id, response, "assistant")
    await cache_put(body.message, embedding, llm_sig, response)

    return {
        "response": response,
        "cache_hit": False,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# ---------------------------------------------------------------------------
# Demo: Simple Chat + Cache + Conversation + RAG (streaming)
# ---------------------------------------------------------------------------


class RagChatRequest(BaseModel):
    message: str
    session_id: str | None = None


@app.post("/api/chat-rag")
async def chat_rag(body: RagChatRequest):
    """RAG chat with cache and conversation history — streams the response."""
    if not body.message or not body.message.strip():
        raise HTTPException(status_code=400, detail="Message is required.")

    session_id = body.session_id or "default-session"
    llm_sig = create_llm_signature(INFERENCE_MODEL, 0.7, 1000, "MDN expert")
    embedding = await get_embedding(body.message)

    cached = await cache_get(body.message, embedding, llm_sig)
    if cached:
        async def from_cache():
            yield cached
        return StreamingResponse(from_cache(), media_type="text/plain; charset=utf-8",
                                 headers={"X-Cache-Hit": "true"})

    await add_message(session_id, body.message, "user")
    formatted_history = await summarize_conversation(session_id)
    documents = await get_relevant_documents(embedding)

    document_list = "\n\n".join(
        f"Document {i+1}:\n  ID: {doc['id']}\n  Filepath: {doc['filepath']}\n  Score: {doc['score']}\n  Content: {doc['content']}"
        for i, doc in enumerate(documents)
    )
    prompt = (
        "You are a Web MDN Documentation expert with access to conversation history.\n\n"
        f"CONVERSATION SUMMARY:\n{formatted_history}\n\n"
        f"RELEVANT DOCUMENTS:\n{document_list}\n\n"
        f"CURRENT QUERY: {body.message}\n\n"
        "Answer using the documents and history. Reference document IDs and filepaths where relevant."
    )

    async def generate_and_store():
        full_response = ""
        async for token in stream_completion(prompt):
            full_response += token
            yield token
        await add_message(session_id, full_response, "assistant")
        await cache_put(body.message, embedding, llm_sig, full_response)

    return StreamingResponse(
        generate_and_store(), media_type="text/plain; charset=utf-8",
        headers={"X-Cache-Hit": "false"}
    )


# ---------------------------------------------------------------------------
# Exercise 3 — RAG query
# ---------------------------------------------------------------------------


class QueryRequest(BaseModel):
    q: str
    session_id: str | None = None  # used in Exercise 4


@app.post("/api/query")
async def query(body: QueryRequest):
    """RAG endpoint — embeds the query, retrieves docs, streams the response."""
    if not body.q or not body.q.strip():
        raise HTTPException(status_code=400, detail="Query is required.")

    session_id = body.session_id or "default-session"
    llm_sig = create_llm_signature(INFERENCE_MODEL, 0.7, 1000, "MDN expert")

    # Exercise 3: embed the query
    embedding = await get_embedding(body.q)

    # Exercise 5: check semantic cache before running the full pipeline
    cached = await cache_get(body.q, embedding, llm_sig)
    if cached:

        async def from_cache():
            yield cached

        return StreamingResponse(from_cache(), media_type="text/plain; charset=utf-8")

    # Exercise 4: store user message and summarize history via Capella AI Functions
    await add_message(session_id, body.q, "user")
    formatted_history = await summarize_conversation(session_id)

    # Exercise 3: retrieve relevant documents
    documents = await get_relevant_documents(embedding)

    document_list = "\n\n".join(
        f"Document {i+1}:\n  ID: {doc['id']}\n  Filepath: {doc['filepath']}\n  Score: {doc['score']}\n  Content: {doc['content']}"
        for i, doc in enumerate(documents)
    )
    prompt = (
        "You are a Web MDN Documentation expert with access to conversation history.\n\n"
        f"CONVERSATION SUMMARY:\n{formatted_history}\n\n"
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

    return StreamingResponse(
        generate_and_store(), media_type="text/plain; charset=utf-8"
    )


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
# Exercise 6 & 7 — Multi-agent endpoint
# ---------------------------------------------------------------------------


class AgentRequest(BaseModel):
    message: str
    session_id: str | None = None


@app.post("/api/agent")
async def agent(body: AgentRequest):
    """Multi-agent endpoint — routes to math, RAG, or FAQ search agent.

    Routes:
      direct         — router answers from general knowledge
      math           — math agent with arithmetic tools
      rag            — RAG agent searches MDN documentation
      faq            — FAQ search agent with hybrid vector + FTS search
      faq_missing    — no matching FAQ collection found

    Conversation history is stored in Couchbase and injected into each
    agent invocation so agents can reference prior turns.
    Trace steps (route decision, tool calls, tool results) are returned
    alongside the final answer for display in the UI.
    """
    if not body.message or not body.message.strip():
        raise HTTPException(status_code=400, detail="Message is required.")

    from agents.graph import agent_graph

    session_id = body.session_id or "agent-default-session"

    # Load conversation history for memory
    raw_history = await get_conversation_history(session_id, limit=10)
    conversation_history = [
        (m["role"], m["content"]) for m in raw_history
    ]

    # Store user message
    await add_message(session_id, body.message, "user")

    result = await agent_graph.ainvoke({
        "message": body.message,
        "conversation_history": conversation_history,
        "trace_steps": [],
        "previous_node": None,
    })

    answer = result.get("answer", "")

    # Store assistant response
    await add_message(session_id, answer, "assistant")

    return {
        "response": answer,
        "routed_to": result.get("routed_to", "router"),
        "faq_collection": result.get("faq_collection"),
        "missing_topic": result.get("missing_topic"),
        "trace_steps": result.get("trace_steps") or [],
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 5000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
