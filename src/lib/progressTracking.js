import { addDays, daysBetween } from './dates.js'
import { exerciseKey, workingGroup } from './muscleVolume.js'
import { estOneRepMax } from './assessment.js'

export const EXERCISE_MEASURES = [
  { id: 'load', label: 'Heaviest set load', unit: 'kg' },
  { id: 'reps', label: 'Best-set reps', unit: 'reps' },
  { id: 'sets', label: 'Completed working sets', unit: 'sets' },
  { id: 'e1rm', label: 'Estimated 1RM', unit: 'kg' },
]
export const BODY_MEASURES = [
  { id: 'massKg', label: 'Body mass', unit: 'kg' },
  { id: 'bodyFatPct', label: 'Body fat', unit: '%' },
  { id: 'leanMassKg', label: 'Lean mass', unit: 'kg' },
]
const finite = v => v === '' || v == null || !Number.isFinite(Number(v)) ? null : Number(v)
const positive = v => finite(v) > 0 ? Number(v) : null
const count = v => Number.isInteger(finite(v)) && Number(v) > 0 ? Number(v) : null
const validDate = d => /^\d{4}-\d{2}-\d{2}$/.test(d || '') && Number.isFinite(Date.parse(d)) && new Date(d).toISOString().slice(0,10) === d
const path = id => `/clients/${encodeURIComponent(id)}`
export const metricKey = m => JSON.stringify([m.kind, m.exerciseId || exerciseKey(m.name), m.measure, m.source || ''])

// Library IDs keep variations apart. Legacy name matches are accepted only
// when the catalog resolves the name unambiguously.
export function trackingExercises(db, clientId) {
  const options = new Map()
  for (const e of db.exercises || []) if (e.name) options.set(e.id || `name:${exerciseKey(e.name)}`, { exerciseId: e.id || null, name: e.name })
  for (const w of db.workouts || []) if (w.clientId === clientId) for (const item of w.main || []) {
    if (!item.name) continue
    const same = (db.exercises || []).filter(e => exerciseKey(e.name) === exerciseKey(item.name))
    if (item.exId) options.set(item.exId, options.get(item.exId) || { exerciseId: item.exId, name: item.name })
    else if (!same.length) options.set(`name:${exerciseKey(item.name)}`, { exerciseId: null, name: item.name })
  }
  // A planned custom exercise can be selected before its first observation;
  // prescriptions contribute names only, never chart values.
  for (const plan of db.prescriptions || []) if (plan.clientId === clientId) for (const block of plan.blocks || []) for (const e of block.exercises || []) {
    const name = e.exerciseName?.trim()
    if (name && e.exerciseDbRef) options.set(e.exerciseDbRef, options.get(e.exerciseDbRef) || { exerciseId: e.exerciseDbRef, name })
    else if (name && ![...options.values()].some(o => exerciseKey(o.name) === exerciseKey(name))) options.set(`name:${exerciseKey(name)}`, { exerciseId: null, name })
  }
  return [...options.values()].sort((a, b) => a.name.localeCompare(b.name))
}

