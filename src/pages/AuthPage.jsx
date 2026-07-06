import { useState } from 'react'
import Button from '../components/atoms/Button'
import Field from '../components/atoms/Field'
import { useAuth } from '../store/AuthContext'

const TITLES = { signin: 'Coach sign in', signup: 'Create coach account', reset: 'Reset your password' }

export default function AuthPage() {
  const { signIn, signUp, sendPasswordReset } = useAuth()
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)

  const go = (m) => { setMode(m); setMsg(null) }

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setMsg(null)
    if (mode === 'reset') {
      const { error } = await sendPasswordReset(email)
      setBusy(false)
      setMsg(error ? { type: 'err', text: error.message } : { type: 'ok', text: 'If that email has an account, a reset link is on its way. Check your inbox.' })
      return
    }
    const fn = mode === 'signin' ? signIn : signUp
    const { error } = await fn(email.trim(), password)
    setBusy(false)
    if (error) setMsg({ type: 'err', text: error.message })
    else if (mode === 'signup') setMsg({ type: 'ok', text: 'Account created. Check your email to confirm, then sign in.' })
  }

  const cta = busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Sign up' : 'Send reset link'

  return (
    <div id="app" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ width: 360, maxWidth: '92vw' }}>
        <div className="brand" style={{ padding: '0 0 18px' }}><span className="logo" aria-hidden="true">💪</span><span>FitScribe</span></div>
        <h2 style={{ fontSize: 18, marginBottom: 4 }}>{TITLES[mode]}</h2>
        <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
          {mode === 'reset' ? "Enter your account email and we'll send you a reset link." : "Your athletes' data is private to your account."}
        </p>
        <form onSubmit={submit}>
          <Field label="Email"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></Field>
          {mode !== 'reset' && (
            <Field label="Password"><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} /></Field>
          )}
          {msg && <div style={{ fontSize: 12, marginBottom: 10, color: msg.type === 'err' ? '#fb404a' : 'var(--green)' }}>{msg.text}</div>}
          <Button type="submit" disabled={busy} style={{ width: '100%' }}>{cta}</Button>
        </form>
        {mode === 'signin' && (
          <div style={{ marginTop: 10, textAlign: 'center', fontSize: 13 }}>
            <button className="back" style={{ margin: 0 }} onClick={() => go('reset')}>Forgot password?</button>
          </div>
        )}
        <div style={{ marginTop: mode === 'signin' ? 6 : 14, textAlign: 'center', fontSize: 13 }}>
          {mode === 'reset' ? (
            <button className="back" style={{ margin: 0 }} onClick={() => go('signin')}>← Back to sign in</button>
          ) : (
            <button className="back" style={{ margin: 0 }} onClick={() => go(mode === 'signin' ? 'signup' : 'signin')}>
              {mode === 'signin' ? 'Need an account? Sign up' : 'Have an account? Sign in'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
