import React from 'react'
import BotOverview from './components/BotOverview'
import BotDemo from './components/BotDemo'
import BotDeploy from './components/BotDeploy'

export const SHOPIFY_BOT = {
  name: 'Shopify',
  logo: '🛍️',
  color: '#96BF48',
  heroBg: '#f6fff0',
  heroBorder: '#d4edbc',
  title: 'Building a Shopify Storefront Bot',
  subtitle: 'Answer product questions, check inventory, and guide purchases — powered by Storefront API + RAG',
  deployDesc: 'Connect the Storefront API, index your product catalog, and deploy a shopping assistant that knows your store.',
  inputPrefix: null,
  inputPlaceholder: 'Do you have running shoes under $100?',
  archSteps: [
    { icon: '👤', label: 'Shopper', desc: 'Asks a product question in the chat widget or bot' },
    { icon: '🔍', label: 'RAG Retrieval', desc: 'Embeds the query, searches Couchbase for matching products' },
    { icon: '🛒', label: 'Storefront API', desc: 'Fetches live price, inventory, and variant data via GraphQL' },
    { icon: '🧠', label: 'LLM', desc: 'Generates a natural-language answer grounded in real product data' },
    { icon: '💬', label: 'Response', desc: 'Returns answer with product cards, prices, and add-to-cart links' },
  ],
  concepts: [
    { icon: '🔑', title: 'Storefront API', desc: 'Public GraphQL API — use a Storefront Access Token (not Admin API). Safe to call from the browser or a public bot. Read-only for products, collections, and cart.' },
    { icon: '📦', title: 'Product Catalog Ingestion', desc: 'Fetch all products via the Admin API (or bulk export), chunk descriptions, embed with OpenAI, and store vectors in Couchbase for semantic search.' },
    { icon: '🔍', title: 'Hybrid Search', desc: 'Combine Couchbase vector search (semantic similarity) with metadata filters (price range, product type, tags) to narrow results before sending to the LLM.' },
    { icon: '🛒', title: 'Live Inventory Lookup', desc: 'After RAG retrieves candidate products, fetch live availability and pricing from the Storefront API so the LLM never hallucinates stock status.' },
    { icon: '🔗', title: 'Add-to-Cart Links', desc: 'Generate Shopify checkout URLs with variant IDs pre-filled. The bot can return a direct link: /cart/{variant_id}:{quantity}.' },
    { icon: '🔄', title: 'Catalog Sync', desc: 'Use Shopify webhooks (products/create, products/update) to keep the Couchbase vector index fresh when products change.' },
  ],
  builds: [
    '<strong>Product search</strong> — semantic search over your catalog with price/tag metadata filters, returning ranked product cards',
    '<strong>Live inventory check</strong> — Storefront API GraphQL query to get real-time stock and variant availability',
    '<strong>Add-to-cart link generator</strong> — bot appends a direct Shopify checkout URL to each product recommendation',
  ],
  demoLeft: (
    <div>
      <h2 style={{ color: '#96BF48' }}>Product Search Handler</h2>
      <p>Combine Couchbase vector search with a live Storefront API lookup to answer product questions with accurate, up-to-date data.</p>
      <div className="bot-demo-flow">
        {[
          ['Embed', 'Embed the shopper\'s question with OpenAI text-embedding-3-small'],
          ['Search', 'Couchbase vector search with optional price/tag metadata filters'],
          ['Enrich', 'Fetch live price + inventory for top-k products via Storefront API'],
          ['Answer', 'LLM generates a grounded answer with product cards and checkout links'],
        ].map(([n, d], i) => (
          <div key={i} className="bot-demo-flow-step">
            <span className="bot-demo-flow-num" style={{ background: '#96BF48' }}>{i + 1}</span>
            <div><strong>{n}</strong> — {d}</div>
          </div>
        ))}
      </div>
      <pre className="bot-demo-code">{`@app.post("/api/shopify-chat")
async def shopify_chat(req: ShopifyChatRequest):
    # 1. Embed the question
    embedding = await get_embedding(req.question)

    # 2. Vector search with optional filters
    filters = build_filters(req.max_price, req.tags)
    products = await couchbase_vector_search(
        embedding, filters, top_k=5)

    # 3. Enrich with live Storefront API data
    enriched = await fetch_storefront_data(
        [p["handle"] for p in products])

    # 4. Generate grounded answer
    answer = await llm_answer(
        req.question, enriched, req.session_id)

    return {
        "answer": answer,
        "products": enriched,
        "sources": [p["handle"] for p in products],
    }`}</pre>
    </div>
  ),
  demoLeft2: {
    'shopify-catalog': (
      <div>
        <h2 style={{ color: '#96BF48' }}>Catalog Ingestion</h2>
        <p>Fetch all products from the Shopify Admin API, build a rich text representation, embed with OpenAI, and upsert into Couchbase. Register webhooks to re-index on product changes.</p>
        <div className="bot-demo-flow">
          {[
            ['Fetch', 'GET /admin/api/2024-01/products.json — paginate with page_info cursor'],
            ['Build', 'Combine title + description + tags + product_type into one text blob'],
            ['Embed', 'Batch embed up to 100 products per OpenAI API call'],
            ['Upsert', 'Store in Couchbase with price, tags, variants as metadata fields'],
          ].map(([n, d], i) => (
            <div key={i} className="bot-demo-flow-step">
              <span className="bot-demo-flow-num" style={{ background: '#96BF48' }}>{i + 1}</span>
              <div><strong>{n}</strong> — {d}</div>
            </div>
          ))}
        </div>
        <pre className="bot-demo-code">{`async def ingest_shopify_catalog():
    url = f"https://{STORE}/admin/api/2024-01/products.json"
    params = {"limit": 250}

    while url:
        r = await http.get(url, params=params,
            headers={"X-Shopify-Access-Token": ADMIN_TOKEN})
        data = r.json()

        # Batch embed all products on this page
        texts = [build_product_text(p) for p in data["products"]]
        embeddings = await openai_embed_batch(texts)

        for product, embedding in zip(data["products"], embeddings):
            doc = {
                "id":          product["id"],
                "handle":      product["handle"],
                "title":       product["title"],
                "description": product["body_html"],
                "price":       float(product["variants"][0]["price"]),
                "tags":        product["tags"].split(", "),
                "embedding":   embedding,
            }
            await cb.upsert(f"product::{product['handle']}", doc)

        # Follow pagination cursor
        link = r.headers.get("Link", "")
        url = parse_next_link(link)  # None if last page
        params = {}`}</pre>
      </div>
    ),
  },
  examples: {
    default: [
      'Do you have running shoes under $100?',
      'What waterproof jackets do you carry?',
      'Show me your best-selling products',
    ],
    'shopify-catalog': [
      'How does catalog ingestion work?',
      'How do I keep the index fresh?',
      'What metadata should I store per product?',
    ],
  },
}

