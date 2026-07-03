// Advanced Programming Platform engine — pure, React-free.
// Owns the nested workout structure (workout → blocks → exercises → sets),
// the Epley e1RM / Absolute 1RM / Training Max math, progression rules,
// legacy-shape migration and the completion feedback loop (new-peak
// detection, assessment auto-update, context-rich failure flags).
import { uid } from './format'
import { addDays } from './dates'
import { dayMetrics } from './calc'

// ---- Vocabulary -----------------------------------------------------------
export const BLOCK_TYPES = ['Warm-up', 'Main Lifts', 'Assisted', 'Core/Others', 'Cool-down']

// A fresh workout opens with the trainer's standard three-block scaffold.
export const defaultBlocks = () => [newBlock('Warm-up', 1), newBlock('Main Lifts', 2), newBlock('Core/Others', 3)]
export const INTENSITY_TYPES = ['%1RM', 'RPE', 'Load', 'Target HR']
export const SET_STATUS = ['Pending', 'Completed', 'Failed']
export const SUPERSET_GROUPS = ['', 'A', 'B', 'C', 'D']

// Blocks whose successful sets feed strength tracking (spec: warm-up sets are
// ignored for performance baselines; Main Lifts initiates baseline calcs).
const TRACKS_1RM = (b) => b.blockType === 'Main Lifts'

// ---- Factories ------------------------------------------------------------
export const newSet = (n = 1, o = {}) => ({
  setId: uid(),
  setNumber: n,
  prescribedReps: o.reps ?? 10,
  prescribedIntensityValue: o.intensity ?? null,
  prescribedLoadKg: o.loadKg ?? null,
  prescribedTempo: o.tempo ?? '',
  prescribedRestSeconds: o.rest ?? 90,
  completedReps: null,
  completedLoadKg: null,
  status: 'Pending',
})

export const newProgExercise = (name = '', o = {}) => ({
  exerciseId: uid(),
  exerciseDbRef: o.dbRef ?? null,
  exerciseName: name,
  order: o.order ?? 1,
  supersetLinkId: o.group ?? null,
  intensityType: o.intensityType ?? 'Load',
  unmapped: o.unmapped ?? false,
  sets: o.sets ?? [newSet(1), newSet(2), newSet(3)],
})

export const newBlock = (blockType = 'Main Lifts', order = 1) => ({
  blockId: uid(),
  blockType,
  order,
  autoCalculate1RM: blockType === 'Main Lifts',
  exercises: [],
})

// ---- Strength math ----------------------------------------------------------
// Epley: 1RM = w × (1 + r/30)
export const epley1RM = (w, r) =>
  w > 0 && r > 0 ? +(w * (1 + r / 30)).toFixed(1) : null

// Rolling 30-day Absolute 1RM: peak e1rm event in (date-30, date].
export function absolute1RM(maxes, clientId, exercise, date) {
  const lo = addDays(date, -30)
  const vals = (maxes || [])
    .filter((m) => m.clientId === clientId && m.kind === 'e1rm' && m.date <= date && m.date > lo &&
      m.exercise.toLowerCase() === String(exercise).toLowerCase())
    .map((m) => +m.valueKg)
  return vals.length ? Math.max(...vals) : null
}

// Training Max: latest 'tm' checkpoint on/before date; falls back to the
// rolling Absolute 1RM so %1RM targets always resolve when history exists.
export function trainingMaxKg(maxes, clientId, exercise, date) {
  const tm = (maxes || [])
    .filter((m) => m.clientId === clientId && m.kind === 'tm' && m.date <= date &&
      m.exercise.toLowerCase() === String(exercise).toLowerCase())
    .sort((a, b) => b.date.localeCompare(a.date))[0]
  return tm ? +tm.valueKg : absolute1RM(maxes, clientId, exercise, date)
}

// %1RM → target kg off the Training Max, rounded to the nearest 0.5 kg.
export const targetKg = (tmKg, pct) =>
  tmKg > 0 && pct > 0 ? Math.round((tmKg * pct) / 100 * 2) / 2 : null

// Aerobic zone indicator for Target HR entries. Values ≤ 100 read as %MaxHR,
// larger values as bpm against the supplied max HR.
export function hrZone(value, maxHr = 190) {
  const v = +value
  if (!v) return null
  const pct = v <= 100 ? v : (v / maxHr) * 100
  if (pct < 60) return 'Zone 1 · recovery'
  if (pct < 70) return 'Zone 2 · aerobic base'
  if (pct < 80) return 'Zone 3 · tempo'
  if (pct < 90) return 'Zone 4 · threshold'
  return 'Zone 5 · maximal'
}

