# Voice — Server

**Module:** Voice | **Level:** Advanced
**Runtime:** ~7 min | **Tab:** `voice-server`

---

## Hook

> 🎬 **SHOW:** Voice Server tab open, microphone button visible, voice selector dropdown showing "alloy", three-step pipeline indicator (STT → LLM → TTS) with latency timers, audio playback area below.

The WASM approach keeps audio on the device but is limited by client hardware and browser TTS quality. The server-side approach trades privacy for quality: OpenAI's Whisper API produces more accurate transcriptions, and OpenAI's TTS API produces natural-sounding speech. Three API calls per turn — STT, LLM, TTS — but the result is a voice interface that sounds like a real product.

---

## Concept

> 🎬 **SHOW:** Slide — three-step pipeline with latency estimates: "STT (Whisper API) ~0.5s" → "LLM (chat) ~1-2s" → "TTS (OpenAI speech) ~0.5s". Total: ~2-3s per turn.

The server-side voice pipeline has three sequential steps per turn:

1. **Speech-to-Text**: the browser records audio and POSTs the WAV blob to the backend. The backend calls `openai.audio.transcriptions.create` (Whisper API) and returns the transcript.
2. **LLM**: the transcript is sent to the chat endpoint.
3. **Text-to-Speech**: the text response is sent to the TTS endpoint. The backend calls `openai.audio.speech.create` and streams the audio/mpeg back to the browser.

> 🎬 **SHOW:** Slide — six voice options: alloy, echo, fable, onyx, nova, shimmer. Two models: tts-1 (speed) vs tts-1-hd (quality).

The TTS API supports six voices and two models. `tts-1` is optimised for speed; `tts-1-hd` for quality.

> 🎬 **SHOW:** Slide — privacy warning: "Audio is uploaded to the server and forwarded to OpenAI. Not suitable for sensitive audio — use WASM for those use cases."

Privacy consideration: audio is uploaded to the server and forwarded to OpenAI. Use the WASM approach for sensitive audio.

---

## Demo Walkthrough

> 🎬 **SHOW:** Voice Server tab, voice selector set to "alloy", microphone button ready.

1. Click **Start Recording**. Ask: *"What is the difference between flexbox and grid?"* Click **Stop**.

   > 🎬 **SHOW:** Record the question. Watch the three-step pipeline indicator light up in sequence: STT timer counts, then LLM timer counts, then TTS timer counts. Point to each step's latency as it completes.

   Watch the three-step pipeline: STT → LLM → TTS. Each step shows its latency.

2. Compare transcription accuracy to the WASM tab.

   > 🎬 **SHOW:** Open the WASM tab in a second browser tab. Record the same phrase in both. Compare the transcripts side by side.

   Try the same phrase in both. Is the server-side Whisper more accurate?

3. Compare TTS voice quality.

   > 🎬 **SHOW:** Play the server-side TTS response. Then switch to the WASM tab and trigger its TTS for the same text. Point to the quality difference — OpenAI TTS sounds significantly more natural.

   The OpenAI TTS should sound significantly more natural than the browser's Web Speech API.

4. Try different voices.

   > 🎬 **SHOW:** Change the voice selector to "nova", record a question, listen to the response. Then try "onyx". Point to the personality differences between voices.

   Switch between `alloy`, `nova`, and `onyx`. Which sounds best for your use case?

5. Ask a question that produces a long response.

   > 🎬 **SHOW:** Ask something that generates a long answer. Watch whether the audio starts playing before the full response is generated — point to the audio element starting to play while the TTS timer is still counting.

   Does the audio start playing before the full response is generated? It should — TTS streams.

6. Open the Network tab.

   > 🎬 **SHOW:** Open DevTools → Network. Record a phrase. Point to three requests: POST to `/api/stt` (with audio blob), POST to `/api/chat` (with transcript text), POST to `/api/tts` (with LLM text). Compare the sizes — the audio upload is the largest.

   You'll see three requests: `/api/stt`, `/api/chat`, `/api/tts`. Compare the latency of each step.

---

## Code Deep-Dive

> 🎬 **SHOW:** Open `backend/main.py`, scrolled to the STT endpoint. Highlight `openai.audio.transcriptions.create`.

The STT endpoint receives the audio blob and calls Whisper:

```python
@app.post("/api/stt")
async def speech_to_text(audio: UploadFile = File(...)):
    data = await audio.read()
    transcript = await client.audio.transcriptions.create(
        model="whisper-1",
        file=("audio.wav", data, "audio/wav"),
    )
    return {"transcript": transcript.text}
```

> 🎬 **SHOW:** Scroll to the TTS endpoint. Highlight `StreamingResponse` and `response.iter_bytes()`.

The TTS endpoint streams the audio back:

```python
@app.post("/api/tts")
async def text_to_speech(body: TTSRequest):
    response = await client.audio.speech.create(
        model="tts-1",        # or "tts-1-hd" for higher quality
        voice=body.voice,     # "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer"
        input=body.text,
    )
    return StreamingResponse(
        response.iter_bytes(),
        media_type="audio/mpeg",
    )
```

> 🎬 **SHOW:** Highlight `response.iter_bytes()` — the audio streams back as chunks, the browser can start playing before the full audio is received.

`response.iter_bytes()` streams the audio as chunks — the browser can start playing before the full audio is received. This is what makes the TTS feel responsive even for long responses.

> 🎬 **SHOW:** Switch to the frontend code — show the three sequential fetch calls.

The frontend orchestrates the three steps sequentially:

```javascript
// Step 1: STT
const { transcript } = await fetch('/api/stt', { method: 'POST', body: formData }).then(r => r.json())

// Step 2: LLM
const { response: llmText } = await fetch('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ message: transcript }),
}).then(r => r.json())

// Step 3: TTS — stream audio to <audio> element
const ttsResponse = await fetch('/api/tts', {
    method: 'POST',
    body: JSON.stringify({ text: llmText, voice: selectedVoice }),
})
const audioUrl = URL.createObjectURL(await ttsResponse.blob())
audioElement.src = audioUrl
audioElement.play()
```

---

## Key Takeaways

> 🎬 **SHOW:** Return to the tab with a completed voice turn — transcript visible, LLM response visible, audio player showing the TTS audio. Network tab open showing the three requests.

- Server-side voice uses three API calls per turn: Whisper (STT) → LLM → OpenAI TTS.
- Quality is higher than WASM: Whisper API is more accurate, OpenAI TTS sounds more natural.
- Audio is uploaded to the server — not suitable for sensitive audio. Use WASM for privacy-sensitive applications.
- TTS streams audio/mpeg — the browser can start playing before the full audio is received.
- Cost per turn: ~$0.001-0.003 for a typical query. Track STT, LLM, and TTS costs separately.

---

## What's Next

> 🎬 **SHOW:** Click "Capella AI Summarisation" in the sidebar — the first tab of Module 9.

You've completed the Voice module. The final module covers Capella AI Functions — LLM capabilities exposed as SQL++ built-in functions that run inside the Couchbase query engine, starting with AI-powered summarisation.
