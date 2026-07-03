// Pre-participation screening: HHQ + Goals definitions (adaptable, synthesized from
// NASM/NSCA/ACSM practice) and the pure computation layer (outcomes, red flags,
// gating, expiry). The PAR-Q+ instrument itself lives verbatim in parq.js.
// Pure module — no React, no fetch.
import { parqOutcome, CLEARANCE_MONTHS } from './parq'

// ---- HHQ 2C: conditions (answer: 'no' | 'past' | 'current', + note). flag 1 = 🚩 ----
export const HHQ_CONDITIONS = [
  { id: 'heart', label: 'Heart / cardiovascular disease (heart attack, angina, arrhythmia, heart failure, valve disease, congenital heart condition)', flag: 1 },
  { id: 'bp_chol', label: 'High blood pressure / high cholesterol', flag: 1 },
  { id: 'stroke', label: 'Stroke or TIA', flag: 1 },
  { id: 'diabetes', label: 'Diabetes (Type 1 / Type 2 / pre-diabetes / gestational)', flag: 1 },
  { id: 'thyroid', label: 'Metabolic / thyroid disorder', flag: 0 },
  { id: 'respiratory', label: 'Asthma or other respiratory/lung disease (COPD, bronchitis)', flag: 1 },
  { id: 'cancer', label: 'Cancer (type; current treatment)', flag: 1 },
  { id: 'arthritis', label: 'Arthritis / osteoporosis / osteopenia', flag: 0 },
  { id: 'kidney_liver', label: 'Kidney or liver disease', flag: 1 },
  { id: 'neuro', label: 'Epilepsy / seizures / neurological condition', flag: 1 },
  { id: 'blood', label: 'Anemia or blood/clotting disorder', flag: 0 },
  { id: 'autoimmune', label: 'Autoimmune condition', flag: 0 },
  { id: 'mental', label: 'Mental-health condition (depression, anxiety, eating disorder, other)', flag: 0 },
  { id: 'concussion', label: 'Concussion / head injury', flag: 1 },
  { id: 'hernia', label: 'Any hernia', flag: 0 },
  { id: 'other', label: 'Other diagnosed condition', flag: 1 },
]

// ---- HHQ 2C: current symptoms (yes/no). flag 2 = 🚩🚩 major red flag ----
export const HHQ_SYMPTOMS = [
  { id: 'chest_pain', label: 'Chest pain/discomfort or pressure at rest or with exertion', flag: 2 },
  { id: 'dyspnea', label: 'Unusual shortness of breath at rest or with mild exertion', flag: 2 },
  { id: 'dizziness', label: 'Dizziness, fainting, or blackouts', flag: 2 },
  { id: 'palpitations', label: 'Palpitations / irregular or racing heartbeat', flag: 2 },
  { id: 'oedema', label: 'Ankle swelling (oedema)', flag: 0 },
  { id: 'claudication', label: 'Pain/cramping in legs when walking (claudication)', flag: 0 },
  { id: 'fatigue', label: 'Unusual fatigue with normal activity', flag: 0 },
  { id: 'murmur', label: 'Heart murmur previously diagnosed by a doctor', flag: 1 },
]

// ---- Goals 3A / 3C / 3D option lists ----
export const GOAL_OPTIONS = [
  'Lose fat/weight', 'Build muscle/hypertrophy', 'Increase strength',
  'Improve cardiovascular fitness/endurance', 'Improve general health & energy',
  'Improve mobility/flexibility', 'Sport-specific performance',
  'Rehab/return from injury (with clearance)', 'Tone & body recomposition',
  'Stress relief/mental wellbeing', 'Event preparation (race, wedding, etc.)',
]
export const LOCATION_OPTIONS = ['Commercial gym', 'Home', 'Outdoors', 'Studio', 'Hotel/travel', 'Mix']
export const EQUIPMENT_OPTIONS = [
  'Full gym', 'Dumbbells', 'Barbell + plates', 'Kettlebells', 'Resistance bands',
  'Machines', 'Cardio machines', 'Pull-up bar', 'Bench', 'None/bodyweight only',
]
export const EXERCISE_TYPES = [
  'Weightlifting', 'Bodyweight', 'HIIT', 'Running', 'Cycling', 'Swimming',
  'Yoga/Pilates', 'Sports', 'Group classes', 'Walking/hiking', 'Rowing', 'Dance',
]
export const SESSION_MINUTES = [30, 45, 60, 90]

// ---- Screening record factory ----
export const newScreening = (clientId, today) => ({
  clientId, status: 'draft', step: 'consent', startedOn: today,
  consent: {}, parq: { general: {}, lists: {}, delay: {}, followup: {}, conditionsAndMeds: '', declaration: null },
  hhq: { personal: {}, contacts: {}, conditions: {}, symptoms: {}, risk: {}, meds: {}, msk: {}, womens: {}, lifestyle: {}, activity: {} },
  goals: { primary: '', secondary: [], smart: '', target: {}, event: '', availability: {}, environment: {}, prefs: {} },
  acknowledgements: null,
  outcome: null, programStatus: null, clearance: null,
  completedOn: null, validUntil: null,
})