// ---- Volume & summaries -----------------------------------------------------
const setLoad = (s) => +s.completedLoadKg || +s.prescribedLoadKg || 0
const setReps = (s) => +s.completedReps || +s.prescribedReps || 0

export const blocksVolume = (blocks) =>
  (blocks || []).reduce(
    (t, b) => t + b.exercises.reduce((u, e) => u + e.sets.reduce((v, s) => v + setLoad(s) * setReps(s), 0), 0), 0)

export function programStats(p) {
  const blocks = p?.blocks?.length ? p.blocks : []
  const exercises = blocks.reduce((n, b) => n + b.exercises.length, 0)
  const sets = blocks.reduce((n, b) => n + b.exercises.reduce((m, e) => m + e.sets.length, 0), 0)
  // Legacy rows not yet migrated still carry items.
  if (!blocks.length && p?.items?.length) {
    return {
      exercises: p.items.length,
      sets: p.items.reduce((n, it) => n + (+it.sets || 0), 0),
      volume: p.items.reduce((s, it) => s + (it.volumeLoad || 0), 0),
    }
  }
  return { exercises, sets, volume: blocksVolume(blocks) }
}

// Legacy flat items kept in sync for older consumers (planner VL, exports).
export const blocksToItems = (blocks) =>
  (blocks || []).flatMap((b) =>
    b.exercises.map((e) => {
      const sets = e.sets.length
      const reps = +e.sets[0]?.prescribedReps || 0
      const load = +e.sets[0]?.prescribedLoadKg || 0
      return {
        exercise: e.exerciseName, sets, reps, load,
        intensity: +e.sets[0]?.prescribedIntensityValue || 0,
        intensityType: e.intensityType, group: e.supersetLinkId || '', mode: 'Straight',
        tempo: e.sets[0]?.prescribedTempo || '',
        volumeLoad: e.sets.reduce((v, s) => v + setLoad(s) * setReps(s), 0),
      }
    }))

// ---- Legacy migration -------------------------------------------------------
// Old prescription/template items → a single Main Lifts block.
export function itemsToBlocks(items) {
  if (!items?.length) return []
  const b = newBlock('Main Lifts', 1)
  b.exercises = items.map((it, i) => {
    const count = Math.max(1, +it.sets || 1)
    const sets = Array.from({ length: count }, (_, j) =>
      newSet(j + 1, {
        reps: +it.reps || 10,
        intensity: it.intensity ?? null,
        loadKg: +it.load || null,
        tempo: it.tempo || '',
      }))
    return newProgExercise(it.exercise, {
      order: i + 1,
      group: it.group || null,
      intensityType: INTENSITY_TYPES.includes(it.intensityType) ? it.intensityType : 'Load',
      sets,
    })
  })
  return [b]
}

// Idempotent store migration: new collections + lazy blocks upgrade.
export function ensureProgramShape(db) {
  if (!db.maxes) db.maxes = []
  if (!db.synonyms) db.synonyms = []
  ;(db.clients || []).forEach((c) => { if (!c.trackedLifts) c.trackedLifts = [] })
  const renameBlocks = (blocks) => (blocks || []).forEach((b) => {
    if (b.blockType === 'Core/Hypertrophy') b.blockType = 'Core/Others'
  })
  ;(db.prescriptions || []).forEach((p) => {
    if (!p.blocks?.length && p.items?.length) p.blocks = itemsToBlocks(p.items)
    if (!p.blocks) p.blocks = []
    renameBlocks(p.blocks)
  })
  ;(db.templates || []).forEach((t) => {
    if (!t.blocks?.length && t.items?.length) t.blocks = itemsToBlocks(t.items)
    if (!t.blocks) t.blocks = []
    renameBlocks(t.blocks)
  })
  return db
}

// ---- Cloning & progression ---------------------------------------------------
// Deep copy with brand-new ids and completion state reset (spec 3.1: new
// workoutId/blockId/setId while database references are preserved).
export function cloneBlocksFresh(blocks) {
  return (blocks || []).map((b) => ({
    ...structuredClone(b),
    blockId: uid(),
    exercises: b.exercises.map((e) => ({
      ...structuredClone(e),
      exerciseId: uid(),
      sets: e.sets.map((s, i) => ({
        ...structuredClone(s),
        setId: uid(), setNumber: i + 1,
        completedReps: null, completedLoadKg: null, status: 'Pending', flagged: false,
      })),
    })),
  }))
}

