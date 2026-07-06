import { useState } from 'react'
import ModalShell from '../molecules/ModalShell'
import Button from '../atoms/Button'
import Avatar from '../atoms/Avatar'
import { useModal } from '../../store/ModalContext'
import { sendBroadcast } from '../../api/messages'
import { toast } from '../../lib/toast'

// Coach composes one update and fans it out to the chosen athletes. Each
// recipient receives it in their own thread (via api/messages.sendBroadcast).
export default function BroadcastComposer({ clients = [], onSent }) {
  const { closeModal } = useModal()
  const [selected, setSelected] = useState(() => new Set())
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)

  const allOn = clients.length > 0 && selected.size === clients.length
  const toggleAll = () => setSelected(allOn ? new Set() : new Set(clients.map((c) => c.id)))
  const toggle = (id) => setSelected((prev) => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })

  const count = selected.size
  const canSend = count > 0 && body.trim() && !busy

  const send = async () => {
    if (!canSend) return
    setBusy(true)
    try {
      const { count: n } = await sendBroadcast({ clientIds: [...selected], body })
      onSent?.(n)
      closeModal()
    } catch (e) {
      setBusy(false)
      toast('Broadcast failed: ' + (e.message || 'unknown error'), 'error')
    }
  }

  return (
    <ModalShell
      title="📣 Broadcast message"
      onClose={closeModal}
      footer={(
        <>
          <Button variant="ghost" onClick={closeModal}>Cancel</Button>
          <Button onClick={send} disabled={!canSend}>{busy ? 'Sending…' : `Send to ${count || 0}`}</Button>
        </>
      )}
    >
      <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
        Sends the same message to each selected athlete in their own chat thread.
      </p>

      <div className="flex between" style={{ marginBottom: 6 }}>
        <span className="section-title" style={{ margin: 0, fontSize: 13 }}>Recipients</span>
        <label className="bc-all">
          <input type="checkbox" checked={allOn} onChange={toggleAll} /> Select all ({clients.length})
        </label>
      </div>

      <div className="bc-list">
        {clients.map((c) => (
          <label key={c.id} className={'bc-row' + (selected.has(c.id) ? ' on' : '')}>
            <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
            <Avatar name={c.name} size={28} />
            <span className="bc-name">{c.name}</span>
          </label>
        ))}
        {!clients.length && <div className="muted" style={{ padding: 10 }}>No clients to message.</div>}
      </div>

      <label className="section-title" style={{ margin: '12px 0 6px', fontSize: 13, display: 'block' }}>Message</label>
      <textarea
        className="bc-body" value={body} onChange={(e) => setBody(e.target.value)}
        rows={4} placeholder="e.g. Reminder: deload week starts Monday — keep RPE ≤ 7." aria-label="Broadcast message" />
    </ModalShell>
  )
}
