import React, { useState, useRef, useCallback } from 'react'
import './App.css'
import './AppVoice.css'

/**
 * Server Voice Chat
 *
 * STT: POST /api/voice/transcribe — OpenAI Whisper API on the backend.
 * TTS: POST /api/voice/speak — OpenAI TTS API on the backend, returns MP3.
 * LLM: POST /api/chat — standard chat endpoint.
 */

const VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']

export default function AppVoiceServer() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! Click the microphone to speak. Audio is transcribed by Whisper on the server.' },
  ])
  const [status, setStatus] = useState('ready') // ready | recording | transcribing | thinking | speaking
  const [ttsEnabled, setTtsEnabled] = useState(true)
  const [voice, setVoice] = useState('nova')
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState(null)

  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const audioRef = useRef(null)

  const transcribe = async (blob) => {
    setStatus('transcribing')
    const form = new FormData()
    form.append('audio', blob, 'recording.webm')
    const res = await fetch('/api/voice/transcribe', { method: 'POST', body: form })
    if (!res.ok) throw new Error('Transcription failed')
    const { transcript } = await res.json()
    return transcript
  }

  const chat = async (text) => {
    setStatus('thinking')
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text }),
    })
    if (!res.ok) throw new Error('Chat failed')
    const data = await res.json()
    return data.response || data.message || ''
  }

  const speakText = useCallback(async (text) => {
    if (!ttsEnabled) return
    setStatus('speaking')
    try {
      const res = await fetch('/api/voice/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice }),
      })
      if (!res.ok) throw new Error('TTS failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      if (audioRef.current) {
        audioRef.current.src = url
        await audioRef.current.play()
        audioRef.current.onended = () => { URL.revokeObjectURL(url); setStatus('ready') }
      } else {
        setStatus('ready')
      }
    } catch {
      setStatus('ready')
    }
  }, [ttsEnabled, voice])

  const stopAudio = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = '' }
    setStatus('ready')
  }

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
        try {
          const transcript = await transcribe(blob)
          if (!transcript) { setStatus('ready'); return }
          setMessages(prev => [...prev, { role: 'user', content: transcript }])
          const reply = await chat(transcript)
          setMessages(prev => [...prev, { role: 'assistant', content: reply }])
          await speakText(reply)
        } catch (err) {
          setError(err.message)
          setStatus('ready')
        }
      }
      recorder.start()
      mediaRecorderRef.current = recorder
      setIsRecording(true)
      setStatus('recording')
    } catch (err) {
      setError(`Microphone access denied: ${err.message}`)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop()
    setIsRecording(false)
  }

  const isBusy = status !== 'ready' && status !== 'recording'

  const STATUS_LABEL = {
    ready:        'Ready',
    recording:    '🔴 Recording…',
    transcribing: 'Transcribing with Whisper…',
    thinking:     'LLM thinking…',
    speaking:     '🔊 Speaking…',
  }

  return (
    <div className="app voice-app">
      <audio ref={audioRef} style={{ display: 'none' }} />

      <div className="voice-header">
        <div className="voice-badges">
          <span className="voice-badge voice-badge--stt">🎙 Whisper API</span>
          <span className="voice-badge voice-badge--tts">🔊 OpenAI TTS</span>
          <span className="voice-badge voice-badge--llm">💬 LLM via server</span>
        </div>
        <div className="voice-controls-row">
          <span className={`voice-status voice-status--${status}`}>{STATUS_LABEL[status]}</span>
          <label className="voice-tts-toggle">
            <input type="checkbox" checked={ttsEnabled} onChange={e => { setTtsEnabled(e.target.checked); if (!e.target.checked) stopAudio() }} />
            Speak replies
          </label>
          <select className="voice-select" value={voice} onChange={e => setVoice(e.target.value)}>
            {VOICES.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          {status === 'speaking' && (
            <button className="voice-stop-btn" onClick={stopAudio}>⏹ Stop</button>
          )}
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
          disabled={isBusy}
        >
          {isRecording ? '⏹' : '🎤'}
        </button>
        <span className="voice-mic-hint">
          {isRecording ? 'Release to send' : isBusy ? STATUS_LABEL[status] : 'Hold to speak'}
        </span>
      </div>
    </div>
  )
}