// ---- Red flags (trainer-only). Returns { major: [..], minor: [..] } of labels ----
export function redFlags(s) {
  const major = [], minor = []
  const hhq = s.hhq || {}
  HHQ_SYMPTOMS.forEach((x) => {
    if (hhq.symptoms?.[x.id] !== true) return
    ;(x.flag === 2 ? major : x.flag === 1 ? minor : []).push(x.label)
  })
  HHQ_CONDITIONS.forEach((x) => {
    const v = hhq.conditions?.[x.id]?.status
    if (x.flag === 1 && (v === 'current' || v === 'past')) minor.push(x.label)
  })
  if (hhq.meds?.hrbpMeds === 'yes' || hhq.meds?.hrbpMeds === 'unsure') minor.push('Medication affecting heart rate / blood pressure')
  if (hhq.meds?.allergies) minor.push('Allergies: ' + hhq.meds.allergies)
  if (hhq.msk?.currentPain) minor.push('Current pain: ' + hhq.msk.currentPain)
  if (hhq.msk?.implants) minor.push('Implants/prostheses: ' + hhq.msk.implants)
  if (s.parq?.delay?.pregnant || hhq.womens?.pregnant === true) minor.push('Pregnant / possibly pregnant')
  if (hhq.womens?.postpartum === true) minor.push('Postpartum within the last 6 months')
  return { major, minor }
}

// ---- Gating: outcome C or any 🚩🚩 gates program start until clearance received ----
export function programStatus(s) {
  const needsReview = s.outcome === 'C' || redFlags(s).major.length > 0
  if (!needsReview) return 'ready'
  return s.clearance?.status === 'received' ? 'ready' : 'gated'
}

// ---- Expiry: valid for 12 months from completion; invalid on health change ----
export const validUntilFrom = (completedOn) => {
  const [y, m, d] = completedOn.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1 + CLEARANCE_MONTHS, d)).toISOString().slice(0, 10)
}
export const isExpired = (s, today) => !!s.validUntil && today > s.validUntil

// Finalize a completed screening: compute + stamp everything derived (silently —
// the client-facing UI never renders these fields).
export function finalizeScreening(s, today) {
  const outcome = parqOutcome(s.parq)
  const done = {
    ...s, status: 'complete', outcome,
    completedOn: today, validUntil: validUntilFrom(today),
    clearance: s.clearance || { action: outcome === 'C' ? 'eparmedx_or_physician' : 'none', status: 'not_started', notes: '', dateCleared: '' },
  }
  done.programStatus = programStatus(done)
  return done
}

// Latest screening rows for a client (complete + draft, newest first)
export function screeningsFor(list = [], clientId) {
  const mine = list.filter((x) => x.clientId === clientId)
  const complete = mine.filter((x) => x.status === 'complete').sort((a, b) => (b.completedOn || '').localeCompare(a.completedOn || ''))[0] || null
  const draft = mine.find((x) => x.status === 'draft') || null
  return { complete, draft }
}

// ---- Computed profile fields (populate, don't ask again) ----
export const bmiOf = (heightCm, massKg) =>
  heightCm && massKg ? +(massKg / (heightCm / 100) ** 2).toFixed(1) : null

// Age from ISO date of birth (both are stored; age auto-fills from DOB).
export function ageFrom(dob, todayIso) {
  if (!dob) return null
  const [y, m, d] = dob.split('-').map(Number)
  const [ty, tm, td] = todayIso.split('-').map(Number)
  return ty - y - (tm < m || (tm === m && td < d) ? 1 : 0)
}

// Re-screen due indicator: expired, or expiring within 30 days.
export const rescreenDue = (s, today) => {
  if (!s?.validUntil) return false
  const soon = new Date(new Date(today).getTime() + 30 * 86400000).toISOString().slice(0, 10)
  return s.validUntil <= soon
}

export const physicallyInactive = (s) => s.hhq?.activity?.exercises === false

// CVD/metabolic risk factors (HHQ 2D + derived). Returns [{ label, hit }] for hits only.
export function cvdRiskFactors(s, anthro = {}) {
  const r = s.hhq?.risk || {}
  const p = s.hhq?.personal || {}
  const age = p.age ?? anthro.age
  const sex = (p.sex || '').toLowerCase()
  const out = []
  if (age != null && ((sex === 'male' && age >= 45) || (sex === 'female' && age >= 55))) out.push('Age (M ≥ 45 / F ≥ 55)')
  if (r.familyHistory === true) out.push('Family history of early cardiac events')
  if (r.smoking === 'current' || r.smoking === 'quit_lt_6mo') out.push('Smoking (current or quit < 6 months)')
  if (physicallyInactive(s)) out.push('Physically inactive (derived from activity answers)')
  const bmi = bmiOf(p.heightCm ?? anthro.heightCm, p.massKg ?? anthro.massKg)
  if (bmi != null && bmi >= 30) out.push(`BMI ${bmi} (≥ 30)`)
  if (r.highCholesterol === true) out.push('Known high cholesterol / lipids')
  if (r.highGlucose === true) out.push('Known elevated fasting glucose / A1c')
  return out
}

export const OUTCOME_META = {
  A: { label: 'Cleared', color: 'green', desc: 'Self-cleared for unrestricted activity (NO to all 7 general questions).' },
  B: { label: 'Cleared – low risk', color: 'blue', desc: 'YES to ≥1 general question but NO to all follow-ups; minimal supervision recommended.' },
  C: { label: 'Review required', color: 'red', desc: 'YES to ≥1 follow-up — physician clearance / ePARmed-X+ likely needed before an active program.' },
}
export const CLEARANCE_STATUSES = [['not_started', 'Not started'], ['requested', 'Requested'], ['received', 'Received']]
