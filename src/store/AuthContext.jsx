import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase, hasBackend } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [ready, setReady] = useState(!hasBackend)
  const [profile, setProfile] = useState(null)
  const [profileReady, setProfileReady] = useState(!hasBackend)

  useEffect(() => {
    if (!hasBackend) return
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true) })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const loadProfile = useCallback(async () => {
    if (!hasBackend || !session) { setProfile(null); setProfileReady(true); return }
    setProfileReady(false)
    const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle()
    setProfile(data || null)
    setProfileReady(true)
  }, [session])

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

  const value = {
    session,
    user: session?.user || null,
    ready,
    profile,
    role: profile?.role || null,
    profileReady,
    signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
    signUp: (email, password) => supabase.auth.signUp({ email, password }),
    signOut: () => supabase.auth.signOut(),
    becomeCoach,
    redeemInvite,
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
