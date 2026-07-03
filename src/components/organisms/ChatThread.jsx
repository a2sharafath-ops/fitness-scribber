import { useEffect, useRef } from 'react'
import MessageBubble from '../molecules/MessageBubble'
import ChatComposer from '../molecules/ChatComposer'
import { useThread } from '../../hooks/useThread'
import { useMediaUrls } from '../../hooks/useMediaUrls'

// Feed + composer for one thread. `viewerRole` decides which side is "mine"
// and who a sent message comes from ('coach' in the trainer app, 'athlete' in
// the portal). Handles text, voice notes and file (form-check) attachments.
export default function ChatThread({ clientId, viewerRole, headerName, subtitle }) {
  const { messages, loading, uploading, send, sendVoice, sendFile } = useThread(clientId, viewerRole)
  const mediaUrls = useMediaUrls(messages)
  const feedRef = useRef(null)

  useEffect(() => {
    const el = feedRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  const guard = (fn) => async (...args) => {
    try { await fn(...args) } catch (e) { alert('Upload failed: ' + (e.message || 'unknown error')) }
  }

  return (
    <div className="chat-thread">
      {headerName ? (
        <div className="chat-head">
          <div className="chat-h-name">{headerName}</div>
          {subtitle ? <div className="chat-h-sub muted">{subtitle}</div> : null}
        </div>
      ) : null}
      <div className="chat-feed" ref={feedRef}>
        {loading ? (
          <div className="muted" style={{ padding: 16 }}>Loading…</div>
        ) : messages.length ? (
          messages.map((m) => (
            <MessageBubble key={m.id} {...m} mine={m.senderRole === viewerRole} mediaSrc={mediaUrls[m.id]} />
          ))
        ) : (
          <div className="empty" style={{ padding: 24 }}><div className="big">💬</div>No messages yet. Say hello.</div>
        )}
      </div>
      <ChatComposer onSend={send} onVoice={guard(sendVoice)} onFile={guard(sendFile)} busy={uploading} />
    </div>
  )
}