// Default progression per block category (spec 3.2).
export const defaultRuleFor = (blockType) =>
  blockType === 'Main Lifts' || blockType === 'Warm-up'
    ? { type: 'load', value: 2.5 }
    : { type: 'reps', value: 1 }

// rules: { [blockId]: { enabled, type: 'load'|'percentage'|'reps'|'sets',
//          value, exercises: { [exerciseId]: bool } } }
// resolveTm(exerciseName) supplies the Training Max so %1RM rows can
// re-evaluate absolute target weights after a percentage bump.
export function applyProgression(blocks, rules, resolveTm = () => null) {
  return (blocks || []).map((b) => {
    const rule = rules[b.blockId]
    if (!rule?.enabled) return b
    return {
      ...b,
      exercises: b.exercises.map((e) => {
        if (rule.exercises && rule.exercises[e.exerciseId] === false) return e
        let sets = e.sets.map((s) => ({ ...s }))
        if (rule.type === 'load') {
          sets = sets.map((s) => (s.prescribedLoadKg != null
            ? { ...s, prescribedLoadKg: +(+s.prescribedLoadKg + +rule.value).toFixed(2) } : s))
        } else if (rule.type === 'percentage') {
          sets = sets.map((s) => {
            const pct = s.prescribedIntensityValue != null ? +s.prescribedIntensityValue + +rule.value : null
            const tm = resolveTm(e.exerciseName)
            return {
              ...s,
              prescribedIntensityValue: pct ?? s.prescribedIntensityValue,
              prescribedLoadKg: e.intensityType === '%1RM' && pct != null && tm
                ? targetKg(tm, pct) : s.prescribedLoadKg,
            }
          })
        } else if (rule.type === 'reps') {
          sets = sets.map((s) => ({ ...s, prescribedReps: (+s.prescribedReps || 0) + +rule.value }))
        } else if (rule.type === 'sets') {
          for (let i = 0; i < +rule.value; i++) {
            const last = sets[sets.length - 1]
            sets.push({ ...structuredClone(last), setId: uid(), setNumber: sets.length + 1 })
          }
        }
        return { ...e, sets }
      }),
    }
  })
}

// ---- Fuzzy exercise mapping (spec 5.2) ----------------------------------------
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()

// Spoken phrase → database standard term. Order: synonym index (exact
// normalized match) → library exact → library substring either way.
// Unmapped names come back matched:false — the UI must force validation.
export function mapExercise(phrase, synonyms, exercises) {
  const p = norm(phrase)
  if (!p) return { name: phrase, matched: false }
  const syn = (synonyms || []).find((s) => norm(s.phrase) === p)
  if (syn) return { name: syn.exercise, matched: true }
  const exact = (exercises || []).find((e) => norm(e.name) === p)
  if (exact) return { name: exact.name, matched: true }
  const partial = (exercises || []).find((e) => norm(e.name).includes(p) || p.includes(norm(e.name)))
  if (partial) return { name: partial.name, matched: true }
  return { name: phrase, matched: false }
}

export const hasUnmapped = (blocks) =>
  (blocks || []).some((b) => b.exercises.some((e) => e.unmapped))

// ---- Completion feedback loop (spec 4) -----------------------------------------
// Runs inside a commit() mutator against the draft store. For each newly
// completed set in a 1RM-tracked block: Epley e1RM → new rolling-30-day peak?
// → append a maxes event + auto-refresh the fitness assessment. For each
// newly failed set: raise a context-rich concern with live stress markers.
// Sets are stamped (e1rmApplied / flagged) so re-saving is idempotent.
export function applyCompletionEffects(draft, prescription, tz) {
  const events = []
  const { clientId, date } = prescription
  for (const b of prescription.blocks || []) {
    for (const e of b.exercises) {
      for (const s of e.sets) {
        if (s.status === 'Completed' && TRACKS_1RM(b) && b.autoCalculate1RM && !s.e1rmApplied) {
          const est = epley1RM(+s.completedLoadKg || +s.prescribedLoadKg, +s.completedReps || +s.prescribedReps)
          if (est) {
            s.e1rmApplied = true
            const abs = absolute1RM(draft.maxes, clientId, e.exerciseName, date)
            if (!abs || est > abs) {
              const tracked = recordLiftMax(draft, clientId, e.exerciseName, est, date, 'auto')
              events.push({ type: 'peak', exercise: e.exerciseName, valueKg: est, tracked })
            }
          }
        }
        if (s.status === 'Failed' && !s.flagged) {
          s.flagged = true
          draft.concerns.push(failureConcern(draft, prescription, e, s, tz))
          events.push({ type: 'failure', exercise: e.exerciseName })
        }
      }
    }
  }
  return events
}

