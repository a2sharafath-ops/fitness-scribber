// Timezone-aware "civil date" helpers. The day boundary follows the configured zone.
export const todayISO = (tz) => {
  try {
    return new Date().toLocaleDateString('en-CA', tz ? { timeZone: tz } : undefined)
  } catch {
    return new Date().toISOString().slice(0, 10)
  }
}

export const addDays = (iso, n) => {
  const [y, m, d] = iso.split('-').map(Number)
  const x = new Date(Date.UTC(y, m - 1, d))
  x.setUTCDate(x.getUTCDate() + n)
  return x.toISOString().slice(0, 10)
}

// Whole days from `a` to `b` (negative when b is earlier). Both ISO.
export const daysBetween = (a, b) =>
  Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000)

// Inclusive ISO range between two dates, ascending, regardless of argument order.
export const datesBetween = (a, b) => {
  const [lo, hi] = a <= b ? [a, b] : [b, a]
  const out = []
  for (let d = lo; d <= hi; d = addDays(d, 1)) out.push(d)
  return out
}

export const lastNDates = (n, tz) => {
  const t = todayISO(tz)
  const a = []
  for (let i = n - 1; i >= 0; i--) a.push(addDays(t, -i))
  return a
}

export const fmtDate = (iso) => {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export const fmtDay = (iso) => {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

// Clock time from a full ISO timestamp (used by chat bubbles / conversation list).
export const fmtTime = (ts) =>
  ts ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''

// Date + time from a full ISO timestamp (e.g. an assessment's createdAt).
// Returns '' for a missing/invalid value so callers can fall back to the date.
export const fmtDateTime = (ts) => {
  if (!ts) return ''
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// Month calendar grid: 42 ISO dates (6 Monday-anchored weeks) covering the month
// that `anchorISO` falls in, including leading/trailing days from adjacent months.
export const monthGridDates = (anchorISO) => {
  const [y, m] = anchorISO.split('-').map(Number)
  const first = new Date(Date.UTC(y, m - 1, 1))
  const dow = (first.getUTCDay() + 6) % 7 // Monday = 0
  const start = new Date(first)
  start.setUTCDate(1 - dow)
  const days = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(start)
    d.setUTCDate(start.getUTCDate() + i)
    days.push(d.toISOString().slice(0, 10))
  }
  return days
}

export const monthLabel = (anchorISO) => {
  const [y, m] = anchorISO.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

// First day of the month `n` months from the anchor (keeps a stable month identity).
export const addMonths = (anchorISO, n) => {
  const [y, m] = anchorISO.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 10)
}

// Monday-anchored week (array of 7 ISO dates) offset by startOffset days.
export const weekDates = (startOffset, tz) => {
  const today = todayISO(tz)
  const base = new Date(today + 'T00:00:00Z')
  const dow = (base.getUTCDay() + 6) % 7
  const a = []
  for (let i = 0; i < 7; i++) a.push(addDays(today, -dow + i + startOffset))
  return a
}
