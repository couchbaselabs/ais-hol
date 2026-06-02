# Voice — WASM

**Module:** Voice | **Level:** Advanced
**Runtime:** ~7 min | **Tab:** `voice-wasm`

---

## Hook

What if you could run Whisper — OpenAI's speech recognition model — entirely in the browser, with no audio ever leaving the device? No server costs, no privacy concerns, no network round-trip for transcription. WebAssembly makes this possible: a quantised Whisper model runs locally in a Web Worker, transcribes your speech, and the text is sent to the LLM. The reply is spoken back using the browser's built-in speech synthesis.

---

## Concept

**WebAssembly (WASM)** allows near-native-speed code to run in the browser. The `@xenova/transformers` library compiles Hugging Face transformer models to WASM, making it possible to run models like Whisper directly in the browser without a server.

The architecture:

1. **Web Worker**: the Whisper model runs in a Web Worker — a background thread — so it doesn't block the UI. The first time it runs, it downloads the model (~40 MB for `whisper-tiny.en`) and caches it in the browser. Subsequent loads use the cache.

2. **MediaRecorder API**: captures microphone audio as a WAV blob.

3. **Whisper WASM**: the Web Worker receives the audio data and runs the Whisper pipeline locally. Returns a transcript string.

4. **LLM call**: the transcript is sent to the backend `/api/chat` endpoint — the same one used by the text chat tabs.

5. **Web Speech API**: the LLM's text response is spoken back using `window.speechSynthesis` — the browser's built-in TTS. Voice quality varies by browser and OS.

Privacy advantage: audio never leaves the device. The only data sent to the server is the transcript text and the LLM response. This is significant for applications handling sensitive audio — medical, legal, financial.

Performance caveat: transcription speed depends on the client device. On a modern laptop, `whisper-tiny.en` transcribes in roughly real-time. On a low-end mobile device, it may be 2-3× slower than real-time.

---

## Demo Walkthrough

Open the **Voice (WASM)** tab. The first load downloads the Whisper model — watch the progress bar.

1. Click **Start Recording**. Say: *"Hello, how are you?"* Click **Stop**. Watch the transcription appear. How accurate is it?

2. Try speaking with background noise. Does accuracy drop? Whisper is surprisingly robust to noise, but very loud environments will degrade it.

3. Try a technical term: *"Explain WebAssembly."* Does Whisper handle domain vocabulary correctly?

4. Try a longer sentence. Compare transcription speed — how long does it take relative to the recording length?

5. After transcription, the text is sent to the LLM and the response is spoken back. Compare the TTS voice quality to the server-side TTS in the next tab.

6. Open the browser's Network tab. Confirm that no audio data is sent to the server — only the transcript text appears in the network requests.

---

## Code Deep-Dive

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

The main component records audio and sends it to the worker:

```javascript
// Start recording
const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
const recorder = new MediaRecorder(stream)
const chunks = []

recorder.ondataavailable = (e) => chunks.push(e.data)
recorder.onstop = async () => {
    const blob = new Blob(chunks, { type: 'audio/wav' })
    const arrayBuffer = await blob.arrayBuffer()
    const audioContext = new AudioContext()
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

    // Send float32 audio data to the worker
    worker.postMessage({
        audioData:  audioBuffer.getChannelData(0),  // mono float32
        sampleRate: audioBuffer.sampleRate,
    })
}
```

The Web Speech API speaks the LLM response:

```javascript
const utterance = new SpeechSynthesisUtterance(llmResponse)
utterance.rate = 1.0
utterance.pitch = 1.0
window.speechSynthesis.speak(utterance)
```

The voice quality of `speechSynthesis` varies significantly by browser and OS. Chrome on macOS uses high-quality neural voices; Firefox on Linux may use a robotic synthesiser.

---

## Key Takeaways

- `@xenova/transformers` runs Whisper in the browser via WebAssembly — no server needed for transcription.
- Audio never leaves the device — only the transcript text is sent to the server.
- The model is downloaded once (~40 MB) and cached in the browser for subsequent uses.
- Web Workers run the model in a background thread, keeping the UI responsive.
- Transcription speed depends on the client device — test on your target hardware.

---

## What's Next

WASM voice keeps audio on the device. The server-side approach sends audio to the backend, where OpenAI's Whisper API transcribes it and OpenAI's TTS API speaks the response — higher quality, but with network round-trips and API costs for each turn.
