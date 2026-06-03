# setup.nu — provision all Couchbase resources required by the AIS HOL backend
#
# Run inside couchbase-shell (cbsh):
#   use scripts/setup.nu *
#   setup
#
# Or run directly:
#   cbsh --script scripts/setup.nu
#
# Environment variables (all optional — defaults match .env.example):
#   CB_SHARED_BUCKET      default: shared
#   CB_CACHE_BUCKET       default: semantic_cache
#   CB_SEARCH_INDEX       default: documentation        (GSI vector index name)
#   CB_CACHE_INDEX        default: semantic_cache_vector_idx
#   CB_CONV_SCOPE         default: _default
#   CB_CONV_COLLECTION    default: conversations
#   VECTOR_DIMS           default: 1536                 (must match embedding model)

# ── helpers ──────────────────────────────────────────────────────────────────

def cfg [] {
    {
        shared_bucket:  ($env.CB_SHARED_BUCKET?   | default "aisholshared")
        cache_bucket:   ($env.CB_CACHE_BUCKET?    | default "aisholcache")
        search_index:   ($env.CB_SEARCH_INDEX?    | default "documentation")
        cache_index:    ($env.CB_CACHE_INDEX?     | default "semantic_cache_vector_idx")
        conv_scope:     ($env.CB_CONV_SCOPE?      | default "_default")
        conv_collection:($env.CB_CONV_COLLECTION? | default "conversations")
        dims:           ($env.VECTOR_DIMS?        | default "1536" | into int)
    }
}

def ensure-bucket [name: string] {
    if (buckets | where name == $name | is-empty) {
        buckets create --replicas 0 $name 256
        print $"  ✓ bucket created: ($name)"
    } else {
        print $"  · bucket exists:  ($name)"
    }
}

def ensure-scope [bucket: string, scope: string] {
    if $scope == "_default" {
        return  # _default always exists
    }
    if (scopes --bucket $bucket | where scope == $scope | is-empty) {
        scopes create --bucket $bucket $scope
        print $"  ✓ scope created:  ($bucket).($scope)"
    } else {
        print $"  · scope exists:   ($bucket).($scope)"
    }
}

def ensure-collection [bucket: string, scope: string, collection: string] {
    if (collections --bucket $bucket --scope $scope | where collection == $collection | is-empty) {
        collections create --bucket $bucket --scope $scope $collection
        print $"  ✓ collection created: ($bucket).($scope).($collection)"
        # brief pause so the collection is ready before we create indexes on it
        sleep 2sec
    } else {
        print $"  · collection exists:  ($bucket).($scope).($collection)"
    }
}

# Create a GSI vector index via SQL++ CREATE VECTOR INDEX.
# This is the index type the backend queries with ANN_DISTANCE() ... USE INDEX ... USING GSI.
# Create a GSI vector index via SQL++ CREATE VECTOR INDEX IF NOT EXISTS.
# This is the index type the backend queries with ANN_DISTANCE() ... USE INDEX ... USING GSI.
def ensure-gsi-vector-index [
    bucket: string,
    scope: string,
    collection: string,
    index_name: string,
    field: string,
    dims: int,
] {
    let full_name = $"($bucket).($scope).($index_name)"
    let sql = $"CREATE VECTOR INDEX IF NOT EXISTS `($full_name)` ON `($bucket)`.`($scope)`.`($collection)`\(`($field)` VECTOR) WITH {\"dimension\": ($dims), \"similarity\": \"L2\", \"description\": \"IVF,PQ8x8\"}"
    query $sql
    print $"  ✓ GSI vector index ready: ($full_name)"
}

# Create a GSI index for conversation history queries (ORDER BY timestamp).
def ensure-gsi-index [
    bucket: string,
    scope: string,
    collection: string,
    index_name: string,
    fields: string,   # e.g. "session_id, timestamp DESC"
] {
    let sql = $"CREATE INDEX IF NOT EXISTS `($index_name)` ON `($bucket)`.`($scope)`.`($collection)`\(($fields))"
    query $sql
    print $"  ✓ GSI index ready: ($index_name)"
}

# ── main ──────────────────────────────────────────────────────────────────────

export def setup [] {
    let c = cfg

    print "\n=== AIS HOL — Couchbase setup ===\n"

    # ── 1. Documentation (RAG, Rerank, Query Expansion, Agentic RAG, Ingestion) ──
    print "── 1. Documentation store (shared.public.documentation)"
    ensure-bucket $c.shared_bucket
    ensure-scope  $c.shared_bucket "public"
    ensure-collection $c.shared_bucket "public" "documentation"
    ensure-gsi-vector-index $c.shared_bucket "public" "documentation" $c.search_index "vector" $c.dims

    # ── 2. Conversation history (Chat History, RAG) ───────────────────────────
    print "\n── 2. Conversation history (shared._default.conversations)"
    ensure-scope      $c.shared_bucket $c.conv_scope
    ensure-collection $c.shared_bucket $c.conv_scope $c.conv_collection
    # Index for the session_id + timestamp query in conversation_service.py
    ensure-gsi-index $c.shared_bucket $c.conv_scope $c.conv_collection "idx_conversations_session_ts" "session_id, `timestamp` DESC"

    # ── 3. Semantic cache (Cached, Chat History, RAG) ─────────────────────────
    print "\n── 3. Semantic cache (semantic_cache._default.semantic)"
    ensure-bucket $c.cache_bucket
    ensure-scope  $c.cache_bucket "_default"
    ensure-collection $c.cache_bucket "_default" "semantic"
    ensure-gsi-vector-index $c.cache_bucket "_default" "semantic" $c.cache_index "vector" $c.dims

    print "\n=== Setup complete ===\n"
    print "Next step: ingest documentation content."
    print "  use scripts/importers.nu *"
    print $"  import_markdown_in_folder \"scripts/content/files/en-us/glossary1\" \"mdn-glossary\" \"MDN Web Docs glossary\"\n"
}
