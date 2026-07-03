// Heuristic transcript → blocks parser. Pure, React-free.
// Used as the local-mode fallback for the AI voice pipeline; backend mode
// sends the transcript to the parse-workout edge function (LLM) instead.
// Corrections ("no wait, scratch that, make it…") resolve naturally because
// for every parameter the LAST spoken value in an exercise clause wins.
import { newBlock, newProgExercise, newSet, BLOCK_TYPES, INTENSITY_TYPES, mapExercise } from './program'

const WORDNUM = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, twenty: 20,
}
const digitize = (t) => t.replace(/\b([a-z]+)\b/g, (w) => (WORDNUM[w.toLowerCase()] != null ? WORDNUM[w.toLowerCase()] : w))

const BLOCK_RE = [
  [/warm[\s-]?up/i, 'Warm-up'],
  [/main (?:lift|block|lifts)/i, 'Main Lifts'],
  [/assist(?:ed|ance)|accessor/i, 'Assisted'],
  [/core|hypertrophy|other/i, 'Core/Others'],
  [/cool[\s-]?down/i, 'Cool-down'],
]

const last = (arr) => (arr.length ? arr[arr.length - 1] : null)
const allMatches = (re, s) => [...s.matchAll(re)]

// One clause like "bench press, 4 sets of 8 reps at rpe 8" → exercise object.
function parseExercise(clause, order) {
  const t = digitize(clause).toLowerCase()
  const setsM = last(allMatches(/(\d+)\s*sets?/g, t))
  if (!setsM) return null
  const repsM = last(allMatches(/(?:sets?\s*(?:of|x|by)\s*|x\s*)(\d+)(?:\s*reps?)?/g, t))
  const rpeM = last(allMatches(/rpe\s*(?:of\s*)?(\d+(?:\.\d)?)/g, t))
  const pctM = last(allMatches(/(\d+(?:\.\d)?)\s*(?:%|percent)/g, t))
  const loadM = last(allMatches(/(\d+(?:\.\d+)?)\s*(?:kg|kilo|kilos|kilograms)/g, t))
  const hrM = last(allMatches(/(\d+)\s*(?:bpm|beats)/g, t))
  const restM = last(allMatches(/(\d+(?:\.\d)?)\s*(minutes?|min|seconds?|secs?)\s*(?:rest|between)/g, t))

  // Name = whatever precedes the first sets mention (in the digitized text,
  // so indexes line up). First mention, not last — corrections repeat the
  // numbers but the name is spoken up front.
  const firstSets = allMatches(/(\d+)\s*sets?/g, t)[0]
  const name = t.slice(0, firstSets.index)
    .replace(/^(?:let'?s\s+(?:do|put down|add|go with)\s*)/i, '')
    .replace(/\b(?:do|let'?s|we'?ll|add|go with)\b/gi, ' ')
    .replace(/[,.:;-]+/g, ' ').replace(/\s+/g, ' ').trim()
  if (!name) return null

  const count = Math.min(12, Math.max(1, +setsM[1]))
  const reps = repsM ? +repsM[1] : 10
  const rest = restM ? Math.round(+restM[1] * (restM[2].startsWith('min') ? 60 : 1)) : 90
  let intensityType = 'Load', intensity = null, loadKg = null
  if (rpeM) { intensityType = 'RPE'; intensity = +rpeM[1] }
  else if (pctM) { intensityType = '%1RM'; intensity = +pctM[1] }
  else if (hrM) { intensityType = 'Target HR'; intensity = +hrM[1] }
  if (loadM) { loadKg = +loadM[1]; if (!rpeM && !pctM && !hrM) intensityType = 'Load' }

  return newProgExercise(name, {
    order,
    intensityType,
    sets: Array.from({ length: count }, (_, i) => newSet(i + 1, { reps, intensity, loadKg, rest })),
  })
}

// Full transcript → blocks[]. Splits into block sections on spoken block
// names, then into exercise clauses on connectors / sentence breaks.
export function parseTranscript(text) {
  const src = String(text || '').trim()
  if (!src) return []
  // Section the transcript by block mentions (default: Main Lifts).
  const sections = []
  let cur = { type: 'Main Lifts', text: '' }
  for (const piece of src.split(/(?<=[.;!?])\s+|\n+/)) {
    const hit = BLOCK_RE.find(([re]) => re.test(piece))
    if (hit) {
      if (cur.text.trim()) sections.push(cur)
      cur = { type: hit[1], text: piece }
    } else cur.text += ' ' + piece
  }
  if (cur.text.trim()) sections.push(cur)

  const blocks = []
  sections.forEach((sec) => {
    let block = blocks.find((b) => b.blockType === sec.type)
    if (!block) { block = newBlock(sec.type, blocks.length + 1); blocks.push(block) }
    const raw = sec.text.split(/\bthen\b|\bnext\b|\bafter that\b|\bfollowed by\b|(?<=[.;!?])\s+/i)
    // Fold correction clauses back onto the exercise they amend, so the
    // last-spoken values win ("…three sets of ten. No wait, make it four
    // sets of eight" → one clause, 4×8).
    const clauses = []
    raw.map((c) => c.trim()).filter(Boolean).forEach((c) => {
      if (clauses.length && /^\W*(?:no,?\s*wait|wait|scratch that|no,?\s+|actually|make (?:it|that)|sorry|correction|i mean)/i.test(c)) {
        clauses[clauses.length - 1] += ' ' + c
      } else clauses.push(c)
    })
    clauses.forEach((c) => {
      const ex = parseExercise(c, block.exercises.length + 1)
      if (ex) block.exercises.push(ex)
    })
  })
  return blocks.filter((b) => b.exercises.length).map((b, i) => ({ ...b, order: i + 1 }))
}

export const KNOWN_BLOCKS = BLOCK_TYPES

// Coerce loose LLM output (spec-schema-ish JSON) into store-shaped blocks
// with fresh ids and sane defaults. Tolerates either full set arrays or a
// {setCount, prescribedReps, ...} shorthand per exercise.
export function normalizeParsed(raw) {
  const blocks = Array.isArray(raw) ? raw : raw?.blocks
  if (!Array.isArray(blocks)) return []
  return blocks.map((b, bi) => {
    const nb = newBlock(BLOCK_TYPES.includes(b.blockType) ? b.blockType : 'Main Lifts', bi + 1)
    if (b.autoCalculate1RM != null) nb.autoCalculate1RM = !!b.autoCalculate1RM
    nb.exercises = (b.exercises || []).map((e, ei) => {
      const type = INTENSITY_TYPES.includes(e.intensityType) ? e.intensityType : 'Load'
      let sets
      if (Array.isArray(e.sets) && e.sets.length) {
        sets = e.sets.map((s, si) => newSet(si + 1, {
          reps: +s.prescribedReps || 10,
          intensity: s.prescribedIntensityValue != null ? +s.prescribedIntensityValue : null,
          loadKg: s.prescribedLoadKg != null ? +s.prescribedLoadKg : null,
          tempo: s.prescribedTempo || '',
          rest: +s.prescribedRestSeconds || 90,
        }))
      } else {
        const n = Math.max(1, +e.setCount || +e.sets || 3)
        sets = Array.from({ length: n }, (_, si) => newSet(si + 1, {
          reps: +e.prescribedReps || 10,
          intensity: e.prescribedIntensityValue != null ? +e.prescribedIntensityValue : null,
          loadKg: e.prescribedLoadKg != null ? +e.prescribedLoadKg : null,
        }))
      }
      return newProgExercise(e.exerciseName || e.name || '', {
        order: ei + 1, intensityType: type, group: e.supersetLinkId || null, sets,
      })
    }).filter((e) => e.exerciseName)
    return nb
  }).filter((b) => b.exercises.length)
}

// Cross-reference every parsed exercise against the synonym index / library
// (spec 5.2). Misses keep the raw string and get flagged unmapped:true so the
// UI can force manual dropdown validation before a save event.
export function applySynonyms(blocks, synonyms, exercises) {
  return (blocks || []).map((b) => ({
    ...b,
    exercises: b.exercises.map((e) => {
      const hit = mapExercise(e.exerciseName, synonyms, exercises)
      return { ...e, exerciseName: hit.name, unmapped: !hit.matched }
    }),
  }))
}
