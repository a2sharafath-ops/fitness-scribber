// Planner copy/paste: turning a span of prescribed days into a portable
// "clip", and writing that clip back onto any client's calendar.
//
// The clip preserves the *pattern* of the copied span: each session is stored
// as a day offset from the first day of the selection, so a Mon/Wed/Fri block
// pasted onto a Tuesday lands on Tue/Thu/Sat. Rest days inside the selection
// stay rest days at the target.
//
// React-free. `pasteClip` is a draft mutator (runs inside commit(), same shape
// as the mutators in program.js); everything else is pure.
import { uid } from './format'
import { addDays, daysBetween } from './dates'
import { blocksToItems, itemsToBlocks, cloneBlocksFresh, programStats } from './program'
import { validatePrescription } from './prescription'

// The blocks of a prescription, migrating legacy item-shaped rows on the way.
const blocksOf = (p) => (p?.blocks?.length ? p.blocks : itemsToBlocks(p?.items))

// A prescription only counts as a "session" once it actually holds exercises.
export const isSession = (p) => !!p && programStats(p).exercises > 0

// Shared preflight for bulk writes: the caller must await approval before commit.
export async function approvePlanReplacement(db, targets, confirm) {
  const clashes = targets.filter(target => db.prescriptions.some(plan => plan.clientId === target.clientId && plan.date === target.date))
  if (!clashes.length) return true
  const rows = clashes.map(target => `${db.clients?.find(client => client.id === target.clientId)?.name || 'Client'} · ${target.date}`)
  return !!await confirm({
    title: 'Replace existing plans?',
    message: `${clashes.length} existing plan${clashes.length === 1 ? '' : 's'} will be replaced: ${rows.slice(0, 6).join('; ')}${rows.length > 6 ? `; and ${rows.length - 6} more` : ''}.`,
    confirmLabel: 'Replace plans',
  })
}

// A past date or a completed appointment/workout is closed to new planning.
// An existing prescription may still be reviewed (and corrected separately).
export function isClosedTrainingDay(db, clientId, date, today) {
  return date < today
    || (db.workouts || []).some((w) => w.clientId === clientId && w.date === date && w.status === 'completed')
    || (db.sessions || []).some((s) => s.clientId === clientId && s.date === date && String(s.status).toLowerCase() === 'completed')
}

export const isPlanTargetBlocked = (db, clientId, date, today) => isClosedTrainingDay(db, clientId, date, today)
  || (db.workouts || []).some(workout => workout.clientId === clientId && workout.date === date)

export function assertPrescriptionWritable(db, clientId, date) {
  if ((db.workouts || []).some(workout => workout.clientId === clientId && workout.date === date)
    || (db.sessions || []).some(session => session.clientId === clientId && session.date === date && String(session.status).toLowerCase() === 'completed')) {
    throw new Error(`${date}: this date already has a workout or completed appointment. Its prescription is protected.`)
  }
}

// A workout log is evidence of performed work, not a prescription. Calendar
// views can display it without creating a second, misleading planner record.
export function completedWorkoutsByDate(workouts, clientId) {
  const byDate = new Map()
  for (const workout of workouts || []) {
    if (workout.clientId !== clientId || workout.status !== 'completed' || !workout.date) continue
    const rows = byDate.get(workout.date) || []
    rows.push(workout)
    byDate.set(workout.date, rows)
  }
  return byDate
}

// Build a clip from a selected span of dates. `dates` is the full selection
// (including empty days); only days holding a real session are carried, each
// keyed by its offset from the first selected day. Returns null when the span
// holds nothing to copy.
export function buildClip(db, client, dates) {
  if (!dates?.length) return null
  const anchor = dates[0]
  const days = dates
    .map((date) => {
      const p = db.prescriptions.find((x) => x.clientId === client.id && x.date === date)
      if (!isSession(p)) return null
      return { offset: daysBetween(anchor, date), blocks: blocksOf(p), name: p.name || '', notes: p.notes || '' }
    })
    .filter(Boolean)
  if (!days.length) return null
  return {
    sourceClientId: client.id,
    sourceClientName: client.name,
    anchor,
    span: dates.length,
    days,
  }
}

// The dates a clip would occupy if pasted starting at `startDate`.
export const clipTargets = (clip, startDate) =>
  (clip?.days || []).map((d) => addDays(startDate, d.offset))

// Which of those target dates already hold a session for `clientId`.
export const clipClashes = (db, clip, clientId, startDate) =>
  clipTargets(clip, startDate).filter((date) =>
    isSession(db.prescriptions.find((p) => p.clientId === clientId && p.date === date)))

// Write (or overwrite) one prescription on a client's calendar.
export function writePrescription(draft, clientId, date, blocks, notes = '', name = '') {
  assertPrescriptionWritable(draft, clientId, date)
  // Legacy unnamed plans get a visible name when copied through the planner.
  name = name.trim() || 'Workout'
  validatePrescription(name, blocks)
  const items = blocksToItems(blocks)
  const ex = draft.prescriptions.find((p) => p.clientId === clientId && p.date === date)
  if (ex) { ex.blocks = blocks; ex.items = items; ex.notes = notes; ex.name = name }
  else draft.prescriptions.push({ id: uid(), clientId, date, name, notes, blocks, items })
}

// How many of `dates` actually hold a session for this client — what a delete
// would remove, which is what the confirmation needs to state.
export const sessionsIn = (db, clientId, dates) =>
  (dates || []).filter((date) =>
    isSession(db.prescriptions.find((p) => p.clientId === clientId && p.date === date)))

// Remove every prescription this client has across `dates`. Draft mutator, so
// it runs inside commit() alongside the other planner writes. Days without a
// session are simply left alone. Returns the dates cleared.
export function deleteSpan(draft, clientId, dates) {
  const wanted = new Set(dates || [])
  const cleared = draft.prescriptions
    .filter((p) => p.clientId === clientId && wanted.has(p.date))
    .map((p) => p.date)
  draft.prescriptions = draft.prescriptions.filter((p) => !(p.clientId === clientId && wanted.has(p.date)))
  return cleared
}

// Paste a clip onto `clientId`, anchored at `startDate`. Every day gets its own
// deep copy with brand-new block/exercise/set ids, so the pasted sessions are
// independent of the source. Returns the dates written.
export function pasteClip(draft, clip, clientId, startDate) {
  // Preflight the whole span before mutating even the first destination.
  for (const day of clip?.days || []) {
    assertPrescriptionWritable(draft, clientId, addDays(startDate, day.offset))
    validatePrescription(day.name || 'Workout', day.blocks)
  }
  const written = []
  for (const d of clip?.days || []) {
    const date = addDays(startDate, d.offset)
    writePrescription(draft, clientId, date, cloneBlocksFresh(d.blocks), d.notes, d.name || '')
    written.push(date)
  }
  return written
}
