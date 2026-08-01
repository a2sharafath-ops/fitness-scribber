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

const clamp100 = (v) => Math.max(0, Math.min(100, v))

// The two component parts are UNCHANGED from the original design — only the way
// they are combined into the final score is new.
//   • Subjective (Hooper) part: (score − 4) / 24 × 100.
//   • Objective (HRV) part: 50 + (% deviation from the 30-day baseline) × 2.5.
const wellnessPartOf = (w) => (w ? Math.round(clamp100(((w.score - 4) / 24) * 100)) : null)
function hrvPartOf(db, clientId, date, hr) {
  if (!hr) return { part: null, dev: null, baseline: null }
  const baseline = rolling30Baseline(db, clientId, 'hrv', date)
  if (!baseline) return { part: null, dev: null, baseline: null }
  const dev = deviationPct(hr.hrv, baseline)
  return { part: Math.round(clamp100(50 + dev * 2.5)), dev, baseline }
}

// Full readiness for one day. The component parts are the originals; the CHANGES
// live only in the COMBINE step: a red-flag-dominant blend instead of a plain
// mean, an R/Y/G taken from that same number (so score and light can't
// disagree), and a data-confidence level.
export function computeReadiness(db, clientId, date) {
  const w = db.wellness.find((x) => x.clientId === clientId && x.date === date)
  const hr = db.wearable.find((x) => x.clientId === clientId && x.date === date)
  const wellnessPart = wellnessPartOf(w)
  const { part: hrvPart, dev: hrvDev, baseline: hrvBaseline } = hrvPartOf(db, clientId, date, hr)
  const parts = [wellnessPart, hrvPart].filter((v) => v != null)

  let score = null
  if (parts.length === 1) score = parts[0]
  else if (parts.length === 2) {
    // Soft worst-of: 60% weight on the lower signal, so a poor reading in one
    // system is not cancelled by a good reading in the other (a plain mean was).
    const lo = Math.min(...parts)
    score = Math.round(lo + (mean(parts) - lo) * 0.4)
  }

  const confidence = parts.length >= 2 ? 'high' : parts.length === 1 ? 'low' : 'none'
  let color = 'gray', label = 'No data'
  if (score != null) {
    if (score < 45) { color = 'red'; label = 'Red — At risk' }
    else if (score >= 67) { color = 'green'; label = 'Green — Ready' }
    else { color = 'yellow'; label = 'Yellow — Monitor' }
  }

  return {
    score, color, label, confidence,
    wellnessPart, hrvPart, hrvDev, hrvBaseline,
    hrv: hr ? hr.hrv : null, wellness: w || null,
  }
}

// 0–100 composite of wellness + HRV for a given day.
export const readinessScore = (db, clientId, date) => computeReadiness(db, clientId, date).score

// Component breakdown behind the composite for one day (superset of the score:
// both parts, deviation/z, baseline, confidence and the red-flag).
export const readinessParts = (db, clientId, date) => computeReadiness(db, clientId, date)

// R/Y/G classification for the client's most recent day that has ANY data —
// keeping subjective and objective on the SAME date (the old version took each
// from its own latest row, which could mix a check-in with 3-day-old HRV).
export function readinessFor(db, clientId) {
  const dates = [
    ...db.wellness.filter((x) => x.clientId === clientId).map((x) => x.date),
    ...db.wearable.filter((x) => x.clientId === clientId).map((x) => x.date),
  ]
  if (!dates.length) return { label: 'No data', color: 'gray', wellness: null, hrvDev: null, score: null, confidence: 'none' }
  const date = dates.sort((a, b) => b.localeCompare(a))[0]
  const r = computeReadiness(db, clientId, date)
  return { label: r.label, color: r.color, wellness: r.wellness ? r.wellness.score : null, hrvDev: r.hrvDev, score: r.score, confidence: r.confidence }
}

// Smoothed readiness + trend over a window (default 5 days vs the prior 5), to
// damp single-day noise and show direction instead of a one-off reading.
export function readinessTrend(db, clientId, endDate, win = 5) {
  const days = []
  for (let i = win * 2 - 1; i >= 0; i--) days.push(addDays(endDate, -i))
  const scores = days.map((d) => readinessScore(db, clientId, d))
  const recent = scores.slice(-win).filter((v) => v != null)
  const prior = scores.slice(0, win).filter((v) => v != null)
  const smoothed = recent.length ? Math.round(mean(recent)) : null
  const priorAvg = prior.length ? mean(prior) : null
  const delta = smoothed != null && priorAvg != null ? Math.round(smoothed - priorAvg) : null
  const trend = delta == null ? 'flat' : delta >= 3 ? 'up' : delta <= -3 ? 'down' : 'flat'
  return { smoothed, trend, delta }
}

// Per-day snapshot of the four headline load-response metrics, all ending on `date`.
// readiness = composite for that day; acwr = 7d acute / 28d chronic ending on date;
// monotony & strain = over the 7-day window ending on date. Pass a precomputed
// `intMap` (dailySum of sRPE-TL) to avoid recomputing it per cell.
// The three load metrics are only reported once a session RPE has been logged
// for that day — before that the day's load is unknown, so no ACWR/monotony/
// strain is calculated (readiness stays independent: it comes from check-ins).
export function dayMetrics(db, clientId, date, intMap) {
  const im = intMap || dailySum(db.srpe, clientId, 'tl')
  const logged = im[date] !== undefined
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
    acwr: logged && chronic > 0 && trained >= MIN_ACWR_DAYS ? +(acute / chronic).toFixed(2) : null,
    monotony: logged ? trainingMonotony(w7) : 0,
    strain: logged ? trainingStrain(w7) : 0,
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
