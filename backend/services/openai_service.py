import os
from openai import AsyncOpenAI, Timeout as _OAITimeout

_client_inference: AsyncOpenAI | None = None
_client_embeddings: AsyncOpenAI | None = None

EMBEDDING_MODEL = os.environ.get("EMBEDDING_MODEL", "text-embedding-3-small")
INFERENCE_MODEL = os.environ.get("INFERENCE_MODEL", "gpt-4o-mini")

_TIMEOUT = _OAITimeout(connect=10.0, read=60.0, write=10.0, pool=10.0)


def _get_inference_client() -> AsyncOpenAI:
    global _client_inference
    if _client_inference is None:
        base_url = os.environ.get("INFERENCE_MODEL_BASE_URL") or None
        _client_inference = AsyncOpenAI(
            api_key=os.environ["INFERENCE_MODEL_API_KEY"],
            base_url=base_url,
            timeout=_TIMEOUT,
        )
    return _client_inference


def _get_embeddings_client() -> AsyncOpenAI:
    global _client_embeddings
    if _client_embeddings is None:
        base_url = os.environ.get("EMBEDDING_MODEL_BASE_URL") or None
        _client_embeddings = AsyncOpenAI(
            api_key=os.environ["EMBEDDING_MODEL_API_KEY"],
            base_url=base_url,
            timeout=_TIMEOUT,
        )
    return _client_embeddings


async def generate_response(message: str, system_prompt: str | None = None) -> str:
    client = _get_inference_client()
    default_prompt = "You are a helpful AI assistant. Be concise and friendly."
    final_prompt = system_prompt or default_prompt

    completion = await client.chat.completions.create(
        model=INFERENCE_MODEL,
        messages=[
            {"role": "system", "content": final_prompt},
            {"role": "user", "content": message},
        ],
        max_tokens=1000,
        temperature=0.7,
    )
    return completion.choices[0].message.content.strip()


async def get_embedding(text: str) -> list[float]:
    client = _get_embeddings_client()
    response = await client.embeddings.create(model=EMBEDDING_MODEL, input=text)
    return response.data[0].embedding


async def stream_completion(prompt: str):
    """Stream completion tokens. Yields an error sentinel on mid-stream failure.

    If the stream raises (network drop, timeout, API error), yields a
    sentinel line so the client knows the response was truncated rather
    than silently receiving a partial answer.
    """
    client = _get_inference_client()
    try:
        stream = await client.chat.completions.create(
            model=INFERENCE_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": "Return plain text, no markdown. Be informal and conversational.",
                },
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
    except Exception as e:
        # HTTP 200 already sent — signal truncation via a sentinel token.
        yield f"\n[Stream interrupted: {type(e).__name__}]"
