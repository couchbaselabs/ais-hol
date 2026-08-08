# Voice — WASM

**Module:** Voice | **Level:** Advanced
**Runtime:** ~7 min | **Tab:** `voice-wasm`

---

## Hook

> 🎬 **SHOW:** Voice WASM tab open, a model download progress bar visible (or already complete), microphone button prominent in the centre, transcript area and response area below — both empty.

What if you could run Whisper — OpenAI's speech recognition model — entirely in the browser, with no audio ever leaving the device? No server costs, no privacy concerns, no network round-trip for transcription. WebAssembly makes this possible: a quantised Whisper model runs locally in a Web Worker, transcribes your speech, and the text is sent to the LLM. The reply is spoken back using the browser's built-in speech synthesis.

---

## Concept

> 🎬 **SHOW:** Slide — architecture diagram: microphone → MediaRecorder → WAV blob → Web Worker (Whisper WASM) → transcript text → backend /api/chat → LLM response → Web Speech API → speaker. Highlight "No audio leaves the device" with a lock icon.

The architecture keeps audio entirely on the device:

1. **Web Worker**: the Whisper model runs in a background thread. The first time it runs, it downloads the model (~40 MB for `whisper-tiny.en`) and caches it in the browser.
2. **MediaRecorder API**: captures microphone audio as a WAV blob.
3. **Whisper WASM**: the Web Worker receives the audio data and runs the Whisper pipeline locally.
4. **LLM call**: only the transcript text is sent to the backend — no audio.
5. **Web Speech API**: the LLM's text response is spoken back using `window.speechSynthesis`.

> 🎬 **SHOW:** Slide — privacy comparison: "WASM: audio stays on device, only transcript sent. Server: audio uploaded to server and forwarded to OpenAI."

Privacy advantage: audio never leaves the device. This is significant for applications handling sensitive audio — medical, legal, financial.

> 🎬 **SHOW:** Slide — performance caveat: "Transcription speed depends on client hardware. whisper-tiny.en ≈ real-time on a modern laptop."

Performance caveat: transcription speed depends on the client device. Test on your target hardware.

---

## Demo Walkthrough

> 🎬 **SHOW:** Voice WASM tab. If the model hasn't been downloaded yet, point to the progress bar as it downloads. Once complete, the microphone button becomes active.

1. Click **Start Recording**. Say: *"Hello, how are you?"* Click **Stop**.

   > 🎬 **SHOW:** Click the microphone button — it should turn red/active. Speak clearly. Click Stop. Watch the transcript appear in the transcript area. Point to the text.

   Watch the transcription appear. How accurate is it?

2. Try speaking with background noise.

   > 🎬 **SHOW:** Make some background noise (tap the desk, shuffle papers) while speaking. Point to the transcript — Whisper is surprisingly robust to noise.

   Whisper is surprisingly robust to noise, but very loud environments will degrade it.

3. Try a technical term: *"Explain WebAssembly."*

   > 🎬 **SHOW:** Record the phrase. Point to whether "WebAssembly" is correctly transcribed — it's a domain-specific term.

   Does Whisper handle domain vocabulary correctly?

4. After transcription, watch the LLM response and TTS.

   > 🎬 **SHOW:** After the transcript appears, point to the LLM response generating below it. Then point to the browser speaking the response — the audio plays from the browser's built-in TTS.

   The text is sent to the LLM and the response is spoken back using the browser's built-in speech synthesis.

5. Open the browser's Network tab.

   > 🎬 **SHOW:** Open DevTools → Network. Record another phrase. Show the network requests — only a POST to `/api/chat` with the transcript text. No audio upload visible.

   Confirm that no audio data is sent to the server — only the transcript text appears in the network requests.

---

## Code Deep-Dive

> 🎬 **SHOW:** Open `frontend/src/whisper.worker.js`. Highlight the `pipeline` import from `@xenova/transformers` and the model name.

The Web Worker runs Whisper locally:

```javascript
// src/whisper.worker.js
import { pipeline } from '@xenova/transformers'

let transcriber = null

self.onmessage = async ({ data: { audioData, sampleRate } }) => {
  if (!transcriber) {
    // Download and cache the model on first use
    transcriber = await pipeline(
      'automatic-speech-recognition',
      'Xenova/whisper-tiny.en',
    )
  }
  const result = await transcriber(audioData, { sampling_rate: sampleRate })
  self.postMessage({ transcript: result.text })
}
```

> 🎬 **SHOW:** Highlight `'Xenova/whisper-tiny.en'` — explain this is a quantised model, ~40 MB, cached after first download.

`'Xenova/whisper-tiny.en'` is a quantised model — ~40 MB, downloaded once and cached in the browser's cache storage.

> 🎬 **SHOW:** Switch to the main component file. Show the MediaRecorder setup and the `worker.postMessage` call.

The main component records audio and sends it to the worker:

```javascript
recorder.onstop = async () => {
    const blob = new Blob(chunks, { type: 'audio/wav' })
    const arrayBuffer = await blob.arrayBuffer()
    const audioContext = new AudioContext()
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

    // Send float32 audio data to the worker — no audio leaves the browser
    worker.postMessage({
        audioData:  audioBuffer.getChannelData(0),  // mono float32
        sampleRate: audioBuffer.sampleRate,
    })
}
```

> 🎬 **SHOW:** Highlight `getChannelData(0)` — mono float32 array. Then show the `speechSynthesis` call for TTS.

The Web Speech API speaks the LLM response — voice quality varies significantly by browser and OS. Chrome on macOS uses high-quality neural voices; Firefox on Linux may use a robotic synthesiser.

---

## Key Takeaways

> 🎬 **SHOW:** Return to the tab with a completed transcription — transcript visible, LLM response below it. Network tab open showing only a text POST, no audio upload.

- `@xenova/transformers` runs Whisper in the browser via WebAssembly — no server needed for transcription.
- Audio never leaves the device — only the transcript text is sent to the server.
- The model is downloaded once (~40 MB) and cached in the browser for subsequent uses.
- Web Workers run the model in a background thread, keeping the UI responsive.
- Transcription speed depends on the client device — test on your target hardware.

---

## What's Next

> 🎬 **SHOW:** Click "Voice — Server" in the sidebar.

WASM voice keeps audio on the device. The server-side approach sends audio to the backend, where OpenAI's Whisper API transcribes it and OpenAI's TTS API speaks the response — higher quality, but with network round-trips and API costs for each turn.
