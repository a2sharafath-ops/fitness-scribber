import { useState } from 'react'
import Card from '../../atoms/Card'
import Button from '../../atoms/Button'
import Avatar from '../../atoms/Avatar'
import Tag from '../../atoms/Tag'
import { fmtDate } from '../../../lib/dates'

// Athlete accounts + outstanding invite codes. Presentational only.
export default function AthleteManager({ athletes, clients, coachName, onToggleActive, onDelete, onReset }) {
  const [confirmId, setConfirmId] = useState(null)
  const clientOf = (userId) => clients.find((c) => c.userId === userId)
  const pendingInvites = clients.filter((c) => c.inviteCode)

  return (
    <div className="grid" style={{ gap: 14 }}>
      <div className="adm-table">
        <div className="adm-head adm-cols-ath">
          <span>Athlete</span><span>Linked client</span><span>Coach</span><span>Last sign-in</span><span>Status</span><span />
        </div>
        {athletes.map((u) => {
          const c = clientOf(u.id)
          const disabled = !!u.bannedUntil
          return (
            <div key={u.id} className="adm-row adm-cols-ath">
              <span className="adm-user">
                <Avatar name={u.displayName || u.email} size={34} />
                <span className="adm-id"><span className="n">{u.displayName || u.email}</span><span className="e">{u.email}</span></span>
              </span>
              <span>{c ? c.name : <span className="muted">unlinked</span>}</span>
              <span className="muted">{c ? coachName(c.coachId) : '—'}</span>
              <span className="muted">{u.lastSignInAt ? fmtDate(u.lastSignInAt.slice(0, 10)) : 'never'}</span>
              <span>{disabled ? <Tag color="red">deactivated</Tag> : <Tag color="green">active</Tag>}</span>
              <span className="flex gap adm-actions">
                <Button size="sm" variant="ghost" onClick={() => onReset(u.email)}>Reset pw</Button>
                <Button size="sm" variant="ghost" onClick={() => onToggleActive(u.id, disabled)}>{disabled ? 'Reactivate' : 'Deactivate'}</Button>
                {confirmId === u.id
                  ? <Button size="sm" variant="danger" onClick={() => { setConfirmId(null); onDelete(u.id) }}>Confirm delete</Button>
                  : <Button size="sm" variant="ghost" onClick={() => setConfirmId(u.id)}>Delete</Button>}
              </span>
            </div>
          )
        })}
        {!athletes.length && <div className="empty" style={{ padding: 30 }}>No athlete accounts yet.</div>}
      </div>

      <Card>
        <h3 style={{ fontSize: 15, marginBottom: 8 }}>Outstanding invite codes · {pendingInvites.length}</h3>
        {pendingInvites.length
          ? pendingInvites.map((c) => (
              <div key={c.id} className="flex gap" style={{ padding: '6px 0', alignItems: 'center', fontSize: 13 }}>
                <code>{c.inviteCode}</code>
                <span>{c.name}</span>
                <span className="muted">coach: {coachName(c.coachId)}</span>
              </div>
            ))
          : <p className="muted" style={{ fontSize: 13 }}>None — codes appear here when a coach generates an athlete invite that hasn't been redeemed yet.</p>}
      </Card>
    </div>
  )
}
