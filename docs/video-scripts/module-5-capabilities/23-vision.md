# Vision

**Module:** LLM Capabilities | **Level:** Intermediate
**Runtime:** ~6 min | **Tab:** `vision`

---

## Hook

> 🎬 **SHOW:** Vision tab open, image drop zone visible, prompt input below it, response area empty.

Text in, text out — that's been the model so far. But GPT-4o is multimodal: it accepts images alongside text in the same API call. No separate vision API, no preprocessing pipeline, no OCR step. You send an image and a question, and the model reasons about both together.

---

## Concept

> 🎬 **SHOW:** Slide — the standard messages array, but the user message content is now an array: one item is `{type: "image_url", image_url: {...}}`, the other is `{type: "text", text: "..."}`.

Multimodal models process images and text in a unified representation. The image is encoded into visual tokens that the model processes alongside text tokens. From the model's perspective, an image is just another kind of input in the message content array.

> 🎬 **SHOW:** Slide — two input methods: "Base64 data URL" (image bytes encoded inline) vs "URL reference" (public URL, API fetches it).

The API accepts images in two ways: base64 data URL (embed the image bytes directly) or a public URL (the API fetches it server-side).

> 🎬 **SHOW:** Slide — `detail` parameter: "low" (512×512, fast, cheap) vs "high" (tiled, slower, captures fine detail). Token cost: low ≈ 85 tokens, high ≈ 1000+ tokens for a large image.

The `detail` parameter controls quality and cost. Use `"low"` unless you need to read small text or analyse dense charts.

> 🎬 **SHOW:** Slide — "What vision does well" vs "What it can't do": can't identify real people by face (policy), struggles with very small handwritten text, can't process video in real time.

---

## Demo Walkthrough

> 🎬 **SHOW:** Vision tab, image drop zone ready.

1. **Screenshot of code**: drag in a screenshot of any code file.

   > 🎬 **SHOW:** Drag a code screenshot onto the drop zone — watch the image preview appear. Type "What does this code do?" in the prompt field, click Send. Watch the response describe the logic and identify the language.

   Ask: *"What does this code do?"* — the model should explain the logic, identify the language, and note any obvious issues.

2. **A chart or graph**: upload a bar chart or line graph.

   > 🎬 **SHOW:** Drop a chart image. Ask "Describe the trend shown in this chart." Point to the response identifying axes, describing the pattern, noting outliers.

   Ask: *"Describe the trend shown in this chart."*

3. **Text in an image**: take a screenshot of a webpage.

   > 🎬 **SHOW:** Drop a webpage screenshot. Ask "Extract all the text from this image." Compare the extracted text to what's visible on screen.

   Ask: *"Extract all the text from this image."*

4. **Same image, different prompts**.

   > 🎬 **SHOW:** Keep the same image loaded. Change the prompt to "What is wrong with this?" — send. Then change to "What is good about this?" — send. Point to how the framing shifts the response.

   The model's framing shifts based on the question — same image, completely different focus.

5. **Open the Network tab**.

   > 🎬 **SHOW:** Open browser DevTools → Network tab. Send another image. Point to the POST request — show that the request body contains the base64-encoded image data, not a URL. Confirm no audio or sensitive data is sent beyond what you explicitly upload.

   Confirm that the image is sent as base64 in the request body.

---

## Code Deep-Dive

> 🎬 **SHOW:** Open `backend/main.py`, scrolled to the vision endpoint. Highlight the content array structure.

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

> 🎬 **SHOW:** Highlight the content array — two items: image_url and text. Point out they can be in any order, and you can have multiple images.

The content array can contain multiple items — images and text interleaved. You can send multiple images in one call.

> 🎬 **SHOW:** Switch to the frontend code — show the clipboard paste handler.

The frontend handles clipboard paste:

```javascript
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

> 🎬 **SHOW:** Highlight the token cost note — a large image at `detail: "high"` can cost 1000+ tokens.

Token cost for vision: a 512×512 image at `detail: "low"` costs 85 tokens. At `detail: "high"`, a large image can cost 1000+ tokens. For cost-sensitive applications, use `detail: "low"` unless fine detail is required.

---

## Key Takeaways

> 🎬 **SHOW:** Return to the tab with a code screenshot and the model's explanation visible.

- GPT-4o accepts images and text in the same API call — no separate vision endpoint.
- Images are sent as base64 data URLs or public URLs in the message content array.
- The `detail` parameter controls quality and cost: `"low"` is fast and cheap, `"high"` captures fine detail.
- Vision works well for code screenshots, charts, UI analysis, and text extraction.
- Images cost tokens — a high-detail large image can cost 1000+ tokens per call.

---

## What's Next

> 🎬 **SHOW:** Click "Tool Calling" in the sidebar.

Vision lets the model perceive the world. Tool calling lets the model act on it — by invoking functions in your application to fetch data, run calculations, or trigger side effects. It's the foundation of every agent system.
