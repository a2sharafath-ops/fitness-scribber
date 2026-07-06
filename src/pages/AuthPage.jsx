import { useState } from 'react'
import Button from '../components/atoms/Button'
import Icon from '../components/atoms/Icon'
import { useAuth } from '../store/AuthContext'
import { toast } from '../lib/toast'

// Copy per mode — mirrors the Cureocity "01 · Login / Sign up" Figma frame,
// adapted for the three auth flows the backend supports.
const COPY = {
  signin: { h: 'Welcome back', sub: 'Sign in to your trainer studio', cta: 'Sign in' },
  signup: { h: 'Create your account', sub: 'Start your trainer studio', cta: 'Create account' },
  reset: { h: 'Reset your password', sub: "We'll email you a reset link", cta: 'Send reset link' },
}

export default function AuthPage() {
  const { signIn, signUp, sendPasswordReset, signInWithGoogle } = useAuth()
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [remember, setRemember] = useState(true)
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

  const google = async () => {
    const { error } = await signInWithGoogle()
    if (error) toast('Google sign-in isn’t enabled yet.', 'error')
  }

  const copy = COPY[mode]
  const cta = busy ? 'Please wait…' : copy.cta

  return (
    <div className="auth-wrap">
      <aside className="auth-brand">
        <div className="auth-brandmark">
          <span className="auth-logo"><img src="/cureocity-logo.png" alt="Cureocity" /></span>
          <span className="auth-brand-name">Cureocity</span>
        </div>
        <div className="auth-spacer" />
        <div className="auth-hero">
          <h2>Coach smarter.<br />Every client, one studio.</h2>
          <p>Programs, schedules, health insights and Curio Ai — everything your coaching practice needs in one place.</p>
        </div>
        <div className="auth-spacer" />
        <figure className="auth-quote">
          <blockquote>“I cut my admin time in half. My clients feel the difference every week.”</blockquote>
          <figcaption>Maya Chen · Strength coach, Berlin</figcaption>
        </figure>
      </aside>

      <main className="auth-panel">
        <div className="auth-card">
          <div className="auth-head">
            <h1 className="auth-h">{copy.h}</h1>
            <p className="auth-sub">{copy.sub}</p>
          </div>

          <form onSubmit={submit} className="auth-form">
            <label className="auth-field">
              <span className="auth-label">Email</span>
              <input className="auth-input" type="email" value={email} placeholder="alex@cureocity.studio"
                onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </label>

            {mode !== 'reset' && (
              <label className="auth-field">
                <span className="auth-label">Password</span>
                <span className="auth-input-wrap">
                  <input className="auth-input" type={showPw ? 'text' : 'password'} value={password}
                    onChange={(e) => setPassword(e.target.value)} required
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} />
                  <button type="button" className="auth-eye" aria-label={showPw ? 'Hide password' : 'Show password'}
                    aria-pressed={showPw} onClick={() => setShowPw((s) => !s)}>
                    <Icon name={showPw ? 'eyeOff' : 'eye'} size={18} />
                  </button>
                </span>
              </label>
            )}

            {mode === 'signin' && (
              <div className="auth-meta">
                <label className="auth-remember">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                  Remember me for 30 days
                </label>
                <button type="button" className="auth-link" onClick={() => go('reset')}>Forgot password?</button>
              </div>
            )}

            {msg && <div className={'auth-msg ' + msg.type}>{msg.text}</div>}

            <Button type="submit" className="auth-submit" disabled={busy}>{cta}</Button>
          </form>

          {mode !== 'reset' && (
            <>
              <div className="auth-divider"><span /> or <span /></div>
              <button type="button" className="auth-google" onClick={google}>
                <span className="auth-g">G</span> Continue with Google
              </button>
            </>
          )}

          <div className="auth-foot">
            {mode === 'reset' ? (
              <button type="button" className="auth-link" onClick={() => go('signin')}>← Back to sign in</button>
            ) : mode === 'signin' ? (
              <><span className="muted">New to Cureocity?</span><button type="button" className="auth-link" onClick={() => go('signup')}>Create an account</button></>
            ) : (
              <><span className="muted">Have an account?</span><button type="button" className="auth-link" onClick={() => go('signin')}>Sign in</button></>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
