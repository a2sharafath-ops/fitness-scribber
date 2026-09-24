import { addDays } from './dates.js'

// Booked appointments are the attendance unit; workout logs are excluded.
export function appointmentCompletion(sessions, clientId, today, days) {
  const start = addDays(today, -(days - 1))
  const period = (sessions || []).filter((s) => s.clientId === clientId && s.date >= start && s.date <= today)
  const cancelled = period.filter((s) => s.status === 'Cancelled').length
  const elapsed = period.filter((s) => s.date < today && s.status !== 'Cancelled')
  const completed = elapsed.filter((s) => s.status === 'Completed').length
  const unresolved = elapsed.filter((s) => s.status !== 'Completed').length
  const todayCompleted = period.filter((s) => s.date === today && s.status === 'Completed').length
  return { start, end: today, completed, total: elapsed.length, unresolved, cancelled, todayCompleted,
    percent: elapsed.length ? Math.round(completed / elapsed.length * 100) : null }
}

export function assessmentPair(list, type) {
  const rows = (list || []).filter((a) => a.type === type)
    .sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.createdAt || '').localeCompare(b.createdAt || ''))
  const first = rows.find((a) => a.phase === 'baseline') || rows[0] || null
  const last = rows.at(-1) || null
  return { first, last, comparable: !!first && !!last && first.id !== last.id }
}
