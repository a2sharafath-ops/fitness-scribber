// Supabase data layer. Loads the signed-in coach's whole dataset into the
// existing store shape, and persists store changes by diffing collections by id —
// so every existing `commit(db => ...)` call site keeps working unchanged.
import { supabase, TABLES } from '../lib/supabase'
import { seed } from '../lib/seed'

const stripOwner = (rows) => rows.map(({ coachId: _own, ...r }) => r)
const byId = (arr) => Object.fromEntries((arr || []).map((r) => [r.id, r]))
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b)

export async function fetchAll() {
  const db = {}
  for (const t of TABLES) {
    const { data, error } = await supabase.from(t).select('*')
    if (error) throw error
    db[t] = stripOwner(data || [])
  }
  const { data: s } = await supabase.from('settings').select('*').maybeSingle()
  const { coachId: _own, ...settings } = s || {}
  db.settings = { trainerName: '', businessName: '', units: 'kg', tz: '', ...settings }
  // defensive defaults so pure calc never sees undefined nested fields
  db.clients.forEach((c) => {
    if (!c.anthro) c.anthro = { age: null, heightCm: null, massKg: null, bodyFatPct: null, leanMassKg: null }
    if (!c.intake) c.intake = { questionnaire: '', medical: '', injury: '', diet: '' }
    if (c.monitorOptIn == null) c.monitorOptIn = false
  })
  return db
}

export async function persistDiff(prev, next) {
  for (const t of TABLES) {
    const a = byId(prev[t]), b = byId(next[t])
    const ups = (next[t] || []).filter((r) => !a[r.id] || !eq(a[r.id], r))
    const dels = (prev[t] || []).filter((r) => !b[r.id]).map((r) => r.id)
    if (ups.length) { const { error } = await supabase.from(t).upsert(ups); if (error) console.error(t, 'upsert', error) }
    if (dels.length) { const { error } = await supabase.from(t).delete().in('id', dels); if (error) console.error(t, 'delete', error) }
  }
  if (!eq(prev.settings, next.settings)) {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('settings').upsert({ coachId: user.id, ...next.settings })
    if (error) console.error('settings', error)
  }
}

// One-time demo data load for a fresh coach account.
export async function seedRemote() {
  const data = seed()
  for (const t of TABLES) {
    if (data[t]?.length) { const { error } = await supabase.from(t).upsert(data[t]); if (error) throw error }
  }
  const { data: { user } } = await supabase.auth.getUser()
  await supabase.from('settings').upsert({ coachId: user.id, ...data.settings })
}
