// Pure helpers that build and reason about a "Today's Workout" session.
// React-free: components import these and render the result (no fabricated
// data lives in the UI — the structure is generated here from real inputs).
import { uid } from './format'
import { itemsToBlocks } from './program'

// "60s" / "3m" / "90" → seconds. Numbers pass through.
export const restToSec = (r) => {
  if (r == null) return 60
  if (typeof r === 'number') return Math.max(0, Math.round(r))
  const m = String(r).trim().toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(m|min|s|sec)?/)
  if (!m) return 60
  const n = parseFloat(m[1])
  return m[2] && m[2].startsWith('m') ? Math.round(n * 60) : Math.round(n)
}

// seconds → "1:05" or "45s"
export const secToClock = (sec) => {
  sec = Math.max(0, Math.round(sec))
  const m = Math.floor(sec / 60), s = sec % 60
  return m ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`
}

const isTimed = (reps) => /[sm]|sec|min/i.test(String(reps ?? ''))

// Exercise-shaped item so warm-up, main set and cool-down all support the same
// tick + editable Sets/Reps/Weight/Rest fields.
const item = (name, o = {}) => ({
  id: uid(), name,
  sets: o.sets ?? 1, reps: o.reps ?? '10', weight: o.weight ?? null,
  duration: o.duration ?? null, rest: o.rest ?? 30, done: false,
})

// ---- Per-set logging model --------------------------------------------------
// Each exercise carries `setRows`: one row per set, holding the prescribed
// target AND the athlete's actuals (load, reps, RIR/RPE, done). This is what the
// block-by-block player logs against, and what volume + e1RM read on completion.
// Stored inside the existing warmup/main/cooldown jsonb — no new DB column.

// A logging row from a prescribed set. `effortType` is the metric the athlete
// records (matches an RPE prescription, else defaults to RIR).
export const setRowFromPrescribed = (s = {}, i = 0, intensityType = null) => ({
  n: i + 1,
  pReps: s.prescribedReps ?? null,
  pIntensityType: intensityType,
  pIntensityValue: s.prescribedIntensityValue ?? null,
  pLoadKg: s.prescribedLoadKg ?? null,
  pTempo: s.prescribedTempo || '',
  pRest: s.prescribedRestSeconds ?? null,
  load: null, reps: null,
  effortType: intensityType === 'RPE' ? 'RPE' : 'RIR',
  effort: null,
  done: false,
})

// The set rows for an item, synthesising them from a legacy count-based item
// (plans / manual / older sessions) when none are stored yet.
export function ensureSetRows(it) {
  if (Array.isArray(it?.setRows) && it.setRows.length) return it.setRows
  const n = Math.max(1, parseInt(it?.sets, 10) || 1)
  return Array.from({ length: n }, (_, i) => ({
    n: i + 1,
    pReps: it?.reps ?? null,
    pIntensityType: null, pIntensityValue: null,
    pLoadKg: it?.weight ?? null,
    pTempo: '', pRest: it?.rest ?? null,
    load: null, reps: null, effortType: 'RIR', effort: null, done: false,
  }))
}

// Ordered blocks for the block-by-block stepper: warm-up, then the main set
// grouped by its builder block type (Main Lifts / Assisted / Core…) preserving
// order, then cool-down. Empty sections are dropped.
export function runBlocks(w) {
  const out = []
  if (w?.warmup?.length) out.push({ key: 'warmup', title: 'Warm-up', section: 'warmup', items: w.warmup })
  const groups = []
  const byType = new Map()
  for (const it of (w?.main || [])) {
    const bt = it.blockType || 'Main set'
    if (!byType.has(bt)) { byType.set(bt, []); groups.push(bt) }
    byType.get(bt).push(it)
  }
  for (const bt of groups) out.push({ key: 'main:' + bt, title: bt, section: 'main', blockType: bt, items: byType.get(bt) })
  if (w?.cooldown?.length) out.push({ key: 'cooldown', title: 'Cool-down', section: 'cooldown', items: w.cooldown })
  return out
}

// Work (kg·reps) a set row represents. Uses logged actuals, falling back to the
// prescription so a pre-start estimate still has a number.
export const rowWork = (r) => (+(r.load ?? r.pLoadKg) || 0) * (parseInt(r.reps ?? r.pReps, 10) || 0)
// Same, but only counts a row the athlete actually completed.
export const doneRowWork = (r) => (r.done ? (+(r.load ?? r.pLoadKg) || 0) * (parseInt(r.reps ?? r.pReps, 10) || 0) : 0)

// Generic warm-up / cool-down scaffolding (program logic, not UI data).
const warmupItems = () => [
  item('Light cardio — easy bike or row', { reps: '5 min', rest: 30 }),
  item('Dynamic mobility — hips, shoulders, ankles', { reps: '8/side', rest: 20 }),
  item('Activation — band work for today’s pattern', { sets: 2, reps: '12', rest: 30 }),
]
const cooldownItems = () => [
  item('Easy walk — bring HR down', { reps: '3–5 min', rest: 0 }),
  item('Static stretch — worked muscles', { reps: '30s hold', rest: 0 }),
  item('Breathing — slow nasal', { reps: '2 min', rest: 0 }),
]

function base({ clientId, date, title, source, planId, main, note = '' }) {
  return {
    id: uid(), clientId, date, title, source, planId, note,
    status: 'suggested', startedAt: null, endedAt: null, durationSec: null,
    hrAvg: null, hrMax: null,
    warmup: warmupItems(), main, cooldown: cooldownItems(),
  }
}

export const newExercise = () => ({
  id: uid(), name: 'New exercise', sets: 3, reps: '10', weight: null, duration: null, rest: 60, done: false,
})

// Map a saved plan into an editable session. Plan items reference an exercise by
// id (library plans) or carry a literal name (plans saved from a past workout).
export function buildFromPlan(plan, exercises, { clientId, date }) {
  const exName = (it) => it.name || exercises.find((e) => e.id === it.exId)?.name || 'Exercise'
  const main = (plan?.items || []).map((it) => {
    const timed = isTimed(it.reps)
    return {
      id: uid(),
      name: exName(it),
      sets: +it.sets || 3,
      reps: timed ? '' : String(it.reps ?? '10'),
      duration: timed ? String(it.reps) : null,
      weight: null,
      rest: restToSec(it.rest),
      done: false,
    }
  })
  return base({ clientId, date, title: plan?.name || 'Workout', source: 'plan', planId: plan?.id || null, main, note: 'From plan library' })
}

// Map a coach prescription (blocks → exercises → prescribed sets) into an
// editable session. Warm-up / Cool-down blocks feed their sections; every
// other block feeds the main set. Legacy item-shaped rows are migrated first.
// Loads stay in kg (set 1 is the template row, matching blocksToItems).
export function buildFromPrescription(presc, { clientId, date }) {
  const blocks = presc?.blocks?.length ? presc.blocks : itemsToBlocks(presc?.items)
  const toItem = (e, blockType) => {
    const s = e.sets?.[0] || {}
    return {
      id: uid(),
      name: e.exerciseName || 'Exercise',
      blockType,                 // preserves the builder block so the runner can group by it
      note: '',                  // per-exercise reflection, filled during the session
      // Per-set logging rows carry each prescribed set + the athlete's actuals.
      setRows: (e.sets?.length ? e.sets : [s]).map((row, i) => setRowFromPrescribed(row, i, e.intensityType)),
      // Legacy count-based fields kept for back-compat displays / fallbacks.
      sets: e.sets?.length || 1,
      reps: String(s.prescribedReps ?? '10'),
      duration: null,
      weight: s.prescribedLoadKg ?? null,
      rest: s.prescribedRestSeconds ?? 60,
      done: false,
    }
  }
  const section = (type) => (blocks || []).filter((b) => b.blockType === type).flatMap((b) => b.exercises.map((e) => toItem(e, type)))
  const main = (blocks || [])
    .filter((b) => b.blockType !== 'Warm-up' && b.blockType !== 'Cool-down')
    .flatMap((b) => b.exercises.map((e) => toItem(e, b.blockType)))
  const w = base({ clientId, date, title: 'Prescribed workout', source: 'prescribed', planId: null, main, note: presc?.notes || 'Assigned in the workout planner' })
  const warmup = section('Warm-up')
  const cooldown = section('Cool-down')
  if (warmup.length) w.warmup = warmup
  if (cooldown.length) w.cooldown = cooldown
  return w
}

// Empty session for hand-building.
export function blankWorkout({ clientId, date }) {
  return base({ clientId, date, title: 'Custom workout', source: 'manual', planId: null, main: [newExercise()], note: 'Built manually' })
}

// Rule-based "auto" coach: scale a plan's volume by readiness / ACWR.
// (Same spirit as the existing rule-based AI coach; swap for an LLM later.)
export function adaptFromPlan(plan, exercises, { clientId, date, readiness, acwr }) {
  const w = buildFromPlan(plan, exercises, { clientId, date })
  let factor = 1, note = 'Adaptive — matched to plan'
  if (readiness != null && readiness < 50) { factor = 0.8; note = 'Adaptive — volume trimmed for low readiness' }
  if (acwr != null && acwr > 1.5) { factor = Math.min(factor, 0.7); note = 'Adaptive — deload, ACWR spike' }
  if (factor < 1) w.main = w.main.map((m) => ({ ...m, sets: Math.max(1, Math.round(m.sets * factor)) }))
  w.title = (plan?.name || 'Workout') + ' · auto'
  w.source = 'ai'
  w.note = note
  return w
}

// Estimated volume load (kg) — per-set when rows exist (prescribed loads),
// else the legacy sets×reps×weight. Used for the pre-start overview.
export const itemEstVolume = (m) =>
  (Array.isArray(m.setRows) && m.setRows.length)
    ? m.setRows.reduce((t, r) => t + rowWork(r), 0)
    : (+m.sets || 0) * (parseInt(m.reps, 10) || 0) * (+m.weight || 0)
export const workoutVolume = (w) => (w?.main || []).reduce((t, m) => t + itemEstVolume(m), 0)

export const SOURCE_LABEL = { plan: 'Plan', ai: 'Adaptive', manual: 'Manual', prescribed: 'Coach' }

const CARDIO_RE = /run|jog|bike|cycl|row|cardio|walk|elliptical|sprint|swim|skip/i
const isCardioItem = (m) => CARDIO_RE.test(m.name) || (m.weight == null && /min|sec|\d\s*s\b|hold/i.test(String(m.reps)))

// Actuals: athletes log what they really did (doneSets / doneReps / doneWeight)
// against the prescription. Fall back to the prescribed value when not logged,
// so coach-built sessions without actuals keep working unchanged.
export const actualSets = (m) => +(m.doneSets ?? m.sets) || 0
export const actualReps = (m) => parseInt(m.doneReps ?? m.reps, 10) || 0
export const actualWeight = (m) => +(m.doneWeight ?? m.weight) || 0

// Derive a completed session's vitals + breakdowns. Several values (energy, HRR,
// strain) are physiological estimates from duration + heart rate and are labelled
// as such in the UI — the wearable doesn't stream them yet. Tonnage/reps use the
// logged actuals where present, so the summary reflects what was actually done.
export function summarize(w, { exercises = [], restingHr = null, age = null, bodyMassKg = null } = {}) {
  const minutes = (w.durationSec || 0) / 60
  const maxHr = 220 - (age || 30)
  const rest = restingHr || 60
  const avg = w.hrAvg || null
  const peak = w.hrMax || null
  const frac = avg ? Math.max(0, Math.min(1, (avg - rest) / Math.max(1, maxHr - rest))) : 0
  const intensity = avg ? Math.min(1, avg / maxHr) : 0

  const main = w.main || []
  // Prefer per-set actuals (the block-by-block logger); fall back to the legacy
  // per-exercise done fields so older sessions still summarise correctly.
  const hasRows = (m) => Array.isArray(m.setRows) && m.setRows.length
  const doneRows = (m) => m.setRows.filter((r) => r.done)
  const repsOf = (m) => hasRows(m)
    ? doneRows(m).reduce((t, r) => t + (parseInt(r.reps ?? r.pReps, 10) || 0), 0)
    : actualSets(m) * actualReps(m)
  const volume = main.reduce((t, m) => t + (hasRows(m) ? doneRows(m).reduce((s, r) => s + doneRowWork(r), 0) : repsOf(m) * actualWeight(m)), 0)
  const reps = main.reduce((t, m) => t + repsOf(m), 0)
  const sets = main.reduce((t, m) => t + (hasRows(m) ? doneRows(m).length : actualSets(m)), 0)
  const topWeight = main.reduce((mx, m) => Math.max(mx, hasRows(m)
    ? m.setRows.reduce((x, r) => Math.max(x, +(r.load ?? r.pLoadKg) || 0), 0)
    : actualWeight(m)), 0)

  const met = 2 + intensity * 9
  const energy = Math.round((met * 3.5 * (bodyMassKg || 75)) / 200 * minutes)
  const trimp = avg ? Math.round(minutes * frac * 0.64 * Math.exp(1.92 * frac)) : 0
  const strain = avg ? Math.min(21, +(Math.pow(frac, 1.5) * (minutes / 2.2) + frac * 6).toFixed(1)) : 0
  const rpe = peak ? Math.max(1, Math.min(10, Math.round((peak / maxHr) * 10))) : null
  const hrr = peak ? Math.round((peak - rest) * 0.32) : null

  // muscular vs cardio split + per-muscle strain (match names to the library)
  const muscleOf = (name) => exercises.find((e) => e.name && name.toLowerCase().includes(e.name.toLowerCase()))?.muscle
  let muscular = 0, cardio = 0
  const byMuscle = {}
  for (const m of main) {
    const itemWork = hasRows(m) ? doneRows(m).reduce((s, r) => s + doneRowWork(r), 0) : repsOf(m) * actualWeight(m)
    const work = itemWork || repsOf(m) || (hasRows(m) ? doneRows(m).length : actualSets(m)) || 1
    if (isCardioItem(m)) { cardio += work }
    else { muscular += work; const mu = muscleOf(m.name) || 'General'; byMuscle[mu] = (byMuscle[mu] || 0) + work }
  }
  const total = muscular + cardio || 1
  const muscleStrain = Object.entries(byMuscle).map(([muscle, val]) => ({ muscle, val })).sort((a, b) => b.val - a.val)
  // An exercise counts as done when any of its logged sets is done (per-set
  // model), else the legacy per-exercise done flag.
  const itemDone = (m) => (hasRows(m) ? doneRows(m).length > 0 : !!m.done)

  return {
    minutes, durationSec: w.durationSec || 0, volume, reps, sets, topWeight, energy, trimp, strain, rpe, hrr,
    avg, peak, rest, maxHr,
    muscularPct: Math.round((muscular / total) * 100), cardioPct: Math.round((cardio / total) * 100),
    muscleStrain, doneMain: main.filter(itemDone).length, totalMain: main.length,
  }
}

// Build a reusable plan from a completed/edited session (saved to the plan library).
export function workoutToPlan(w, name) {
  return {
    id: uid(),
    name: (name || w.title.replace(' · auto', '')).trim() || 'Saved workout',
    desc: 'Saved from a workout on ' + (w.date || ''),
    items: (w.main || []).map((m) => ({ name: m.name, sets: +m.sets || 3, reps: String(m.duration ?? m.reps ?? '10'), rest: (m.rest ?? 60) + 's' })),
  }
}
