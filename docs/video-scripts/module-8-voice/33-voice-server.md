# Voice — Server

**Module:** Voice | **Level:** Advanced
**Runtime:** ~7 min | **Tab:** `voice-server`

---

## Hook

The WASM approach keeps audio on the device but is limited by client hardware and browser TTS quality. The server-side approach trades privacy for quality: OpenAI's Whisper API produces more accurate transcriptions, and OpenAI's TTS API produces natural-sounding speech. Three API calls per turn — STT, LLM, TTS — but the result is a voice interface that sounds like a real product.

---

## Concept

The server-side voice pipeline has three sequential steps per turn:

1. **Speech-to-Text (STT)**: the browser records audio and POSTs the WAV blob to the backend. The backend calls `openai.audio.transcriptions.create` (Whisper API) and returns the transcript.

2. **LLM**: the transcript is sent to the chat endpoint. The LLM generates a text response.

3. **Text-to-Speech (TTS)**: the text response is sent to the TTS endpoint. The backend calls `openai.audio.speech.create` and streams the audio/mpeg back to the browser, which plays it via an `<audio>` element.

Each step is a separate API call with separate latency and cost:
- Whisper: ~$0.006 per minute of audio
- LLM: token-based pricing (same as text chat)
- TTS: ~$15 per million characters

For a typical 5-second voice query with a 100-word response, the total cost is roughly $0.001-0.003 per turn — cheap individually, but significant at scale.

The TTS API supports multiple voices (`alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer`) and two models (`tts-1` for speed, `tts-1-hd` for quality). The audio streams back as `audio/mpeg` — the browser can start playing before the full audio is received.

Privacy consideration: audio is uploaded to the server and forwarded to OpenAI. This is not suitable for applications handling sensitive audio (medical, legal, financial) — use the WASM approach for those.

---

## Demo Walkthrough

Open the **Voice (Server)** tab.

1. Click **Start Recording**. Ask: *"What is the difference between flexbox and grid?"* Click **Stop**. Watch the three-step pipeline: STT → LLM → TTS. Each step shows its latency.

2. Compare the transcription accuracy to the WASM tab. Try the same phrase in both. Is the server-side Whisper more accurate?

3. Compare the TTS voice quality to the browser's Web Speech API. The OpenAI TTS should sound significantly more natural.

4. Try different voices: switch between `alloy`, `nova`, and `onyx`. Which sounds best for your use case?

5. Ask a question that produces a long response. Does the audio start playing before the full response is generated? (It should — TTS streams.)

6. Open the Network tab. You'll see three requests: POST to `/api/stt`, POST to `/api/chat`, POST to `/api/tts`. Compare the latency of each step.

---

## Code Deep-Dive

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

The TTS endpoint calls the speech API and streams the audio back:

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

The frontend orchestrates the three steps:

```javascript
// Step 1: STT
const formData = new FormData()
formData.append('audio', audioBlob, 'audio.wav')
const { transcript } = await fetch('/api/stt', { method: 'POST', body: formData }).then(r => r.json())

// Step 2: LLM
const { response: llmText } = await fetch('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ message: transcript }),
}).then(r => r.json())

// Step 3: TTS — stream audio to <audio> element
const ttsResponse = await fetch('/api/tts', {
    method: 'POST',
    body: JSON.stringify({ text: llmText, voice: 'alloy' }),
})
const audioUrl = URL.createObjectURL(await ttsResponse.blob())
audioElement.src = audioUrl
audioElement.play()
```

For lower latency, you can pipeline steps 2 and 3: start TTS as soon as the first sentence of the LLM response is available, rather than waiting for the full response. This requires streaming the LLM response and sentence-splitting it in real time.

---

## Key Takeaways

- Server-side voice uses three API calls per turn: Whisper (STT) → LLM → OpenAI TTS.
- Quality is higher than WASM: Whisper API is more accurate, OpenAI TTS sounds more natural.
- Audio is uploaded to the server — not suitable for sensitive audio. Use WASM for privacy-sensitive applications.
- TTS streams audio/mpeg — the browser can start playing before the full audio is received.
- Cost per turn: ~$0.001-0.003 for a typical query. Track separately: STT, LLM, and TTS have different pricing models.

---

## What's Next

You've completed the Voice module. The final module covers Capella AI Functions — LLM capabilities exposed as SQL++ built-in functions that run inside the Couchbase query engine, starting with AI-powered summarisation.
