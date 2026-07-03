import { useState, useRef, useEffect } from 'react'

// Mic button that records audio via MediaRecorder and raises onRecorded(blob,
// seconds) when stopped. Presentational + local state only; no data access.
export default function VoiceRecorder({ onRecorded, disabled }) {
  const [recording, setRecording] = useState(false)
  const [secs, setSecs] = useState(0)
  const recRef = useRef(null)
  const chunksRef = useRef([])
  const startedRef = useRef(0)
  const timerRef = useRef(null)

  useEffect(() => () => { clearInterval(timerRef.current); const r = recRef.current; if (r && r.state !== 'inactive') r.stop() }, [])

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      alert('Voice recording is not supported in this browser.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const rec = new MediaRecorder(stream)
      chunksRef.current = []
      rec.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data) }
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' })
        const seconds = (Date.now() - startedRef.current) / 1000
        if (blob.size) onRecorded(blob, seconds)
      }
      recRef.current = rec
      startedRef.current = Date.now()
      rec.start()
      setRecording(true)
      setSecs(0)
      timerRef.current = setInterval(() => setSecs((s) => s + 1), 1000)
    } catch {
      alert('Microphone access was denied.')
    }
  }

  const stop = () => {
    clearInterval(timerRef.current)
    const r = recRef.current
    if (r && r.state !== 'inactive') r.stop()
    setRecording(false)
  }

  const mm = String(Math.floor(secs / 60)).padStart(1, '0')
  const ss = String(secs % 60).padStart(2, '0')

  return recording ? (
    <button type="button" className="rec-btn on" onClick={stop} aria-label="Stop recording">
      <span className="rec-dot" /> {mm}:{ss} · stop
    </button>
  ) : (
    <button type="button" className="rec-btn" onClick={start} disabled={disabled} aria-label="Record voice note" title="Record voice note">🎙️</button>
  )
}
