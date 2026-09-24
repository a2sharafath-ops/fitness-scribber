import { addDays } from './dates'
import { screeningsFor } from './screening'
import { epley1RM } from './program'
import { postureFindings, SEVERITY_WEIGHT } from './posture'

// Pure helpers for the Assessment module — no React, no I/O.
// One record shape: { id, clientId, type, date, phase, data, notes }.
// The `data` payload is type-specific (see the forms). These helpers pick
// baseline/latest, score movement screens, summarise a record, and diff a
// baseline against the latest for the compare view.

// `icon` values are Icon-component names (see components/atoms/Icon.jsx),
// rendered as <Icon name={meta.icon} /> at each site.
export const TYPES = [
  { key: 'fitness', label: 'Fitness', icon: 'dumbbell', by: 'coach' },
  { key: 'movement', label: 'Movement screen', icon: 'activity', by: 'coach' },
  { key: 'body_comp', label: 'Body composition', icon: 'scale', by: 'coach' },
  { key: 'pain', label: 'Pain', icon: 'danger', by: 'athlete' },
  { key: 'lifestyle', label: 'Lifestyle', icon: 'watch', by: 'athlete' },
  { key: 'goals', label: 'Goals', icon: 'target', by: 'athlete' },
]
// Types with a form implemented (coach can record any; pain/lifestyle/goals
// are also athlete self-reportable from the portal).
export const ACTIVE_TYPES = ['fitness', 'movement', 'body_comp', 'pain', 'lifestyle', 'goals']
export const SELF_REPORT_TYPES = ['pain', 'lifestyle', 'goals']
export const ACTIVITY_LEVELS = ['Sedentary', 'Light', 'Moderate', 'Active', 'Very active']
export const typeMeta = (key) => TYPES.find((t) => t.key === key) || { key, label: key, icon: 'clipboard' }

export const MOVEMENT_PATTERNS = ['squat', 'hinge', 'lunge', 'push', 'pull']
export const MOVEMENT_MAX = MOVEMENT_PATTERNS.length * 3

const num = (v) => (v == null || v === '' || Number.isNaN(+v) ? null : +v)

// Estimated 1RM for a strength-test entry. A single rep is treated as a true
// 1RM (returns the weight); multi-rep tests use the Epley estimate — the same
// formula the completion flow uses — so assessment and training 1RMs are
// computed identically. Returns null for an empty/invalid weight.
export function estOneRepMax(weightKg, reps) {
  const w = num(weightKg), r = num(reps)
  if (!w || w <= 0) return null
  if (!r || r <= 1) return +w.toFixed(1)
  return epley1RM(w, r)
}
// Assessments can be recorded more than once on the same day. Prefer the full
// creation timestamp when present so "latest" really is the newest entry;
// legacy records without one still sort correctly by their assessment date.
const byDateDesc = (a, b) => (b.date || '').localeCompare(a.date || '') ||
  (b.createdAt || '').localeCompare(a.createdAt || '')

// Tracked lift peaks are progress observations, not complete fitness tests.
// Early backend imports retained their auto-update note but not sourceMaxId.
export const isTrainingDerivedAssessment = (rec) => rec?.type === 'fitness' && (
  !!rec.data?.sourceMaxId || !!rec.data?.sourceWorkoutId || rec.phase === 'progress' ||
  /^(Auto-update: new estimated 1RM peak|Trainer-recorded 1RM:)/.test(rec.notes || '')
)
export const formalAssessments = (list) => (list || []).filter((a) => !isTrainingDerivedAssessment(a))

export const forClient = (assessments, clientId) =>
  (assessments || []).filter((a) => a.clientId === clientId)

// Most recent record of a type.
export const latest = (list, type) =>
  list.filter((a) => a.type === type).sort(byDateDesc)[0] || null

// The onboarding baseline (explicit phase, else the earliest record).
export const baseline = (list, type) => {
  const of = list.filter((a) => a.type === type)
  return of.find((a) => a.phase === 'baseline') || of.sort((a, b) => (a.date || '').localeCompare(b.date || ''))[0] || null
}

