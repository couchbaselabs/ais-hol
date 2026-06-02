import React, { useState, useRef, useEffect, useCallback } from 'react'
import './App.css'
import './AppVoice.css'

/**
 * WASM Voice Chat
 *
 * STT: Whisper tiny.en running in-browser via @xenova/transformers WASM.
 *      Model is downloaded once (~40 MB) and cached in the browser.
 * TTS: Browser SpeechSynthesis API — fully client-side, no server calls.
 * LLM: Standard /api/chat endpoint on the backend.
 */

function useSpeechSynthesis() {
  const speak = useCallback((text) => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(text)
    utt.rate = 1.0
    utt.pitch = 1.0
    window.speechSynthesis.speak(utt)
  }, [])

  const stop = useCallback(() => {
    if (window.speechSynthesis) window.speechSynthesis.cancel()
  }, [])

  return { speak, stop }
}

export default function AppVoiceWasm() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! Click the microphone to speak. Whisper runs entirely in your browser.' },
  ])
  const [workerStatus, setWorkerStatus] = useState('idle') // idle | loading | ready | recording | transcribing | thinking
  const [isRecording, setIsRecording] = useState(false)
  const [ttsEnabled, setTtsEnabled] = useState(true)
  const [error, setError] = useState(null)

  const workerRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const { speak, stop } = useSpeechSynthesis()

  // Initialise worker on mount
  useEffect(() => {
    const worker = new Worker(new URL('./whisper.worker.js', import.meta.url), { type: 'module' })
    workerRef.current = worker

    worker.onmessage = (e) => {
      const { type, message, text } = e.data
      if (type === 'loading') setWorkerStatus('loading')
      if (type === 'ready')   setWorkerStatus('ready')
      if (type === 'transcribing') setWorkerStatus('transcribing')
      if (type === 'error')   { setError(message); setWorkerStatus('ready') }
      if (type === 'result')  handleTranscript(text)
    }

    // Warm up the worker immediately
    worker.postMessage({ type: 'ping' })

    return () => { worker.terminate(); stop() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleTranscript = useCallback(async (text) => {
    if (!text) { setWorkerStatus('ready'); return }
    setWorkerStatus('thinking')
    const userMsg = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      })
      const data = await res.json()
      const reply = data.response || data.message || 'Sorry, I could not get a response.'
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
      if (ttsEnabled) speak(reply)
    } catch {
      setError('Chat request failed.')
    } finally {
      setWorkerStatus('ready')
    }
  }, [ttsEnabled, speak])

  const startRecording = async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      chunksRef.current = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const arrayBuffer = await blob.arrayBuffer()
        const float32 = await decodeAudioToFloat32(arrayBuffer)
        workerRef.current.postMessage({ type: 'transcribe', audio: float32 }, [float32.buffer])
      }
      recorder.start()
      mediaRecorderRef.current = recorder
      setIsRecording(true)
      setWorkerStatus('recording')
    } catch (err) {
      setError(`Microphone access denied: ${err.message}`)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    setIsRecording(false)
  }

  const isBusy = ['loading', 'transcribing', 'thinking'].includes(workerStatus)

  const STATUS_LABEL = {
    idle:         'Initialising…',
    loading:      'Downloading Whisper model (~40 MB)…',
    ready:        'Ready',
    recording:    '🔴 Recording…',
    transcribing: 'Transcribing…',
    thinking:     'Thinking…',
  }

  return (
    <div className="app voice-app">
      <div className="voice-header">
        <div className="voice-badges">
          <span className="voice-badge voice-badge--wasm">🧠 Whisper WASM</span>
          <span className="voice-badge voice-badge--tts">🔊 Browser TTS</span>
          <span className="voice-badge voice-badge--llm">💬 LLM via server</span>
        </div>
        <div className="voice-controls-row">
          <span className={`voice-status voice-status--${workerStatus}`}>{STATUS_LABEL[workerStatus]}</span>
          <label className="voice-tts-toggle">
            <input type="checkbox" checked={ttsEnabled} onChange={e => { setTtsEnabled(e.target.checked); if (!e.target.checked) stop() }} />
            Speak replies
          </label>
        </div>
        {error && <div className="voice-error">{error}</div>}
      </div>

      <div className="voice-messages">
        {messages.map((m, i) => (
          <div key={i} className={`voice-bubble voice-bubble--${m.role}`}>
            <span className="voice-bubble-role">{m.role === 'user' ? '🎤 You' : '🤖 Assistant'}</span>
            <p className="voice-bubble-text">{m.content}</p>
          </div>
        ))}
      </div>

      <div className="voice-mic-area">
        <button
          className={`voice-mic-btn ${isRecording ? 'voice-mic-btn--recording' : ''}`}
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          onTouchStart={startRecording}
          onTouchEnd={stopRecording}
          disabled={isBusy || workerStatus === 'idle'}
        >
          {isRecording ? '⏹' : '🎤'}
        </button>
        <span className="voice-mic-hint">
          {isRecording ? 'Release to transcribe' : isBusy ? STATUS_LABEL[workerStatus] : 'Hold to speak'}
        </span>
      </div>
    </div>
  )
}

// Decode audio blob to Float32Array using the Web Audio API
async function decodeAudioToFloat32(arrayBuffer) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 })
  const decoded = await ctx.decodeAudioData(arrayBuffer)
  await ctx.close()
  return decoded.getChannelData(0) // mono, 16kHz
}
