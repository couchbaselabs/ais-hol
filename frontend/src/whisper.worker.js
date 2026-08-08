/**
 * Web Worker: runs Whisper tiny.en in-browser via @xenova/transformers WASM.
 * Loaded lazily on first use — the model (~40MB) is downloaded and cached
 * in the browser's Cache API on first run.
 */
import { pipeline, env } from '@xenova/transformers'

// Use the CDN-hosted WASM/ONNX files — no local bundling needed
env.allowLocalModels = false

let transcriber = null

async function getTranscriber() {
  if (!transcriber) {
    self.postMessage({ type: 'loading', message: 'Downloading Whisper tiny.en (~40 MB, cached after first run)…' })
    transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en', {
      chunk_length_s: 30,
      stride_length_s: 5,
    })
    self.postMessage({ type: 'ready' })
  }
  return transcriber
}

self.addEventListener('message', async (e) => {
  const { type, audio } = e.data
  if (type !== 'transcribe') return

  try {
    const asr = await getTranscriber()
    self.postMessage({ type: 'transcribing' })
    const result = await asr(audio, { language: 'english', task: 'transcribe' })
    self.postMessage({ type: 'result', text: result.text.trim() })
  } catch (err) {
    self.postMessage({ type: 'error', message: err.message })
  }
})
