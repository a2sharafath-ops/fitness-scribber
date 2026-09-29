import { addDays } from './dates.js'
import { acwrSeries, sdev, trainingMonotony, trainingStrain } from './calc.js'

export const LOAD_RESPONSE_METRICS = [
  { id: 'load', label: 'Session load', unit: 'AU', group: 'Training' },
  { id: 'rpe', label: 'Session RPE (daily mean)', unit: '/10', group: 'Training' },
  { id: 'duration', label: 'Session duration', unit: 'min', group: 'Training' },
  { id: 'volumeLoad', label: 'Resistance volume load', unit: 'kg', group: 'Training' },
  { id: 'trimp', label: 'TRIMP', unit: 'AU', group: 'Conditioning' },
  { id: 'tiz', label: 'Time in zone', unit: 'min', group: 'Conditioning' },
  { id: 'tss', label: 'TSS', unit: 'points', group: 'Conditioning' },
  { id: 'hsd', label: 'High-speed distance', unit: 'km', group: 'Conditioning' },
  { id: 'acwr', label: 'ACWR', unit: 'ratio', group: 'Calculated load' },
  { id: 'monotony', label: 'Monotony', unit: 'ratio', group: 'Calculated load' },
  { id: 'strain', label: 'Strain', unit: 'AU', group: 'Calculated load' },
  { id: 'wellness', label: 'Wellness score', unit: '/28', group: 'Response' },
  { id: 'sleep', label: 'Sleep quality', unit: '/7', group: 'Response' },
  { id: 'stress', label: 'Stress', unit: '/7', group: 'Response' },
  { id: 'fatigue', label: 'Fatigue', unit: '/7', group: 'Response' },
  { id: 'soreness', label: 'Soreness', unit: '/7', group: 'Response' },
  { id: 'hrv', label: 'HRV', unit: 'ms', group: 'Wearables' },
  { id: 'rhr', label: 'Resting heart rate', unit: 'bpm', group: 'Wearables' },
  { id: 'sleepHrs', label: 'Sleep duration', unit: 'h', group: 'Wearables' },
]

const numeric = (value) => value === '' || value == null ? null : Number.isFinite(Number(value)) ? Number(value) : null
const sourceOf = (row) => row.source || 'Source not recorded'
const finite = (values) => values.filter((value) => value != null && Number.isFinite(value))
const sum = (values) => values.reduce((total, value) => total + value, 0)

// A calendar day is the comparison unit. Multiple sessions/records on a day
// are summed for additive measures and averaged for ratings and readings.
export function loadResponseRows(db, clientId, endDate, days) {
  const startDate = addDays(endDate, -(days - 1))
  const inRange = (row) => row.clientId === clientId && row.date >= startDate && row.date <= endDate
  const buckets = Object.fromEntries(Array.from({ length: days }, (_, index) => {
    const date = addDays(startDate, index)
    return [date, { date, values: {}, sources: {} }]
  }))
  const values = (collection, field, target, aggregate = 'sum') => {
    const grouped = new Map()
    for (const row of (db[collection] || []).filter(inRange)) {
      if (!buckets[row.date]) continue
      const value = numeric(row[field])
      if (value == null) continue
      if (!grouped.has(row.date)) grouped.set(row.date, [])
      grouped.get(row.date).push({ value, source: sourceOf(row) })
    }
    for (const [date, records] of grouped) {
      const total = sum(records.map((record) => record.value))
      buckets[date].values[target] = aggregate === 'mean' ? total / records.length : total
      buckets[date].sources[target] = [...new Set(records.map((record) => record.source))].join(', ')
    }
  }
  values('srpe', 'tl', 'load')
  values('srpe', 'rpe', 'rpe', 'mean')
  values('srpe', 'duration', 'duration')
  values('resistance', 'volumeLoad', 'volumeLoad')
  for (const field of ['trimp', 'tiz', 'tss', 'hsd']) values('cardio', field, field)
  for (const field of ['sleep', 'stress', 'fatigue', 'soreness']) values('wellness', field, field, 'mean')
  values('wellness', 'score', 'wellness', 'mean')
  for (const field of ['hrv', 'rhr', 'sleepHrs']) values('wearable', field, field, 'mean')

  const rows = Object.values(buckets)
  const loadMap = Object.fromEntries(rows.filter((row) => row.values.load != null).map((row) => [row.date, row.values.load]))
  for (const row of rows) {
    if (row.values.load == null) continue
    const window = Array.from({ length: 28 }, (_, index) => addDays(row.date, index - 27))
    const load7 = window.slice(-7).map((date) => loadMap[date] || 0)
    row.values.acwr = acwrSeries(loadMap, window).at(-1)
    row.values.monotony = sdev(load7) > 0 ? trainingMonotony(load7) : null
    row.values.strain = row.values.monotony == null ? null : trainingStrain(load7)
    for (const metric of ['acwr', 'monotony', 'strain']) row.sources[metric] = 'Calculated from recorded session load'
  }
  return rows
}

// Rolling means use only observed values in the preceding calendar window.
// They appear only on dates with a raw observation; missing days stay gaps.
export function responseSeries(rows, metric, window = 0) {
  return rows.map((row, index) => {
    if (row.values[metric] == null) return { value: null, count: 0 }
    if (!window) return { value: row.values[metric], count: 1 }
    const observed = finite(rows.slice(Math.max(0, index - window + 1), index + 1).map((item) => item.values[metric]))
    return { value: observed.length ? sum(observed) / observed.length : null, count: observed.length }
  })
}

export function pairedResponsePoints(rows, xSeries, ySeries) {
  return rows.flatMap((row, index) => xSeries[index].value == null || ySeries[index].value == null ? [] : [{
    date: row.date, x: xSeries[index].value, y: ySeries[index].value,
  }])
}
