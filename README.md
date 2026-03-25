# Python Workshop — AI with Couchbase

[![Open in Ona](https://gitpod.io/button/open-in-gitpod.svg)](https://app.ona.io/new#https://github.com/ldoguin/ais-hol)

Build a RAG (Retrieval-Augmented Generation) chatbot step by step using **Python (FastAPI)** and **Couchbase Vector Search**.

You will start with a simple OpenAI chatbot and progressively add vector search, conversation history, and semantic caching — all without switching branches.

---

## Prerequisites

- Python 3.11+
- Node.js 18+ (for the frontend)
- An [OpenAI API key](https://platform.openai.com/api-keys)
- A Couchbase Capella account (needed from Exercise 3 onwards)

---

## Quick Start

```bash
# Clone this branch
git clone -b python-workshop <repo-url>
cd <repo>

# Install Python dependencies (once, covers all exercises)
cd backend
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Copy and fill in environment variables
cp .env.example .env
# Edit .env — at minimum set OPENAI_API_KEY for Exercise 1

# Install frontend dependencies (once)
cd ../frontend
npm install
```

---

## Exercise 1 — Simple Chatbot

### What you will build

A chatbot that accepts a message and an optional system prompt, calls OpenAI, and returns a plain text response. Use the **Simple Chat** tab in the UI.

### Step 1 — Configure environment

Edit `backend/.env` and set:

```env
OPENAI_API_KEY=your_openai_api_key_here
PORT=5000
```

### Step 2 — Implement `generate_response`

Open `backend/services/openai_service.py` and find the `generate_response` function. Replace the placeholder with a real OpenAI call:

```python
async def generate_response(message: str, system_prompt: str | None = None) -> str:
    client = _get_client()
    default_prompt = "You are a helpful AI assistant. Be concise and friendly."
    final_prompt = system_prompt or default_prompt

    completion = await client.chat.completions.create(
        model=COMPLETION_MODEL,
        messages=[
            {"role": "system", "content": final_prompt},
            {"role": "user", "content": message},
        ],
        max_tokens=1000,
        temperature=0.7,
    )
    return completion.choices[0].message.content.strip()
```

### Step 3 — Run and test

```bash
# Terminal 1 — backend
cd backend
source .venv/bin/activate
python main.py

# Terminal 2 — frontend
cd frontend
npm run dev
```

Open the app, select the **Simple Chat** tab, and send a message. You should get a real AI response.

**API:** `POST /api/chat` — `{ "message": "...", "systemPrompt": "..." }` returns `{ "response": "...", "timestamp": "..." }`

---

## Exercise 2 — Import Data into Couchbase

Before building the RAG app you need chunked documents stored in Couchbase and their vector embeddings generated. This exercise uses two steps:

1. **Import** — use `cbsh` to chunk and import raw markdown into a collection named `ingestion` (no embedding yet)
2. **Vectorize** — use the Capella AI Services vectorization workflow to generate embeddings automatically inside the database

> **`cbsh` is pre-installed** by the devcontainer `postCreateCommand` — no manual install needed. Run all `cbsh` commands from the **repository root** so that `scripts/` paths resolve correctly.

### Step 1 — Set up Couchbase Capella

1. Sign up at [cloud.couchbase.com/signup](https://cloud.couchbase.com/signup)
2. Create a cluster (Couchbase Server 8.0+, Search Service and Eventing Service enabled)
3. Inside the cluster create:
   - Bucket: `shared`
   - Scope: `public`
   - Collection: `documentation`
4. Go to **Organization Settings → API Keys → Generate Key** and copy the access key and secret

### Step 2 — Configure Couchbase Shell

Edit `~/.cbsh/config`:

```toml
version = 1

[[capella-organization]]
identifier = "yourOrgIdentifier"
access-key = "yourAccessKey"
secret-key = "yourSecretKey"
default-project = "Trial - Project"
```

Register your cluster in cbsh:

```
clusters | clusters get $in.0.name | cb-env register $in.name $in."connection string" \
  --capella-organization "yourOrgIdentifier" --project "Trial - Project" \
  --save --default-bucket shared --default-scope public --username cbsh --password yourPassword
```

Create database credentials:

```
credentials create --read --write --username cbsh --password yourPassword
```

### Step 3 — Import the documentation (no embedding)

Run `cbsh` from the **repository root**:

```bash
cbsh
```

```
cb-env cluster <your-cluster-identifier>
use scripts/couchbase.nu *
use scripts/importers.nu *

# Import raw chunks — no embedding step
import_markdown_no_embed scripts/content/files/en-us/glossary1/ "glossary" "a glossary of IT terms"
```

This reads all markdown files, chunks them, assigns a content hash as document ID, and upserts into the `ingestion` collection. No OpenAI calls are made.

### Step 4 — Vectorize with Capella AI Services

Now use the Capella AI Services vectorization workflow to generate embeddings for all documents in `ingestion` and create a vector search index automatically.

1. In Capella, go to **AI Services → Workflows → Create New Workflow**
2. Click **Data from Capella**
3. Give the workflow a name and click **Start Workflow**
4. Under **Data Source**, select your cluster, then:
   - Bucket: `shared`
   - Scope: `public`
   - Collection: `ingestion`
5. Under **Source Fields**, click **Map all source fields to a single vector field**
   - Set the **Vector Field** name to `vector`
6. Under **Embedding Model**, click **External Model**
   - Select `text-embedding-3-small` from the OpenAI model list
   - Add your OpenAI API key
7. Click **Next**, verify the configuration, then click **Run Workflow**

The workflow generates a `vector` field on every document in `ingestion` and creates a vector search index. Wait for the workflow status to show all documents processed before moving to Exercise 3.

See: [Vectorize Structured Data from Capella](https://docs.couchbase.com/ai/build/vectorization-service/vectorize-structured-data-capella.html)

### Step 5 — Update your backend environment

Add to `backend/.env`:

```env
COUCHBASE_SEARCH_INDEX_NAME=<index-name-created-by-the-workflow>
```

The index name is shown in the Capella AI Services workflow detail page after the workflow completes.

---

## Exercise 3 — RAG Application

### What you will build

The backend embeds the user query, searches Couchbase for the most relevant documents, injects them into the prompt, and streams the OpenAI response. Switch to the **RAG Chat** tab in the UI.

### Step 1 — Add Couchbase environment variables

Add to `backend/.env`:

```env
COUCHBASE_CONNECTION_STRING=couchbases://your-cluster-endpoint
COUCHBASE_USERNAME=your-username
COUCHBASE_PASSWORD=your-password
COUCHBASE_BUCKET_NAME=shared
COUCHBASE_SEARCH_INDEX_NAME=documentation
```

### Step 2 — Implement `get_embedding`

In `backend/services/openai_service.py`:

```python
async def get_embedding(text: str) -> list[float]:
    client = _get_client()
    response = await client.embeddings.create(model=EMBEDDING_MODEL, input=text)
    return response.data[0].embedding
```

### Step 3 — Implement `get_relevant_documents`

In `backend/services/couchbase_service.py`:

```python
async def get_relevant_documents(embedding: list[float], name: str | None = None) -> list[dict]:
    cluster = _get_cluster()
    bucket_name = os.environ["COUCHBASE_BUCKET_NAME"]
    index_name = os.environ["COUCHBASE_SEARCH_INDEX_NAME"]
    scope = cluster.bucket(bucket_name).scope(SCOPE_NAME)
    collection = scope.collection("documentation")

    request = SearchRequest.create(
        VectorSearch.from_vector_query(
            VectorQuery("vector", embedding, num_candidates=4)
        )
    )
    result = scope.search(index_name, request, SearchOptions(limit=4))
    doc_refs = [{"id": row.id, "score": row.score} for row in result.rows]

    documents = []
    for ref in doc_refs:
        try:
            doc = collection.get(ref["id"])
            content = dict(doc.content_as[dict])
            content.pop("vector", None)
            documents.append({
                "id": ref["id"],
                "filepath": content.get("filepath", ""),
                "content": content,
                "score": ref["score"],
            })
        except Exception as e:
            print(f"Error fetching {ref['id']}: {e}")
    return documents
```

### Step 4 — Implement `stream_completion`

In `backend/services/openai_service.py`:

```python
async def stream_completion(prompt: str):
    client = _get_client()
    stream = await client.chat.completions.create(
        model=COMPLETION_MODEL,
        messages=[
            {"role": "system", "content": "Return plain text, no markdown. Be informal and conversational."},
            {"role": "user", "content": prompt},
        ],
        stream=True,
    )
    async for chunk in stream:
        token = chunk.choices[0].delta.content
        if token:
            yield token
```

### Step 5 — Implement the `/api/query` route

In `backend/main.py`, replace the placeholder in the `query` function:

```python
@app.post("/api/query")
async def query(body: QueryRequest):
    if not body.q or not body.q.strip():
        raise HTTPException(status_code=400, detail="Query is required.")

    embedding = await get_embedding(body.q)
    documents = await get_relevant_documents(embedding)

    document_list = "\n\n".join(
        f"Document {i+1}:\n  ID: {doc['id']}\n  Filepath: {doc['filepath']}\n  Score: {doc['score']}\n  Content: {doc['content']}"
        for i, doc in enumerate(documents)
    )
    prompt = (
        "You are a Web MDN Documentation expert.\n"
        "Answer the user query using the documents below.\n\n"
        f"{document_list}\n\n"
        f"User Query: {body.q}\n\n"
        "Reference document IDs and filepaths where relevant."
    )

    return StreamingResponse(stream_completion(prompt), media_type="text/plain; charset=utf-8")
```

### Step 6 — Switch to RAG Chat and test

Restart the backend, then click the **RAG Chat** tab. Ask something like *"What is an array?"* — the response will stream in and reference MDN documentation.

---

## Exercise 4 — Conversation History

### What you will build

Every message is stored in Couchbase so the model can answer follow-up questions like *"What did I just ask?"*.

### Step 1 — Create the conversations collection

In Couchbase Capella Query Workbench:

```sql
CREATE COLLECTION `shared`.`_default`.`conversations`;

CREATE INDEX idx_conversation_session
ON `shared`.`_default`.`conversations`(session_id, timestamp)
WHERE type = "chat_message";
```

### Step 2 — Implement `conversation_service.py`

In `backend/services/conversation_service.py`, implement all four functions:

**`add_message`:**
```python
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
```

**`get_conversation_history`:**
```python
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
```

**`format_conversation_history`:**
```python
def format_conversation_history(messages: list[dict]) -> str:
    if not messages:
        return "No previous conversation history."
    return "\n".join(
        f"{'User' if m['role'] == 'user' else 'Assistant'}: {m['content']}"
        for m in messages
    )
```

**`clear_conversation_history`:**
```python
async def clear_conversation_history(session_id: str) -> None:
    cluster = _get_cluster()
    sql = f"""
        DELETE FROM `{BUCKET_NAME()}`.`{SCOPE()}`.`{COLLECTION()}`
        WHERE session_id = $session_id AND type = "chat_message"
    """
    cluster.query(sql, QueryOptions(named_parameters={"session_id": session_id}))
```

### Step 3 — Update the `/api/query` route

Replace the route body in `main.py`:

```python
@app.post("/api/query")
async def query(body: QueryRequest):
    if not body.q or not body.q.strip():
        raise HTTPException(status_code=400, detail="Query is required.")

    session_id = body.session_id or "default-session"
    await add_message(session_id, body.q, "user")

    history = await get_conversation_history(session_id, limit=10)
    formatted_history = format_conversation_history(history)

    embedding = await get_embedding(body.q)
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
        await add_message(session_id, full_response, "assistant")

    return StreamingResponse(generate_and_store(), media_type="text/plain; charset=utf-8")
```

### Step 4 — Implement the history endpoints

In `main.py`, replace the placeholder bodies:

```python
@app.get("/api/conversation/history")
async def get_history(session_id: str, limit: int = 10):
    messages = await get_conversation_history(session_id, limit)
    return {"session_id": session_id, "messages": messages, "count": len(messages)}

@app.delete("/api/conversation/clear")
async def clear_history(body: ClearRequest):
    await clear_conversation_history(body.session_id)
    return {"success": True}
```

### Step 5 — Summarize conversation history with Capella AI Functions

Instead of passing raw message history to the prompt, use Couchbase Capella's built-in
`ai_summary` SQL++ function to compress it. The summarization runs **inside the database**
— no extra API call from the backend is needed.

#### Prerequisites

Enable the **Summarization** AI Function on your Capella cluster:

1. In Capella, go to **AI Services → AI Functions**
2. Click **Enable AI Functions**
3. Select **Summarization** and click **Next**
4. Choose your LLM model (OpenAI, Bedrock, or Capella Model Service) and configure credentials
5. Select your operational cluster and click **Complete Setup**
6. Wait for the status to show **Healthy** before proceeding

See: [Capella AI Functions — Summarization](https://docs.couchbase.com/ai/build/ai-functions.html#summarization)

#### Implement `summarize_conversation`

In `backend/services/conversation_service.py`:

```python
async def summarize_conversation(session_id: str, max_words: int = 150) -> str:
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
```

#### Update the `/api/query` route to use the summary

Replace `formatted_history` in the prompt with the summary:

```python
# Replace this:
history = await get_conversation_history(session_id, limit=10)
formatted_history = format_conversation_history(history)

# With this:
formatted_history = await summarize_conversation(session_id)
```

The prompt stays compact regardless of how long the conversation grows.

### Step 6 — Test conversation memory

Restart the backend and try in the **RAG Chat** tab:

1. Ask: *"What is the JavaScript Array.map() method?"*
2. Ask: *"What was my previous question?"*
3. Ask: *"Can you explain that in simpler terms?"*

Check the Capella Query Workbench to see the `ai_summary` function being called.

---

## Exercise 5 — Semantic Caching

### What you will build

Semantically similar queries are served from cache without calling OpenAI, reducing latency and cost.

### Step 1 — Create the cache bucket and collection

In Couchbase Capella:

1. Create a new bucket named `semantic_cache`
2. Inside it, create a collection named `semantic` in the `_default` scope
3. Create a vector search index:
   - **Index Name:** `semantic_cache._default.semantic_cache_idx`
   - **Source:** `semantic_cache._default.semantic`
   - Field: `vector`, 1536 dimensions, dot product similarity

### Step 2 — Implement `semantic_cache_service.py`

In `backend/services/semantic_cache_service.py`:

**`cache_get`:**
```python
async def cache_get(prompt, embedding, llm_signature, similarity_threshold=0.85, k=3):
    cluster = _get_cluster()
    scope = cluster.bucket(CACHE_BUCKET()).scope(CACHE_SCOPE())
    collection = scope.collection(CACHE_COLLECTION())

    request = SearchRequest.create(
        VectorSearch.from_vector_query(VectorQuery("vector", embedding, num_candidates=k))
    )
    try:
        result = scope.search(CACHE_INDEX(), request, SearchOptions(limit=k))
        for row in result.rows:
            if row.score < similarity_threshold:
                continue
            doc = collection.get(row.id)
            entry = doc.content_as[dict]
            if entry.get("llm_signature") == llm_signature:
                print(f"Cache HIT (score={row.score:.3f})")
                return entry["response"]
    except Exception as e:
        print(f"Cache lookup error: {e}")
    return None
```

**`cache_put`:**
```python
async def cache_put(prompt, embedding, llm_signature, response, ttl_minutes=1440):
    import uuid
    from couchbase.options import UpsertOptions
    cluster = _get_cluster()
    collection = cluster.bucket(CACHE_BUCKET()).scope(CACHE_SCOPE()).collection(CACHE_COLLECTION())
    doc = {
        "prompt": prompt,
        "response": response,
        "llm_signature": llm_signature,
        "vector": embedding,
    }
    collection.upsert(
        str(uuid.uuid4()),
        doc,
        UpsertOptions(expiry=timedelta(minutes=ttl_minutes)),
    )
```

### Step 3 — Update the `/api/query` route

Wrap the RAG pipeline with cache check/store in `main.py`:

```python
@app.post("/api/query")
async def query(body: QueryRequest):
    if not body.q or not body.q.strip():
        raise HTTPException(status_code=400, detail="Query is required.")

    session_id = body.session_id or "default-session"
    llm_sig = create_llm_signature(COMPLETION_MODEL, 0.7, 1000, "MDN expert")

    embedding = await get_embedding(body.q)

    cached = await cache_get(body.q, embedding, llm_sig)
    if cached:
        async def from_cache():
            yield cached
        return StreamingResponse(from_cache(), media_type="text/plain; charset=utf-8")

    await add_message(session_id, body.q, "user")
    history = await get_conversation_history(session_id, limit=10)
    formatted_history = format_conversation_history(history)
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
        await add_message(session_id, full_response, "assistant")
        await cache_put(body.q, embedding, llm_sig, full_response)

    return StreamingResponse(generate_and_store(), media_type="text/plain; charset=utf-8")
```

### Step 4 — Test the cache

Restart the backend and send the same query twice. The second response should be instant. Check the terminal for `Cache HIT` log messages.

---

## Running the application

```bash
# Backend
cd backend
source .venv/bin/activate
python main.py

# Frontend (separate terminal)
cd frontend
npm run dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

- **Simple Chat tab** — Exercise 1 chatbot
- **RAG Chat tab** — Exercises 3–5 RAG application