// Spec 4.3 — alert block with immediate structural context.
function failureConcern(draft, p, e, s, tz) {
  const abs = absolute1RM(draft.maxes, p.clientId, e.exerciseName, p.date)
  const m = dayMetrics(draft, p.clientId, p.date)
  const acwrTxt = m.acwr != null
    ? `${m.acwr} (${m.acwr > 1.5 ? 'Elevated Injury Risk Zone' : m.acwr >= 0.8 && m.acwr <= 1.3 ? 'Sweet spot' : 'Outside sweet spot'})` : 'n/a'
  const monoTxt = m.monotony ? `${m.monotony} (${m.monotony > 2 ? 'High Risk / Low Variation' : 'Healthy variation'})` : 'n/a'
  const strainTxt = m.strain > 6000 ? 'Extreme' : m.strain > 3000 ? 'High' : m.strain ? 'Moderate' : 'n/a'
  const load = +s.completedLoadKg || +s.prescribedLoadKg || 0
  const doneReps = s.completedReps != null ? ` (failed at ${s.completedReps} reps)` : ''
  return {
    id: uid(), clientId: p.clientId, date: p.date, sessionId: null,
    category: 'Performance', severity: m.acwr > 1.5 || m.monotony > 2 ? 'High' : 'Medium',
    source: 'System', status: 'Open', resolution: '',
    text: `Prescription Failure Flag: ${e.exerciseName} — ${load}kg × ${s.prescribedReps} reps${doneReps}. ` +
      `Current Absolute 1RM baseline: ${abs ? abs + 'kg' : 'not established'}. ` +
      `Stress markers — ACWR: ${acwrTxt} · Monotony: ${monoTxt} · Strain: ${strainTxt}. tz:${tz || 'local'}`,
  }
}

// Is this lift on the client's "Current Lifts Performance" watch list?
export const isTrackedLift = (client, lift) =>
  (client?.trackedLifts || []).some((t) => t.toLowerCase() === String(lift).toLowerCase())

// Single entry point for a new 1RM value (auto Epley peak or manual trainer
// entry). Appends the e1rm ledger event; if the lift is one the trainer
// chose to track, also pushes the fitness-assessment auto-update.
// Returns whether the assessment was updated.
export function recordLiftMax(draft, clientId, lift, valueKg, date, source = 'manual') {
  draft.maxes.push({ id: uid(), clientId, exercise: lift, date, kind: 'e1rm', valueKg, source })
  const client = (draft.clients || []).find((c) => c.id === clientId)
  if (!isTrackedLift(client, lift)) return false
  autoUpdateAssessment(draft, clientId, lift, valueKg, date, source)
  return true
}

// Spec 6.2 — push a fresh e1RM peak straight onto the athlete's central
// metrics board (a new auto-sourced fitness assessment record).
function autoUpdateAssessment(draft, clientId, lift, valueKg, date, source) {
  if (!draft.assessments) draft.assessments = []
  draft.assessments.push({
    id: uid(), clientId, type: 'fitness', date, phase: 'progress',
    data: { strength: [{ lift, valueKg }] },
    notes: source === 'auto'
      ? `Auto-update: new estimated 1RM peak (${valueKg}kg) from a completed top set.`
      : `Trainer-recorded 1RM: ${valueKg}kg (Current Lifts Performance).`,
  })
}

// Spec 4.2 — block trigger: at the start of a new programming block the
// Training Max resets upward to the current rolling 30-day Absolute 1RM.
export function resetTrainingMaxes(draft, clientId, blocks, date) {
  const lifts = new Set()
  for (const b of blocks || []) if (TRACKS_1RM(b)) b.exercises.forEach((e) => e.exerciseName && lifts.add(e.exerciseName))
  const reset = []
  for (const lift of lifts) {
    const abs = absolute1RM(draft.maxes, clientId, lift, date)
    // Compare against the latest explicit TM checkpoint (not the abs-1RM
    // fallback, which would always equal `abs` and mask the reset).
    const tmRow = draft.maxes
      .filter((m) => m.clientId === clientId && m.kind === 'tm' && m.date <= date &&
        m.exercise.toLowerCase() === lift.toLowerCase())
      .sort((a, b) => b.date.localeCompare(a.date))[0]
    if (abs && (!tmRow || abs > +tmRow.valueKg)) {
      draft.maxes.push({ id: uid(), clientId, exercise: lift, date, kind: 'tm', valueKg: abs, source: 'block-start' })
      reset.push(lift)
    }
  }
  return reset
}
