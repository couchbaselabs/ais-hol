# Python Workshop — AI with Couchbase

[![Open in Ona](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/couchbaselabs/ais-hol)
[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/couchbaselabs/ais-hol)

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
git clone -b python-workshop https://github.com/couchbaselabs/ais-hol
cd ais-hol

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

1. **Import** — use `cbsh` to chunk and import raw markdown into a collection named `documentation` (no embedding yet)
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

This reads all markdown files, chunks them, assigns a content hash as document ID, and upserts into the `documentation` collection. No OpenAI calls are made.

### Step 4 — Vectorize with Capella AI Services

Now use the Capella AI Services vectorization workflow to generate embeddings for all documents in `documentation` and create a vector search index automatically.

1. In Capella, go to **AI Services → Workflows → Create New Workflow**
2. Click **Data from Capella**
3. Give the workflow a name and click **Setup Workflow**
4. Under **Data Source**, select your cluster, then:
   - Bucket: `shared`
   - Scope: `public`
   - Collection: `documentation`
5. Under **Source Fields**, click **Map all source fields to a single vector field**
   - Set the **Vector Field** name to `vector`
6. Under **Embedding Model**, click **Capella Model**
   - Select your available embedding model
   - Add your API key ID and Token
7. Click **Next**, verify the configuration, then click **Run Workflow**

The workflow generates a `vector` field on every document in `documentation` and creates a vector search index. Wait for the workflow status to show all documents processed before moving to Exercise 3.

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

> The Capella AI Services workflow creates a **SQL++ GSI vector index** (not an FTS index). Query it using `ORDER BY ANN_DISTANCE()` via SQL++, not `scope.search()`.

```python
async def get_relevant_documents(embedding: list[float], name: str | None = None) -> list[dict]:
    cluster = _get_cluster()
    bucket_name = os.environ["COUCHBASE_BUCKET_NAME"]
    index_name = os.environ["COUCHBASE_SEARCH_INDEX_NAME"]

    sql = f"""
        SELECT META(d).id AS id,
               d.filepath,
               d.content,
               ANN_DISTANCE(d.vector, $embedding, "L2") AS score
        FROM `{bucket_name}`.`{SCOPE_NAME}`.`documentation` AS d
        USE INDEX ({index_name} USING GSI)
        ORDER BY ANN_DISTANCE(d.vector, $embedding, "L2")
        LIMIT 4
    """
    result = cluster.query(sql, QueryOptions(named_parameters={"embedding": embedding}))
    documents = []
    for row in result.rows():
        documents.append({
            "id": row.get("id", ""),
            "filepath": row.get("filepath", ""),
            "content": row.get("content", ""),
            "score": row.get("score", 0.0),
        })
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
        if not chunk.choices:
            continue
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

### Step 1 — Create the cache bucket, collection and vector index

In Couchbase Capella:

1. Create a new bucket named `semantic_cache`
2. Inside it, create a collection named `semantic` in the `_default` scope
3. Create a SQL++ vector index on the collection. In the Capella **Query** tab run:

```sql
CREATE VECTOR INDEX `semantic_cache_vector_idx`
ON `semantic_cache`.`_default`.`semantic`(`vector` VECTOR)
WITH {
  "dimension": 2048,
  "similarity": "L2",
  "description": "IVF,SQ8"
}
```

> Adjust `"dimension"` to match your embedding model output size (2048 for `nvidia/llama-3.2-nv-embedqa-1b-v2`, 1536 for `text-embedding-3-small`).

Add to `backend/.env`:
```env
CACHE_INDEX=semantic_cache_vector_idx
```

### Step 2 — Implement `semantic_cache_service.py`

In `backend/services/semantic_cache_service.py`:

**`cache_get`:**
```python
async def cache_get(prompt, embedding, llm_signature, similarity_threshold=0.85, k=3):
    cluster = _get_cluster()
    try:
        sql = f"""
            SELECT META(c).id AS id,
                   c.llm_signature,
                   c.response,
                   ANN_DISTANCE(c.vector, $embedding, "L2") AS score
            FROM `{CACHE_BUCKET()}`.`{CACHE_SCOPE()}`.`{CACHE_COLLECTION()}` AS c
            USE INDEX ({CACHE_INDEX()} USING GSI)
            ORDER BY ANN_DISTANCE(c.vector, $embedding, "L2")
            LIMIT {k}
        """
        result = cluster.query(sql, QueryOptions(named_parameters={"embedding": embedding}))
        for row in result.rows():
            # ANN_DISTANCE with L2: lower = more similar, so skip if score is too high
            if row.get("score", 1.0) > similarity_threshold:
                continue
            if row.get("llm_signature") == llm_signature:
                print(f"Cache HIT (score={row.get('score', '?'):.3f})")
                return row["response"]
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
- **Agent Chat tab** — Exercises 6–7 multi-agent system

---

## Exercise 6 — Multi-Agent Routing

### What you will build

A multi-agent system using **LangGraph** and the **Couchbase Agent Catalog**. A router agent classifies each user message and either answers directly or hands off to a math agent equipped with calculation tools. The Agent Catalog manages tool discovery and versioning.

```
User message
     │
  [router]  ──── direct answer ────▶ response
     │
     └── math question ──▶ [math_agent] ──▶ response
```

### Step 1 — Switch to OpenAI and install new dependencies

Exercises 6 and 7 use tool calling and structured output, which require a model that supports these features. Capella-hosted models (DeepSeek, Mistral NIM) do not reliably support multi-turn tool use. Switch to a real OpenAI key before proceeding.

In `backend/.env`, comment out the Capella endpoint variables and set a real OpenAI API key:

```env
OPENAI_API_KEY=sk-...        # real OpenAI key
# OPENAI_BASE_URL=...        # comment out
# OPENAI_COMPLETION_MODEL=... # comment out
# OPENAI_EMBEDDING_MODEL=...  # comment out — embeddings will use OpenAI too
```

> If you still need Capella embeddings for the vector search index created in Exercise 2, keep `OPENAI_EMBEDDING_MODEL` set. The completion model is what requires OpenAI.

Then install the new packages:

```bash
cd backend
source .venv/bin/activate
pip install -r requirements.txt
```

New packages: `langgraph`, `langchain-openai`, `agentc[langgraph]`, `agentc-langchain`.

### Step 2 — Set up the Agent Catalog

Add to `backend/.env`:

```env
AGENT_CATALOG_CONN_STRING=couchbases://your-cluster-endpoint
AGENT_CATALOG_USERNAME=your-username
AGENT_CATALOG_PASSWORD=your-password
AGENT_CATALOG_BUCKET=shared
```

Initialise the catalog. Run from the **repository root** (where `.git` lives) so `agentc` can install its post-commit hook:

```bash
cd /path/to/ais-hol
AGENT_CATALOG_CONN_ROOT_CERTIFICATE=backend/certificate \
  backend/.venv/bin/agentc --no-config init --bucket shared
```

> `--no-config` avoids a known conflict between `agentc 1.0.0` and `click-extra` that causes a spurious `ERROR` before the command runs. `AGENT_CATALOG_CONN_ROOT_CERTIFICATE` must be set because the `.env` relative path does not resolve when running from the repo root.

### Step 3 — Implement math tools and the agent prompt

Open `backend/agents/math_tools.py`. The file defines five functions decorated with `@agentc_tool` (imported from `agentc_core.tool`):

```python
from agentc_core.tool import tool as agentc_tool

@agentc_tool
def add(a: float, b: float) -> float:
    """Add two numbers and return the result."""
    return a + b

@agentc_tool
def evaluate_expression(expression: str) -> float:
    """Evaluate a mathematical expression string (e.g. 'sqrt(144) + 10')."""
    return _safe_eval(expression)
```

The `evaluate_expression` tool uses a whitelist-based safe eval — only names from Python's `math` module are permitted.

The agent's system prompt and tool list are declared in `backend/agents/prompts/math_agent.yaml`:

```yaml
record_kind: prompt
name: math_agent
description: System prompt and tools for the math agent.

content:
  agent_instructions: >
    You are a precise math assistant. Use the available tools to evaluate
    the user's calculation request. Always use a tool — do not compute
    answers in your head.

tools:
  - name: add
  - name: subtract
  - name: multiply
  - name: divide
  - name: evaluate_expression
```

`agentc index` resolves the `tools` list at index time. At runtime, `catalog.find("prompt", name="math_agent")` returns the prompt with tool functions already attached — no manual `catalog.find("tool", ...)` calls needed.

### Step 4 — Index and publish tools and prompts

Run from the **`backend/` directory** after exporting env vars:

```bash
cd backend
export $(grep -v '^#' .env | grep -v '^$' | xargs)
AGENT_CATALOG_CONN_ROOT_CERTIFICATE=/path/to/ais-hol/backend/certificate \
PYTHONPATH=. \
  .venv/bin/agentc --no-config index ./agents/

AGENT_CATALOG_CONN_ROOT_CERTIFICATE=/path/to/ais-hol/backend/certificate \
  .venv/bin/agentc --no-config publish --bucket shared
```

`PYTHONPATH=.` is required so that `from agents.state import AgentState` resolves when `agentc` imports the tool files. Both tools and prompts are indexed and published in one pass.

> **Important:** `publish` requires a clean git working tree — commit any changes before running it. Re-run `index` then `publish` every time you modify a tool or prompt file.

### Step 5 — Implement the router agent

Open `backend/agents/router_agent.py`. The router uses an LLM with structured output to classify the message:

```python
class RouterDecision(BaseModel):
    route: Literal["direct", "math", "faq"]
    answer: str | None = None
    missing_topic: str | None = None
```

- `"direct"` → router answers immediately
- `"math"` → `Command(goto="math_agent")`
- `"faq"` → FAQ catalog lookup (Exercise 7)

### Step 6 — Implement the math agent

Open `backend/agents/math_agent.py`. It extends `agentc_langgraph.ReActAgent`, which fetches the `math_agent` prompt (and its attached tools) from the catalog and wraps each invocation in an agentc `Span` for activity logging:

```python
class MathAgent(agentc_langgraph.agent.ReActAgent):
    def __init__(self, catalog: agentc.Catalog, span: agentc.Span):
        super().__init__(
            chat_model=_get_llm(),
            catalog=catalog,
            span=span,
            prompt_name="math_agent",   # resolves prompts/math_agent.yaml
        )

    async def _ainvoke(self, span, state, config):
        agent = self.create_react_agent(span)  # attaches ToolNode + Callback
        result = await agent.ainvoke({"messages": [("user", state["message"])], ...})
        return Command(goto="__end__", update={"answer": result["messages"][-1].content})
```

`create_react_agent(span)` wraps the tool node with `agentc_langgraph.ToolNode` (logs tool results) and attaches a `Callback` to the chat model (logs completions and tool calls).

### Step 7 — Wire the LangGraph graph

Open `backend/agents/graph.py`. The graph is wrapped in `agentc_langgraph.GraphRunnable`, which creates a root `Span` and encloses every invocation in it. `catalog` and `span` are injected into the math and FAQ nodes via `functools.partial`:

```python
class AgentGraph(agentc_langgraph.graph.GraphRunnable):
    async def acompile(self):
        builder = StateGraph(AgentState)
        builder.add_node("router", router_node)
        builder.add_node("math_agent",
            functools.partial(math_agent_node, catalog=self.catalog, span=self.span))
        builder.set_entry_point("router")
        return builder.compile()

agent_graph = AgentGraph(catalog=agentc.Catalog())
```

### Step 8 — Add the `/api/agent` endpoint

In `backend/main.py` the route is already wired. Note that `previous_node` must be initialised to `None` in the input state — it is used internally by the agentc span logging:

```python
@app.post("/api/agent")
async def agent(body: AgentRequest):
    result = await agent_graph.ainvoke({"message": body.message, "previous_node": None})
    return {
        "response": result.get("answer", ""),
        "routed_to": result.get("routed_to", "router"),
        ...
    }
```

### Step 9 — Run and test

Restart the backend and open the **Agent Chat** tab.

- Ask `"What is 2 + 2?"` → routed to **Math Agent**, badge shows `MATH AGENT`
- Ask `"What is the capital of France?"` → answered directly, badge shows `ROUTER`
- Ask `"sqrt(144) + 10"` → routed to **Math Agent**, returns `22.0`

**API:** `POST /api/agent` — `{ "message": "..." }` returns `{ "response": "...", "routed_to": "...", "faq_collection": null, "missing_topic": null, "timestamp": "..." }`

---

## Exercise 7 — FAQ Search Agent

### What you will build

Extend the multi-agent graph with a **FAQ search agent**. Multiple FAQ PDFs are each ingested into their own Couchbase collection. The router embeds the user question, compares it against FAQ metadata stored in a `faq_catalog` collection, and routes to the FAQ search agent when a match is found. When no FAQ covers the topic, the router returns an informative message.

```
User message
     │
  [router] ──── direct answer ──────────────────────▶ response
     │
     ├── math question ──▶ [math_agent] ─────────────▶ response
     │
     ├── FAQ match found ──▶ [faq_search_agent] ──────▶ response  (badge: FAQ Search · hr_policy)
     │
     └── no FAQ match ──── informative message ───────▶ response  (badge: No FAQ found · topic)
```

### Step 1 — Upload FAQ PDFs to S3

Create an S3 bucket (or use an existing one). Upload one or more FAQ PDFs, each representing a distinct topic. Choose a short snake_case name for each (e.g. `hr_policy`, `product_manual`) — this will become the Couchbase collection name.

### Step 2 — Ingest PDFs with Capella AI Services (S3 workflow)

For each FAQ PDF:

1. In Capella, go to **AI Services → Workflows → Create New Workflow**
2. Click **Data from S3**
3. Give the workflow a name and click **Start Workflow**
4. Under **Data Source**, configure:
   - **S3 Bucket URL**: your S3 bucket URL (e.g. `s3://my-bucket/hr_policy.pdf`)
   - **AWS Access Key ID** and **Secret Access Key**
5. Under **Target**, select your cluster, then:
   - Bucket: `shared`
   - Scope: `public`
   - Collection: your chosen name (e.g. `hr_policy`)
6. Under **Embedding Model**, click **External Model**
   - Select `text-embedding-3-small` from the OpenAI model list
   - Add your OpenAI API key
7. Click **Next**, verify, then click **Run Workflow**

Wait for the workflow to complete. Each document in the collection will have `content` and `vector` fields.

> **Rename the vector index after the workflow completes.** The Capella workflow creates a vector index with an auto-generated name. Rename it to `shared.public.<collection_name>_vector_idx` (e.g. `shared.public.hr_policy_vector_idx`) so the `hybrid_faq_search` tool can find it. You can rename it in the Capella Search UI or via `cbsh`:
> ```
> search index update shared.public.<auto-generated-name> --new-name shared.public.hr_policy_vector_idx
> ```

### Step 3 — Create the FTS index with `cbsh`

Run `cbsh` from the repository root, then create a Full-Text Search index on the new collection.

> **Index naming is required.** The `hybrid_faq_search` tool looks up indexes by the convention `shared.public.<collection_name>_fts_idx`. Use exactly this pattern — replace `hr_policy` with your collection name.

```
cb-env cluster <your-cluster-identifier>

# Replace hr_policy with your collection name
search index create shared.public.hr_policy_fts_idx \
  --type fulltext-index \
  --source-name shared \
  --source-type couchbase \
  --params '{
    "mapping": {
      "default_mapping": {
        "enabled": true,
        "dynamic": false,
        "properties": {
          "content": { "enabled": true, "dynamic": false,
            "fields": [{ "name": "content", "type": "text", "analyzer": "standard", "index": true }]
          }
        }
      },
      "default_type": "_default",
      "default_analyzer": "standard"
    },
    "store": { "indexType": "scorch" }
  }'
```

Repeat for each FAQ collection, changing the index name and collection accordingly.

### Step 4 — Create the vector index on `faq_catalog` with `cbsh`

The `faq_catalog` collection stores metadata embeddings used by the router to match questions to FAQs. Create its vector index.

> **Index naming is required.** The FAQ catalog service looks up this index by the fixed name `shared.public.faq_catalog_idx`. Do not change it.

```
search index create shared.public.faq_catalog_idx \
  --type fulltext-index \
  --source-name shared \
  --source-type couchbase \
  --params '{
    "mapping": {
      "default_mapping": {
        "enabled": true,
        "dynamic": false,
        "properties": {
          "vector": { "enabled": true, "dynamic": false,
            "fields": [{ "name": "vector", "type": "vector",
              "dims": 1536, "similarity": "dot_product" }]
          }
        }
      }
    },
    "store": { "indexType": "scorch" }
  }'
```

### Step 5 — Register the FAQ in the catalog

After ingestion, register the FAQ so the router can discover it. Run this once per FAQ from a Python shell inside `backend/`:

```python
import asyncio
from services.faq_catalog_service import register_faq

asyncio.run(register_faq(
    collection_name="hr_policy",
    display_name="HR Policy FAQ",
    description="Answers to common HR questions about leave, benefits, conduct, and payroll.",
))
```

This upserts a metadata document with an embedding of the description into the `faq_catalog` collection.

### Step 6 — Implement `faq_catalog_service.py`

Open `backend/services/faq_catalog_service.py`. The key function is `find_best_faq`:

```python
async def find_best_faq(question_embedding: list[float]) -> dict | None:
    # Runs a VectorQuery against faq_catalog_idx
    # Returns the top FAQ metadata doc if score >= FAQ_SIMILARITY_THRESHOLD
    # Returns None otherwise
```

The threshold is controlled by `FAQ_SIMILARITY_THRESHOLD` in `.env` (default `0.75`).

### Step 7 — Implement `faq_search_tools.py` and the agent prompt

Open `backend/agents/faq_search_tools.py`. The `hybrid_faq_search` tool runs both a vector search and an FTS search against the target collection, then merges and deduplicates results by document ID:

```python
from agentc_core.tool import tool as agentc_tool

@agentc_tool
def hybrid_faq_search(query: str, collection_name: str) -> list[dict]:
    """Search a FAQ collection using both vector similarity and full-text search."""
    ...
```

The tool looks up indexes by a fixed naming convention — **your index names in `cbsh` must match exactly**:

| Index type | Expected name |
|---|---|
| Vector | `shared.public.<collection_name>_vector_idx` |
| FTS | `shared.public.<collection_name>_fts_idx` |

The agent's system prompt is declared in `backend/agents/prompts/faq_search_agent.yaml`:

```yaml
record_kind: prompt
name: faq_search_agent
description: System prompt and tools for the FAQ search agent.

content:
  agent_instructions: >
    You are a helpful assistant that answers questions using FAQ documentation.
    Use the hybrid_faq_search tool to find relevant content, then synthesise a
    clear, accurate answer based only on what the documents say.

tools:
  - name: hybrid_faq_search
```

After implementing, commit your changes, then re-index and publish:

```bash
cd backend
export $(grep -v '^#' .env | grep -v '^$' | xargs)
AGENT_CATALOG_CONN_ROOT_CERTIFICATE=/path/to/ais-hol/backend/certificate \
PYTHONPATH=. \
  .venv/bin/agentc --no-config index ./agents/

AGENT_CATALOG_CONN_ROOT_CERTIFICATE=/path/to/ais-hol/backend/certificate \
  .venv/bin/agentc --no-config publish --bucket shared
```

### Step 8 — Implement `faq_search_agent.py`

Open `backend/agents/faq_search_agent.py`. It extends `agentc_langgraph.ReActAgent` and binds `collection_name` into the tool before the ReAct loop runs — the LLM only needs to supply the `query` argument:

```python
class FaqSearchAgent(agentc_langgraph.agent.ReActAgent):
    def __init__(self, catalog, span, collection_name):
        super().__init__(chat_model=_get_llm(), catalog=catalog, span=span,
                         prompt_name="faq_search_agent")
        # Pre-fill collection_name so the LLM only sees query
        self.tools = [self._bind_collection(t, collection_name) for t in self.tools]
```

### Step 9 — Update the router for FAQ matching

Open `backend/agents/router_agent.py`. The router now:

1. Embeds the user question with `get_embedding()`
2. Calls `find_best_faq(embedding)` to check the catalog
3. If a match is found → `Command(goto="faq_search_agent")` with `faq_collection` in state
4. If no match → returns an informative message with `missing_topic` set

### Step 10 — Update `graph.py`

Open `backend/agents/graph.py` — add the `faq_search_agent` node with `catalog` and `span` injected via `functools.partial`:

```python
builder.add_node("faq_search_agent",
    functools.partial(faq_search_agent_node, catalog=self.catalog, span=self.span))
```

### Step 11 — Run and test with two FAQs

Ingest and register two different FAQ PDFs (e.g. `hr_policy` and `product_manual`), then restart the backend and test in the **Agent Chat** tab:

- Ask `"How many days of annual leave do I get?"` → badge: `FAQ SEARCH · hr policy`
- Ask `"How do I reset my product license?"` → badge: `FAQ SEARCH · product manual`
- Ask `"What is the refund policy?"` (no matching FAQ) → badge: `NO FAQ FOUND · refund policy`
- Ask `"What is 15 * 7?"` → badge: `MATH AGENT` (Exercise 6 still works)