// Preserve the source of each displayed measurement. Older profile snapshots
// may contain values mirrored from body composition without a source marker;
// those are explicitly labelled unknown rather than claimed as manual.
export function resolveAnthroDetails(db, client) {
  const stored = client.anthro || {}
  const sourceMap = stored._sources || {}
  const bodyRecord = latest(forClient(db.assessments, client.id), 'body_comp')
  const screening = screeningsFor(db.screenings, client.id).complete
  const body = bodyRecord?.data || {}
  const personal = screening?.hhq?.personal || {}
  const fields = ['age', 'heightCm', 'massKg', 'bodyFatPct', 'leanMassKg']
  return Object.fromEntries(fields.map((field) => {
    const value = num(stored[field])
    const source = sourceMap[field]
    if (value != null) {
      if (source?.kind === 'body_comp') return [field, { value, kind: 'body_comp', label: `Body composition · ${source.method || 'method not recorded'}`, date: source.date || null, recordId: source.recordId || null }]
      if (source?.kind === 'profile') return [field, { value, kind: 'profile', label: 'Profile entry', date: source.date || null }]
      return [field, { value, kind: 'unknown', label: 'Stored profile value · origin not recorded', date: null }]
    }
    if (num(body[field]) != null) return [field, { value: num(body[field]), kind: 'body_comp', label: `Body composition · ${body.method || 'method not recorded'}`, date: bodyRecord.date, recordId: bodyRecord.id }]
    if (num(personal[field]) != null) return [field, { value: num(personal[field]), kind: 'screening', label: 'Health screening', date: screening.completedOn, recordId: screening.id }]
    return [field, { value: null, kind: 'missing', label: 'Not recorded', date: null }]
  }))
}

export function resolveAnthro(db, client) {
  const details = resolveAnthroDetails(db, client)
  const merged = Object.fromEntries(Object.entries(details).map(([field, item]) => [field, item.value]))
  merged.derived = Object.values(details).some((item) => ['body_comp', 'screening'].includes(item.kind))
  return merged
}

// Movement/posture score. Two protocols share this entry point:
//   • legacy — 5 patterns rated 0–3 (+ pain), score out of 15;
//   • nasm   — postural/OHSA compensations, a 0–100 movement-quality score
//     (100 = clean), plus asymmetry and pain counts.
// Both return a normalised `pct` (0–100) so trends chart on one scale.
export function movementScore(data) {
  if (data?.protocol === 'nasm') {
    const found = postureFindings(data)
    const load = found.reduce((s, f) => s + SEVERITY_WEIGHT[f.severity] * f.sides.length, 0)
    const quality = Math.max(0, Math.min(100, Math.round(100 - load * 5)))
    const asymmetry = found.filter((f) => f.item.kind !== 'midline' && f.sides.length === 1).length
    return { protocol: 'nasm', score: quality, max: 100, pct: quality, findings: found.length, asymmetry, pain: found.filter((f) => f.pain).length }
  }
  const screens = data?.screens || []
  const score = screens.reduce((s, x) => s + (num(x.score) || 0), 0)
  const pain = screens.filter((x) => x.pain).length
  return { protocol: 'legacy', score, max: MOVEMENT_MAX, pct: Math.round((score / MOVEMENT_MAX) * 100), pain }
}

// Legacy screens with a score < 2 count as a "compensation" for rough parity
// when comparing an old record against a new NASM one.
const countLegacyFlags = (d) => (d?.screens || []).filter((s) => (num(s.score) ?? 3) < 2).length

// Reassessment diff between two NASM records: which compensations resolved,
// which persist, and which are new. `sideLabel` describes where each sits.
export function movementDiff(baseData, latestData) {
  const key = (f) => f.id
  const bMap = new Map(postureFindings(baseData).map((f) => [key(f), f]))
  const lMap = new Map(postureFindings(latestData).map((f) => [key(f), f]))
  const sideLabel = (f) => (f.item.kind === 'midline' ? 'present' : f.sides.join(' & '))
  const resolved = [], persisting = [], added = []
  for (const [id, f] of bMap) if (!lMap.has(id)) resolved.push({ id, label: f.item.label, view: f.item.view, was: sideLabel(f) })
  for (const [id, f] of lMap) {
    if (bMap.has(id)) persisting.push({ id, label: f.item.label, view: f.item.view, now: sideLabel(f), was: sideLabel(bMap.get(id)) })
    else added.push({ id, label: f.item.label, view: f.item.view, now: sideLabel(f) })
  }
  return { resolved, persisting, added }
}