export function normalizeTrackingMetrics(metrics) {
  const result = [], seen = new Set()
  for (const m of Array.isArray(metrics) ? metrics : []) {
    if (!m || typeof m !== 'object') continue
    const valid = m.kind === 'exercise' ? typeof m.name === 'string' && m.name.trim() && EXERCISE_MEASURES.some(x => x.id === m.measure)
      : m.kind === 'body' ? BODY_MEASURES.some(x => x.id === m.measure)
        : m.kind === 'consistency' ? ['workouts', 'bookings'].includes(m.measure)
          : m.kind === 'legacy' && ['weightKg', 'squat'].includes(m.measure)
    if (!valid) continue
    const row = { kind: m.kind, measure: m.measure, ...(m.kind === 'exercise' ? { name: m.name.trim(), exerciseId: typeof m.exerciseId === 'string' ? m.exerciseId : null } : {}) }
    const key = metricKey(row)
    if (!seen.has(key)) { result.push(row); seen.add(key) }
    if (result.length === 8) break
  }
  return result
}
export const trackedMetrics = client => normalizeTrackingMetrics(client?.intake?.progressTracking?.metrics)
export function saveTrackedMetrics(db, clientId, metrics) {
  const client = db.clients.find(c => c.id === clientId)
  if (!client) throw new Error('This client is no longer available.')
  client.intake = { ...client.intake, progressTracking: { version: 1, metrics: normalizeTrackingMetrics(metrics) } }
}
export function metricMeta(m) {
  if (m.kind === 'exercise') {
    const measure = EXERCISE_MEASURES.find(x => x.id === m.measure)
    return { ...measure, title: m.name, subtitle: measure.label, action: 'Open Training', destination: '/training', help: m.measure === 'e1rm' ? 'Best Epley estimate per completed session, from recorded working sets. A single rep uses the recorded load. Estimates are not tested maxima and do not adjust for RIR. Timed, ballistic, and bodyweight exercises are excluded.' : m.measure === 'sets' ? 'Completed working sets per session. Warm-ups and sets with unknown purpose are excluded.' : 'One best working set per completed session. Compare its reps, load and recorded effort before interpreting a change. No prescribed-value fallback is used.' }
  }
  if (m.kind === 'body') return { ...BODY_MEASURES.find(x => x.id === m.measure), title: BODY_MEASURES.find(x => x.id === m.measure).label, subtitle: 'Body assessment', action: 'Open assessments', destination: '/assessments/body_comp', help: 'Dated body composition assessments. Different or unknown measurement methods are kept separate; changes are compared only within a known method.' }
  if (m.kind === 'legacy') return { title: m.measure === 'weightKg' ? 'Manual body weight' : 'Manual squat value', subtitle: 'Previous manual entries', unit: 'kg', action: 'Open client progress', destination: m.measure === 'weightKg' ? '/progress#outcomes' : '/progress#strength', help: 'Previous manual progress entries, kept separate from assessments and workouts. Zero values are omitted because the old form also saved blank inputs as zero. The old squat field did not record an estimation method.' }
  return { title: m.measure === 'workouts' ? 'Completed workouts' : 'Booking completion', subtitle: 'Weekly · Monday–Sunday', unit: m.measure === 'workouts' ? 'workouts' : '%', action: m.measure === 'workouts' ? 'Open Training' : 'Open schedule', destination: m.measure === 'workouts' ? '/training' : null, help: m.measure === 'workouts' ? 'Completed workout logs per calendar week, not booked sessions. Zero means no completed logs. Partial weeks are labelled.' : 'Completed / past non-cancelled bookings per calendar week. Today is excluded. Awaiting-status bookings remain in the denominator. Weeks without eligible bookings have no rate.' }
}

function matchingItem(db, item, metric) {
  if (item.exId && metric.exerciseId) return item.exId === metric.exerciseId
  const matches = (db.exercises || []).filter(e => exerciseKey(e.name) === exerciseKey(item.name))
  if (matches.length > 1) return false
  if (metric.exerciseId) return matches.length === 1 && matches[0].id === metric.exerciseId
  return exerciseKey(item.name) === exerciseKey(metric.name) && (!item.exId || matches.length === 1 && matches[0].id === item.exId)
}
function eligibleSet(item, set) {
  return set.done && workingGroup(item) && set.purpose === 'working' && !item.isWarmup && item.purpose !== 'warmup' && !set.isWarmup && !['Seconds','Minutes','Target HR'].includes(set.pIntensityType)
}
function estimateAllowed(db, item) {
  const e = (db.exercises || []).find(e => e.id === item.exId) || (db.exercises || []).find(e => exerciseKey(e.name) === exerciseKey(item.name))
  return workingGroup(item) === 'Main Lift' && e?.category !== 'Ballistic' && !/bodyweight|assisted/i.test(e?.equip || '') && !/\b(clean|snatch|jerk|jump|throw|plyometric|pull-up|chin-up)\b/i.test(item.name)
}

