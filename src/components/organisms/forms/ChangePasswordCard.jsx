import { useState } from 'react'
import Card from '../../atoms/Card'
import Button from '../../atoms/Button'
import Field from '../../atoms/Field'
import { useAuth } from '../../../store/AuthContext'

// Self-contained "change my password" card. Works anywhere a signed-in user
// is present (coach Settings, athlete portal) — no modal/provider dependency.
export default function ChangePasswordCard({ style }) {
  const { updatePassword } = useAuth()
  const [open, setOpen] = useState(false)
  const [pw, setPw] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)

  const close = () => { setOpen(false); setPw(''); setConfirm(''); setMsg(null) }

  const submit = async (e) => {
    e.preventDefault()
    if (pw.length < 8) { setMsg({ type: 'err', text: 'Use at least 8 characters.' }); return }
    if (pw !== confirm) { setMsg({ type: 'err', text: 'Passwords do not match.' }); return }
    setBusy(true); setMsg(null)
    const { error } = await updatePassword(pw)
    setBusy(false)
    if (error) { setMsg({ type: 'err', text: error.message }); return }
    setOpen(false); setPw(''); setConfirm(''); setMsg({ type: 'ok', text: 'Password updated.' })
  }

  return (
    <Card style={style}>
      <div className="section-title" style={{ margin: '0 0 8px' }}>Password</div>
      {!open ? (
        <>
          {msg?.type === 'ok' && <p style={{ fontSize: 13, color: 'var(--green)', marginBottom: 10 }}>{msg.text}</p>}
          <Button variant="ghost" onClick={() => { setMsg(null); setOpen(true) }}>🔑 Change password</Button>
        </>
      ) : (
        <form onSubmit={submit}>
          <Field label="New password">
            <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} required minLength={8} autoComplete="new-password" />
          </Field>
          <Field label="Confirm new password">
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" />
          </Field>
          {msg?.type === 'err' && <p style={{ fontSize: 12, color: '#fb404a', marginBottom: 10 }}>{msg.text}</p>}
          <div className="flex gap">
            <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Update password'}</Button>
            <Button type="button" variant="ghost" onClick={close}>Cancel</Button>
          </div>
        </form>
      )}
    </Card>
  )
}
