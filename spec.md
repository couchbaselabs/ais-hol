# Spec — Exercise 6: Multi-Agent Routing with LangGraph and Couchbase Agent Catalog

---

> **Exercise 7 spec is appended at the bottom of this file.**

---

## Problem Statement

The workshop currently covers RAG, conversation history, and semantic caching, but does not introduce agentic patterns. This exercise adds a multi-agent system where a **router agent** classifies user messages and either answers directly or delegates to a **math agent** equipped with calculation tools. The Couchbase Agent Catalog manages tool discovery and versioning; LangGraph provides the graph execution model.

---

## Requirements

### Backend

1. Install `agentc[langgraph]`, `langgraph`, and `langchain-openai` as new dependencies in `backend/requirements.txt`.
2. Create a new directory `backend/agents/` to hold all agent-related files.
3. Define math tools in `backend/agents/math_tools.py` using the `@agentc.tool` decorator:
   - `add(a, b)` — addition
   - `subtract(a, b)` — subtraction
   - `multiply(a, b)` — multiplication
   - `divide(a, b)` — division (raises on zero divisor)
   - `evaluate_expression(expression: str)` — safe eval of a math expression string using Python's `math` module (no arbitrary code execution; whitelist-based)
4. Create a router agent in `backend/agents/router_agent.py`:
   - Uses an LLM with structured output (Pydantic model) to classify the user message.
   - Output schema: `{ "can_answer": bool, "reason": str }`.
   - If `can_answer` is `True`, the router generates a direct answer.
   - If `can_answer` is `False`, it emits a `Command(goto="math_agent")` handoff.
5. Create a math agent in `backend/agents/math_agent.py`:
   - Retrieves math tools from the Agent Catalog via `catalog.find()`.
   - Uses a LangGraph ReAct loop to call tools and return a final answer.
6. Wire both agents into a single LangGraph `StateGraph` in `backend/agents/graph.py`:
   - Nodes: `router`, `math_agent`.
   - Entry point: `router`.
   - Handoff: `router` emits `Command(goto="math_agent")` when it cannot answer.
   - Both nodes write their final answer to a shared `answer` state key.
7. Add a new FastAPI endpoint `POST /api/agent` in `backend/main.py`:
   - Accepts `{ "message": str }`.
   - Invokes the LangGraph graph and returns `{ "response": str, "routed_to": str, "timestamp": str }`.
   - `routed_to` is either `"router"` or `"math_agent"`.
8. Add Agent Catalog environment variables to `backend/.env.example`:
   - `AGENT_CATALOG_CONN_STRING`
   - `AGENT_CATALOG_USERNAME`
   - `AGENT_CATALOG_PASSWORD`
   - `AGENT_CATALOG_BUCKET`

### Frontend

9. Add a third tab **"Agent Chat"** to `frontend/src/components/Header.jsx`.
10. Create `frontend/src/AppAgent.jsx` — a chat component that:
    - Calls `POST /api/agent`.
    - Displays the response text.
    - Shows a small badge indicating which agent handled the message (`Router` or `Math Agent`).
11. Register the new tab in `frontend/src/Shell.jsx`.

### README

12. Add **Exercise 6 — Multi-Agent Routing** section to `README.md` following the existing format (numbered steps, code blocks, explanations). The section covers:
    - Concept overview (router + math agent, LangGraph supervisor pattern, Agent Catalog)
    - Step 1: Install new dependencies
    - Step 2: Set up Agent Catalog (env vars, `agentc init`, `agentc index`, `agentc publish`)
    - Step 3: Implement math tools (`math_tools.py`)
    - Step 4: Implement the router agent (`router_agent.py`)
    - Step 5: Implement the math agent (`math_agent.py`)
    - Step 6: Wire the LangGraph graph (`graph.py`)
    - Step 7: Add the `/api/agent` endpoint
    - Step 8: Add the frontend tab
    - Step 9: Run and test

---

