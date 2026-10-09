import { addDays } from './dates'

export const WELLNESS_BASELINE_DAYS = 28
export const MIN_WELLNESS_BASELINE_DAYS = 7
export const WELLNESS_METRICS = [
  { key: 'sleep', label: 'Sleep', direction: -1 },
  { key: 'stress', label: 'Stress', direction: 1 },
  { key: 'fatigue', label: 'Fatigue', direction: 1 },
  { key: 'soreness', label: 'Soreness', direction: 1 },
]

const validDate = (date) => /^\d{4}-\d{2}-\d{2}$/.test(date || '')
  && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date
const rating = (value) => typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 7 ? value : null

// One observation per date prevents duplicate daily entries from weighting the
// baseline twice. Same-day corrections replace the older row. No future data.
export function wellnessBaseline(records, clientId, throughDate) {
  const daily = new Map()
  for (const row of records || []) {
    if (row.clientId === clientId && validDate(row.date) && row.date <= throughDate) daily.set(row.date, row)
  }
  const rows = [...daily.values()].sort((a, b) => b.date.localeCompare(a.date))
  const latest = rows[0] || null
  const start = latest ? addDays(latest.date, -WELLNESS_BASELINE_DAYS) : null
  const earlier = latest ? rows.filter((row) => row.date < latest.date && row.date >= start) : []
  const metrics = WELLNESS_METRICS.map((metric) => {
    const value = rating(latest?.[metric.key])
    const values = earlier.map((row) => rating(row[metric.key])).filter((number) => number !== null)
    const count = values.length
    const mean = count ? values.reduce((sum, number) => sum + number, 0) / count : null
    const sd = count > 1 ? Math.sqrt(values.reduce((sum, number) => sum + (number - mean) ** 2, 0) / (count - 1)) : null
    const reason = value === null ? 'missing-rating' : count < MIN_WELLNESS_BASELINE_DAYS ? 'insufficient-history' : !(sd > 0) ? 'no-variation' : null
    return { ...metric, value, count, mean, sd, needed: Math.max(0, MIN_WELLNESS_BASELINE_DAYS - count), reason,
      z: reason ? null : metric.direction * (value - mean) / sd }
  })
  return { latest, start, end: latest ? addDays(latest.date, -1) : null, metrics }
}
