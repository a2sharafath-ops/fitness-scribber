import Card from '../../atoms/Card'
import Button from '../../atoms/Button'
import Avatar from '../../atoms/Avatar'
import Tag from '../../atoms/Tag'
import { fmtDate } from '../../../lib/dates'

// Read-only drill-in: one coach's client roster. Admin RLS is select-only,
// so nothing here mutates — oversight, not editing.
export default function CoachDataPanel({ coach, clients, onBack }) {
  return (
    <Card>
      <div className="flex gap" style={{ alignItems: 'center', marginBottom: 12 }}>
        <Button size="sm" variant="ghost" onClick={onBack}>← All users</Button>
        <Avatar name={coach.displayName || coach.email} size={34} />
        <div>
          <div style={{ fontWeight: 600 }}>{coach.displayName || coach.email}</div>
          <div className="muted" style={{ fontSize: 12 }}>{coach.email} · read-only view</div>
        </div>
      </div>

      <div className="adm-table">
        <div className="adm-head adm-cols-cli">
          <span>Client</span><span>Status</span><span>Joined</span><span>Portal login</span>
        </div>
        {clients.map((c) => (
          <div key={c.id} className="adm-row adm-cols-cli">
            <span className="adm-user">
              <Avatar name={c.name} size={30} />
              <span className="adm-id"><span className="n">{c.name}</span><span className="e">{c.email || ''}</span></span>
            </span>
            <span><Tag color={c.status === 'active' ? 'green' : 'gray'}>{c.status || '—'}</Tag></span>
            <span className="muted">{c.joined ? fmtDate(c.joined) : '—'}</span>
            <span>{c.userId ? <Tag color="blue">linked</Tag> : <span className="muted">none</span>}</span>
          </div>
        ))}
        {!clients.length && <div className="empty" style={{ padding: 30 }}>This coach has no clients yet.</div>}
      </div>
    </Card>
  )
}