## Acceptance Criteria

- Sending `"What is 2 + 2?"` to `/api/agent` returns a correct numeric answer and `"routed_to": "math_agent"`.
- Sending `"What is the capital of France?"` returns a direct answer and `"routed_to": "router"`.
- Sending `"sqrt(144) + 10"` via `evaluate_expression` returns `22.0`.
- `evaluate_expression` rejects inputs containing `import`, `exec`, `eval`, `__`, or any non-math token.
- The Agent Catalog `agentc index` command successfully indexes all tools in `backend/agents/`.
- The frontend **Agent Chat** tab renders responses and shows the routing badge.
- All existing exercises (1–5) are unaffected.

---

## Implementation Approach

1. **Add dependencies** — update `backend/requirements.txt` with `agentc[langgraph]`, `langgraph`, `langchain-openai`.
2. **Update `.env.example`** — add Agent Catalog env var block under a new `# Exercise 6` comment.
3. **Create `backend/agents/__init__.py`** — empty, marks the directory as a package.
4. **Implement `backend/agents/math_tools.py`** — five functions decorated with `@agentc.tool`, using Pydantic input models.
5. **Implement `backend/agents/router_agent.py`** — LLM call with `.with_structured_output(RouterDecision)`, returns answer string or raises handoff signal.
6. **Implement `backend/agents/math_agent.py`** — instantiates `agentc.Catalog`, calls `catalog.find()` for each math tool, builds a LangGraph ReAct agent node.
7. **Implement `backend/agents/graph.py`** — `StateGraph` with `router` and `math_agent` nodes, conditional edge from router based on `Command(goto=)`.
8. **Update `backend/main.py`** — add `AgentRequest` Pydantic model and `POST /api/agent` route.
9. **Update `frontend/src/components/Header.jsx`** — add `agent` tab button.
10. **Create `frontend/src/AppAgent.jsx`** — chat component with routing badge display.
11. **Update `frontend/src/Shell.jsx`** — import `AppAgent`, render on `activeTab === 'agent'`.
12. **Update `README.md`** — add Exercise 6 section with all steps and code snippets.

---

# Spec — Exercise 7: FAQ Search Agent with PDF Ingestion from S3

## Problem Statement

Exercise 6 introduces a router that delegates math questions to a math agent. Exercise 7 extends the same multi-agent graph with a second handoff target: a **FAQ search agent** that performs hybrid search (vector + FTS) over FAQ collections stored in Couchbase.

The core use case: multiple FAQ PDFs (e.g. HR policy, product manual, onboarding guide) are each ingested into their own Couchbase collection via a Capella AI Services S3 workflow. When a user asks a question, the **router**:

1. Queries Couchbase for a list of available FAQ collections and their metadata.
2. Embeds the user question and compares it against stored FAQ metadata embeddings to find the best-matching FAQ.
3. If a sufficiently similar FAQ exists → hands off to the FAQ search agent with the matched collection name.
4. If no FAQ is close enough → returns an informative message telling the user which topic is missing and that a new FAQ PDF needs to be ingested.

This teaches: dynamic data-aware routing, FAQ metadata management in Couchbase, vector similarity matching at the routing layer, hybrid search (vector + FTS), and PDF ingestion from S3 via Capella AI Services.

---

## Requirements

### Couchbase Data Model

Each ingested FAQ is represented by:
- A **metadata document** stored in a dedicated `faq_catalog` collection (scope: `public`, bucket: `shared`):
  ```json
  {
    "type": "faq_meta",
    "collection_name": "hr_policy",
    "display_name": "HR Policy FAQ",
    "description": "Answers to common HR questions about leave, benefits, and conduct.",
    "vector": [...]   // embedding of the description field
  }
  ```
- A **content collection** (e.g. `hr_policy`) in the same scope, populated by the Capella S3 ingestion workflow, where each document has `content` and `vector` fields.

### Backend

