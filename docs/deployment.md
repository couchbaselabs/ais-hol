# Production Deployment Guide

This guide covers deploying the AI Services HOL on a Linux server with Nginx as a reverse proxy.

## Prerequisites

- Linux server (Ubuntu 22.04+ or equivalent)
- Python 3.11–3.13
- Node.js 18+
- Nginx
- A running Couchbase Capella cluster (or self-managed Couchbase 7.6+)
- An OpenAI-compatible API key (OpenAI, Azure OpenAI, or Capella AI Services)

---

## 1. Build the frontend

```bash
cd frontend
npm ci
npm run build          # outputs to frontend/dist/
```

Copy `frontend/dist/` to the server (or build directly on the server).

---

## 2. Server setup

### Install Python dependencies

```bash
python3 -m venv /opt/ais-hol/venv
/opt/ais-hol/venv/bin/pip install -r /opt/ais-hol/backend/requirements.txt
```

### Create the environment file

```bash
cp /opt/ais-hol/backend/.env.example /opt/ais-hol/backend/.env
```

Edit `/opt/ais-hol/backend/.env` and fill in all values. At minimum:

```
INFERENCE_MODEL_BASE_URL=https://api.openai.com/v1
INFERENCE_MODEL_API_KEY=sk-...
EMBEDDING_MODEL_BASE_URL=https://api.openai.com/v1
EMBEDDING_MODEL_API_KEY=sk-...
COUCHBASE_CONNECTION_STRING=couchbases://your-cluster.cloud.couchbase.com
COUCHBASE_USERNAME=your-username
COUCHBASE_PASSWORD=your-password
PORT=5000
```

---

## 3. Couchbase data setup

