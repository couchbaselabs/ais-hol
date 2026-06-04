# setup.nu — provision all Couchbase resources required by the AIS HOL backend
#
# Creates vector indexes for all collections.
#
# FTS vector index  — created via cbsh if the Search Service is running.
# GSI vector index  — created via SQL++ if the Index Service is running (Server 8.0+).
#                     Not available on Capella managed clusters.
#
# Both are attempted; whichever services are present will be set up.
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
    # cbsh built-in commands panic on error and cannot be caught with try/catch.
    # Pre-check FTS service availability and index existence before calling create.
    let fts_running = (nodes | where ($it.services | str contains "fts") | is-empty | not $in)
    if not $fts_running {
        print $"  ⚠ FTS vector index skipped: Search Service \(fts\) not running on this cluster"
        return
    }

    let fts_name = $"($bucket).($scope).($index_name)"
    let exists = (
        query indexes
        | where type == "fts" and name == $fts_name
        | is-empty
        | not $in
    )
    if $exists {
        print $"  · FTS vector index exists:  ($fts_name)"
    } else {
        vector create-index --bucket $bucket --scope $scope --collection $collection --similarity-metric dot_product $index_name $field $dims
        print $"  ✓ FTS vector index created: ($fts_name)"
    }
}

# Create a GSI vector index via SQL++ CREATE VECTOR INDEX (Server 8.0+, not on Capella).
# Pre-checks server version and Index Service availability before attempting DDL.
# cbsh panics on query errors so we gate on version rather than catching errors.
def ensure-gsi-vector-index [
    bucket: string,
    scope: string,
    collection: string,
    index_name: string,
    field: string,
    dims: int,
] {
    # Require Index Service
    let index_running = (nodes | where ($it.services | str contains "index") | is-empty | not $in)
    if not $index_running {
        print $"  ⚠ GSI vector index skipped: Index Service not running"
        return
    }

    # Require Server 8.0+ (VECTOR keyword not supported on earlier versions or Capella)
    let version = (nodes | get version | first | split row "-" | first)
    let major = ($version | split row "." | first | into int)
    if $major < 8 {
        print $"  ⚠ GSI vector index skipped: requires Server 8.0+ \(found ($version)\)"
        return
    }

    let full_name = $"($bucket).($scope).($index_name)_gsi"

    # Check existence via query indexes (works with standard user rights)
    let exists = (
        query indexes
        | where type == "gsi" and name == $full_name
        | is-empty
        | not $in
    )
    if $exists {
        print $"  · GSI vector index exists:  ($full_name)"
        return
    }

    let sql = $"CREATE VECTOR INDEX `($full_name)` ON `($bucket)`.`($scope)`.`($collection)` \(`($field)` VECTOR\) WITH {\"dimension\": ($dims), \"similarity\": \"L2\", \"description\": \"IVF,SQ8\"}"
    query $sql
    print $"  ✓ GSI vector index created: ($full_name)"
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
    ensure-vector-index     $c.shared_bucket "public" "documentation" $c.search_index "vector" $c.dims
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
    ensure-vector-index     $c.cache_bucket "_default" "semantic" $c.cache_index "vector" $c.dims
    ensure-gsi-vector-index $c.cache_bucket "_default" "semantic" $c.cache_index "vector" $c.dims

    print "\n=== Setup complete ===\n"
    print "Next step: ingest documentation content."
    print "  use scripts/importers.nu *"
    print $"  import_markdown_in_folder \"scripts/content/files/en-us/glossary1\" \"mdn-glossary\" \"MDN Web Docs glossary\"\n"
}
