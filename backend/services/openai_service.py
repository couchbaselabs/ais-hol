import os
from openai import AsyncOpenAI

_client: AsyncOpenAI | None = None

EMBEDDING_MODEL = os.environ.get("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")
COMPLETION_MODEL = os.environ.get("OPENAI_COMPLETION_MODEL", "gpt-4o-mini")


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        # OPENAI_BASE_URL is optional. Set it to use an OpenAI-compatible
        # endpoint such as Capella AI Model Service instead of api.openai.com.
        base_url = os.environ.get("OPENAI_BASE_URL") or None
        _client = AsyncOpenAI(
            api_key=os.environ["OPENAI_API_KEY"],
            base_url=base_url,
        )
    return _client


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


async def get_embedding(text: str) -> list[float]:
    client = _get_client()
    response = await client.embeddings.create(model=EMBEDDING_MODEL, input=text)
    return response.data[0].embedding


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
