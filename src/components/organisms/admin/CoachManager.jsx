import { useState } from 'react'
import Card from '../../atoms/Card'
import Button from '../../atoms/Button'
import Field from '../../atoms/Field'
import Avatar from '../../atoms/Avatar'
import Tag from '../../atoms/Tag'
import { fmtDate } from '../../../lib/dates'

const ROLE_COLOR = { admin: 'purple', coach: 'blue', pending: 'gray' }

// Coach & admin account management. Pure/presentational: all data arrives via
// props; every action is raised to the page through callbacks.
export default function CoachManager({ users, clientCounts, currentUserId, busy, onCreate, onInvite, onToggleActive, onDelete, onSetRole, onReset, onView }) {
  const [mode, setMode] = useState(null) // null | 'create' | 'invite'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [confirmId, setConfirmId] = useState(null)

  const submit = async () => {
    if (mode === 'create') await onCreate(email.trim(), password, name.trim())
    else await onInvite(email.trim())
    setMode(null); setEmail(''); setPassword(''); setName('')
  }

  return (
    <div className="grid" style={{ gap: 14 }}>
      <Card>
        <div className="flex gap" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: 15 }}>Coaches & admins · {users.length}</h3>
          <div className="flex gap">
            <Button size="sm" onClick={() => setMode(mode === 'create' ? null : 'create')}>+ Create coach</Button>
            <Button size="sm" variant="ghost" onClick={() => setMode(mode === 'invite' ? null : 'invite')}>✉️ Invite by email</Button>
          </div>
        </div>

        {mode && (
          <div className="grid" style={{ gap: 10, marginTop: 14, maxWidth: 380 }}>
            <Field label="Email"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="coach@example.com" autoFocus /></Field>
            {mode === 'create' && (
              <>
                <Field label="Display name (optional)"><input value={name} onChange={(e) => setName(e.target.value)} /></Field>
                <Field label="Temporary password"><input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="min 6 characters" /></Field>
              </>
            )}
            <div className="flex gap">
              <Button onClick={submit} disabled={busy || !email.trim() || (mode === 'create' && password.length < 6)}>
                {busy ? 'Working…' : mode === 'create' ? 'Create account' : 'Send invite'}
              </Button>
              <Button variant="ghost" onClick={() => setMode(null)}>Cancel</Button>
            </div>
            {mode === 'invite' && <p className="muted" style={{ fontSize: 12 }}>They get an email link to set a password, then land straight in the coach app.</p>}
          </div>
        )}
      </Card>

      <div className="adm-table">
        <div className="adm-head adm-cols">
          <span>User</span><span>Role</span><span>Clients</span><span>Last sign-in</span><span>Status</span><span />
        </div>
        {users.map((u) => {
          const disabled = !!u.bannedUntil
          return (
            <div key={u.id} className="adm-row adm-cols">
              <span className="adm-user">
                <Avatar name={u.displayName || u.email} size={34} />
                <span className="adm-id"><span className="n">{u.displayName || u.email}</span><span className="e">{u.email}</span></span>
              </span>
              <span><Tag color={ROLE_COLOR[u.role] || 'gray'}>{u.role || 'no profile'}</Tag></span>
              <span>{clientCounts.get(u.id) || 0}</span>
              <span className="muted">{u.lastSignInAt ? fmtDate(u.lastSignInAt.slice(0, 10)) : 'never'}</span>
              <span>{disabled ? <Tag color="red">deactivated</Tag> : <Tag color="green">active</Tag>}</span>
              <span className="flex gap adm-actions">
                <Button size="sm" variant="ghost" onClick={() => onView(u)}>View data</Button>
                {u.role !== 'admin' && <Button size="sm" variant="ghost" onClick={() => onSetRole(u.id, 'admin')}>Make admin</Button>}
                {u.role === 'admin' && u.id !== currentUserId && <Button size="sm" variant="ghost" onClick={() => onSetRole(u.id, 'coach')}>Make coach</Button>}
                <Button size="sm" variant="ghost" onClick={() => onReset(u.email)}>Reset pw</Button>
                {u.id !== currentUserId && (
                  <>
                    <Button size="sm" variant="ghost" onClick={() => onToggleActive(u.id, disabled)}>{disabled ? 'Reactivate' : 'Deactivate'}</Button>
                    {confirmId === u.id
                      ? <Button size="sm" variant="danger" onClick={() => { setConfirmId(null); onDelete(u.id) }}>Confirm delete</Button>
                      : <Button size="sm" variant="ghost" onClick={() => setConfirmId(u.id)}>Delete</Button>}
                  </>
                )}
              </span>
            </div>
          )
        })}
        {!users.length && <div className="empty" style={{ padding: 30 }}>No coach accounts yet.</div>}
      </div>
    </div>
  )
}
