# ── Stage 1: build frontend ───────────────────────────────────────────────────
FROM node:20-slim AS frontend-build

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ── Stage 2: Python runtime ───────────────────────────────────────────────────
FROM python:3.12-slim

# System deps needed by the Couchbase SDK and sentence-transformers
RUN apt-get update && apt-get install -y --no-install-recommends \
    libssl-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Poetry
RUN curl -sSL https://install.python-poetry.org | python3 - \
    && ln -s /root/.local/bin/poetry /usr/local/bin/poetry

WORKDIR /app

# Install dependencies via Poetry (no virtualenv — we're in a container)
COPY backend/pyproject.toml backend/poetry.lock* ./
RUN poetry config virtualenvs.create false \
    && poetry install --only main --no-root --no-interaction --no-ansi

# Copy backend source
COPY backend/ ./

# Copy built frontend into a directory the backend will serve as static files
COPY --from=frontend-build /app/frontend/dist ./static

EXPOSE 10000

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}"]
