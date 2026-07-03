import { useState, useRef } from 'react'
import Button from '../atoms/Button'
import VoiceRecorder from './VoiceRecorder'

// Message input hub. Pure: raises onSend(text), onVoice(blob, seconds),
// onFile(file). Enter sends text, Shift+Enter newlines.
export default function ChatComposer({ onSend, onVoice, onFile, busy }) {
  const [text, setText] = useState('')
  const fileRef = useRef(null)

  const submit = () => {
    const t = text.trim()
    if (!t) return
    onSend(t)
    setText('')
  }
  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() }
  }
  const pickFile = (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (f && onFile) onFile(f)
  }

  return (
    <div className="chat-composer">
      {onFile && (
        <>
          <button type="button" className="rec-btn" onClick={() => fileRef.current?.click()} disabled={busy}
            aria-label="Attach a video or image" title="Attach form-check video / image">📎</button>
          <input ref={fileRef} type="file" accept="video/*,image/*,audio/*" hidden onChange={pickFile} />
        </>
      )}
      {onVoice && <VoiceRecorder onRecorded={onVoice} disabled={busy} />}
      <textarea
        value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKey}
        rows={1} placeholder={busy ? 'Uploading…' : 'Write a message…'} aria-label="Message" disabled={busy} />
      <Button size="sm" onClick={submit} disabled={busy || !text.trim()}>Send</Button>
    </div>
  )
}
