// Body-composition report parsing — pure, React-free, no I/O.
//
// Device reports (InBody, DEXA, Tanita/Omron BIA) all print the same handful of
// measurements under different names, in different orders, with different units.
// This module turns already-extracted PDF text into the six fields the body
// composition assessment stores. It never guesses: a field is only returned when
// a known label is matched AND the number lands inside a physiologically
// plausible range. Everything unmatched is left for the coach to type.
//
// Kept separate from the PDF reading itself (see pdfText.js) so the matching
// logic can be unit-tested against plain strings.

const toNum = (s) => {
  const n = Number(String(s).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

// lb → kg. Reports are either fully metric or fully imperial; we detect per-match.
const LB_TO_KG = 0.45359237

// Field definitions. `labels` are matched case-insensitively against the text;
// the first label that yields an in-range number wins. `range` is a sanity gate
// in the field's canonical unit — values outside it are treated as a mis-read
// (usually a page number or a reference-range bound picked up by mistake).
// `concepts` are the fallback: groups of ideas that together identify the
// measurement. Every token in a group must appear on the line, in any order,
// allowing for extra words and light OCR damage. Groups are ordered most
// specific first, because the first that yields a plausible number wins.
const FIELDS = [
  {
    key: 'massKg',
    unit: 'kg',
    range: [20, 350],
    labels: ['body weight', 'weight', 'total mass', 'peso'],
    concepts: [['body', 'weight'], ['total', 'mass'], ['weight']],
  },
  {
    key: 'bodyFatPct',
    unit: 'pct',
    range: [1, 75],
    // PBF = InBody's "Percent Body Fat". Order matters: more specific first, so
    // "body fat mass" (kg) can't be mistaken for the percentage.
    labels: ['percent body fat', 'body fat percentage', 'total body fat %', 'body fat %', 'pbf', '% body fat', '% fat', 'fat %'],
    concepts: [['percent', 'body', 'fat'], ['body', 'fat', 'percentage'], ['pbf']],
  },
  {
    key: 'leanMassKg',
    unit: 'kg',
    range: [10, 200],
    labels: ['fat free mass', 'fat-free mass', 'lean body mass', 'lean mass', 'ffm', 'lbm'],
    concepts: [['fat', 'free', 'mass'], ['lean', 'body', 'mass'], ['lean', 'mass'], ['ffm'], ['lbm']],
  },
  {
    key: 'skeletalMuscleKg',
    unit: 'kg',
    range: [5, 100],
    labels: ['skeletal muscle mass', 'skeletal muscle', 'muscle mass', 'smm'],
    // "skeletal muscle" alone is enough — the trailing "mass" is optional, which
    // is what lets a sheet saying "Skeletal Muscle Mass" fill a field we call
    // "Skeletal muscle". "muscle mass" is a separate, looser group.
    concepts: [['skeletal', 'muscle'], ['muscle', 'mass'], ['smm']],
  },
  {
    key: 'visceralFat',
    unit: 'raw',
    range: [1, 60],
    labels: ['visceral fat level', 'visceral fat area', 'visceral fat rating', 'visceral fat', 'vfa', 'vfl'],
    concepts: [['visceral', 'fat']],
  },
  {
    key: 'hydrationL',
    unit: 'L',
    range: [5, 100],
    labels: ['total body water', 'body water', 'tbw'],
    concepts: [['total', 'body', 'water'], ['body', 'water'], ['tbw']],
  },
]

// Normalises whitespace so labels split across PDF text runs still match, and
// lowercases for case-insensitive matching. Keeps digits/punctuation intact.
export function normalize(text) {
  return String(text || '')
    .replace(/ | | /g, ' ')   // nbsp variants → space
    .replace(/[\r\n\t]+/g, '\n')
    .replace(/[ ]{2,}/g, ' ')
    .toLowerCase()
}

// ---- OCR repair -------------------------------------------------------------
// Tesseract reliably confuses a handful of glyph pairs. Applied ONLY to OCR
// output (never to a real text layer), and only inside numeric contexts, so a
// letter that is genuinely part of a word is never touched.
const OCR_DIGIT = { o: '0', q: '0', l: '1', i: '1', '|': '1', s: '5', b: '8', z: '2', g: '9' }

// A token counts as "numeric" when digits outnumber letters — e.g. "8o.4",
// "l9.2", "5s.1". Words like "kg", "male" or "bia" are left untouched.
function repairNumericToken(tok) {
  const digits = (tok.match(/\d/g) || []).length
  const letters = (tok.match(/[a-z|]/g) || []).length
  if (digits === 0 || letters === 0 || digits < letters) return tok
  return tok.replace(/[a-z|]/g, (ch) => OCR_DIGIT[ch] ?? ch)
}

/**
 * Repair OCR text before parsing.
 *
 * Fixes glyph confusions inside numbers and the spaced-out decimal separators
 * Tesseract invents. Never applied to a real PDF text layer, which is exact.
 */
export function repairOcrText(text) {
  return String(text || '')
    // "19 . 2" / "19 ,2" / "19'2" → "19.2"
    .replace(/(\d)\s*[.,'`´]\s*(\d)/g, '$1.$2')
    .split(/(\s+)/)
    .map((tok) => (/\s/.test(tok) ? tok : repairNumericToken(tok.toLowerCase())))
    .join('')
}

// Escapes a label for use inside a RegExp, and allows any run of whitespace
// wherever the label has a space (PDF extraction often inserts line breaks).
const labelPattern = (label) =>
  label
    .split(/\s+/)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join(String.raw`\s*`)

// Words that turn a label into a *different* measurement. InBody's "Weight
// Control" panel prints "Target Weight 96.8 kg" right next to the real weight,
// and matching it silently fills the form with the wrong number — worse than
// filling nothing. Any label preceded by one of these is skipped.
const QUALIFIER = /(target|ideal|goal|desirable|recommended?|standard|control|normal|min|max|range|per|based)\W{0,3}$/

// InBody prints a "Weight Control" panel — Target Weight, Weight Control, Fat
// Control — immediately beside the real measurements. Those are goals, not
// readings, and sit close enough that any nearby-number strategy will pick them
// up. Blanking the number that follows a goal word removes the trap entirely,
// which matters more than the missed field: a silently wrong weight is worse
// than an empty one.
const maskGoals = (t) =>
  t.replace(/\b(target|ideal|goal|desirable|recommended?)\b[^\d\n]{0,25}-?\d+(?:\.\d+)?/gi, '$1 ')

// Reference ranges — "(46.1~56.3)", "( 1~9 )", "(kg)" — are not values.
// Stripping them before reading numbers stops a range bound being mistaken for
// the measurement.
const stripRanges = (line) =>
  line
    .replace(/\([^)]*\)/g, ' ')
    .replace(/-?\d[\d.]*\s*[~∼]\s*-?\d[\d.]*/g, ' ')

// Pulls the numbers out of a line, in order, each with any unit written
// directly after it. Carrying the unit per number (rather than sniffing near
// the label) is what keeps "Weight ....... 165.3 lb" convertible — the leader
// dots can put the value far from its label, but never from its own unit.
function numbersIn(line) {
  const re = /(-?\d+(?:\.\d+)?)\s*(kgs?|lbs?|%|l)?\b/gi
  const out = []
  let m
  while ((m = re.exec(stripRanges(line))) !== null) {
    const value = toNum(m[1])
    if (value != null) out.push({ value, unit: (m[2] || '').toLowerCase() })
  }
  return out
}

// InBody and DEXA print bar-chart scales ("0.0 5.0 10.0 … 50.0") between a label
// and its value. Such a run is evenly spaced and ascending; the real reading is
// whatever follows it. Detecting and dropping the run is what lets the value be
// found at all on chart rows.
function dropAxisRuns(toks) {
  const out = []
  let i = 0
  while (i < toks.length) {
    let j = i + 1
    while (j < toks.length && toks[j].value > toks[j - 1].value) j++
    const run = toks.slice(i, j)
    // A scale is a long ascending run whose steps are near-constant.
    let isAxis = false
    if (run.length >= 4) {
      const steps = run.slice(1).map((t, k) => t.value - run[k].value)
      const avg = steps.reduce((a, b) => a + b, 0) / steps.length
      isAxis = avg > 0 && steps.every((s) => Math.abs(s - avg) <= Math.max(avg * 0.45, 0.6))
    }
    if (!isAxis) out.push(...run)
    i = j
  }
  return out
}

// ---- Fuzzy (concept) matching ----------------------------------------------
// Exact phrases are brittle: a report may say "Skeletal Muscle Mass" where we
// expect "Skeletal Muscle", may reorder words, or may have a letter chewed up
// by OCR. Concept matching asks a looser question — does this line mention all
// the ideas that identify the measurement? — regardless of order or wording.

// Levenshtein distance, abandoned once it exceeds `max` (we only care about
// near-misses, and bailing early keeps this cheap inside the line scan).
function editDistance(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    let best = i
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
      if (cur[j] < best) best = cur[j]
    }
    if (best > max) return max + 1
    prev = cur
  }
  return prev[b.length]
}

// How forgiving to be depends on length. Abbreviations (smm, tbw, pbf, ffm) must
// match exactly — at three letters, one substitution reaches a different word.
function tokenMatches(token, word) {
  if (token === word) return true
  if (token.length < 5) return false
  // The first letter must agree. Edit distance alone is not enough to tell
  // clinical terms apart — "intracellular" and "extracellular" are only two
  // edits from each other, and treating them as the same word made total body
  // water come out as double the extracellular figure. Distinguishing prefixes
  // (intra/extra, hyper/hypo) differ at the start, while OCR damage rarely
  // lands on the leading glyph, so anchoring there separates the two cases.
  if (token[0] !== word[0]) return false
  // Two edits from six letters up: OCR merges "cl" into "d" and "rn" into "m",
  // so "muscle" arrives as "musde" — a distance of two, not one.
  const tol = token.length >= 6 ? 2 : 1
  return editDistance(token, word, tol) <= tol
}

// Splits a line into words with the index just past each, so we can read the
// numbers that follow the concept rather than any number on the line.
function wordsWithEnd(line) {
  const out = []
  const re = /[a-z0-9%]+/g
  let m
  while ((m = re.exec(line)) !== null) out.push({ word: m[0], end: m.index + m[0].length })
  return out
}

// True when every token in the group appears somewhere on the line; returns the
// position after the last of them, which is where the value normally sits.
function conceptEnd(line, group) {
  const words = wordsWithEnd(line)
  let last = -1
  for (const token of group) {
    let hit = -1
    for (const w of words) if (tokenMatches(token, w.word)) { hit = Math.max(hit, w.end) }
    if (hit < 0) return -1
    last = Math.max(last, hit)
  }
  return last
}

/**
 * Find a field's value by scanning line by line.
 *
 * Flat whole-document regexes fail on real report layouts, where the value can
 * be separated from its label by a chart scale or pushed onto the next line.
 * Working per line keeps the label and its value associated, and lets us fall
 * through to the following line when the label's own line holds only a scale.
 */
function findField(lines, field) {
  for (let i = 0; i < lines.length; i++) {
    for (const label of field.labels) {
      // A label must start at a word boundary, or "weight" matches inside the
      // run-together words OCR produces ("oncurrentweightmemmm") and picks up a
      // neighbouring chart figure. No trailing boundary: OCR routinely fuses a
      // label with its unit ("Body Fat Mass (kg)" → "body fat masstkg").
      const re = new RegExp('(?:^|[^a-z0-9])' + labelPattern(label), 'gi')
      let m
      while ((m = re.exec(lines[i])) !== null) {
        const before = lines[i].slice(0, m.index)
        if (QUALIFIER.test(before)) continue          // "target weight", "weight control"…
        const v = valueAfter(field, lines, i, m.index + m[0].length)
        if (v != null) return v
      }
    }
  }

  // Nothing matched by exact phrase — try the looser concept match, which
  // tolerates extra words ("Skeletal Muscle" vs "Skeletal Muscle Mass"),
  // reordering, and single-character OCR damage.
  for (let i = 0; i < lines.length; i++) {
    for (const group of field.concepts || []) {
      const end = conceptEnd(lines[i], group)
      if (end < 0) continue
      const v = valueAfter(field, lines, i, end)
      if (v != null) return v
    }
  }
  return null
}

// Reads the value belonging to a label that ends at `from` on line `i`.
function valueAfter(field, lines, i, from) {
  const here = dropAxisRuns(numbersIn(lines[i].slice(from)))
  for (const tok of here) {
    const v = canonical(field, tok)
    if (v != null) return v
  }
  // Fall to the next line only when this label carried no number of its own —
  // i.e. it is a heading sitting above its value, as chart rows are. Without
  // this guard a section header ("Body Water Analysis") would swallow whatever
  // number happened to follow it.
  if (here.length === 0) {
    const next = dropAxisRuns(numbersIn(lines[i + 1] || ''))
    // A dense line is someone else's data, not this label's value.
    if (next.length > 0 && next.length <= 3) {
      for (const tok of next) {
        const v = canonical(field, tok)
        if (v != null) return v
      }
    }
  }
  return null
}

// Converts a raw match into the field's canonical unit, or null if implausible.
function canonical(field, hit) {
  if (!hit || hit.value == null) return null
  let v = hit.value
  if (field.unit === 'kg' && (hit.unit === 'lb' || hit.unit === 'lbs')) v = v * LB_TO_KG
  v = Math.round(v * 10) / 10
  const [lo, hi] = field.range
  if (v < lo || v > hi) return null
  return v
}

/**
 * Parse body-composition values out of report text.
 *
 * @param {string} text  Text extracted from the PDF (any layout).
 * @param {{ ocr?: boolean }} [opts]  Set `ocr` when the text came from OCR, which
 *   enables glyph-confusion repair. Never enable it for a real text layer.
 * @returns {{ values: Object, found: string[], method: string|null, date: string|null }}
 *   `values` holds only the fields that matched; `found` lists their keys so the
 *   UI can flag which inputs came from the PDF rather than the coach.
 */
export function parseBodyComp(text, opts = {}) {
  const t = maskGoals(normalize(opts.ocr ? repairOcrText(text) : text))
  const values = {}
  const found = []
  if (!t.trim()) return { values, found, method: null, date: null }

  const lines = t.split('\n')
  for (const field of FIELDS) {
    const v = findField(lines, field)
    if (v != null) { values[field.key] = v; found.push(field.key) }
  }

  // Helper measurements we don't store, but which reconstruct the ones we do.
  // On a dense InBody sheet these read far more reliably than the headline
  // numbers, because they sit in plain label-value panels rather than charts.
  const extra = Object.fromEntries(HELPERS.map((h) => [h.key, findField(lines, h)]))
  derive(values, found, extra)

  return { values, found, method: detectMethod(t), date: detectDate(t) }
}

// Measurements used only to reconstruct missing fields.
const HELPERS = [
  { key: 'fatMassKg', unit: 'kg', range: [1, 150], labels: ['body fat mass', 'fat mass'], concepts: [['body', 'fat', 'mass'], ['fat', 'mass']] },
  { key: 'icwL', unit: 'L', range: [3, 60], labels: ['intracellular water', 'icw'], concepts: [['intracellular', 'water']] },
  { key: 'ecwL', unit: 'L', range: [2, 40], labels: ['extracellular water', 'ecw'], concepts: [['extracellular', 'water']] },
]

const inRange = (v, lo, hi) => v != null && Number.isFinite(v) && v >= lo && v <= hi
const r1 = (v) => Math.round(v * 10) / 10

/**
 * Fill gaps by arithmetic on values the report itself printed.
 *
 * Every relation here is an identity, not an estimate: fat-free mass really is
 * weight minus fat mass. Derivation only ever fills a field left empty by
 * matching, never overrides a direct reading, and each result must land in a
 * plausible range to be accepted.
 */
function derive(values, found, extra = {}) {
  // Fills an empty field, or sharpens one whose decimal OCR dropped. These
  // reports print weights to one decimal, so a direct read that came back a
  // whole number lost its point ("97.4" → "97"); when an exact identity agrees
  // to within a unit, that identity is the better-preserved value. The number
  // never changes materially — this only restores precision.
  const add = (key, v) => {
    if (v == null) return
    const cur = values[key]
    if (cur == null) { values[key] = v; found.push(key); return }
    if (Number.isInteger(cur) && !Number.isInteger(v) && Math.abs(v - cur) < 1) values[key] = v
  }
  const { fatMassKg, icwL, ecwL } = extra

  // Total body water = intracellular + extracellular.
  if (inRange(icwL, 3, 60) && inRange(ecwL, 2, 40)) {
    const tbw = r1(icwL + ecwL)
    if (inRange(tbw, 5, 100)) add('hydrationL', tbw)
  }
  // Body fat % from fat mass and weight.
  if (inRange(fatMassKg, 1, 150) && inRange(values.massKg, 20, 350)) {
    const pct = r1((fatMassKg / values.massKg) * 100)
    if (inRange(pct, 1, 75)) add('bodyFatPct', pct)
  }
  // Weight back out of fat mass and fat % — recovers the headline number when
  // it is buried in a chart, as it is on the InBody 570 sheet.
  if (inRange(fatMassKg, 1, 150) && inRange(values.bodyFatPct, 1, 75)) {
    const mass = r1(fatMassKg / (values.bodyFatPct / 100))
    if (inRange(mass, 20, 350)) add('massKg', mass)
  }
  // Lean (fat-free) mass = weight − fat mass, else weight × (1 − fat%).
  if (inRange(fatMassKg, 1, 150) && inRange(values.massKg, 20, 350)) {
    const lean = r1(values.massKg - fatMassKg)
    if (inRange(lean, 10, 200)) add('leanMassKg', lean)
  }
  if (inRange(values.massKg, 20, 350) && inRange(values.bodyFatPct, 1, 75)) {
    const lean = r1(values.massKg * (1 - values.bodyFatPct / 100))
    if (inRange(lean, 10, 200)) add('leanMassKg', lean)
  }
}

// Identifies the device so the form's Method dropdown can be preset. Returns one
// of the dropdown's exact option values, or null when nothing is recognisable.
// Brand names are matched loosely because OCR mangles their capitals — "InBody"
// commonly comes back as "lnBody" or "1nBody" (capital I → l / 1).
export function detectMethod(text) {
  const t = normalize(text)
  if (/\b[il1|]nbody\b/.test(t)) return 'InBody'
  if (/\b(dexa|dxa|densitometry|hologic|lunar)\b/.test(t)) return 'DEXA'
  if (/\b(caliper|skinfold|jackson|pollock)\b/.test(t)) return 'Calipers'
  if (/\b(bioelectrical|impedance|bia|tanita|omron)\b/.test(t)) return 'BIA'
  return null
}

// Pulls the test date so the assessment is dated from the report, not "today".
// Handles yyyy.mm.dd / yyyy-mm-dd (InBody) and dd/mm/yyyy — returns ISO or null.
export function detectDate(text) {
  const t = normalize(text)
  const iso = /\b(20\d{2})[.\-/](\d{1,2})[.\-/](\d{1,2})\b/.exec(t)
  if (iso) {
    const [, y, m, d] = iso
    if (+m >= 1 && +m <= 12 && +d >= 1 && +d <= 31) return `${y}-${String(+m).padStart(2, '0')}-${String(+d).padStart(2, '0')}`
  }
  const dmy = /\b(\d{1,2})[.\-/](\d{1,2})[.\-/](20\d{2})\b/.exec(t)
  if (dmy) {
    const [, d, m, y] = dmy
    if (+m >= 1 && +m <= 12 && +d >= 1 && +d <= 31) return `${y}-${String(+m).padStart(2, '0')}-${String(+d).padStart(2, '0')}`
  }
  return null
}

// Human-readable labels for the "filled from PDF" summary line.
export const FIELD_LABELS = {
  massKg: 'Body mass',
  bodyFatPct: 'Body fat',
  leanMassKg: 'Lean mass',
  skeletalMuscleKg: 'Skeletal muscle',
  visceralFat: 'Visceral fat',
  hydrationL: 'Total body water',
}
