// Metric registry powering the Load-Response dashboard axis toggles.
// Each metric: label(units) -> string, kind ('line'|'bar'), series(db, clientId, dates, units) -> number[]
import { dailySum, acwrSeries, trainingStrain, trainingMonotony, readinessScore } from './calc'
import { KG2LB } from './units'

export const METRICS = {
  vl: {
    label: (u) => 'Volume Load (' + (u === 'lb' ? 'lb' : 'kg') + ')',
    kind: 'bar',
    series: (db, c, D, u) => {
      const m = dailySum(db.resistance, c, 'volumeLoad')
      return D.map((d) => (u === 'lb' ? Math.round((m[d] || 0) * KG2LB) : m[d] || 0))
    },
  },
  srpetl: {
    label: () => 'sRPE-TL (AU)',
    kind: 'line',
    series: (db, c, D) => {
      const m = dailySum(db.srpe, c, 'tl')
      return D.map((d) => m[d] || 0)
    },
  },
  strain: {
    label: () => 'Training Strain',
    kind: 'line',
    series: (db, c, D) => {
      const m = dailySum(db.srpe, c, 'tl')
      const L = D.map((d) => m[d] || 0)
      return D.map((d, i) => trainingStrain(L.slice(Math.max(0, i - 6), i + 1)))
    },
  },
  monotony: {
    label: () => 'Training Monotony',
    kind: 'line',
    series: (db, c, D) => {
      const m = dailySum(db.srpe, c, 'tl')
      const L = D.map((d) => m[d] || 0)
      return D.map((d, i) => trainingMonotony(L.slice(Math.max(0, i - 6), i + 1)))
    },
  },
  acwr: {
    label: () => 'ACWR (sRPE-TL)',
    kind: 'line',
    series: (db, c, D) => acwrSeries(dailySum(db.srpe, c, 'tl'), D),
  },
  wellness: {
    label: () => 'Wellness (Hooper)',
    kind: 'line',
    series: (db, c, D) => {
      const m = {}
      db.wellness.filter((x) => x.clientId === c).forEach((x) => (m[x.date] = x.score))
      return D.map((d) => m[d] ?? null)
    },
  },
  hrv: {
    label: () => 'HRV (RMSSD, ms)',
    kind: 'line',
    series: (db, c, D) => {
      const m = {}
      db.wearable.filter((x) => x.clientId === c).forEach((x) => (m[x.date] = x.hrv))
      return D.map((d) => m[d] ?? null)
    },
  },
  rhr: {
    label: () => 'Resting HR (bpm)',
    kind: 'line',
    series: (db, c, D) => {
      const m = {}
      db.wearable.filter((x) => x.clientId === c).forEach((x) => (m[x.date] = x.rhr))
      return D.map((d) => m[d] ?? null)
    },
  },
  readiness: {
    label: () => 'Readiness score',
    kind: 'line',
    series: (db, c, D) => D.map((d) => readinessScore(db, c, d)),
  },
}
