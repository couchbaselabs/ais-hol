# Image Generation

**Module:** LLM Capabilities | **Level:** Intermediate
**Runtime:** ~6 min | **Tab:** `image-generation`

---

## Hook

> 🎬 **SHOW:** Image Generation tab open, prompt input visible, style selector (vivid/natural), size selector, empty image display area.

Text-to-image generation is now a first-class API call. DALL-E 3 accepts a text prompt and returns a URL to a generated image — the same pattern as a chat completion, just a different endpoint. This tab covers the API, prompt engineering for images, and the practical constraints you need to know before using image generation in production.

---

## Concept

> 🎬 **SHOW:** Slide — the `images.generate()` API call with its key parameters: `model`, `prompt`, `size`, `quality`, `style`, `n`.

The `images.generate()` endpoint takes a prompt and returns one or more image URLs. Key parameters:

- **size**: `1024x1024`, `1792x1024` (landscape), `1024x1792` (portrait)
- **quality**: `standard` or `hd` (higher detail, higher cost)
- **style**: `vivid` (saturated, dramatic) or `natural` (muted, realistic)

> 🎬 **SHOW:** Slide — DALL-E 3 vs DALL-E 2 comparison: DALL-E 3 has better prompt adherence, higher resolution, built-in safety filters.

DALL-E 3 automatically rewrites your prompt internally to improve adherence — the revised prompt is returned in the response and is worth logging for debugging.

> 🎬 **SHOW:** Slide — the returned URL is temporary (expires in ~1 hour). Production pattern: download and store in your own object storage immediately.

The returned URL is temporary. In production, download the image bytes immediately and store them in your own object storage (S3, GCS, Couchbase blob) — don't store the URL.

---

## Demo Walkthrough

> 🎬 **SHOW:** Image Generation tab, style on vivid, size on 1024x1024.

1. Enter a prompt: *"A photorealistic mountain landscape at golden hour, with a lake reflecting the peaks."* Submit.

   > 🎬 **SHOW:** Image appears. Point to the revised prompt shown below the image — DALL-E 3's internal rewrite. Compare it to the original.

   The revised prompt is often more detailed than what you wrote. This is DALL-E 3 expanding your intent — useful to understand what the model actually generated.

2. Switch style to **natural**. Same prompt. Submit.

   > 🎬 **SHOW:** New image appears. Compare the two — vivid is more saturated and dramatic, natural is more muted and realistic.

   Style has a significant visual impact. Vivid suits marketing and illustration; natural suits product photography and documentation.

3. Try a prompt that tests safety filters: *"A realistic image of a person holding a weapon."*

   > 🎬 **SHOW:** The API returns a content policy error. Point to the error message displayed in the UI.

   DALL-E 3 has built-in content filters. Certain categories of content are rejected at the API level — your application must handle these errors gracefully.

4. Try a prompt for a UI mockup: *"A clean mobile app interface for a weather app, flat design, light theme."*

   > 🎬 **SHOW:** Image appears — a plausible UI mockup. Point out the use case: rapid prototyping, design exploration.

   Image generation is useful for rapid prototyping — generating UI mockups, icons, or placeholder images without a designer.

---

## Code Deep-Dive

> 🎬 **SHOW:** `backend/main.py`, scrolled to `/api/image-generate`. Highlight the `images.generate()` call.

```python
response = client.images.generate(
    model="dall-e-3",
    prompt=body.prompt,
    size=body.size,          # "1024x1024" | "1792x1024" | "1024x1792"
    quality=body.quality,    # "standard" | "hd"
    style=body.style,        # "vivid" | "natural"
    n=1,                     # DALL-E 3 only supports n=1
)

image_url      = response.data[0].url
revised_prompt = response.data[0].revised_prompt
```

> 🎬 **SHOW:** Highlight `revised_prompt` — the model's internal rewrite of the input prompt.

Always log `revised_prompt` in production. It tells you what the model actually interpreted, which helps debug unexpected outputs.

> 🎬 **SHOW:** Slide — production storage pattern: `httpx.get(image_url)` → write bytes → upload to object storage → store your own URL.

```python
# Production: download immediately — the URL expires in ~1 hour
import httpx
image_bytes = httpx.get(image_url).content
# upload image_bytes to your object storage here
```

> 🎬 **SHOW:** Highlight the content policy error handling — `openai.BadRequestError` with `code="content_policy_violation"`.

```python
try:
    response = client.images.generate(...)
except openai.BadRequestError as e:
    if "content_policy_violation" in str(e):
        raise HTTPException(status_code=400, detail="Content policy violation")
    raise
```

---

## Key Takeaways

> 🎬 **SHOW:** Generated image visible with the revised prompt shown below it.

- `images.generate()` follows the same pattern as chat completions — prompt in, result out.
- DALL-E 3 rewrites your prompt internally; log `revised_prompt` to understand what was actually generated.
- The returned URL is temporary (~1 hour) — download and store image bytes in your own storage immediately.
- Handle `content_policy_violation` errors explicitly; they are expected in any user-facing application.
- `n=1` is the only supported value for DALL-E 3; for multiple variants, make parallel calls.

---

## What's Next

> 🎬 **SHOW:** Sidebar — highlight the next tab `moderation`.

Next: Moderation — using the OpenAI moderation API to classify content before it reaches your LLM or your users.
