# AI Couchbase Days — Full Workshop Guide

This document consolidates all five workshop exercises into a single reference, including all READMEs, solution files, and supplementary guides from every branch.

---

## Table of Contents

1. [Exercise 1 — Simple Chatbot with OpenAI](#exercise-1--simple-chatbot-with-openai)
2. [Exercise 2 — Vector Search with Couchbase](#exercise-2--vector-search-with-couchbase)
3. [Exercise 3 — RAG Application](#exercise-3--rag-application)
4. [Exercise 4 — RAG with Conversation History](#exercise-4--rag-with-conversation-history)
5. [Exercise 5 — Semantic Caching](#exercise-5--semantic-caching)

---

## Exercise 1 — Simple Chatbot with OpenAI

**Branch:** `main`

Build a chatbot with a React frontend and Node.js backend that calls the OpenAI API.

### Prerequisites

- Node.js v18+
- npm or yarn
- OpenAI API key — [platform.openai.com/api-keys](https://platform.openai.com/api-keys)

### Setup

```bash
# Backend
cd backend
npm install
cp env.example .env
```

Edit `.env`:

```env
OPENAI_API_KEY=your_openai_api_key_here
PORT=5002
```

```bash
# Frontend
cd frontend
npm install
```

### Run

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### API

**`POST /api/chat`**

```json
// Request
{ "message": "Hello, how are you?" }

// Response
{ "response": "Hello! ...", "timestamp": "2024-01-15T10:30:00.000Z" }

// Error response
{ "error": "Failed to generate response", "message": "Invalid or missing OpenAI API key." }
```

### System Prompt

Click the **⚙️ System Prompt** button to choose from six built-in templates or write a custom prompt:

- **Default Assistant** — General-purpose helpful AI
- **Code Helper** — Programming and coding assistance
- **Creative Writer** — Storytelling and creative writing
- **Business Advisor** — Strategic business consultation
- **Educational Tutor** — Patient teaching and learning support
- **Technical Documentarian** — Clear technical documentation

### Solution A — Plain LLM (no system prompt)

**`backend/services/openaiService.js`** — replace the placeholder in `generateResponse`:

```js
const completion = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: userMessage }],
  max_tokens: 1000,
  temperature: 0.7,
});

const response = completion.choices[0]?.message?.content;
if (!response) throw new Error('No response generated from OpenAI');
return response.trim();
```

**`frontend/src/App.jsx`** — replace the placeholder in `sendMessage`:

```js
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: messageText }),
});

if (!response.ok) throw new Error('Failed to send message');

const data = await response.json();
const botMessage = {
  id: Date.now() + 1,
  text: data.response,
  sender: 'bot',
  timestamp: new Date()
};
setMessages(prev => [...prev, botMessage]);
```

### Solution B — With system prompt

**`backend/services/openaiService.js`**:

```js
const defaultSystemPrompt = "You are a helpful AI assistant. Please respond to the user's message in a friendly and helpful manner. Keep your responses concise but informative.";
const finalSystemPrompt = systemPrompt || defaultSystemPrompt;

const completion = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [
    { role: "system", content: finalSystemPrompt },
    { role: "user", content: userMessage },
  ],
  max_tokens: 1000,
  temperature: 0.7,
});

const response = completion.choices[0]?.message?.content;
if (!response) throw new Error('No response generated from OpenAI');
return response.trim();
```

**`frontend/src/App.jsx`**:

```js
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: messageText, systemPrompt }),
});

if (!response.ok) throw new Error('Failed to send message');

const data = await response.json();
const botMessage = {
  id: Date.now() + 1,
  text: data.response,
  sender: 'bot',
  timestamp: new Date()
};
setMessages(prev => [...prev, botMessage]);
```

Implement Solution A first, then Solution B to observe the effect of the system prompt.

---

## Exercise 2 — Vector Search with Couchbase

**Branch:** `exercise-2`

Import markdown documents as vector embeddings into Couchbase and run semantic searches using Couchbase Shell (`cbsh`).

> **Important:** Key information for running this workshop in GitHub Codespaces is covered in the setup sections below.

### Prerequisites

**Option A — Couchbase Capella (Cloud):**
- A GitHub account
- A Couchbase Capella account

**Option B — Local Couchbase Server:**
- Couchbase Server Enterprise Edition 7.6+
- [Couchbase Shell (cbsh)](https://couchbase.sh)
- OpenAI API key

---

### Option A: Local Couchbase Server

#### Install and initialise

Download from [couchbase.com/downloads](https://www.couchbase.com/downloads):

- **macOS**: `.dmg` installer
- **Linux**: package manager or downloaded package
- **Windows**: `.exe` installer

Open [http://localhost:8091](http://localhost:8091) and complete the setup wizard:

1. Click "Setup New Cluster"
2. Set a cluster name (e.g., `local`)
3. Create an admin username and password (e.g., `admin` / `password`)
4. Accept terms and configure memory quotas (defaults are fine)

Verify:

```bash
curl -u admin:password http://127.0.0.1:8091/pools/default
```

#### Install cbsh

```bash
# macOS/Linux
curl -sSL https://sh.couchbase.com/install | sh

# Or download from GitHub releases:
# https://github.com/couchbaselabs/couchbase-shell/releases
```

#### Configure cbsh for local cluster

Edit `~/.cbsh/config`:

```toml
version = 1

[[cluster]]
identifier = "local"
connstr = "couchbase://127.0.0.1"
user-display-name = "couchbase"
username = "admin"
password = "password"
default-bucket = "shared"
default-scope = "public"
default-collection = "documentation"
tls-enabled = false

[[llm]]
identifier = "OpenAI-small"
provider = "OpenAI"
embed_model = "text-embedding-3-small"
chat_model = "gpt-3.5-turbo"
api_key = "sk-your-openai-api-key-here"
```

Verify the connection:

```bash
cbsh
```

```
cb-env cluster local
cb-env
```

#### Create bucket and collections

**Via Web UI:**

1. Navigate to [http://localhost:8091](http://localhost:8091)
2. Go to **Buckets → Add Bucket**, create `shared` with at least 100MB RAM
3. Create scope `public` and collection `documentation` inside it

**Via cbsh:**

```
cb-env cluster local

buckets create shared 100 --replicas 0
scopes create --bucket shared public
collections create --bucket shared --scope public documentation
vector create-index --bucket shared --scope public --collection documentation --similarity-metric dot_product documentation vector 1536
```

Verify:

```
buckets
scopes --bucket shared
collections --bucket shared --scope public
query indexes | where type == 'fts'
```

---

### Option B: Couchbase Capella

#### Create account and cluster

1. Sign up at [cloud.couchbase.com/signup](https://cloud.couchbase.com/signup)
2. Click **Create Cluster**, choose a cloud provider, name, and region
3. Inside the cluster, create:
   - Bucket: `shared`
   - Scope: `public`
   - Collection: `documentation`

#### Create an API key

1. Go to **Organization Settings → API Keys → Generate Key**
2. Choose a name, check all Organization Roles, click **Generate Key**
3. Copy the access key and secret (shown only once)

#### Configure cbsh for Capella

Edit `~/.cbsh/config`:

```toml
version = 1

[[capella-organization]]
identifier = "yourOrgIdentifier"
access-key = "yourAccessKey"
secret-key = "yourSecretKey"
default-project = "Trial - Project"

[[llm]]
identifier = "OpenAI-small"
provider = "OpenAI"
embed_model = "text-embedding-3-small"
chat_model = "gpt-3.5-turbo"
api_key = "sk-your-openai-api-key-here"
```

Register your cluster in cbsh:

```
clusters | clusters get $in.0.name | cb-env register $in.name $in."connection string" --capella-organization "yourOrgIdentifier" --project "Trial - Project" --save --default-bucket shared --default-scope public --username cbsh --password yourPassword
```

Set the default cluster:

```
cb-env cluster <your-cluster-identifier>
```

Create database credentials:

```
credentials create --read --write --username cbsh --password yourPassword
```

---

### Import data

```bash
cbsh
```

```
# Set your cluster
cb-env cluster local          # or your Capella identifier

# Load scripts
use scripts/couchbase.nu *
use scripts/importers.nu *

# Import MDN glossary docs
import_markdown_in_folder scripts/content/files/en-us/glossary1/ "glossary" "a glossary of IT terms"
```

The import reads all markdown files, chunks them, generates OpenAI embeddings, and upserts into Couchbase. It may take several minutes depending on file count and API rate limits.

---

### Query the data

```
let query = "What is an array?"
let vectorized_query = $query | vector enrich-text
let context = vector search documentation vector $vectorized_query.content.vector.0 | get id | subdoc get content | select content
$context | ask $vectorized_query.content.text.0
```

Try other queries:

```
let query = "How does authentication work?"
let vectorized_query = $query | vector enrich-text
let context = vector search documentation vector $vectorized_query.content.vector.0 | get id | subdoc get content | select content
$context | ask $vectorized_query.content.text.0
```

**What each step does:**

1. `vector enrich-text` — converts the query string to a vector embedding
2. `vector search documentation` — KNN search against the vector index
3. `subdoc get content` — fetches the actual document content by ID
4. `ask` — calls OpenAI to generate a natural language answer from the context

---

### Troubleshooting

**Connection errors (`Failed to load cluster config`):**
- Verify the cluster is running (local: [http://localhost:8091](http://localhost:8091))
- Run `cb-env` to check current settings
- Switch clusters with `cb-env cluster <identifier>`

**OpenAI API errors:**
- Verify `api_key` in `~/.cbsh/config`
- Check rate limits and account credits

**Import takes too long:**
- OpenAI rate limits apply; the function processes in batches
- Try importing a smaller folder first for testing

---

### Solution — vector search in `server.js`

Replace the placeholder in `getStoredEmbeddings`:

```js
async function getStoredEmbeddings(queryEmbedding) {
  const cluster = await init();
  const scope = cluster.bucket(process.env.COUCHBASE_BUCKET).scope('_default');
  const searchIndex = 'vector-search-index';

  let request = couchbase.SearchRequest.create(
    couchbase.VectorSearch.fromVectorQuery(
      couchbase.VectorQuery.create('_default.embedding', queryEmbedding).numCandidates(5)
    )
  );

  const result = await scope.search(searchIndex, request);

  return result.rows.map(row => ({ id: row.id, score: row.score }));
}
```

---

## Exercise 3 — RAG Application

**Branch:** `exercise-3`

Wire the vector search from Exercise 2 into a full RAG pipeline: embed the query → retrieve relevant docs → augment the prompt → stream the OpenAI response to the frontend.

### Prerequisites

- Completed Exercise 2 (data imported, vector index created)
- OpenAI API key

### Environment variables (`backend/.env`)

```env
COUCHBASE_CONNECTION_STRING=your-connection-string
COUCHBASE_USERNAME=your-username
COUCHBASE_PASSWORD=your-password
COUCHBASE_SEARCH_INDEX_NAME=your-index-name
COUCHBASE_BUCKET_NAME=your-bucket-name
OPENAI_API_KEY=your-api-key
```

### Setup and run

```bash
# Backend
cd backend && npm install && node server.js

# Frontend
cd frontend && npm install && npm run dev
```

### How it works

1. Frontend sends `POST /api/query` with `{ "q": "user question" }`
2. Backend embeds the query with OpenAI (`text-embedding-3-small`)
3. Backend runs a vector search against Couchbase to find the top-k relevant documents
4. Backend builds a prompt from the retrieved documents and the original query
5. Backend streams the OpenAI completion back to the frontend as `text/plain`

---

## Exercise 4 — RAG with Conversation History

**Branch:** `excercise-4`

Extends Exercise 3 by persisting conversation history in Couchbase so the model can answer follow-up questions with context.

### Prerequisites

- Completed Exercise 3

### Additional environment variables

```env
COUCHBASE_CONVERSATION_SCOPE=_default
COUCHBASE_CONVERSATION_COLLECTION=conversations
```

### Quick Start (5 minutes)

#### 1. Create the collection (30 seconds)

In Couchbase Capella Query Workbench:

```sql
CREATE COLLECTION `your-bucket-name`.`_default`.`conversations`;

CREATE INDEX idx_conversation_session
ON `your-bucket-name`.`_default`.`conversations`(sessionId, timestamp)
WHERE type = 'chat_message';
```

#### 2. Update `.env` (30 seconds)

```env
COUCHBASE_CONVERSATION_SCOPE=_default
COUCHBASE_CONVERSATION_COLLECTION=conversations
```

#### 3. Install and start (2 minutes)

```bash
# Backend
cd project/backend
npm install
node server.js

# Frontend (new terminal)
cd project/frontend
npm install
npm run dev
```

#### 4. Test it

1. Ask: *"What is JavaScript Array.map()?"*
2. Ask: *"What was my previous question?"*
3. The AI responds using conversation history.

**Before vs. after:**

| Before | After |
|---|---|
| Each query was independent | Queries have context from history |
| "What did I just ask?" cannot be answered | "What did I just ask?" is answered correctly |
| No memory between questions | Remembers the entire conversation |

---

### How conversation history works

1. Every user message and AI response is stored in a Couchbase collection
2. Before answering, the system retrieves recent conversation history
3. The history is prepended to the prompt as context
4. Sessions are tracked using unique IDs stored in browser `sessionStorage`

**New API endpoints:**

- `POST /api/query` — now accepts `sessionId` parameter
- `GET /api/conversation/history?sessionId=xxx` — retrieve history
- `DELETE /api/conversation/clear` — clear conversation (body: `{ sessionId }`)

**Tip:** Run `sessionStorage.clear()` in DevTools Console to start a fresh conversation without restarting the server.

---

### Solutions

#### 1. Storing messages (`conversationService.js`)

```js
export async function addMessage(sessionId, message, role) {
  const cluster = await initCouchbase();
  const bucket = cluster.bucket(COUCHBASE_BUCKET_NAME);
  const scope = COUCHBASE_CONVERSATION_SCOPE || '_default';
  const collectionName = COUCHBASE_CONVERSATION_COLLECTION || 'conversations';
  const collection = bucket.scope(scope).collection(collectionName);

  const messageDoc = {
    sessionId,
    role, // 'user' or 'assistant'
    content: message,
    timestamp: new Date().toISOString(),
    type: 'chat_message',
  };
  const messageId = `${sessionId}_${Date.now()}_${role}`;
  await collection.insert(messageId, messageDoc);
}
```

#### 2. Retrieving history (`conversationService.js`)

```js
export async function getConversationHistory(sessionId, limit = 10) {
  const cluster = await initCouchbase();
  const bucket = cluster.bucket(COUCHBASE_BUCKET_NAME);
  const scope = COUCHBASE_CONVERSATION_SCOPE || '_default';
  const query = `
    SELECT content, \`role\`, timestamp
    FROM \`${COUCHBASE_BUCKET_NAME}\`.\`${scope}\`.\`${COUCHBASE_CONVERSATION_COLLECTION || 'conversations'}\`
    WHERE sessionId = $sessionId AND type = 'chat_message'
    ORDER BY timestamp DESC
    LIMIT $limit
  `;
  const result = await cluster.query(query, { parameters: { sessionId, limit } });
  const messages = result.rows.map(row => ({
    role: row.role,
    content: row.content,
    timestamp: row.timestamp,
  }));
  messages.reverse(); // chronological order
  return messages;
}
```

#### 3. Formatting history for the prompt (`conversationService.js`)

```js
export function formatConversationHistory(messages) {
  if (!messages || messages.length === 0) {
    return 'No previous conversation history.';
  }
  return messages
    .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
    .join('\n');
}
```

#### 4. Clearing history (`conversationService.js`)

```js
export async function clearConversationHistory(sessionId) {
  const cluster = await initCouchbase();
  const bucket = cluster.bucket(COUCHBASE_BUCKET_NAME);
  const scope = COUCHBASE_CONVERSATION_SCOPE || '_default';
  const query = `
    DELETE FROM \`${COUCHBASE_BUCKET_NAME}\`.\`${scope}\`.\`${COUCHBASE_CONVERSATION_COLLECTION || 'conversations'}\`
    WHERE sessionId = $sessionId AND type = 'chat_message'
  `;
  await cluster.query(query, { parameters: { sessionId } });
}
```

#### 5. Conversation API endpoints (`routes/conversation.js`)

```js
// GET /api/conversation/history?sessionId=xxx
router.get('/history', async (req, res) => {
  const { sessionId, limit } = req.query;
  if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });
  try {
    const messages = await getConversationHistory(sessionId, parseInt(limit) || 10);
    res.json({ sessionId, messages, count: messages.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve conversation history' });
  }
});

// DELETE /api/conversation/clear
router.delete('/clear', async (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });
  try {
    await clearConversationHistory(sessionId);
    res.json({ success: true, message: `Conversation history cleared for session ${sessionId}` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear conversation history' });
  }
});
```

#### 6. Enriching the query prompt with history (`routes/query.js`)

```js
router.post('/', async (req, res) => {
  const { q, sessionId } = req.body;
  if (!q || q.trim() === '') return res.status(400).json({ error: 'Query is required.' });

  const session = sessionId || 'default-session';
  try {
    await addMessage(session, q, 'user');
    const conversationHistory = await getConversationHistory(session, 10);
    const formattedHistory = formatConversationHistory(conversationHistory);

    const embedding = await getEmbedding(q);
    const documents = await getRelevantDocuments(embedding);

    const documentList = documents.map((doc, index) =>
      `Document ${index + 1}:\nID: ${doc.id}\nFilepath: ${doc.filepath}\nScore: ${doc.score}\nContent: ${JSON.stringify(doc.content)}`
    ).join('\n\n');

    const prompt = `You are a Web MDN Documentation expert with access to the conversation history.
Given the user query, conversation history, and the following relevant documents, provide a helpful and accurate answer.

CONVERSATION HISTORY:
${formattedHistory}

RELEVANT DOCUMENTS:
${documentList}

CURRENT USER QUERY: ${q}

Please provide a helpful response based on the documentation pages and conversation context.
If the user asks about previous questions or the conversation history, use the conversation history above.
Include references to the document IDs and filepaths when relevant.`;

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');

    const stream = await getCompletionStream(prompt);
    let fullResponse = '';
    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content;
      if (token) {
        fullResponse += token;
        res.write(token);
      }
    }

    await addMessage(session, fullResponse, 'assistant');
    res.end();
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ error: 'An error occurred while processing your request.' });
    } else {
      res.end();
    }
  }
});
```

---

## Exercise 5 — Semantic Caching

**Branch:** `excercise-5`

Adds a semantic cache layer in front of the RAG pipeline. Semantically similar queries are served from cache without calling OpenAI, reducing latency and cost.

### Architecture

```
User Query → Semantic Cache Check → Cache Hit → Return Cached Response
                    |
               Cache Miss → RAG Pipeline → LLM Response → Store in Cache → Return Response
```

### Environment variables

```env
# Existing variables remain unchanged
COUCHBASE_CONNECTION_STRING=your-connection-string
COUCHBASE_USERNAME=your-username
COUCHBASE_PASSWORD=your-password
COUCHBASE_BUCKET_NAME=your-bucket-name
COUCHBASE_SEARCH_INDEX_NAME=your-index-name

# Cache configuration (optional — defaults shown)
CACHE_BUCKET=semantic_cache
CACHE_SCOPE=_default
CACHE_COLLECTION=semantic
```

### Setup

```bash
cd backend
npm run setup-cache   # creates the cache bucket and collection
```

Manual steps if the script fails:

1. Create a `semantic_cache` bucket in Capella dashboard
2. Create a `semantic` collection inside it
3. Create a vector search index in **Search & Indexing**:
   - **Index Name**: `cache._default.semantic_cache_idx`
   - **Source**: `cache._default.semantic`
   - Use the JSON definition provided by the setup script

### Test the cache

```bash
npm run test-cache
```

Send the same or a semantically similar query twice and observe the console:

```
🎯 Cache HIT  — returning cached response
❌ Cache MISS — calling miss handler
📊 Cache FRESH: uuid-1234-5678
```

### Run the full application

```bash
cd backend && npm start
cd frontend && npm run dev
```

---

### Key components

**`services/semanticCacheService.js`**

| Function | Description |
|---|---|
| `cachePut(prompt, llmString, response, ttlMinutes)` | Store a cache entry with its embedding |
| `cacheGet(prompt, llmString, similarityThreshold, k)` | Retrieve a cached response via vector similarity |
| `semanticCache(prompt, llmString, missHandler, options)` | High-level cache-or-generate API |
| `createLLMSignature(model, temperature, maxTokens, systemPrompt)` | Build a consistent cache key for a model config |

**Cache options:**

```js
const options = {
  similarityThreshold: 0.85,  // minimum similarity score (0-1)
  k: 3,                       // number of candidates to retrieve
  ttlMinutes: 1440            // TTL in minutes (24 hours default)
}
```

---

### How it works

**Cache storage (on miss):**

1. Full RAG pipeline runs and generates a response
2. Query embedding is created via OpenAI
3. Document stored in cache with: prompt, LLM signature, response, embedding, TTL

**Cache retrieval (on hit):**

1. Query embedding is created
2. Vector similarity search runs against the cache collection
3. Results filtered by LLM signature
4. Best match returned if similarity is above threshold

**LLM signature** ensures responses are only reused for the same model configuration (model name, temperature, max tokens, system prompt).

---

### Similarity threshold guide

| Threshold | Behaviour |
|---|---|
| 0.9+ | Very strict — near-identical semantic meaning only |
| 0.8–0.9 | Recommended balance |
| 0.7–0.8 | More lenient matching |
| < 0.7 | May return loosely related results |

### TTL guide

| TTL | Use case |
|---|---|
| 1–6 hours | Frequently changing content |
| 12–24 hours | Stable content (default) |
| 7+ days | Static documentation |

### Clearing the cache

```js
import { clearCache } from './services/semanticCacheService.js'

// Clear all entries
await clearCache()

// Clear entries for a specific LLM signature
await clearCache('gpt-4:temp=0.7:max=1000:system=...')
```

### Troubleshooting

| Issue | Fix |
|---|---|
| Index not found | Ensure the search index is created with the correct name |
| Bucket not found | Run `npm run setup-cache` |
| Low cache hit rate | Lower the similarity threshold or check LLM signature consistency |
| Memory growth | Reduce TTL or implement periodic cache cleanup |

Enable debug logging:

```js
process.env.DEBUG_CACHE = 'true'
```
