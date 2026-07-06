import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase, hasBackend } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [ready, setReady] = useState(!hasBackend)
  const [profile, setProfile] = useState(null)
  const [profileReady, setProfileReady] = useState(!hasBackend)
  // True after the user follows a password-reset email link — forces the
  // "set a new password" screen until they choose one.
  const [recovery, setRecovery] = useState(false)

  useEffect(() => {
    if (!hasBackend) return
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true) })
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  // Keyed on the user id, NOT the session object: supabase fires auth events on
  // every window refocus/token refresh with a fresh session object, and reloading
  // the profile then (profileReady=false) unmounts the whole app — which looks
  // like a full page refresh. The profile only needs reloading when the user changes.
  const userId = session?.user?.id || null
  const loadProfile = useCallback(async () => {
    if (!hasBackend || !userId) { setProfile(null); setProfileReady(true); return }
    setProfileReady(false)
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    setProfile(data || null)
    setProfileReady(true)
  }, [userId])

  useEffect(() => { loadProfile() }, [loadProfile])

  const becomeCoach = async () => {
    await supabase.from('profiles').upsert({ id: session.user.id, role: 'coach' })
    await loadProfile()
  }
  const redeemInvite = async (code) => {
    const { data, error } = await supabase.rpc('redeem_invite', { code: code.trim() })
    if (error) return { error }
    if (data === 'invalid') return { error: { message: 'Invalid or already-used invite code.' } }
    await loadProfile()
    return { clientId: data }
  }

  // Change the signed-in user's own password (also used to finish a reset).
  const updatePassword = async (password) => {
    const { error } = await supabase.auth.updateUser({ password })
    if (!error) setRecovery(false)
    return { error }
  }
  // Email a password-reset link that returns to this app.
  const sendPasswordReset = (email) =>
    supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin })

  const value = {
    session,
    user: session?.user || null,
    ready,
    profile,
    role: profile?.role || null,
    profileReady,
    recovery,
    signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
    signUp: (email, password) => supabase.auth.signUp({ email, password }),
    // Redirects to Google when the provider is configured in Supabase; otherwise
    // returns an error the caller surfaces as a toast (no broken redirect).
    signInWithGoogle: () => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } }),
    signOut: () => supabase.auth.signOut(),
    becomeCoach,
    redeemInvite,
    updatePassword,
    sendPasswordReset,
    refreshProfile: loadProfile,
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
