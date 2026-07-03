import ConversationItem from '../molecules/ConversationItem'
import { fmtTime } from '../../lib/dates'

// Coach's client list ordered by most-recent message. `byClient` comes from
// useConversations; `clients` from the store (names/avatars).
export default function ConversationList({ clients, byClient, selectedId, onSelect }) {
  const sorted = [...clients].sort((a, b) => {
    const la = byClient[a.id]?.last?.createdAt || ''
    const lb = byClient[b.id]?.last?.createdAt || ''
    return lb.localeCompare(la)
  })
  const preview = (last) => (!last ? '' : (last.kind === 'text' || last.kind === 'system') ? last.body : '[' + last.kind + ']')

  return (
    <div className="conv-list">
      {sorted.map((c) => {
        const g = byClient[c.id]
        return (
          <ConversationItem
            key={c.id} name={c.name} preview={preview(g?.last)} unread={g?.unread || 0}
            time={g?.last ? fmtTime(g.last.createdAt) : ''} active={c.id === selectedId}
            onClick={() => onSelect(c.id)} />
        )
      })}
      {!clients.length ? <div className="muted" style={{ padding: 12 }}>No clients yet.</div> : null}
    </div>
  )
}
