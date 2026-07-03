import { addDays } from './dates'
import { screeningsFor } from './screening'

// Pure helpers for the Assessment module — no React, no I/O.
// One record shape: { id, clientId, type, date, phase, data, notes }.
// The `data` payload is type-specific (see the forms). These helpers pick
// baseline/latest, score movement screens, summarise a record, and diff a
// baseline against the latest for the compare view.

export const TYPES = [
  { key: 'fitness', label: 'Fitness', icon: '🏋️', by: 'coach' },
  { key: 'movement', label: 'Movement screen', icon: '🤸', by: 'coach' },
  { key: 'body_comp', label: 'Body composition', icon: '⚖️', by: 'coach' },
  { key: 'pain', label: 'Pain', icon: '🩹', by: 'athlete' },
  { key: 'lifestyle', label: 'Lifestyle', icon: '😴', by: 'athlete' },
  { key: 'goals', label: 'Goals', icon: '🎯', by: 'athlete' },
]
// Types with a form implemented (coach can record any; pain/lifestyle/goals
// are also athlete self-reportable from the portal).
export const ACTIVE_TYPES = ['fitness', 'movement', 'body_comp', 'pain', 'lifestyle', 'goals']
export const SELF_REPORT_TYPES = ['pain', 'lifestyle', 'goals']
export const ACTIVITY_LEVELS = ['Sedentary', 'Light', 'Moderate', 'Active', 'Very active']
export const typeMeta = (key) => TYPES.find((t) => t.key === key) || { key, label: key, icon: '📋' }

export const MOVEMENT_PATTERNS = ['squat', 'hinge', 'lunge', 'push', 'pull']
export const MOVEMENT_MAX = MOVEMENT_PATTERNS.length * 3

const num = (v) => (v == null || v === '' || Number.isNaN(+v) ? null : +v)
const byDateDesc = (a, b) => (b.date || '').localeCompare(a.date || '')

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

// Merge anthropometrics from every source the app collects them in.
// Manually entered values (client.anthro) win; gaps fill from the latest
// body-composition assessment, then the completed screening's HHQ personal
// details — so the profile card is populated as soon as screening or
// assessment data exists, without re-typing. `derived` flags that at least
// one shown value came from a fallback source.
export function resolveAnthro(db, client) {
  const a = client.anthro || {}
  const bc = latest(forClient(db.assessments, client.id), 'body_comp')?.data || {}
  const hp = screeningsFor(db.screenings, client.id).complete?.hhq?.personal || {}
  const pick = (...vals) => { for (const v of vals) { const n = num(v); if (n != null) return n } return null }
  const merged = {
    age: pick(a.age, hp.age),
    heightCm: pick(a.heightCm, hp.heightCm),
    massKg: pick(a.massKg, bc.massKg, hp.massKg),
    bodyFatPct: pick(a.bodyFatPct, bc.bodyFatPct),
    leanMassKg: pick(a.leanMassKg, bc.leanMassKg),
  }
  merged.derived = Object.entries(merged).some(([k, v]) => v != null && num(a[k]) == null)
  return merged
}

export function movementScore(data) {
  const screens = data?.screens || []
  const score = screens.reduce((s, x) => s + (num(x.score) || 0), 0)
  const pain = screens.filter((x) => x.pain).length
  return { score, pain, max: MOVEMENT_MAX }
}

// One-line summary of a record for list rows.
export function summarize(rec) {
  const d = rec?.data || {}
  switch (rec?.type) {
    case 'movement': { const m = movementScore(d); return `Score ${m.score}/${m.max}${m.pain ? ` · ${m.pain} pain flag${m.pain === 1 ? '' : 's'}` : ''}` }
    case 'body_comp': return [d.method, d.massKg != null ? `${d.massKg} kg` : null, d.bodyFatPct != null ? `${d.bodyFatPct}% BF` : null].filter(Boolean).join(' · ') || '—'
    case 'fitness': return [(d.strength?.length ? `${d.strength.length} lift${d.strength.length === 1 ? '' : 's'}` : null), d.endurance?.result].filter(Boolean).join(' · ') || '—'
    case 'pain': return `${d.sites?.length || 0} site${(d.sites?.length || 0) === 1 ? '' : 's'}`
    case 'lifestyle': return [d.sleepHrs != null ? `Sleep ${d.sleepHrs} h` : null, d.stress != null ? `stress ${d.stress}/7` : null].filter(Boolean).join(' · ') || '—'
    case 'goals': return `${d.shortTerm?.length || 0} short · ${d.longTerm?.length || 0} long-term`
    default: return '—'
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
export const ONBOARDING_TYPES = ['fitness', 'movement', 'body_comp', 'lifestyle', 'goals']
export const REASSESS_TYPES = ['fitness', 'movement', 'body_comp']
export const DEFAULT_REASSESS_DAYS = 84 // 12 weeks

const todayLocal = (now = new Date()) => new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)

// Which onboarding baselines exist vs. are missing.
export function baselineProgress(list, types = ONBOARDING_TYPES) {
  const doneTypes = types.filter((t) => list.some((a) => a.type === t))
  return { done: doneTypes.length, total: types.length, doneTypes, missing: types.filter((t) => !doneTypes.includes(t)) }
}

// Reassessment timing for one type: last date, due date, overdue, days left.
export function dueStatus(list, type, intervalDays = DEFAULT_REASSESS_DAYS, now = new Date()) {
  const l = latest(list, type)
  if (!l) return { has: false }
  const today = todayLocal(now)
  const dueDate = addDays(l.date, intervalDays)
  const daysLeft = Math.round((Date.parse(dueDate) - Date.parse(today)) / 86400000)
  return { has: true, last: l.date, dueDate, overdue: dueDate <= today, daysLeft }
}
