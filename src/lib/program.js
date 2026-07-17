// Advanced Programming Platform engine — pure, React-free.
// Owns the nested workout structure (workout → blocks → exercises → sets),
// the Epley e1RM / Absolute 1RM / Training Max math, progression rules,
// legacy-shape migration and the completion feedback loop (new-peak
// detection, assessment auto-update, context-rich failure flags).
import { uid } from './format'
import { addDays } from './dates'
import { EXERCISE_LIBRARY } from './exerciseLibrary'

// ---- Vocabulary -----------------------------------------------------------
export const BLOCK_TYPES = ['Warm-up', 'Main Lifts', 'Assisted', 'Core/Others', 'Cool-down']

// A fresh workout opens with the trainer's standard three-block scaffold.
export const defaultBlocks = () => [newBlock('Warm-up', 1), newBlock('Main Lifts', 2), newBlock('Core/Others', 3)]
export const INTENSITY_TYPES = ['%1RM', 'RIR', 'RPE', 'Seconds', 'Minutes', 'Load', 'Target HR']
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

// The imported library's %1RM-relative default for an exercise (e.g. Romanian
// Deadlift ≈ 75% of Squat), or null if the exercise carries no relationship.
export function exerciseRelation(db, name) {
  const e = (db?.exercises || []).find((x) => x.name?.toLowerCase() === String(name).toLowerCase())
  return e && e.relTo && e.relPct ? { relTo: e.relTo, relPct: +e.relPct } : null
}

// Best Training Max among the client's lifts whose name INCLUDES a reference
// term (e.g. 'Squat' matches 'Barbell Back Squat'). Latest 'tm' checkpoint wins,
// else the rolling 30-day e1RM peak — so the manual's %-of-reference defaults
// resolve even when the reference lift is logged under a specific variant name.
function referenceMaxKg(maxes, clientId, refTerm, date) {
  const term = String(refTerm).toLowerCase()
  const lo = addDays(date, -30)
  const rows = (maxes || []).filter((m) => m.clientId === clientId && m.date <= date && String(m.exercise).toLowerCase().includes(term))
  const tm = rows.filter((m) => m.kind === 'tm').sort((a, b) => b.date.localeCompare(a.date))[0]
  if (tm) return +tm.valueKg
  const e1 = rows.filter((m) => m.kind === 'e1rm' && m.date > lo).map((m) => +m.valueKg)
  return e1.length ? Math.max(...e1) : null
}

// Latest fitness-assessment 1RM for a lift, of any age. Read straight from the
// assessment records (the durable source of truth) rather than a mirrored
// ledger row — so a baseline or reassessment always feeds the builder, even
// months later, with no dependency on any extra persistence step.
function assessmentMaxKg(db, clientId, exercise) {
  const ex = String(exercise).toLowerCase()
  const recs = (db.assessments || [])
    .filter((a) => a.clientId === clientId && a.type === 'fitness')
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  for (const a of recs) {
    const s = (a.data?.strength || []).find((x) => String(x.lift).toLowerCase() === ex)
    if (s) { const v = +(s.valueKg ?? s.e1rmKg); if (v > 0) return v }
  }
  return null
}

// Training Max for an exercise, in priority order:
//   1. direct 1RM history — a 'tm' checkpoint or the rolling 30-day e1RM peak
//      (this is where recent training PRs and recent assessments land);
//   2. the latest fitness-assessment 1RM of any age (baseline / reassessment);
//   3. the imported library's %-of-reference relationship (e.g. RDL ≈ 75% of
//      Squat) against the client's reference-lift max.
// Returns { kg, source: 'direct'|'assessment'|'derived'|null, relTo, relPct, refKg }.
export function resolveTrainingMax(db, clientId, name, date) {
  const direct = trainingMaxKg(db.maxes, clientId, name, date)
  if (direct) return { kg: direct, source: 'direct' }
  const asr = assessmentMaxKg(db, clientId, name)
  if (asr) return { kg: asr, source: 'assessment' }
  const rel = exerciseRelation(db, name)
  if (rel) {
    const refKg = referenceMaxKg(db.maxes, clientId, rel.relTo, date)
    if (refKg) return { kg: Math.round((refKg * rel.relPct) / 100 * 2) / 2, source: 'derived', relTo: rel.relTo, relPct: rel.relPct, refKg }
  }
  return { kg: null, source: null }
}

