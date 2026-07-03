import { fmtTime } from '../../lib/dates'

const dur = (s) => (s ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : '')

// One chat message. `mediaSrc` is a resolved (signed) URL supplied by the
// parent for non-text kinds; presentational only.
export default function MessageBubble({ body, kind = 'text', mine, createdAt, durationSec, mediaSrc }) {
  // Automated reminders/nudges render as a centered notice, not a chat bubble.
  if (kind === 'system') {
    return <div className="msg-system"><span>{body}</span><span className="msg-sys-time">{fmtTime(createdAt)}</span></div>
  }
  return (
    <div className={'msg-row' + (mine ? ' mine' : '')}>
      <div className="msg-bubble">
        {kind === 'text' && <span>{body}</span>}

        {kind === 'voice' && (mediaSrc
          ? <span className="msg-voice"><audio controls src={mediaSrc} />{durationSec ? <span className="msg-dur">{dur(durationSec)}</span> : null}</span>
          : <span className="muted">Loading voice note…</span>)}

        {kind === 'video' && (mediaSrc
          ? <video className="msg-video" controls src={mediaSrc} />
          : <span className="muted">Loading video…</span>)}

        {kind === 'image' && (mediaSrc
          ? <img className="msg-image" alt="attachment" src={mediaSrc} />
          : <span className="muted">Loading image…</span>)}

        {(kind === 'video') && body ? <div className="msg-cap">{body}</div> : null}

        <span className="msg-time">{fmtTime(createdAt)}</span>
      </div>
    </div>
  )
}
