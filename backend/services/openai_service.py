import os
from openai import AsyncOpenAI

_client_inference: AsyncOpenAI | None = None
_client_embeddings: AsyncOpenAI | None = None

EMBEDDING_MODEL = os.environ.get("EMBEDDING_MODEL", "text-embedding-3-small")
INFERENCE_MODEL = os.environ.get("INFERENCE_MODEL", "gpt-4o-mini")


def _get_inference_client() -> AsyncOpenAI:
    global _client_inference
    if _client_inference is None:
        # OPENAI_BASE_URL is optional. Set it to use an OpenAI-compatible
        # endpoint such as Capella AI Model Service instead of api.openai.com.
        base_url = os.environ.get("INFERENCE_MODEL_BASE_URL") or None
        _client_inference = AsyncOpenAI(
            api_key=os.environ["INFERENCE_MODEL_API_KEY"],
            base_url=base_url,
        )
    return _client_inference


def _get_embeddings_client() -> AsyncOpenAI:
    global _client_embeddings
    if _client_embeddings is None:
        # OPENAI_BASE_URL is optional. Set it to use an OpenAI-compatible
        # endpoint such as Capella AI Model Service instead of api.openai.com.
        base_url = os.environ.get("EMBEDDING_MODEL_BASE_URL") or None
        _client_embeddings = AsyncOpenAI(
            api_key=os.environ["EMBEDDING_MODEL_API_KEY"],
            base_url=base_url,
        )
    return _client_embeddings


# ---------------------------------------------------------------------------
# Exercise 1
# ---------------------------------------------------------------------------


async def generate_response(message: str, system_prompt: str | None = None) -> str:
    """Return a complete chat response as a string.

    TODO (Exercise 1):
      1. Get the OpenAI client with _get_inference_client()
      2. Call client.chat.completions.create() with:
           - model: INFERENCE_MODEL
           - messages: [{"role": "system", "content": system_prompt}, {"role": "user", "content": message}]
             Use system_prompt if provided, otherwise use a sensible default.
           - max_tokens: 1000, temperature: 0.7
      3. Return the response text: response.choices[0].message.content.strip()

    Docs: https://platform.openai.com/docs/api-reference/chat/create
    """
    # TODO: replace this placeholder with your implementation
    return "[AI response will appear here. Implement generate_response in openai_service.py]"


# ---------------------------------------------------------------------------
# Exercise 3
# ---------------------------------------------------------------------------


async def get_embedding(text: str) -> list[float]:
    """Return a vector embedding for the given text.

    TODO (Exercise 3):
      1. Get the OpenAI client with _get_embeddings_client()
      2. Call client.embeddings.create(model=EMBEDDING_MODEL, input=text)
      3. Return response.data[0].embedding

    Docs: https://platform.openai.com/docs/api-reference/embeddings/create
    """
    # TODO: replace this placeholder with your implementation
    raise NotImplementedError("Implement get_embedding in openai_service.py")


async def stream_completion(prompt: str):
    """Yield text tokens from a streaming chat completion.

    TODO (Exercise 3):
      1. Get the OpenAI client with _get_inference_client()
      2. Call client.chat.completions.create() with stream=True and:
           - model: INFERENCE_MODEL
           - messages: system message ("Return plain text, no markdown.") + user prompt
      3. async for chunk in stream: yield chunk.choices[0].delta.content (if not None)

    Docs: https://platform.openai.com/docs/api-reference/chat/create
    """
    # TODO: replace this placeholder with your implementation
    raise NotImplementedError("Implement stream_completion in openai_service.py")
    yield  # makes this a generator — keep this line until you implement the function