// ---- Subjective load → %1RM (NSCA Table 18.10) ------------------------------
// Exact reproduction of Table 18.10 (Subjective Loading Efforts and
// Corresponding Set-Repetition Best Relative Percentages). Each effort carries
// the table's own relative-percentage band as its exact endpoints [low, high]
// (low = null marks an open "<high%" band). No interpolation or invented
// mid-points — the numbers are taken verbatim from the table.
// Source: NSCA, Essentials of Strength Training and Conditioning — Table 18.10.
const LOAD_EFFORTS = {
  maximal: { label: 'Maximal', band: '100%', low: 100, high: 100 },
  veryHeavy: { label: 'Very heavy', band: '95–99%', low: 95, high: 99 },
  heavy: { label: 'Heavy', band: '90–94%', low: 90, high: 94 },
  moderateHeavy: { label: 'Moderate-heavy', band: '85–89%', low: 85, high: 89 },
  moderate: { label: 'Moderate', band: '80–84%', low: 80, high: 84 },
  lightModerate: { label: 'Light-moderate', band: '75–79%', low: 75, high: 79 },
  light: { label: 'Light', band: '70–74%', low: 70, high: 74 },
  veryLight: { label: 'Very light', band: '<70%', low: null, high: 70 },
  veryVeryLight: { label: 'Very, very light', band: '<60%', low: null, high: 60 },
}

// RPE column of Table 18.10 → effort. Thresholds reproduce every row exactly,
// including the half-point ratings (9.5, 8.5, 7.5, 6.5):
//   10 & 9.5→Maximal · 9 & 8.5→Very heavy · 8 & 7.5→Heavy · 7 & 6.5→Mod-heavy ·
//   6 & 5.5→Moderate · 5→Light-moderate · 4.5 & 4→Light · 3.5 & 3→Very light ·
//   ≤2→Very, very light.
function rpeEffort(v) {
  if (v >= 9.5) return LOAD_EFFORTS.maximal
  if (v >= 8.5) return LOAD_EFFORTS.veryHeavy
  if (v >= 7.5) return LOAD_EFFORTS.heavy
  if (v >= 6.5) return LOAD_EFFORTS.moderateHeavy
  if (v >= 5.5) return LOAD_EFFORTS.moderate
  if (v >= 5) return LOAD_EFFORTS.lightModerate
  if (v >= 4) return LOAD_EFFORTS.light
  if (v >= 3) return LOAD_EFFORTS.veryLight
  return LOAD_EFFORTS.veryVeryLight
}

// RIR column of Table 18.10 → effort (reps in reserve, exact):
//   0→Maximal · 1→Very heavy · 2→Heavy · 3→Mod-heavy · 4→Moderate ·
//   5→Light-moderate · 6→Light · 7→Very light · ≥8→Very, very light.
function rirEffort(v) {
  if (v <= 0) return LOAD_EFFORTS.maximal
  if (v === 1) return LOAD_EFFORTS.veryHeavy
  if (v === 2) return LOAD_EFFORTS.heavy
  if (v === 3) return LOAD_EFFORTS.moderateHeavy
  if (v === 4) return LOAD_EFFORTS.moderate
  if (v === 5) return LOAD_EFFORTS.lightModerate
  if (v === 6) return LOAD_EFFORTS.light
  if (v === 7) return LOAD_EFFORTS.veryLight
  return LOAD_EFFORTS.veryVeryLight
}

// Table 18.10 effort descriptor for an RPE/RIR value: { label, band, low, high }.
// Returns null when the value is blank or the metric isn't a subjective one.
export function subjectiveEffort(intensityType, value) {
  if (value == null || value === '') return null
  const v = +value
  if (Number.isNaN(v)) return null
  return intensityType === 'RPE' ? rpeEffort(v)
    : intensityType === 'RIR' ? rirEffort(v) : null
}

// Exact %1RM band [low, high] from Table 18.10 for an RPE/RIR value (low = null
// for the open "<high%" bands), else null.
export const subjectivePct = (intensityType, value) => {
  const e = subjectiveEffort(intensityType, value)
  return e ? { low: e.low, high: e.high, band: e.band } : null
}

// Exact target working-load band (kg) implied by an RPE/RIR prescription
// against the Training Max, from the Table 18.10 percentage endpoints — no
// interpolation. Returns { low, high, open } in kg (open bands have low=null),
// or null when there's no value/TM.
export function subjectiveTargetBand(tmKg, intensityType, value) {
  const e = subjectiveEffort(intensityType, value)
  if (!e || !(tmKg > 0)) return null
  return {
    low: e.low != null ? targetKg(tmKg, e.low) : null,
    high: targetKg(tmKg, e.high),
    open: e.low == null,
  }
}

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
  mergeExerciseLibrary(db)
  return db
}