export function trackingSeries(db, clientId, metric, start, end) {
  const rows = [], inRange = r => r.clientId === clientId && validDate(r.date) && r.date >= start && r.date <= end
  let excluded = 0
  if (metric.kind === 'exercise') {
    for (const workout of (db.workouts || []).filter(w => inRange(w) && w.status === 'completed')) {
      const sets = []
      for (const item of workout.main || []) {
        if (!matchingItem(db, item, metric)) continue
        if (!Array.isArray(item.setRows) || !item.setRows.length) { excluded++; continue }
        for (const s of item.setRows) {
          if (!s.done) continue
          if (!eligibleSet(item, s)) { excluded++; continue }
          const load = finite(s.load), reps = count(s.reps)
          const value = metric.measure === 'sets' ? 1 : metric.measure === 'load' ? load != null && load >= 0 ? load : null
            : metric.measure === 'reps' ? reps : estimateAllowed(db, item) && positive(load) && reps ? estOneRepMax(load, reps) : null
          if (value == null) { excluded++; continue }
          sets.push({ value, load, reps, effort: finite(s.effort), effortType: s.effortType === 'RPE' ? 'RPE' : 'RIR', setNumber: s.n })
        }
      }
      if (!sets.length) continue
      const best = [...sets].sort((a, b) => b.value - a.value || (b.reps || 0) - (a.reps || 0))[0]
      rows.push({ id: workout.id, date: workout.date, value: metric.measure === 'sets' ? sets.length : best.value, source: 'Completed workout', detail: metric.measure === 'sets' ? `${sets.length} working sets` : '', ...(metric.measure === 'sets' ? {} : { load: best.load, reps: best.reps, effort: best.effort, effortType: best.effortType }), path: `${path(clientId)}/training?date=${workout.date}&workout=${encodeURIComponent(workout.id)}#selected-workout` })
    }
  } else if (metric.kind === 'body' || metric.kind === 'legacy') {
    for (const r of (db[metric.kind === 'body' ? 'assessments' : 'logs'] || []).filter(inRange)) {
      if (metric.kind === 'body' && r.type !== 'body_comp') continue
      const value = positive(metric.kind === 'body' ? r.data?.[metric.measure] : r[metric.measure])
      if (value == null || metric.measure === 'bodyFatPct' && value > 100) { excluded++; continue }
      const method = metric.kind === 'body' ? r.data?.method?.trim() || 'Method not recorded' : null
      rows.push({ id: r.id, date: r.date, value, method, source: metric.kind === 'body' ? 'Body assessment' : 'Previous manual entry', detail: method || 'Manually entered', path: metric.kind === 'body' ? `${path(clientId)}/assessments/body_comp?record=${encodeURIComponent(r.id)}#assessment-record-${r.id}` : null })
    }
  } else if (metric.kind === 'consistency') {
    const dow = (new Date(start+'T12:00:00Z').getUTCDay()+6)%7
    for (let monday = addDays(start,-dow); monday <= end; monday = addDays(monday,7)) {
      const from = monday < start ? start : monday, sunday = addDays(monday,6), to = sunday > end ? end : sunday
      if (metric.measure === 'workouts') {
        const logs = (db.workouts || []).filter(w => w.clientId === clientId && w.status === 'completed' && w.date >= from && w.date <= to)
        rows.push({ id: monday, date: from, value: logs.length, source: 'Completed workout logs', detail: `${from} – ${to}${monday < start || sunday >= end ? ' · partial week' : ''}`, path: `${path(clientId)}/training?date=${from}&history=workouts#training-history-title`, partial: monday < start || sunday >= end })
      } else {
        const bookings = (db.sessions || []).filter(s => s.clientId === clientId && s.date >= from && s.date <= to && s.date < end && s.status !== 'Cancelled')
        const completed = bookings.filter(s => s.status === 'Completed').length
        rows.push({ id: monday, date: from, value: bookings.length ? Math.round(completed/bookings.length*100) : null, source: 'Past non-cancelled bookings', detail: `${completed}/${bookings.length} completed · ${from} – ${to}${sunday >= end || monday < start ? ' · partial week' : ''}`, path: '/schedule', partial: sunday >= end || monday < start })
      }
    }
  }
  return { rows: rows.sort((a,b) => a.date.localeCompare(b.date) || String(a.id).localeCompare(String(b.id))), excluded }
}
export function trackingWindow(db, clientId, days, today) {
  if (days !== 'all') return { start: addDays(today,-(Number(days)-1)), end: today }
  const dates = ['workouts','assessments','sessions','logs'].flatMap(k => (db[k] || []).filter(r => r.clientId === clientId && validDate(r.date) && r.date <= today).map(r=>r.date)).sort()
  return { start: dates[0] || addDays(today,-55), end: today }
}
export function trackingComparison(rows, metric) {
  const values = rows.filter(r => r.value != null && !r.partial)
  const first = values[0], last = values.at(-1)
  if (!first || !last || first.date === last.date) return null
  if (metric.kind === 'body' && (values.some(r => !r.method || r.method === 'Method not recorded') || new Set(values.map(r=>r.method)).size > 1)) return null
  return { change: +(last.value-first.value).toFixed(2), first, last, days: daysBetween(first.date,last.date) }
}