The `scripts/` directory contains [couchbase-shell](https://couchbase.sh) (cbsh) scripts that
handle all data setup. You need `cbsh` installed and connected to your cluster before running them.

### Install couchbase-shell

```bash
# Linux x86_64
curl -L https://github.com/couchbaselabs/couchbase-shell/releases/download/v1.1.0/cbsh-x86_64-unknown-linux-musl.tar.gz | tar xz
sudo mv cbsh /usr/local/bin/
```

### Connect cbsh to your cluster

```bash
cbsh --hostnames couchbases://your-cluster.cloud.couchbase.com \
     --username your-username \
     --password your-password
```

Or create `~/.cbsh/config` — see the [cbsh docs](https://couchbase.sh/docs/).

### Create buckets, scopes, collections, and vector indexes

`scripts/couchbase.nu` contains `init_data_structure` which creates everything idempotently:

```nushell
# Inside a cbsh session
use scripts/couchbase.nu *
init_data_structure
```

This creates:

| Bucket           | Scope      | Collection      | Purpose                        |
|------------------|------------|-----------------|--------------------------------|
| `shared`         | `public`   | `documentation` | RAG document chunks + vectors  |
| `shared`         | `_default` | `conversations` | Chat history                   |

### Set up the semantic cache

`scripts/couchbase_semantic_cache.nu` creates the cache bucket, collection, and its vector index:

```nushell
use scripts/couchbase_semantic_cache.nu *
init_semantic_cache
```

This creates:

| Bucket  | Scope      | Collection | Purpose                 |
|---------|------------|------------|-------------------------|
| `cache` | `_default` | `semantic` | Semantic response cache |

> **Note:** The default cache bucket name in the scripts is `cache`, but the backend `.env.example`
> uses `semantic_cache`. Set `CACHE_BUCKET=cache` in your `.env` to match, or adjust the script.

### Ingest documentation content

The MDN glossary content is in `scripts/content/files/`. Ingest and embed it with:

```nushell
use scripts/importers.nu *
import_markdown_in_folder "scripts/content/files/en-us/glossary1" "mdn-glossary" "MDN Web Docs glossary"
```

This chunks the markdown files, generates embeddings via the configured embedding model, and
upserts the vectors into the `documentation` collection.

> The embedding model endpoint must be reachable from the machine running cbsh. Set
> `EMBEDDING_MODEL_BASE_URL` and `EMBEDDING_MODEL_API_KEY` in your shell environment before
> running the importer.

---

## 4. Run the backend

### systemd service

Create `/etc/systemd/system/ais-hol-backend.service`:

```ini
[Unit]
Description=AIS HOL Backend
After=network.target

[Service]
User=www-data
WorkingDirectory=/opt/ais-hol/backend
EnvironmentFile=/opt/ais-hol/backend/.env
ExecStart=/opt/ais-hol/venv/bin/uvicorn main:app --host 127.0.0.1 --port 5000 --workers 2
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload
systemctl enable --now ais-hol-backend
systemctl status ais-hol-backend
```

Verify: `curl http://127.0.0.1:5000/health`

---

## 5. Nginx configuration

The frontend is served as static files. All `/api/*` requests are proxied to the backend.

> **Required:** The `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` headers are
> needed for the Voice (WASM) tab to work. They enable `SharedArrayBuffer` in the browser.

Create `/etc/nginx/sites-available/ais-hol`:

```nginx
server {
    listen 80;
    server_name your-domain.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.example.com;

    ssl_certificate     /etc/letsencrypt/live/your-domain.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.example.com/privkey.pem;

    # Required for WASM Voice tab (SharedArrayBuffer)
    add_header Cross-Origin-Opener-Policy  "same-origin" always;
    add_header Cross-Origin-Embedder-Policy "require-corp" always;

    # Frontend static files
    root /opt/ais-hol/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass         http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;

        # Required for streaming responses (AppChatStream)
        proxy_buffering    off;
        proxy_cache        off;
        proxy_read_timeout 120s;
    }

    location /health {
        proxy_pass http://127.0.0.1:5000/health;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/ais-hol /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

---

## 6. Agent Catalog setup (exercises 6–7 only)

If you need the multi-agent exercises, publish the agent catalog before starting the backend:

```bash
cd /opt/ais-hol
PYTHONPATH=backend/ agentc init
PYTHONPATH=backend/ agentc index ./backend/agents/prompts/
PYTHONPATH=backend/ agentc index ./backend/agents/
PYTHONPATH=backend/ agentc publish
```

The `AGENT_CATALOG_*` environment variables must be set in `.env` before this step.

> **Note:** `backend/agents/graph.py` instantiates the catalog at import time. If the
> `AGENT_CATALOG_*` vars are missing or the catalog has not been published, the backend
> will fail to start entirely — not just the agent endpoints.

---

## 7. Verify

```bash
# Backend health
curl https://your-domain.example.com/health

# Basic chat endpoint
curl -s -X POST https://your-domain.example.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "hello"}'

# Frontend loads
curl -s -o /dev/null -w "%{http_code}" https://your-domain.example.com/
```

---

---

## Fly.io (free tier)

A `fly.toml` and `Dockerfile` are included in the repo root. The Dockerfile builds the
frontend and bundles it into the Python image — a single container serves both.

### First deploy

```bash
# Install flyctl if needed
curl -L https://fly.io/install.sh | sh

# Create the app (skip deploy for now)
fly launch --no-deploy

# Set secrets — these are never stored in fly.toml
fly secrets set \
  INFERENCE_MODEL_API_KEY=sk-... \
  INFERENCE_MODEL_BASE_URL=https://api.openai.com/v1 \
  EMBEDDING_MODEL_API_KEY=sk-... \
  EMBEDDING_MODEL_BASE_URL=https://api.openai.com/v1 \
  COUCHBASE_CONNECTION_STRING=couchbases://your-cluster.cloud.couchbase.com \
  COUCHBASE_USERNAME=your-username \
  COUCHBASE_PASSWORD=your-password

# Deploy
fly deploy
```

### Subsequent deploys

```bash
fly deploy
```

### Notes

- The free tier gives one `shared-cpu-1x` machine. `fly.toml` requests 512 MB RAM — 256 MB
  is not enough for sentence-transformers and the Couchbase SDK to coexist at runtime.
- `auto_stop_machines = "stop"` means the machine sleeps when idle (free tier behaviour).
  Cold starts take ~5–10 seconds.
- The COOP/COEP headers required for the Voice (WASM) tab are set by the backend's
  static file handler — no extra Fly configuration needed.

---

## Environment variable reference

See `backend/.env.example` for the full list with comments. The variables are grouped by exercise — you only need the ones for the exercises you intend to run.
