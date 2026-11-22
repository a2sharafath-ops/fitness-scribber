import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, hasBackend } from '../lib/supabase'

const AuthContext = createContext(null)
const PROFILE_TIMEOUT_MS = 15_000

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [ready, setReady] = useState(!hasBackend)
  const [profileCheck, setProfileCheck] = useState(null)
  const [profileAttempt, setProfileAttempt] = useState(0)
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

  // Token refreshes keep the same profile. A different user or a retry must
  // finish its own check before the app can decide which workspace to show.
  const userId = session?.user?.id || null
  const currentCheck = profileCheck?.userId === userId && profileCheck.attempt === profileAttempt ? profileCheck : null
  const profile = currentCheck?.profile ?? null
  const refreshProfile = () => setProfileAttempt(attempt => attempt + 1)

  useEffect(() => {
    if (!hasBackend || !userId) {
      setProfileCheck(null)
      return
    }

    const controller = new AbortController()
    let active = true
    const fail = () => {
      if (active) {
        setProfileCheck({ userId, attempt: profileAttempt, error: { message: 'Check your connection and try again.' } })
      }
    }
    const timer = setTimeout(() => {
      controller.abort()
      fail()
    }, PROFILE_TIMEOUT_MS)

    async function checkProfile() {
      try {
        const { data, error } = await supabase.from('profiles').select('*').eq('id', userId)
          .abortSignal(controller.signal).maybeSingle()
        if (error) throw error
        if (active && !controller.signal.aborted) {
          setProfileCheck({ userId, attempt: profileAttempt, profile: data })
        }
      } catch {
        if (!controller.signal.aborted) fail()
      } finally {
        clearTimeout(timer)
      }
    }

    void checkProfile()
    return () => {
      active = false
      clearTimeout(timer)
      controller.abort()
    }
  }, [userId, profileAttempt])

  // Coach accounts are invite-only: the security-definer RPC only grants the
  // role when an admin invite matches this user's email.
  const becomeCoach = async () => {
    const { data, error } = await supabase.rpc('become_coach')
    if (error) return { error }
    if (data === 'not_invited') {
      return { error: { message: 'Coach accounts are invite-only. Ask your admin to send you an invite.' } }
    }
    refreshProfile()
    return {}
  }
  const redeemInvite = async (code) => {
    const { data, error } = await supabase.rpc('redeem_invite', { code: code.trim() })
    if (error) return { error }
    if (data === 'invalid') return { error: { message: 'Invalid or already-used invite code.' } }
    refreshProfile()
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
    profileReady: !userId || Boolean(currentCheck && !currentCheck.error),
    profileError: currentCheck?.error ?? null,
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
    refreshProfile,
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