// One-line summary of a record for list rows.
export function summarize(rec) {
  const d = rec?.data || {}
  switch (rec?.type) {
    case 'movement': {
      const m = movementScore(d)
      if (m.protocol === 'nasm') return `Quality ${m.score}/100 · ${m.findings} compensation${m.findings === 1 ? '' : 's'}${m.asymmetry ? ` · ${m.asymmetry} asymmetric` : ''}${m.pain ? ` · ${m.pain} pain` : ''}`
      return `Score ${m.score}/${m.max}${m.pain ? ` · ${m.pain} pain flag${m.pain === 1 ? '' : 's'}` : ''}`
    }
    case 'body_comp': return [d.method, d.massKg != null ? `${d.massKg} kg` : null, d.bodyFatPct != null ? `${d.bodyFatPct}% BF` : null].filter(Boolean).join(' · ') || '—'
    case 'fitness': return [(d.strength?.length ? `${d.strength.length} lift${d.strength.length === 1 ? '' : 's'}` : null), d.endurance?.result].filter(Boolean).join(' · ') || '—'
    case 'pain': return `${d.sites?.length || 0} site${(d.sites?.length || 0) === 1 ? '' : 's'}`
    case 'lifestyle': return [d.sleepHrs != null ? `Sleep ${d.sleepHrs} h` : null, d.stress != null ? `stress ${d.stress}/7` : null].filter(Boolean).join(' · ') || '—'
    case 'goals': return `${d.shortTerm?.length || 0} short · ${d.longTerm?.length || 0} long-term`
    default: return '—'
  }
}

// Full breakdown of one record's data as [{ label, value }] rows, for the
// expandable detail view on each assessment card.
export function describe(rec) {
  const d = rec?.data || {}
  const kv = (pairs) => pairs.filter(([, v]) => v != null && v !== '').map(([label, value]) => ({ label, value: String(value) }))
  switch (rec?.type) {
    case 'fitness': {
      const out = (d.strength || []).map((s) => ({
        label: s.lift,
        value: s.valueKg != null ? `${s.valueKg} kg 1RM${s.weightKg != null && s.reps ? ` (${s.weightKg}×${s.reps})` : ''}` : '—',
      }))
      if (d.endurance?.test) out.push({ label: 'Endurance', value: `${d.endurance.test}${d.endurance.result ? ' — ' + d.endurance.result : ''}` })
      ;(d.mobility || []).forEach((m) => out.push({ label: `Mobility · ${m.joint}`, value: [m.value, m.side].filter(Boolean).join(' · ') || '—' }))
      if (d.posture) out.push({ label: 'Posture', value: d.posture })
      return out
    }
    case 'movement':
      if (d.protocol === 'nasm') {
        const m = movementScore(d)
        return [
          { label: 'Movement quality', value: `${m.score}/100` },
          ...postureFindings(d).map((f) => ({
            label: `${f.item.view} · ${f.item.label}`,
            value: `${f.item.kind === 'midline' ? 'present' : f.sides.join(' & ')} · ${f.severity}${f.pain ? ' · pain' : ''}${f.note ? ' — ' + f.note : ''}`,
          })),
        ]
      }
      return (d.screens || []).map((s) => ({ label: s.pattern[0].toUpperCase() + s.pattern.slice(1), value: `${s.score}/3${s.pain ? ' · pain' : ''}` }))
    case 'body_comp':
      return kv([['Method', d.method], ['Body mass', d.massKg != null ? d.massKg + ' kg' : null], ['Body fat', d.bodyFatPct != null ? d.bodyFatPct + '%' : null],
        ['Lean mass', d.leanMassKg != null ? d.leanMassKg + ' kg' : null], ['Skeletal muscle', d.skeletalMuscleKg != null ? d.skeletalMuscleKg + ' kg' : null],
        ['Visceral fat', d.visceralFat], ['Total body water', d.hydrationL != null ? d.hydrationL + ' L' : null]])
    case 'pain':
      return (d.sites || []).map((s) => ({ label: s.area, value: `${s.severity}/10${s.aggravating ? ' · ' + s.aggravating : ''}${s.limitation ? ' · ' + s.limitation : ''}` }))
    case 'lifestyle':
      return kv([['Sleep', d.sleepHrs != null ? `${d.sleepHrs} h · quality ${d.sleepQuality}/7` : null], ['Stress', d.stress != null ? `${d.stress}/7` : null],
        ['Hydration', d.hydrationL != null ? d.hydrationL + ' L' : null], ['Activity', d.activityLevel], ['Daily steps', d.steps]])
    case 'goals':
      return [
        ...(d.shortTerm || []).map((g) => ({ label: 'Short-term', value: `${g.text}${g.target ? ' (' + g.target + ')' : ''}${g.by ? ' by ' + g.by : ''}` })),
        ...(d.longTerm || []).map((g) => ({ label: 'Long-term', value: `${g.text}${g.target ? ' (' + g.target + ')' : ''}${g.by ? ' by ' + g.by : ''}` })),
        ...(d.why ? [{ label: 'Why', value: d.why }] : []),
      ]
    default: return []
  }
}

