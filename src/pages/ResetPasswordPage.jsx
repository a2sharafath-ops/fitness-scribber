import { useState } from 'react'
import Button from '../components/atoms/Button'
import Field from '../components/atoms/Field'
import { useAuth } from '../store/AuthContext'

// Shown after the user follows a password-reset email link. On success the
// recovery flag clears and the app drops back into its normal routes.
export default function ResetPasswordPage() {
  const { updatePassword, signOut } = useAuth()
  const [pw, setPw] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    if (pw.length < 8) { setMsg('Use at least 8 characters.'); return }
    if (pw !== confirm) { setMsg('Passwords do not match.'); return }
    setBusy(true); setMsg(null)
    const { error } = await updatePassword(pw)
    setBusy(false)
    if (error) setMsg(error.message)
  }

  return (
    <div id="app" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ width: 360, maxWidth: '92vw' }}>
        <div className="brand" style={{ padding: '0 0 18px' }}><span className="logo" aria-hidden="true">💪</span><span>FitScribe</span></div>
        <h2 style={{ fontSize: 18, marginBottom: 4 }}>Set a new password</h2>
        <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>Choose a new password for your account.</p>
        <form onSubmit={submit}>
          <Field label="New password"><input type="password" value={pw} onChange={(e) => setPw(e.target.value)} required minLength={8} autoComplete="new-password" /></Field>
          <Field label="Confirm new password"><input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" /></Field>
          {msg && <div style={{ fontSize: 12, marginBottom: 10, color: '#fb404a' }}>{msg}</div>}
          <Button type="submit" disabled={busy} style={{ width: '100%' }}>{busy ? 'Saving…' : 'Update password'}</Button>
        </form>
        <div style={{ marginTop: 14, textAlign: 'center', fontSize: 13 }}>
          <button className="back" style={{ margin: 0 }} onClick={signOut}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
