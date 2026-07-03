// Pure sports-science calculations. Every function takes data explicitly (no globals).
import { lastNDates, addDays } from './dates'

export const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0)

export const sdev = (a) => {
  if (a.length < 2) return 0
  const m = mean(a)
  return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / a.length)
}

// Core formulas
export const calcVolumeLoad = (sets, reps, weight) => (+sets || 0) * (+reps || 0) * (+weight || 0)
export const calcSRPETL = (rpe, duration) => (+rpe || 0) * (+duration || 0)
export const calcWellness = (sleep, stress, fatigue, soreness) =>
  (+sleep || 0) + (8 - (+stress || 0)) + (8 - (+fatigue || 0)) + (8 - (+soreness || 0))

// Load derivatives
export const trainingMonotony = (loads) => {
  const s = sdev(loads)
  return s > 0 ? +(mean(loads) / s).toFixed(2) : 0
}
export const trainingStrain = (loads) =>
  Math.round(loads.reduce((a, b) => a + b, 0) * trainingMonotony(loads))

export const rollingAvg = (arr, win) =>
  arr.map((_, i) => {
    const s = arr.slice(Math.max(0, i - win + 1), i + 1).filter((v) => v != null)
    return s.length ? +(s.reduce((a, b) => a + b, 0) / s.length).toFixed(1) : null
  })

export const dailySum = (arr, clientId, field) => {
  const m = {}
  arr.filter((x) => x.clientId === clientId).forEach((x) => {
    m[x.date] = (m[x.date] || 0) + (x[field] || 0)
  })
  return m
}

export const latestOf = (arr, clientId) =>
  arr.filter((x) => x.clientId === clientId).sort((a, b) => b.date.localeCompare(a.date))[0]

export const deviationPct = (value, base) => (base ? ((value - base) / base) * 100 : 0)

export function rolling30Baseline(db, clientId, field, beforeDate) {
  const cutoff = new Date(beforeDate)
  const lo = new Date(cutoff)
  lo.setDate(lo.getDate() - 30)
  const vals = db.wearable
    .filter((w) => w.clientId === clientId && w.date < beforeDate && new Date(w.date) >= lo)
    .map((w) => w[field])
  return mean(vals)
}

// ACWR needs a chronic training base before the ratio means anything: with a
// single logged session the math degenerates to (L/7)÷(L/28) = exactly 4.00,
// falsely flagging every new athlete as "elevated injury risk". Report null
// until the 28-day window holds at least this many trained days.
export const MIN_ACWR_DAYS = 3

export function acwrSeries(loadMap, dates) {
  const loads = dates.map((d) => loadMap[d] || 0)
  return dates.map((d, i) => {
    const chronicW = loads.slice(Math.max(0, i - 27), i + 1)
    const acute = mean(chronicW.slice(-7))
    const chronic = mean(chronicW)
    const trained = chronicW.filter((v) => v > 0).length
    return chronic > 0 && trained >= MIN_ACWR_DAYS ? +(acute / chronic).toFixed(2) : null
  })
}

// 0–100 composite of wellness + HRV deviation for a given day
export function readinessScore(db, clientId, date) {
  const w = db.wellness.find((x) => x.clientId === clientId && x.date === date)
  const hr = db.wearable.find((x) => x.clientId === clientId && x.date === date)
  const parts = []
  if (w) parts.push(((w.score - 4) / 24) * 100)
  if (hr) {
    const b = rolling30Baseline(db, clientId, 'hrv', date)
    if (b) parts.push(Math.max(0, Math.min(100, 50 + deviationPct(hr.hrv, b) * 2.5)))
  }
  return parts.length ? Math.round(mean(parts)) : null
}