const row = (label, from, to, dir = 'up', unit = '') => {
  const f = num(from), t = num(to)
  const delta = f != null && t != null ? +(t - f).toFixed(1) : null
  const better = delta == null || delta === 0 ? null : dir === 'up' ? delta > 0 : delta < 0
  return { label, from: f, to: t, delta, better, unit }
}

// Rows of { label, from, to, delta, better, unit } comparing baseline → latest.
export function compare(type, b, l) {
  const bd = b?.data || {}, ld = l?.data || {}
  if (type === 'movement') {
    // If either record is NASM, compare on the 0–100 quality plus counts (the
    // per-compensation resolved/persisting/new diff lives in the detail view).
    if (bd.protocol === 'nasm' || ld.protocol === 'nasm') {
      const mb = movementScore(bd), ml = movementScore(ld)
      return [
        row('Movement quality', mb.pct, ml.pct, 'up', '/100'),
        row('Compensations', mb.findings ?? countLegacyFlags(bd), ml.findings ?? countLegacyFlags(ld), 'down', ''),
        row('Asymmetries', mb.asymmetry ?? 0, ml.asymmetry ?? 0, 'down', ''),
        row('Pain flags', mb.pain, ml.pain, 'down', ''),
      ]
    }
    const rows = MOVEMENT_PATTERNS.map((p) => {
      const bp = (bd.screens || []).find((s) => s.pattern === p)
      const lp = (ld.screens || []).find((s) => s.pattern === p)
      return row(p[0].toUpperCase() + p.slice(1), bp?.score, lp?.score, 'up', '/3')
    })
    rows.unshift(row('Total', movementScore(bd).score, movementScore(ld).score, 'up', `/${MOVEMENT_MAX}`))
    return rows
  }
  if (type === 'body_comp') {
    return [
      row('Body mass', bd.massKg, ld.massKg, 'flat', 'kg'),
      row('Body fat', bd.bodyFatPct, ld.bodyFatPct, 'down', '%'),
      row('Lean mass', bd.leanMassKg, ld.leanMassKg, 'up', 'kg'),
      row('Skeletal muscle', bd.skeletalMuscleKg, ld.skeletalMuscleKg, 'up', 'kg'),
      row('Visceral fat', bd.visceralFat, ld.visceralFat, 'down', ''),
    ].filter((r) => r.from != null || r.to != null)
  }
  if (type === 'fitness') {
    const bl = bd.strength || [], ll = ld.strength || []
    const names = [...new Set([...bl, ...ll].map((x) => x.lift))]
    return names.map((n) => row(n, bl.find((x) => x.lift === n)?.valueKg, ll.find((x) => x.lift === n)?.valueKg, 'up', 'kg'))
  }
  return []
}

// Onboarding baseline set (what a new client should have) and the objective
// types that get periodic reassessment reminders.
export const ONBOARDING_TYPES = ['fitness', 'movement', 'body_comp']
export const REASSESS_TYPES = ['fitness', 'movement', 'body_comp']
export const DEFAULT_REASSESS_DAYS = 84 // 12 weeks
export const hasBaselineRecord = (list, type) => formalAssessments(list).some((a) =>
  a.type === type && (a.phase === 'baseline' || !a.phase))

const todayLocal = (now = new Date()) => new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)

// Which onboarding baselines exist vs. are missing.
export function baselineProgress(list, types = ONBOARDING_TYPES) {
  const formal = formalAssessments(list)
  const doneTypes = types.filter((t) => hasBaselineRecord(formal, t))
  return { done: doneTypes.length, total: types.length, doneTypes, missing: types.filter((t) => !doneTypes.includes(t)) }
}

// Reassessment timing for one type: last date, due date, overdue, days left.
export function dueStatus(list, type, intervalDays = DEFAULT_REASSESS_DAYS, now = new Date()) {
  const l = latest(formalAssessments(list), type)
  if (!l) return { has: false }
  const today = todayLocal(now)
  const dueDate = addDays(l.date, intervalDays)
  const daysLeft = Math.round((Date.parse(dueDate) - Date.parse(today)) / 86400000)
  return { has: true, last: l.date, dueDate, overdue: dueDate <= today, daysLeft }
}
