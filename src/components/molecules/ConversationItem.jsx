import Avatar from '../atoms/Avatar'

// A single row in the coach's conversation list. `time` arrives pre-formatted.
export default function ConversationItem({ name, preview, unread = 0, time, active, onClick }) {
  return (
    <button className={'conv-item' + (active ? ' active' : '')} onClick={onClick} aria-label={'Chat with ' + name}>
      <Avatar name={name} size={38} />
      <div className="conv-main">
        <div className="conv-top">
          <span className="conv-name">{name}</span>
          {time ? <span className="conv-time">{time}</span> : null}
        </div>
        <div className="conv-preview">{preview || 'No messages yet'}</div>
      </div>
      {unread > 0 ? <span className="conv-badge">{unread}</span> : null}
    </button>
  )
}