// Idempotently merge the imported Strength-Training-Manual library into
// db.exercises. Matches by case-insensitive name, so re-running never
// duplicates and any exercise the trainer already has (or edited) is left
// untouched — we only ADD the ones that are missing. Runs on every load via
// ensureProgramShape, so fresh seeds and existing databases both end up with
// the full library.
export function mergeExerciseLibrary(db) {
  if (!db.exercises) db.exercises = []
  const have = new Set(db.exercises.map((e) => String(e.name).toLowerCase()))
  for (const x of EXERCISE_LIBRARY) {
    const key = x.name.toLowerCase()
    if (have.has(key)) continue
    have.add(key)
    db.exercises.push({
      id: uid(),
      name: x.name, muscle: x.muscle, equip: x.equip, difficulty: x.difficulty,
      category: x.category, pattern: x.pattern,
      relPct: x.relPct ?? null, relTo: x.relTo ?? null,
      video: 'https://www.youtube.com/results?search_query=' + encodeURIComponent(x.name + ' proper form'),
      thumb: '', source: 'stm-library',
    })
  }
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

// Apply one progression scheme to an exercise's sets.
function progressSets(e, type, value, resolveTm) {
  let sets = e.sets.map((s) => ({ ...s }))
  if (type === 'load') {
    sets = sets.map((s) => (s.prescribedLoadKg != null
      ? { ...s, prescribedLoadKg: +(+s.prescribedLoadKg + +value).toFixed(2) } : s))
  } else if (type === 'percentage') {
    sets = sets.map((s) => {
      const pct = s.prescribedIntensityValue != null ? +s.prescribedIntensityValue + +value : null
      const tm = resolveTm(e.exerciseName)
      return {
        ...s,
        prescribedIntensityValue: pct ?? s.prescribedIntensityValue,
        prescribedLoadKg: e.intensityType === '%1RM' && pct != null && tm
          ? targetKg(tm, pct) : s.prescribedLoadKg,
      }
    })
  } else if (type === 'reps') {
    sets = sets.map((s) => ({ ...s, prescribedReps: (+s.prescribedReps || 0) + +value }))
  } else if (type === 'sets') {
    for (let i = 0; i < +value; i++) {
      const last = sets[sets.length - 1]
      sets.push({ ...structuredClone(last), setId: uid(), setNumber: sets.length + 1 })
    }
  }
  return sets
}

// rules: { [blockId]: { enabled, type, value, exercises: { [exerciseId]:
//   rule } } } where each exercise rule is either an object
//   { enabled, type, value } (own scheme), a bare boolean (legacy:
//   false = stays static, true = inherit block default), or absent
//   (inherit block default). types: 'load'|'percentage'|'reps'|'sets'.
// resolveTm(exerciseName) supplies the Training Max so %1RM rows can
// re-evaluate absolute target weights after a percentage bump.
export function applyProgression(blocks, rules, resolveTm = () => null) {
  return (blocks || []).map((b) => {
    const rule = rules[b.blockId]
    if (!rule?.enabled) return b
    return {
      ...b,
      exercises: b.exercises.map((e) => {
        const exR = rule.exercises?.[e.exerciseId]
        if (exR === false || exR?.enabled === false) return e
        const type = exR?.type ?? rule.type
        const value = exR?.value ?? rule.value
        return { ...e, sets: progressSets(e, type, value, resolveTm) }
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

// ---- Strength tracking from a completed session (Start → Complete → RPE) ------
// Estimated-1RM peaks from a finished "Today's Workout". For every MAIN exercise
// the athlete marked done and actually loaded, take the Epley e1RM of the
// performed weight × reps and keep only those beating the client's rolling
// 30-day Absolute 1RM for that lift. Pure: returns [{ exercise, valueKg }].
// Warm-up/cool-down and cardio/bodyweight rows are skipped naturally — Epley
// needs a load, so weightless rows yield null.
export function workoutPeaks(maxes, workout) {
  if (!workout?.main) return []
  const { clientId, date } = workout
  const peaks = []
  for (const m of workout.main) {
    if (!m.done) continue
    const weight = +(m.doneWeight ?? m.weight) || 0
    const reps = parseInt(m.doneReps ?? m.reps, 10) || 0
    const est = epley1RM(weight, reps)
    if (!est) continue
    const abs = absolute1RM(maxes, clientId, m.name, date)
    if (!abs || est > abs) peaks.push({ exercise: m.name, valueKg: est })
  }
  return peaks
}

// Local-store hook: record each new peak into the maxes ledger (and auto-update
// the assessment for tracked lifts) via recordLiftMax. Runs inside a commit()
// against the draft store. Returns [{ type:'peak', exercise, valueKg, tracked }]
// for toasts. This is the ONLY automatic strength path now — the workout builder
// only prescribes; completion is logged through the session flow.
export function applyWorkoutStrength(draft, workout) {
  const { clientId, date } = workout || {}
  return workoutPeaks(draft.maxes, workout).map((p) => ({
    type: 'peak', exercise: p.exercise, valueKg: p.valueKg,
    tracked: recordLiftMax(draft, clientId, p.exercise, p.valueKg, date, 'auto'),
  }))
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