1. **New service `backend/services/faq_catalog_service.py`**:
   - `get_available_faqs() -> list[dict]`: fetches all `faq_meta` documents from the `faq_catalog` collection.
   - `find_best_faq(question_embedding: list[float]) -> dict | None`: runs a `VectorQuery` against the `faq_catalog` collection's vector index to find the closest FAQ metadata document. Returns `None` if the top score is below a configurable threshold (default `0.75`).
   - `register_faq(collection_name: str, display_name: str, description: str) -> None`: upserts a new `faq_meta` document and its embedding into `faq_catalog`. Called manually after ingestion.

2. **New agent file `backend/agents/faq_search_tools.py`**:
   - One tool: `hybrid_faq_search(query: str, collection_name: str) -> list[dict]`
   - Decorated with `@agentc.tool`.
   - Runs two Couchbase queries:
     - **Vector search**: embed `query`, run `VectorQuery` against the target collection's vector index.
     - **FTS search**: run a `MatchQuery` on the `content` field of the target collection's FTS index.
   - Merge and deduplicate results by document ID, rank by combined score, return top-5 results with `content` and `score`.

3. **New agent file `backend/agents/faq_search_agent.py`**:
   - Receives `message` and `faq_collection` from the router state.
   - Retrieves `hybrid_faq_search` from the Agent Catalog via `catalog.find(kind="tool", name="hybrid_faq_search")`.
   - Runs a LangGraph ReAct loop using the tool.
   - Synthesises a final answer from retrieved chunks and writes it to the shared `answer` state key.
   - Sets `routed_to = "faq_search_agent"` and `faq_collection` in state.

4. **Update `backend/agents/router_agent.py`** (from Exercise 6):
   - At the start of the router node, call `find_best_faq(question_embedding)` from `faq_catalog_service`.
   - Extend the structured output schema: add `faq_collection: str | None` and `missing_topic: str | None`.
   - Decision logic:
     - If a matching FAQ is found → set `faq_collection`, emit `Command(goto="faq_search_agent")`.
     - If no FAQ matches → set `missing_topic` with a short description of what's needed, return an informative message directly (no handoff).
     - Math questions → `Command(goto="math_agent")` as before.
   - The router node embeds the user question once and reuses the embedding for both FAQ matching and state.

5. **Update `backend/agents/graph.py`**:
   - Add `faq_search_agent` as a third node.
   - Router conditional branches: direct answer, `math_agent`, `faq_search_agent`.

6. **Update `backend/main.py`**:
   - `/api/agent` response adds `"faq_collection": str | None` and `"missing_topic": str | None` to the JSON payload.

7. **Update `backend/.env.example`** — add under `# Exercise 7`:
   - `FAQ_CATALOG_COLLECTION=faq_catalog`
   - `FAQ_SIMILARITY_THRESHOLD=0.75`

### Couchbase Setup (documented in README steps)

8. **S3 bucket**: participant uploads one or more FAQ PDFs to an S3 bucket, each representing a distinct topic. The collection name is chosen by the participant at ingestion time (e.g. `hr_policy`, `product_manual`).

9. **Capella AI Services PDF ingestion workflow** (full walkthrough):
   - Source: **Data from S3**.
   - Configure: S3 bucket URL, AWS credentials, target bucket (`shared`), scope (`public`), collection (user-defined name).
   - Embedding model: `text-embedding-3-small` (OpenAI).
   - The workflow chunks PDFs, generates embeddings, upserts documents with `content` and `vector` fields.
   - After the workflow completes, participant calls `register_faq()` (via a small CLI helper or directly in Python) to add the FAQ metadata to `faq_catalog`.

10. **FTS index creation via `cbsh`**:
    - Create a Full-Text Search index on the new FAQ collection covering the `content` field.
    - README provides the exact `cbsh` command, parameterised by collection name.

11. **Vector index on `faq_catalog`**:
    - Create a vector search index on the `faq_catalog` collection covering the `vector` field (1536 dimensions, dot product).
    - README provides the `cbsh` command.

