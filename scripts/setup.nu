# setup.nu — provision all Couchbase resources required by the AIS HOL backend
#
# Creates indexes for BOTH vector search approaches:
#   FTS  — Search Service, available since 7.0, queried via scope.search()
#   GSI  — Index Service, requires 7.6.4+, queried via SQL++ ANN_DISTANCE()
#
# GSI vector index creation is attempted and silently skipped on clusters < 7.6.4.
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
#   CB_SEARCH_INDEX       default: documentation
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

# Create an FTS vector index using the cbsh `vector create-index` command.
# Couchbase 7.6.3 and earlier do not support CREATE VECTOR INDEX via SQL++;
# that syntax requires 7.6.4+. The cbsh command uses the FTS REST API instead.
# Errors from "already exists" are silently swallowed — safe to re-run.
def ensure-vector-index [
    bucket: string,
    scope: string,
    collection: string,
    index_name: string,
    field: string,
    dims: int,
] {
    try {
        vector create-index --bucket $bucket --scope $scope --collection $collection --similarity-metric dot_product $index_name $field $dims
        print $"  ✓ vector index created: ($bucket).($scope).($index_name)"
    } catch {|e|
        let msg = ($e.msg | str downcase)
        if ($msg | str contains "already exist") or ($msg | str contains "same name") {
            print $"  · FTS vector index exists:  ($bucket).($scope).($index_name)"
        } else {
            error make { msg: $e.msg }
        }
    }
}

# Create a GSI vector index via SQL++ CREATE VECTOR INDEX (requires 7.6.4+).
# Silently skips on older clusters where the syntax is unsupported.
def ensure-gsi-vector-index [
    bucket: string,
    scope: string,
    collection: string,
    index_name: string,
    field: string,
    dims: int,
] {
    let full_name = $"($bucket).($scope).($index_name)_gsi"
    let sql = $"CREATE VECTOR INDEX `($full_name)` ON `($bucket)`.`($scope)`.`($collection)` \(`($field)` VECTOR\) WITH {\"dimension\": ($dims), \"similarity\": \"L2\", \"description\": \"IVF,SQ8\"}"
    try {
        query $sql
        print $"  ✓ GSI vector index created: ($full_name)"
    } catch {|e|
        let msg = ($e.msg | str downcase)
        if ($msg | str contains "already exist") {
            print $"  · GSI vector index exists:  ($full_name)"
        } else if ($msg | str contains "syntax error") or ($msg | str contains "not supported") {
            print $"  ⚠ GSI vector index skipped: cluster < 7.6.4 \(FTS index is sufficient\)"
        } else {
            print $e
            error make { msg: $e.msg }
        }
    }
}

# Create a plain GSI index. Errors from "already exists" are silently swallowed.
def ensure-gsi-index [
    bucket: string,
    scope: string,
    collection: string,
    index_name: string,
    fields: string,   # e.g. "session_id, `timestamp` DESC"
] {
    let sql = $"CREATE INDEX `($index_name)` ON `($bucket)`.`($scope)`.`($collection)` \(($fields)\)"
    try {
        query $sql
        print $"  ✓ GSI index created: ($index_name)"
    } catch {|e|
        let msg = ($e.msg | str downcase)
        if ($msg | str contains "already exist") {
            print $"  · GSI index exists:  ($index_name)"
        } else {
            error make { msg: $e.msg }
        }
    }
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
    # FTS index — Search Service, works on 7.0+, queried via scope.search()
    print "     FTS vector index:"
    ensure-vector-index $c.shared_bucket "public" "documentation" $c.search_index "vector" $c.dims
    # GSI index — Index Service, requires 7.6.4+, queried via SQL++ ANN_DISTANCE()
    print "     GSI vector index:"
    ensure-gsi-vector-index $c.shared_bucket "public" "documentation" $c.search_index "vector" $c.dims

    # ── 2. Conversation history (Chat History, RAG) ───────────────────────────
    print "\n── 2. Conversation history (shared._default.conversations)"
    ensure-scope      $c.shared_bucket $c.conv_scope
    ensure-collection $c.shared_bucket $c.conv_scope $c.conv_collection
    # Plain GSI index for the session_id + timestamp query in conversation_service.py
    ensure-gsi-index $c.shared_bucket $c.conv_scope $c.conv_collection "idx_conversations_session_ts" "session_id, `timestamp` DESC"

    # ── 3. Semantic cache (Cached, Chat History, RAG) ─────────────────────────
    print "\n── 3. Semantic cache (semantic_cache._default.semantic)"
    ensure-bucket $c.cache_bucket
    ensure-scope  $c.cache_bucket "_default"
    ensure-collection $c.cache_bucket "_default" "semantic"
    # FTS index
    print "     FTS vector index:"
    ensure-vector-index $c.cache_bucket "_default" "semantic" $c.cache_index "vector" $c.dims
    # GSI index
    print "     GSI vector index:"
    ensure-gsi-vector-index $c.cache_bucket "_default" "semantic" $c.cache_index "vector" $c.dims

    print "\n=== Setup complete ===\n"
    print "FTS indexes  — ready on all clusters (7.0+)"
    print "GSI indexes  — ready on 7.6.4+ clusters (skipped with ⚠ on older versions)\n"
    print "Next step: ingest documentation content."
    print "  use scripts/importers.nu *"
    print $"  import_markdown_in_folder \"scripts/content/files/en-us/glossary1\" \"mdn-glossary\" \"MDN Web Docs glossary\"\n"
}
