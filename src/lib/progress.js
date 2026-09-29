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

// Descriptive reference only: the middle half of earlier recorded values.
// Four observations are a display floor, not a validated clinical sample size.
export function observedReferenceBand(values) {
  const sorted = values.filter((value) => typeof value === 'number' && Number.isFinite(value)).sort((a, b) => a - b)
  if (sorted.length < 4) return null
  const percentile = (fraction) => {
    const index = (sorted.length - 1) * fraction
    const lower = Math.floor(index)
    return sorted[lower] + (sorted[Math.ceil(index)] - sorted[lower]) * (index - lower)
  }
  return { lower: percentile(0.25), upper: percentile(0.75), count: sorted.length }
}

// Retrospective reference for a graph date: use only earlier observations in
// the preceding calendar window, so later records cannot change past bands.
export function trailingObservedBands(rows, field, dates, days = 28) {
  return dates.map((date) => observedReferenceBand(rows
    .filter((row) => row.date < date && row.date >= addDays(date, -days))
    .map((row) => row[field])))
}

export function compareToObservedBand(value, band) {
  if (value == null || !band) return 'unavailable'
  if (value > band.upper) return 'above'
  if (value < band.lower) return 'below'
  return 'within'
}
