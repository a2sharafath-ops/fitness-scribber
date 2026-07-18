// Supabase data layer. Loads the signed-in coach's whole dataset into the
// existing store shape, and persists store changes by diffing collections by id —
// so every existing `commit(db => ...)` call site keeps working unchanged.
import { supabase, TABLES } from '../lib/supabase'
import { seed } from '../lib/seed'
import { ensureProgramShape } from '../lib/program'

const stripOwner = (rows) => rows.map(({ coachId: _own, ...r }) => r)
const byId = (arr) => Object.fromEntries((arr || []).map((r) => [r.id, r]))
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b)

export async function fetchAll() {
  const db = {}
  const loadIssues = []
  for (const t of TABLES) {
    const { data, error } = await supabase.from(t).select('*')
    // Be resilient to a table that hasn't been migrated yet (e.g. workouts before
    // schema_workouts.sql is applied) — fall back to empty instead of breaking load,
    // but record the failure so the UI can surface it (a missing table means those
    // records can never save, which must not be silent).
    if (error) { console.warn('fetch', t, 'failed:', error.message); db[t] = []; loadIssues.push({ table: t, message: error.message }); continue }
    db[t] = stripOwner(data || [])
  }
  const { data: s } = await supabase.from('settings').select('*').maybeSingle()
  const { coachId: _own, ...settings } = s || {}
  db.settings = { trainerName: '', businessName: '', units: 'kg', tz: '', ...settings }
  // defensive defaults so pure calc never sees undefined nested fields
  db.clients.forEach((c) => {
    if (!c.anthro) c.anthro = { age: null, heightCm: null, massKg: null, bodyFatPct: null, leanMassKg: null }
    if (c.monitorOptIn == null) c.monitorOptIn = false
  })
  // Blocks upgrade for rows written before schema_program.sql was applied.
  ensureProgramShape(db)
  if (loadIssues.length) db._loadIssues = loadIssues
  return db
}

// Returns the tables whose write (upsert/delete) failed — usually a missing
// column or table — so the UI can surface that a change wasn't saved instead of
// failing silently. An empty array means everything persisted.
export async function persistDiff(prev, next) {
  const issues = []
  for (const t of TABLES) {
    const a = byId(prev[t]), b = byId(next[t])
    const ups = (next[t] || []).filter((r) => !a[r.id] || !eq(a[r.id], r))
    const dels = (prev[t] || []).filter((r) => !b[r.id]).map((r) => r.id)
    if (ups.length) { const { error } = await supabase.from(t).upsert(ups); if (error) { console.error(t, 'upsert', error); issues.push({ table: t, message: error.message, kind: 'write' }) } }
    if (dels.length) { const { error } = await supabase.from(t).delete().in('id', dels); if (error) { console.error(t, 'delete', error); issues.push({ table: t, message: error.message, kind: 'write' }) } }
  }
  if (!eq(prev.settings, next.settings)) {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('settings').upsert({ coachId: user.id, ...next.settings })
    if (error) { console.error('settings', error); issues.push({ table: 'settings', message: error.message, kind: 'write' }) }
  }
  return issues
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