// Component breakdown behind the readiness composite for one day.
// Returns the wellness (Hooper) and HRV-deviation parts plus the blended score.
export function readinessParts(db, clientId, date) {
  const w = db.wellness.find((x) => x.clientId === clientId && x.date === date)
  const hr = db.wearable.find((x) => x.clientId === clientId && x.date === date)
  let wellnessPart = null,
    hrvPart = null,
    hrvDev = null,
    hrvBaseline = null
  if (w) wellnessPart = Math.round(((w.score - 4) / 24) * 100)
  if (hr) {
    hrvBaseline = rolling30Baseline(db, clientId, 'hrv', date)
    if (hrvBaseline) {
      hrvDev = deviationPct(hr.hrv, hrvBaseline)
      hrvPart = Math.round(Math.max(0, Math.min(100, 50 + hrvDev * 2.5)))
    }
  }
  const parts = [wellnessPart, hrvPart].filter((v) => v != null)
  return {
    wellnessPart,
    hrvPart,
    hrvDev,
    hrvBaseline,
    hrv: hr ? hr.hrv : null,
    wellness: w || null,
    score: parts.length ? Math.round(mean(parts)) : null,
  }
}

// R/Y/G readiness classification (latest subjective + objective)
export function readinessFor(db, clientId) {
  const w = latestOf(db.wellness, clientId)
  const hr = latestOf(db.wearable, clientId)
  let dev = null
  if (hr) {
    const base = rolling30Baseline(db, clientId, 'hrv', hr.date)
    dev = base ? deviationPct(hr.hrv, base) : null
  }
  const subjGood = w ? w.score >= 20 : null
  const objGood = dev === null ? null : dev >= -5
  let label = 'No data',
    color = 'gray'
  if (subjGood !== null || objGood !== null) {
    if (subjGood && (objGood || objGood === null)) {
      label = 'Green — Ready'
      color = 'green'
    } else if (subjGood === false && objGood === false) {
      label = 'Red — At risk'
      color = 'red'
    } else {
      label = 'Yellow — Monitor'
      color = 'yellow'
    }
    if (subjGood === false && objGood === null) {
      label = 'Yellow — Monitor'
      color = 'yellow'
    }
  }
  return { label, color, wellness: w ? w.score : null, hrvDev: dev }
}

// Per-day snapshot of the four headline load-response metrics, all ending on `date`.
// readiness = composite for that day; acwr = 7d acute / 28d chronic ending on date;
// monotony & strain = over the 7-day window ending on date. Pass a precomputed
// `intMap` (dailySum of sRPE-TL) to avoid recomputing it per cell.
export function dayMetrics(db, clientId, date, intMap) {
  const im = intMap || dailySum(db.srpe, clientId, 'tl')
  const win = (n) => {
    const a = []
    for (let i = n - 1; i >= 0; i--) a.push(im[addDays(date, -i)] || 0)
    return a
  }
  const w28 = win(28)
  const acute = mean(w28.slice(-7))
  const chronic = mean(w28)
  const trained = w28.filter((v) => v > 0).length
  const w7 = w28.slice(-7)
  return {
    readiness: readinessScore(db, clientId, date),
    acwr: chronic > 0 && trained >= MIN_ACWR_DAYS ? +(acute / chronic).toFixed(2) : null,
    monotony: trainingMonotony(w7),
    strain: trainingStrain(w7),
  }
}

export const openConcerns = (db, clientId) =>
  db.concerns.filter((x) => x.status === 'Open' && (!clientId || x.clientId === clientId))

// Streamlined squad-overview row for a client
export function squadRow(db, c, tz) {
  const r = readinessFor(db, c.id)
  const intMap = dailySum(db.srpe, c.id, 'tl')
  const last7 = lastNDates(7, tz).map((d) => intMap[d] || 0)
  const mono = trainingMonotony(last7)
  const acwr = acwrSeries(intMap, lastNDates(28, tz)).filter((v) => v != null).slice(-1)[0]
  const wkLoad = Math.round(last7.reduce((a, b) => a + b, 0))
  const lastW = latestOf(db.wellness, c.id)
  const openC = openConcerns(db, c.id).length
  return {
    c, r, mono, acwr, wkLoad,
    wellness: lastW ? lastW.score : null,
    lastCheckin: lastW ? lastW.date : null,
    openC,
  }
}