### Frontend

12. **Update `frontend/src/AppAgent.jsx`** (from Exercise 6):
    - When `routed_to === "faq_search_agent"`: show badge `"FAQ Search · <faq_collection>"`.
    - When `missing_topic` is set: show a distinct warning badge `"No FAQ found · <missing_topic>"` alongside the informative message.

### README

13. **Add Exercise 7 — FAQ Search Agent** section to `README.md`, following the existing format. Steps:
    - **Concept overview**: multiple FAQ collections, metadata-driven routing, hybrid search, PDF ingestion from S3.
    - **Step 1**: Upload FAQ PDFs to S3.
    - **Step 2**: Configure and run the Capella AI Services S3 ingestion workflow (full walkthrough, one run per FAQ).
    - **Step 3**: Create the FTS index on the FAQ collection with `cbsh`.
    - **Step 4**: Create the vector index on `faq_catalog` with `cbsh`.
    - **Step 5**: Register the FAQ metadata (`register_faq()`).
    - **Step 6**: Implement `faq_catalog_service.py`.
    - **Step 7**: Implement `faq_search_tools.py` with the `hybrid_faq_search` tool.
    - **Step 8**: Implement `faq_search_agent.py`.
    - **Step 9**: Update `router_agent.py` with FAQ matching logic.
    - **Step 10**: Update `graph.py` to add the `faq_search_agent` node.
    - **Step 11**: Update the `/api/agent` response and frontend badge.
    - **Step 12**: Run and test with two different FAQs.

---

## Acceptance Criteria

- With `hr_policy` and `product_manual` collections ingested and registered:
  - Asking `"How many days of annual leave do I get?"` routes to `faq_search_agent` with `faq_collection = "hr_policy"` and returns a document-grounded answer.
  - Asking `"How do I reset my product license?"` routes to `faq_search_agent` with `faq_collection = "product_manual"`.
  - Asking `"What is the refund policy?"` (no matching FAQ) returns an informative message with `missing_topic` set and `routed_to = "router"`.
- Asking `"What is 15 * 7?"` still routes to `math_agent` (Exercise 6 unaffected).
- `find_best_faq()` returns `None` when the top vector score is below the configured threshold.
- `hybrid_faq_search` returns merged, deduplicated results from both vector and FTS queries.
- `agentc index backend/agents/` indexes `hybrid_faq_search` alongside math tools.
- The Capella S3 workflow completes and documents appear in the target collection with `content` and `vector` fields.
- Both `cbsh` index creation commands run without error.
- Frontend shows the correct badge for each routing outcome.
- All existing exercises (1–6) are unaffected.

---

## Implementation Approach

1. **Implement `backend/services/faq_catalog_service.py`** — `get_available_faqs`, `find_best_faq` (vector query on `faq_catalog`), `register_faq`.
2. **Implement `backend/agents/faq_search_tools.py`** — `hybrid_faq_search` tool with `@agentc.tool`, parallel vector + FTS queries, result merging.
3. **Implement `backend/agents/faq_search_agent.py`** — catalog lookup, ReAct loop, state write.
4. **Update `backend/agents/router_agent.py`** — embed question, call `find_best_faq`, extend `RouterDecision` schema, add `faq_search_agent` branch and no-FAQ informative response.
5. **Update `backend/agents/graph.py`** — add `faq_search_agent` node and third conditional branch.
6. **Update `backend/main.py`** — add `faq_collection` and `missing_topic` to `/api/agent` response.
7. **Update `backend/.env.example`** — add `FAQ_CATALOG_COLLECTION` and `FAQ_SIMILARITY_THRESHOLD` under `# Exercise 7`.
8. **Update `frontend/src/AppAgent.jsx`** — render FAQ search badge and no-FAQ warning badge.
9. **Update `README.md`** — add Exercise 7 section with all steps, code blocks, and Capella S3 workflow walkthrough.
