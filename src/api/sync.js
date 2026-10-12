// Supabase data layer. Loads the signed-in coach's whole dataset into the
// existing store shape, and persists store changes by diffing collections by id —
// so every existing `commit(db => ...)` call site keeps working unchanged.
import { supabase, TABLES } from '../lib/supabase'
import { ensureLibrary } from '../lib/programLibrary'
import { seed } from '../lib/seed'
import { ensureProgramShape } from '../lib/program'

const stripOwner = (rows) => rows.map(({ coachId: _own, requestHash: _receipt, ...r }) => r)
const byId = (arr) => Object.fromEntries((arr || []).map((r) => [r.id, r]))
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b)

export async function fetchAll(client = supabase) {
  const db = {}
  const loadIssues = []
  const { data: { user } } = await client.auth.getUser()
  if (!user?.id) throw new Error('Your sign-in expired. Please sign in again before loading data.')
  for (const t of TABLES) {
    const { data, error } = await client.from(t).select('*')
    // Be resilient to a table that hasn't been migrated yet (e.g. workouts before
    // schema_workouts.sql is applied) — fall back to empty instead of breaking load,
    // but record the failure so the UI can surface it (a missing table means those
    // records can never save, which must not be silent).
    if (error) { console.warn('fetch', t, 'failed:', error.message); db[t] = []; loadIssues.push({ table: t, message: error.message }); continue }
    db[t] = stripOwner(data || [])
  }
  const { data: s } = await client.from('settings').select('*').maybeSingle()
  const { coachId: _own, ...settings } = s || {}
  db.settings = { trainerName: '', businessName: '', units: 'kg', tz: '', ...settings }
  // defensive defaults so pure calc never sees undefined nested fields
  db.clients.forEach((c) => {
    if (!c.anthro) c.anthro = { age: null, heightCm: null, massKg: null, bodyFatPct: null, leanMassKg: null }
    if (c.monitorOptIn == null) c.monitorOptIn = false
  })
  // Blocks upgrade for rows written before schema_program.sql was applied.
  ensureProgramShape(db, user.id)
  ensureLibrary(db)
  if (loadIssues.length) db._loadIssues = loadIssues
  return db
}

// Returns the tables whose write (upsert/delete) failed — usually a missing
// column or table — so the UI can surface that a change wasn't saved instead of
// failing silently. An empty array means everything persisted.
export async function persistDiff(prev, next, client = supabase) {
  const issues = []
  const newAssignments = (next.programAssignments || []).filter(a => !(prev.programAssignments || []).some(p => p.id === a.id))
  const groupedBookingIds = new Set(newAssignments.flatMap(a => (a.data.initialBookings || []).map(s => s.id)))
  const groupedIds = new Set(newAssignments.flatMap(a => a.data.schedule.map(s => s.prescriptionId)))
  for (const assignment of newAssignments) {
    const rows = assignment.data.schedule.map(s => next.prescriptions.find(p => p.id === s.prescriptionId))
    if (rows.some(r => !r)) {
      issues.push({ table: 'programAssignments', kind: 'write', message: 'An unsaved assignment has missing sessions. Restore it before retrying.' })
      continue
    }
    const expected = rows.map(row => prev.prescriptions.find(p => p.clientId === row.clientId && p.date === row.date) || null)
    try { await saveAssignmentRemote({ assignment, prescriptions: rows, expected }, client) }
    catch (error) { issues.push({ table: 'programAssignments', kind: 'write', message: error.message }) }
  }
  for (const t of TABLES) {
    const a = byId(prev[t]), b = byId(next[t])
    const ups = (next[t] || []).filter((r) => (!a[r.id] || !eq(a[r.id], r))
      && !(t === 'sessions' && groupedBookingIds.has(r.id))
      && !(t === 'prescriptions' && groupedIds.has(r.id))
      && !(t === 'programAssignments' && newAssignments.some(p => p.id === r.id)))
    const dels = (prev[t] || []).filter((r) => !b[r.id]).map((r) => r.id)
    if (ups.length) { const { error } = await client.from(t).upsert(ups); if (error) { console.error(t, 'upsert', error); issues.push({ table: t, message: error.message, kind: 'write' }) } }
    if (dels.length) { const { error } = await client.from(t).delete().in('id', dels); if (error) { console.error(t, 'delete', error); issues.push({ table: t, message: error.message, kind: 'write' }) } }
  }
  if (!eq(prev.settings, next.settings)) {
    const { data: { user } } = await client.auth.getUser()
    const { error } = await client.from('settings').upsert({ coachId: user.id, ...next.settings })
    if (error) { console.error('settings', error); issues.push({ table: 'settings', message: error.message, kind: 'write' }) }
  }
  return issues
}

// Client deletion must bypass persistDiff: separate table requests can leave a
// partially deleted client if a later foreign key blocks the clients request.
export async function deleteClientRemote(clientId, client = supabase) {
  const { error } = await client.rpc('delete_client_and_data', { p_client_id: clientId })
  if (error) throw error
}

export async function saveScheduleRemote(request, client = supabase) {
  const { error } = await client.rpc('save_schedule_booking', { p_request: request })
  if (error) {
    if (error.code === 'PGRST202') throw new Error('Schedule updates are not installed on this database yet. Ask the administrator to install the protected schedule migration. No changes were made.')
    throw new Error(error.message || 'Could not confirm the booking save. Reload the schedule before retrying.')
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

export async function saveAssignmentRemote(prepared, client = supabase) {
  const { assignment, prescriptions, expected } = prepared
  const scheduled = !!assignment.data.trainingTiming
  const { error } = await client.rpc(scheduled ? 'assign_program_scheduled' : 'assign_program', { p_assignment: assignment, p_rows: prescriptions, p_expected: expected })
  if (error) throw new Error(error.code === 'PGRST202' ? 'Automatic program scheduling is not installed on this database. Install the program training times migration before assigning. Nothing was saved.' : error.message)
}

export async function saveTrainingPlansRemote(request, client = supabase) {
  const {error} = await client.rpc('save_training_plan_batch',{p_request:request})
  if(error) throw new Error(error.code==='PGRST202' ? 'Training schedule sync is not installed on this database. Install the training plan sync migration. Nothing was changed.' : error.message)
}
