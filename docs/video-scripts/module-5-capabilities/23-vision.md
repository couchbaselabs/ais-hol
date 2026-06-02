# Vision

**Module:** LLM Capabilities | **Level:** Intermediate
**Runtime:** ~6 min | **Tab:** `vision`

---

## Hook

Text in, text out — that's been the model so far. But GPT-4o is multimodal: it accepts images alongside text in the same API call. No separate vision API, no preprocessing pipeline, no OCR step. You send an image and a question, and the model reasons about both together.

---

## Concept

Multimodal models process images and text in a unified representation. The image is encoded into a sequence of tokens — visual tokens — that the model processes alongside the text tokens. From the model's perspective, an image is just another kind of input in the message content array.

The API accepts images in two ways:
- **Base64 data URL**: encode the image bytes as base64 and embed them directly in the request. No external URL needed, works for any image the client has access to.
- **URL reference**: pass a publicly accessible URL. The API fetches the image server-side.

The `detail` parameter controls how the image is processed:
- `"low"`: the image is resized to 512×512 and processed as a single tile — fast and cheap, good for simple images.
- `"high"`: the image is tiled into multiple 512×512 sections and processed individually — slower and more expensive, but captures fine detail like small text or dense charts.
- `"auto"`: the API decides based on image size.

What GPT-4o vision can do well: describe scenes, read text in images, analyse charts and diagrams, explain code screenshots, identify UI elements, compare images. What it cannot do: identify real people by face (by policy), reliably read very small or handwritten text, or process video frames in real time.

---

## Demo Walkthrough

Open the **Vision** tab. Drag an image onto the drop zone, paste from clipboard, or use the URL input.

1. **Screenshot of code**: drag in a screenshot of any code. Ask: *"What does this code do?"* — the model should explain the logic, identify the language, and note any obvious issues.

2. **A chart or graph**: upload a bar chart or line graph. Ask: *"Describe the trend shown in this chart."* — the model should identify axes, describe the pattern, and note any outliers.

3. **Text in an image**: take a screenshot of a webpage or document. Ask: *"Extract all the text from this image."* — compare accuracy to what you'd expect from a dedicated OCR tool.

4. **Same image, different prompts**: try the same image with *"What is wrong with this?"* vs *"What is good about this?"* — the model's framing shifts based on the question.

5. **UI screenshot**: upload a screenshot of a UI. Ask: *"What improvements would you suggest for this interface?"* — the model can reason about design.

---

## Code Deep-Dive

The vision endpoint sends the image as a data URL in the message content array:

```python
completion = await client.chat.completions.create(
    model="gpt-4o",
    messages=[{
        "role": "user",
        "content": [
            {
                "type": "image_url",
                "image_url": {
                    "url": f"data:{mime_type};base64,{image_base64}",
                    "detail": "high",
                },
            },
            {"type": "text", "text": prompt},
        ],
    }],
    max_tokens=1024,
)
```

The content array can contain multiple items — images and text interleaved. The model processes them all together. You can send multiple images in one call:

```python
# Multiple images in one call
content = []
for img_b64, mime in images:
    content.append({
        "type": "image_url",
        "image_url": {"url": f"data:{mime};base64,{img_b64}"}
    })
content.append({"type": "text", "text": "Compare these two images."})
```

The frontend handles image input via drag-and-drop and clipboard paste:

```javascript
// Clipboard paste
document.addEventListener('paste', (e) => {
    const item = [...e.clipboardData.items].find(i => i.type.startsWith('image/'))
    if (item) {
        const blob = item.getAsFile()
        const reader = new FileReader()
        reader.onload = (e) => setImageBase64(e.target.result.split(',')[1])
        reader.readAsDataURL(blob)
    }
})
```

Token cost for vision: a 512×512 image at `detail: "low"` costs 85 tokens. At `detail: "high"`, a large image can cost 1000+ tokens. For cost-sensitive applications, use `detail: "low"` unless fine detail is required.

---

## Key Takeaways

- GPT-4o accepts images and text in the same API call — no separate vision endpoint.
- Images are sent as base64 data URLs or public URLs in the message content array.
- The `detail` parameter controls quality and cost: `"low"` is fast and cheap, `"high"` captures fine detail.
- Vision works well for code screenshots, charts, UI analysis, and text extraction.
- Images cost tokens — a high-detail large image can cost 1000+ tokens per call.

---

## What's Next

Vision lets the model perceive the world. Tool calling lets the model act on it — by invoking functions in your application to fetch data, run calculations, or trigger side effects. It's the foundation of every agent system.
