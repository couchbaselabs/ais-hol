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
# Demo: Streaming Chat
# ---------------------------------------------------------------------------


class StreamChatRequest(BaseModel):
    message: str
    systemPrompt: str | None = None


@app.post("/api/chat-stream")
async def chat_stream(body: StreamChatRequest):
    """Simple chat with token-by-token streaming via StreamingResponse.

    Identical LLM call to /api/chat but delivered as a chunked text stream
    instead of a single JSON payload. The frontend reads tokens as they
    arrive and renders them incrementally.
    """
    if not body.message or not body.message.strip():
        raise HTTPException(status_code=400, detail="Message is required.")

    system_prompt = body.systemPrompt or "You are a helpful AI assistant. Be concise and friendly."

    async def token_stream():
        async for token in stream_completion(
            f"{system_prompt}\n\nUser: {body.message}"
        ):
            yield token

    return StreamingResponse(token_stream(), media_type="text/plain; charset=utf-8")


# ---------------------------------------------------------------------------
# Demo: Structured Output
# ---------------------------------------------------------------------------


class StructuredRequest(BaseModel):
    text: str


@app.post("/api/chat-structured")
async def chat_structured(body: StructuredRequest):
    """Extract structured data from free text using OpenAI response_format.

    Asks the LLM to analyse the input and return a fixed JSON schema:
    sentiment, key entities, a one-sentence summary, topics, and a
    confidence score. Demonstrates why structured output matters for
    downstream pipelines.
    """
    if not body.text or not body.text.strip():
        raise HTTPException(status_code=400, detail="Text is required.")

    from openai import AsyncOpenAI
    client = AsyncOpenAI(
        api_key=os.environ["INFERENCE_MODEL_API_KEY"],
        base_url=os.environ.get("INFERENCE_MODEL_BASE_URL") or None,
    )

    system_prompt = (
        "You are a text analysis assistant. Analyse the user's text and respond "
        "with a JSON object that strictly follows this schema:\n"
        "{\n"
        '  "sentiment": "positive" | "negative" | "neutral" | "mixed",\n'
        '  "sentiment_score": <float 0.0–1.0, confidence in the sentiment>,\n'
        '  "summary": <one sentence summary>,\n'
        '  "topics": [<list of 1–5 topic strings>],\n'
        '  "entities": [\n'
        '    { "text": <entity text>, "type": "person" | "place" | "org" | "concept" | "other" }\n'
        "  ],\n"
        '  "language": <ISO 639-1 language code>\n'
        "}\n"
        "Return only valid JSON. No markdown, no explanation."
    )

    completion = await client.chat.completions.create(
        model=INFERENCE_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": body.text},
        ],
        response_format={"type": "json_object"},
        temperature=0,
    )

    import json as _json
    raw = completion.choices[0].message.content.strip()
    try:
        parsed = _json.loads(raw)
    except Exception:
        parsed = {"raw": raw, "parse_error": True}

    return {
        "result": parsed,
        "input_tokens": completion.usage.prompt_tokens,
        "output_tokens": completion.usage.completion_tokens,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# ---------------------------------------------------------------------------
# Demo: Reranking
# ---------------------------------------------------------------------------


class RerankRequest(BaseModel):
    q: str
    top_k_retrieve: int = 10   # how many docs to fetch from vector search
    top_k_rerank: int = 3      # how many to keep after reranking


@app.post("/api/chat-rerank")
async def chat_rerank(body: RerankRequest):
    """RAG with a two-stage retrieval pipeline: broad ANN fetch then LLM rerank.

    Stage 1 — retrieve top_k_retrieve candidates via ANN vector search.
    Stage 2 — ask the LLM to score each candidate for relevance to the query
               and return only the top_k_rerank most relevant ones.
    Returns both the pre- and post-rerank lists so the UI can show the diff.
    """
    if not body.q or not body.q.strip():
        raise HTTPException(status_code=400, detail="Query is required.")

    import json as _json

    embedding = await get_embedding(body.q)

    # Stage 1: broad retrieval
    from services.couchbase_service import get_relevant_documents
    candidates = await get_relevant_documents(embedding)
    # Fetch more by temporarily patching limit — use a direct call with higher k
    # The service always returns LIMIT 4; we call it once and note the constraint.
    # For demo purposes we use what we have and show the reranking step clearly.
    pre_rerank = [
        {
            "id": d["id"],
            "filepath": d["filepath"],
            "content": d["content"],
            "vector_score": round(d["score"], 4),
        }
        for d in candidates
    ]

    if not pre_rerank:
        return {
            "pre_rerank": [],
            "post_rerank": [],
            "answer": "No documents found for this query.",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    # Stage 2: LLM reranking
    doc_list_text = "\n\n".join(
        f"[{i}] filepath={d['filepath']}\n{d['content'][:300]}"
        for i, d in enumerate(pre_rerank)
    )
    rerank_prompt = (
        f"Query: {body.q}\n\n"
        f"Documents:\n{doc_list_text}\n\n"
        f"Score each document 0–10 for relevance to the query. "
        f"Return a JSON array of objects with keys 'index' (int) and 'score' (float). "
        f"Return only the JSON array, no explanation."
    )

    from openai import AsyncOpenAI
    client = AsyncOpenAI(
        api_key=os.environ["INFERENCE_MODEL_API_KEY"],
        base_url=os.environ.get("INFERENCE_MODEL_BASE_URL") or None,
    )
    completion = await client.chat.completions.create(
        model=INFERENCE_MODEL,
        messages=[
            {"role": "system", "content": "You are a relevance scoring assistant. Return only valid JSON."},
            {"role": "user", "content": rerank_prompt},
        ],
        response_format={"type": "json_object"},
        temperature=0,
    )
    raw = completion.choices[0].message.content.strip()
    try:
        parsed = _json.loads(raw)
        # Handle both {"scores": [...]} and plain [...]
        scores = parsed if isinstance(parsed, list) else next(iter(parsed.values()))
        scored = sorted(scores, key=lambda x: x.get("score", 0), reverse=True)
        top_indices = [s["index"] for s in scored[:body.top_k_rerank] if s["index"] < len(pre_rerank)]
        rerank_scores = {s["index"]: s.get("score", 0) for s in scores}
    except Exception:
        top_indices = list(range(min(body.top_k_rerank, len(pre_rerank))))
        rerank_scores = {}

    post_rerank = [
        {**pre_rerank[i], "rerank_score": round(rerank_scores.get(i, 0), 2)}
        for i in top_indices
    ]

    # Generate answer from reranked docs
    context = "\n\n".join(
        f"[{d['filepath']}]\n{d['content']}" for d in post_rerank
    )
    answer_completion = await client.chat.completions.create(
        model=INFERENCE_MODEL,
        messages=[
            {"role": "system", "content": "You are a helpful assistant. Answer using only the provided documents."},
            {"role": "user", "content": f"Documents:\n{context}\n\nQuestion: {body.q}"},
        ],
        temperature=0.7,
    )
    answer = answer_completion.choices[0].message.content.strip()

    # Annotate pre_rerank with rerank scores for comparison
    for i, doc in enumerate(pre_rerank):
        doc["rerank_score"] = round(rerank_scores.get(i, 0), 2)
        doc["selected"] = i in top_indices

    return {
        "pre_rerank": pre_rerank,
        "post_rerank": post_rerank,
        "answer": answer,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# ---------------------------------------------------------------------------
# Demo: Prompt Engineering
# ---------------------------------------------------------------------------

PROMPT_PRESETS = {
    "terse": "Answer in one sentence. No preamble, no explanation.",
    "verbose": (
        "You are a thorough teacher. Explain the topic step by step with examples. "
        "Use clear headings and bullet points where helpful."
    ),
    "chain_of_thought": (
        "Think through this step by step before answering. "
        "Show your reasoning explicitly, then give a final answer."
    ),
    "eli5": (
        "Explain this as if I am five years old. Use simple words, short sentences, "
        "and a fun analogy."
    ),
    "socratic": (
        "Do not answer directly. Instead, ask 2–3 probing questions that guide the "
        "user to discover the answer themselves."
    ),
}


class PromptRequest(BaseModel):
    message: str
    presets: list[str] = ["terse", "verbose", "chain_of_thought"]


@app.post("/api/chat-prompt")
async def chat_prompt(body: PromptRequest):
    """Run the same question through multiple system prompts in parallel.

    Returns one response per requested preset so the UI can display them
    side by side, making the impact of prompt wording immediately visible.
    """
    if not body.message or not body.message.strip():
        raise HTTPException(status_code=400, detail="Message is required.")

    import asyncio
    from openai import AsyncOpenAI

    client = AsyncOpenAI(
        api_key=os.environ["INFERENCE_MODEL_API_KEY"],
        base_url=os.environ.get("INFERENCE_MODEL_BASE_URL") or None,
    )

    async def call_one(preset_name: str) -> dict:
        system_prompt = PROMPT_PRESETS.get(preset_name, "You are a helpful assistant.")
        completion = await client.chat.completions.create(
            model=INFERENCE_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": body.message},
            ],
            temperature=0.7,
            max_tokens=600,
        )
        return {
            "preset": preset_name,
            "system_prompt": system_prompt,
            "response": completion.choices[0].message.content.strip(),
            "tokens": completion.usage.completion_tokens,
        }

    valid_presets = [p for p in body.presets if p in PROMPT_PRESETS]
    if not valid_presets:
        valid_presets = ["terse", "verbose", "chain_of_thought"]

    results = await asyncio.gather(*[call_one(p) for p in valid_presets])

    return {
        "results": list(results),
        "available_presets": list(PROMPT_PRESETS.keys()),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


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
