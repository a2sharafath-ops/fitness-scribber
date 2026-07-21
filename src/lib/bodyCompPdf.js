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

// Accepts "12.3", "12,3" (EU decimal comma) and thin/nbsp-padded numbers.
const NUM = String.raw`(-?\d{1,3}(?:[.,]\d{1,2})?)`

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
const FIELDS = [
  {
    key: 'massKg',
    unit: 'kg',
    range: [20, 350],
    labels: ['body weight', 'weight', 'total mass', 'peso'],
  },
  {
    key: 'bodyFatPct',
    unit: 'pct',
    range: [1, 75],
    // PBF = InBody's "Percent Body Fat". Order matters: more specific first, so
    // "body fat mass" (kg) can't be mistaken for the percentage.
    labels: ['percent body fat', 'body fat percentage', 'total body fat %', 'body fat %', 'pbf', '% body fat', '% fat', 'fat %'],
  },
  {
    key: 'leanMassKg',
    unit: 'kg',
    range: [10, 200],
    labels: ['fat free mass', 'fat-free mass', 'lean body mass', 'lean mass', 'ffm', 'lbm'],
  },
  {
    key: 'skeletalMuscleKg',
    unit: 'kg',
    range: [5, 100],
    labels: ['skeletal muscle mass', 'skeletal muscle', 'muscle mass', 'smm'],
  },
  {
    key: 'visceralFat',
    unit: 'raw',
    range: [1, 60],
    labels: ['visceral fat level', 'visceral fat area', 'visceral fat rating', 'visceral fat', 'vfa', 'vfl'],
  },
  {
    key: 'hydrationL',
    unit: 'L',
    range: [5, 100],
    labels: ['total body water', 'body water', 'tbw'],
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

// Finds `label` followed by a number, tolerating the separators reports use
// between a label and its value: colons, dots/leader dots, parenthesised units,
// and plain whitespace/newlines. Returns { value, unit } or null.
function matchLabel(text, label) {
  // Between label and number allow: separators, an optional unit-in-parens like
  // "(kg)" or "(%)", and up to ~40 chars of leader dots/spaces.
  const sep = String.raw`(?:\s*[:=]\s*|\s*\([^)]{0,12}\)\s*|[\s.]{0,40})`
  const re = new RegExp(labelPattern(label) + sep + NUM + String.raw`\s*(kg|lbs?|%|l\b|cm2|cm²)?`, 'i')
  const m = re.exec(text)
  if (!m) return null
  return { value: toNum(m[1]), unit: (m[2] || '').toLowerCase() }
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
  const t = normalize(opts.ocr ? repairOcrText(text) : text)
  const values = {}
  const found = []
  if (!t.trim()) return { values, found, method: null, date: null }

  for (const field of FIELDS) {
    for (const label of field.labels) {
      const v = canonical(field, matchLabel(t, label))
      if (v != null) { values[field.key] = v; found.push(field.key); break }
    }
  }

  // Derive lean mass when the report gave weight + body fat % but no explicit
  // FFM line (common on minimal BIA printouts). Marked as found so the coach
  // sees it was filled from the PDF, but it is arithmetic, not a reading.
  if (values.leanMassKg == null && values.massKg != null && values.bodyFatPct != null) {
    const lean = Math.round(values.massKg * (1 - values.bodyFatPct / 100) * 10) / 10
    if (lean >= 10 && lean <= 200) { values.leanMassKg = lean; found.push('leanMassKg') }
  }

  return { values, found, method: detectMethod(t), date: detectDate(t) }
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
