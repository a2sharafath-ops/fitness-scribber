import { addDays, daysBetween, fmtDay, coachTimeZone } from './dates'
import { computeReadiness, openConcerns } from './calc'
import { programStats } from './program'
import { clientPrograms } from './clientPrograms'
import { formalAssessments, latest, REASSESS_TYPES, DEFAULT_REASSESS_DAYS, typeMeta } from './assessment'
import { screeningsFor, programStatus, rescreenDue } from './screening'
import { assessmentReview } from './assessmentReview'

export function dashboardClock(now = new Date(), tz) {
  const options = { timeZone: coachTimeZone(tz) }
  const parts = new Intl.DateTimeFormat('en-CA', { ...options, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now)
  const value = key => parts.find(p => p.type === key).value
  return { today: `${value('year')}-${value('month')}-${value('day')}`, time: `${value('hour')}:${value('minute')}` }
}

export const dashboardClientPath = (id, suffix = '') => `/clients/${encodeURIComponent(id)}${suffix}`
const recent = rows => [...rows].sort((a, b) => (b.date || '').localeCompare(a.date || ''))

export function clientReviewItems(db, today, clients = db.clients.filter(c => c.status === 'Active')) {
  const reviews = []
  const add = (c, kind, reason, detail, suffix, tone = 'amber', priority = 3) => reviews.push({ key: `${c.id}:${reason}`, client: c, kind, reason, detail, path: dashboardClientPath(c.id, suffix), tone, priority })
  for (const c of clients) {
    const concerns = openConcerns(db, c.id).filter(r => !r.date || r.date <= today)
    if (concerns.length) add(c, 'review', `${concerns.length} open concern${concerns.length === 1 ? '' : 's'}`, 'Review client concerns', '/check-ins?view=concerns', 'red', 0)
    const screening = screeningsFor((db.screenings || []).filter(s => !s.completedOn || s.completedOn <= today), c.id).complete
    if (screening && programStatus(screening) === 'gated') add(c, 'review', 'Screening needs review', 'Review clearance record', '/assessments#health-screening', 'red', 1)
    else if (rescreenDue(screening, today)) add(c, 'followup', 'Screening renewal due', `Valid until ${fmtDay(screening.validUntil)}`, '/assessments#health-screening')
    const readiness = computeReadiness(db, c.id, today)
    if (readiness.color === 'red') add(c, 'review', 'Lower app score today', 'Review today’s recorded inputs', '/check-ins?view=wellness', 'amber', 2)
    const lastCheckin = recent(db.wellness.filter(w => w.clientId === c.id && w.date <= today))[0]
    if (lastCheckin && daysBetween(lastCheckin.date, today) >= 8) add(c, 'followup', 'Check-in follow-up', `Last recorded ${fmtDay(lastCheckin.date)}`, '/check-ins?view=wellness')
    const assessments = formalAssessments(db.assessments).filter(a => a.clientId === c.id && a.date <= today)
    const absent = REASSESS_TYPES.filter(type => !latest(assessments, type))
    if (absent.length) add(c, 'followup', `${absent.length} baseline${absent.length === 1 ? '' : 's'} to record`, absent.map(t => typeMeta(t).label).join(' · '), '/assessments#formal-assessments', 'neutral')
    for (const type of REASSESS_TYPES) {
      const last = latest(assessments, type)
      const interval = Number(db.settings?.reassessIntervalDays) || DEFAULT_REASSESS_DAYS
      const review = assessmentReview(last, interval)
      if (review.dueDate && review.dueDate <= today) add(c, 'followup', `${typeMeta(type).label} review due`, `${review.kind === 'suggested' ? 'Suggested review' : 'Reassessment'} ${fmtDay(review.dueDate)}`, '/assessments#formal-assessments')
    }
  }
  reviews.sort((a, b) => a.priority - b.priority || a.client.name.localeCompare(b.client.name))
  return reviews
}

// Fully elapsed civil days, shared by Dashboard and the client roster.
export function bookedCompletion(sessions, today, clientIds) {
  const past = sessions.filter(s => clientIds.has(s.clientId) && s.status !== 'Cancelled' && s.date >= addDays(today, -30) && s.date < today)
  return { total: past.length, completed: past.filter(s => s.status === 'Completed').length, missed: past.filter(s => s.status === 'Missed').length, pending: past.filter(s => !['Completed', 'Missed'].includes(s.status)).length }
}

export function dashboardData(db, { today, time }) {
  const clients = [...db.clients].filter(c => c.status === 'Active').sort((a, b) => a.name.localeCompare(b.name))
  const roster = new Map(db.clients.map(c => [c.id, c]))
  const bookings = db.sessions.filter(s => roster.has(s.clientId) && s.date === today && s.status !== 'Cancelled').sort((a, b) => (a.time || '').localeCompare(b.time || ''))
  const next = bookings.find(s => ['Confirmed', 'Pending'].includes(s.status) && s.time >= time)
  const checked = new Set(db.wellness.filter(w => w.date === today).map(w => w.clientId))
  const recorded = clients.filter(c => checked.has(c.id)), missing = clients.filter(c => !checked.has(c.id))
  const reviews = clientReviewItems(db, today, clients)
  const activeIds = new Set(clients.map(c => c.id))
  const plans = db.prescriptions.filter(p => activeIds.has(p.clientId) && p.date === today && programStats(p).exercises > 0).map(p => ({ ...p, client: roster.get(p.clientId), done: db.workouts.some(w => w.clientId === p.clientId && w.date === today && w.status === 'completed') })).sort((a, b) => a.client.name.localeCompare(b.client.name))
  const noProgram = clients.filter(c => !clientPrograms(db, c, today).length)
  // Only fully elapsed calendar days enter the retrospective summary.
  const completion = bookedCompletion(db.sessions, today, new Set(roster.keys()))
  const strength = recent(db.maxes.filter(m => roster.has(m.clientId) && m.kind === 'e1rm' && m.date <= today && Number.isFinite(+m.valueKg) && +m.valueKg > 0))[0]
  return { clients, roster, bookings, next, recorded, missing, reviews, plans, noProgram, completion, strength }
}

export function dashboardActivity(db, { today, days, metric }) {
  const start = addDays(today, -days), end = addDays(today, -1)
  const roster = new Set(db.clients.map(c => c.id)), daily = new Map(), unique = new Set()
  const rows = metric === 'load' ? db.srpe : metric === 'checkins' ? db.wellness : db.sessions
  for (const row of rows) {
    if (!roster.has(row.clientId) || row.date < start || row.date > end) continue
    if (metric === 'sessions' && row.status !== 'Completed') continue
    if (metric === 'checkins') {
      const key = `${row.clientId}:${row.date}`
      if (unique.has(key)) continue
      unique.add(key)
    }
    if (metric === 'load' && (row.tl == null || row.tl === '' || !Number.isFinite(+row.tl) || +row.tl < 0)) continue
    daily.set(row.date, (daily.get(row.date) || 0) + (metric === 'load' ? +row.tl : 1))
  }
  const buckets = []
  for (let offset = 0; offset < days; offset += 7) {
    const count = Math.min(7, days - offset), from = addDays(start, offset), through = addDays(from, count - 1)
    const values = Array.from({ length: count }, (_, i) => daily.get(addDays(from, i))).filter(v => v !== undefined)
    buckets.push({ from, through, count, value: values.length ? values.reduce((a, b) => a + b, 0) : null, label: `${fmtDay(from)}–${fmtDay(through)}` })
  }
  return { start, end, buckets, hasData: daily.size > 0 }
}
