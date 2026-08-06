// Admin API — the only door for admin features.
// User management goes through the `admin-users` edge function (service role).
// Read-only oversight queries hit Postgres directly (RLS `admin_reads` policies).
import { supabase } from '../lib/supabase'
import { callFunction } from './functions'

// Unwrap the function's own error message (supabase-js buries the response
// body of a non-2xx edge function response inside error.context).
const call = async (action, body = {}) => {
  try {
    return await callFunction('admin-users', { action, ...body })
  } catch (e) {
    let msg = e.message
    try { msg = (await e.context.json()).error || msg } catch { /* keep original */ }
    throw new Error(msg)
  }
}

export const listUsers = () => call('list').then((d) => d.users)
export const createCoach = (email, password, displayName) => call('create', { email, password, displayName })
export const inviteCoach = (email) => call('invite', { email })
export const deactivateUser = (id) => call('deactivate', { id })
export const reactivateUser = (id) => call('reactivate', { id })
export const deleteUser = (id) => call('delete', { id })
export const setUserRole = (id, role) => call('setRole', { id, role })

// Email a password-reset link (works for any user's email).
export const sendPasswordReset = (email) =>
  supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })

// All client rows across every coach (admin RLS read).
export async function listAllClients() {
  const { data, error } = await supabase
    .from('clients')
    .select('"id", "name", "email", "status", "joined", "coachId", "userId", "inviteCode"')
  if (error) throw error
  return data || []
}

// Platform-wide row counts for the overview KPIs.
export async function platformCounts() {
  const tables = ['sessions', 'workouts', 'wellness', 'srpe']
  const out = {}
  await Promise.all(tables.map(async (t) => {
    const { count } = await supabase.from(t).select('"id"', { count: 'exact', head: true })
    out[t] = count ?? 0
  }))
  return out
}