const DEPLOY_STEPS = [
  {
    icon: '🏪', title: 'Create Storefront Access Token',
    content: (
      <div>
        <p>In your Shopify admin: <strong>Settings → Apps and sales channels → Develop apps → Create an app</strong>. Under <strong>API credentials</strong>, enable the Storefront API and copy the <strong>Storefront access token</strong>.</p>
        <p>The Storefront API is public and read-only — safe to use from a bot or browser. For catalog ingestion you'll also need an <strong>Admin API access token</strong> with <code>read_products</code> scope.</p>
        <pre className="bot-deploy-code">{`# Test your Storefront API token
curl -X POST \\
  "https://your-store.myshopify.com/api/2024-01/graphql.json" \\
  -H "X-Shopify-Storefront-Access-Token: {TOKEN}" \\
  -H "Content-Type: application/json" \\
  -d '{"query": "{ shop { name } }"}'`}</pre>
      </div>
    ),
  },
  {
    icon: '📦', title: 'Ingest product catalog',
    content: (
      <div>
        <p>Fetch all products via the Admin API and index them into Couchbase:</p>
        <pre className="bot-deploy-code">{`# Fetch products (Admin API)
GET /admin/api/2024-01/products.json?limit=250

# For each product, build a document:
{
  "id": "gid://shopify/Product/123",
  "handle": "running-shoes-v2",
  "title": "Running Shoes V2",
  "description": "Lightweight trail running...",
  "price": 89.99,
  "tags": ["running", "trail", "shoes"],
  "embedding": [0.023, -0.041, ...]  # text-embedding-3-small
}

# Upsert into Couchbase with vector index`}</pre>
        <p>Re-run ingestion on <code>products/update</code> webhook events to keep the index fresh.</p>
      </div>
    ),
  },
  {
    icon: '🔑', title: 'Environment variables',
    content: (
      <div>
        <pre className="bot-deploy-code">{`SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_STOREFRONT_TOKEN=shpat_xxxxxxx
SHOPIFY_ADMIN_TOKEN=shpat_xxxxxxx   # ingestion only
SHOPIFY_WEBHOOK_SECRET=whsec_xxxxxxx
COUCHBASE_CONNECTION_STRING=couchbases://...
OPENAI_API_KEY=sk-...`}</pre>
      </div>
    ),
  },
  {
    icon: '🚀', title: 'Deploy & register webhooks',
    content: (
      <div>
        <p>Deploy to Render, then register Shopify webhooks to keep the catalog in sync:</p>
        <pre className="bot-deploy-code">{`# Register product update webhook
curl -X POST \\
  "https://your-store.myshopify.com/admin/api/2024-01/webhooks.json" \\
  -H "X-Shopify-Access-Token: {ADMIN_TOKEN}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "webhook": {
      "topic": "products/update",
      "address": "https://your-app.onrender.com/webhooks/shopify",
      "format": "json"
    }
  }'`}</pre>
        <p className="bot-deploy-note">⚠️ Verify Shopify webhook signatures with HMAC-SHA256 using your webhook secret. Shopify sends the signature in the <code>X-Shopify-Hmac-Sha256</code> header.</p>
      </div>
    ),
  },
]

