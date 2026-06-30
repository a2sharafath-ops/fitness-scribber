import { useState } from 'react'
import Button from '../components/atoms/Button'
import Field from '../components/atoms/Field'
import { useAuth } from '../store/AuthContext'

export default function AuthPage() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setMsg(null)
    const fn = mode === 'signin' ? signIn : signUp
    const { error } = await fn(email.trim(), password)
    setBusy(false)
    if (error) setMsg({ type: 'err', text: error.message })
    else if (mode === 'signup') setMsg({ type: 'ok', text: 'Account created. Check your email to confirm, then sign in.' })
  }

  return (
    <div id="app" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ width: 360, maxWidth: '92vw' }}>
        <div className="brand" style={{ padding: '0 0 18px' }}><span className="logo" aria-hidden="true">💪</span><span>FitScribe</span></div>
        <h2 style={{ fontSize: 18, marginBottom: 4 }}>{mode === 'signin' ? 'Coach sign in' : 'Create coach account'}</h2>
        <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>Your athletes' data is private to your account.</p>
        <form onSubmit={submit}>
          <Field label="Email"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></Field>
          <Field label="Password"><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} /></Field>
          {msg && <div style={{ fontSize: 12, marginBottom: 10, color: msg.type === 'err' ? '#ff7b6b' : 'var(--green)' }}>{msg.text}</div>}
          <Button type="submit" disabled={busy} style={{ width: '100%' }}>{busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Sign up'}</Button>
        </form>
        <div style={{ marginTop: 14, textAlign: 'center', fontSize: 13 }}>
          <button className="back" style={{ margin: 0 }} onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setMsg(null) }}>
            {mode === 'signin' ? "Need an account? Sign up" : 'Have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  )
}
