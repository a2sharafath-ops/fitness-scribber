import { useState } from 'react'
import Button from '../components/atoms/Button'
import Field from '../components/atoms/Field'
import { useAuth } from '../store/AuthContext'

// Shown once for a brand-new account that has no profile yet.
export default function RoleOnboarding() {
  const { becomeCoach, redeemInvite, signOut } = useAuth()
  const [mode, setMode] = useState(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const redeem = async () => {
    setBusy(true); setErr(null)
    const { error } = await redeemInvite(code)
    setBusy(false)
    if (error) setErr(error.message)
  }

  return (
    <div id="app" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ width: 400, maxWidth: '92vw' }}>
        <div className="brand" style={{ padding: '0 0 14px' }}><span className="logo" aria-hidden="true">💪</span><span>FitScribe</span></div>
        {!mode && (
          <>
            <h2 style={{ fontSize: 18, marginBottom: 4 }}>Welcome — how will you use FitScribe?</h2>
            <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>Pick one to set up your account.</p>
            <div className="grid" style={{ gap: 10 }}>
              <Button onClick={becomeCoach}>🏋️ I'm a coach — manage athletes</Button>
              <Button variant="ghost" onClick={() => setMode('athlete')}>🎟️ I have an invite code (athlete)</Button>
            </div>
          </>
        )}
        {mode === 'athlete' && (
          <>
            <h2 style={{ fontSize: 18, marginBottom: 4 }}>Enter your invite code</h2>
            <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>Your coach generated this for you.</p>
            <Field label="Invite code"><input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. 7KQ2-9F" autoFocus /></Field>
            {err && <div style={{ fontSize: 12, color: '#ff7b6b', marginBottom: 10 }}>{err}</div>}
            <div className="flex gap">
              <Button onClick={redeem} disabled={busy || !code.trim()}>{busy ? 'Linking…' : 'Link my account'}</Button>
              <Button variant="ghost" onClick={() => { setMode(null); setErr(null) }}>Back</Button>
            </div>
          </>
        )}
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <button className="back" style={{ margin: 0, fontSize: 12 }} onClick={signOut}>Sign out</button>
        </div>
      </div>
    </div>
  )
}