function renderShopifyMessage(result, bot) {
  return (
    <div style={{ background: '#fff', border: '1px solid #d4edbc', borderRadius: 10, overflow: 'hidden', margin: '0.25rem 0' }}>
      <div style={{ background: '#96BF48', padding: '0.3rem 0.75rem', fontSize: '0.68rem', color: '#fff', fontWeight: 600 }}>
        🛍️ Store Assistant
      </div>
      <div style={{ padding: '0.65rem 0.75rem' }}>
        <div style={{ fontSize: '0.82rem', color: '#111827', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: '0.5rem' }}>
          {result.answer}
        </div>
        {result.products?.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.4rem' }}>
            {result.products.slice(0, 2).map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f6fff0', border: '1px solid #d4edbc', borderRadius: 6, padding: '0.4rem 0.6rem' }}>
                <span style={{ fontSize: '1.1rem' }}>👟</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#1a1a1a' }}>{p.title || p.handle}</div>
                  {p.price && <div style={{ fontSize: '0.7rem', color: '#96BF48', fontWeight: 700 }}>${p.price}</div>}
                </div>
                <span style={{ fontSize: '0.68rem', background: '#96BF48', color: '#fff', borderRadius: 4, padding: '0.15rem 0.5rem', cursor: 'pointer' }}>
                  Add to cart →
                </span>
              </div>
            ))}
          </div>
        )}
        {result.sources?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
            {result.sources.map((s, i) => (
              <span key={i} style={{ fontSize: '0.68rem', background: '#f6fff0', color: '#5a8a1a', border: '1px solid #d4edbc', borderRadius: 4, padding: '0.1rem 0.4rem', fontFamily: 'monospace' }}>
                {typeof s === 'string' ? s : (s.filepath?.split('/').pop() || s.id)}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function AppShopifyOverview() { return <BotOverview bot={SHOPIFY_BOT} /> }
export function AppShopifyDemo({ tabId }) { return <BotDemo bot={SHOPIFY_BOT} endpoint="/api/slack-demo" mode="shopify" renderMessage={renderShopifyMessage} tabId={tabId} /> }
export function AppShopifyDeploy()   { return <BotDeploy bot={SHOPIFY_BOT} steps={DEPLOY_STEPS} /> }
