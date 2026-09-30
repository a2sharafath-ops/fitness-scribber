import { addDays, datesBetween, daysBetween } from './dates.js'
import { baseline, formalAssessments, latest, movementScore } from './assessment.js'
import { acwrSeries, dailySum, sdev, trainingMonotony, trainingStrain } from './calc.js'
import { muscleVolume } from './muscleVolume.js'
import { epley1RM } from './program.js'

const inRange = (row, clientId, start, end) => row?.clientId === clientId && row.date >= start && row.date <= end
const number = (value) => value == null || value === '' || !Number.isFinite(Number(value)) ? null : Number(value)
const mean = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null
const liftKey = (name) => String(name || '').trim().replace(/\s+/g, ' ').toLowerCase()
const sameMethod = (a, b) => !!a && !!b && a.id !== b.id && !!a.data?.method && a.data.method === b.data?.method
const sameProtocol = (a, b) => !!a && !!b && a.id !== b.id && (a.data?.protocol || 'legacy') === (b.data?.protocol || 'legacy')

export const REPORT_DEFAULT_SECTIONS = { exposure: true, wellbeing: true, outcomes: true, body: false, appendix: false }
export function reportPreferences(client) {
  const saved = client?.intake?.reportPreferences || {}
  return {
    sections: Object.fromEntries(Object.entries(REPORT_DEFAULT_SECTIONS).map(([key, fallback]) => [key, typeof saved.sections?.[key] === 'boolean' ? saved.sections[key] : fallback])),
    note: typeof saved.note === 'string' ? saved.note.slice(0, 300) : '',
    noteDate: saved.noteDate || null,
  }
}

// All selector inputs are scoped to one client and a date window. It has no I/O.
export function clientReport(db, clientId, end, days = 28, today = end) {
  const start = addDays(end, -(days - 1))
  const workouts = (db.workouts || []).filter((row) => inRange(row, clientId, start, end) && row.status === 'completed').sort((a, b) => a.date.localeCompare(b.date))
  const workoutDates = [...new Set(workouts.map((row) => row.date))]
  const activeWeeks = new Set(workouts.map((row) => Math.floor(daysBetween(start, row.date) / 7))).size
  const elapsedEnd = end < today ? end : addDays(today, -1)
  const bookings = (db.sessions || []).filter((row) => inRange(row, clientId, start, elapsedEnd))
  const eligibleBookings = bookings.filter((row) => row.status !== 'Cancelled')
  const completedBookings = eligibleBookings.filter((row) => row.status === 'Completed').length
  const unresolvedBookings = eligibleBookings.length - completedBookings
  const cancelledBookings = bookings.length - eligibleBookings.length

  const working = muscleVolume(db, clientId, start, end, { workingOnly: true })
  const totalKnownVolume = working.observations.filter((row) => row.volume != null).reduce((sum, row) => sum + row.volume, 0)
  const missingVolumeSets = working.observations.filter((row) => row.volume == null).reduce((sum, row) => sum + row.sets, 0)
  const strengthByLift = new Map()
  for (const row of working.observations) {
    if (!row.name || row.name === 'Unnamed exercise' || row.reps == null || row.load == null || row.load <= 0) continue
    const estimate = epley1RM(row.load, row.reps)
    if (!Number.isFinite(estimate) || estimate <= 0) continue
    const key = `workout:${liftKey(row.name)}`
    if (!strengthByLift.has(key)) strengthByLift.set(key, { id: key, name: row.name, kind: 'workout', dates: new Map() })
    const lift = strengthByLift.get(key)
    const current = lift.dates.get(row.date)
    if (!current || estimate > current.estimate) lift.dates.set(row.date, { date: row.date, name: row.name, reps: row.reps, load: row.load, estimate, source: row.source })
  }
  // Manual resistance logs can be the only strength history for older clients.
  // Keep them in a separate series because a log may duplicate a workout set.
  for (const row of (db.resistance || []).filter((item) => inRange(item, clientId, start, end))) {
    const name = String(row.exercise || '').trim()
    const reps = number(row.reps), load = number(row.weight), sets = number(row.sets)
    if (!name || !Number.isInteger(sets) || sets <= 0 || !Number.isInteger(reps) || reps <= 0 || load == null || load <= 0) continue
    const estimate = epley1RM(load, reps)
    const key = `resistance:${liftKey(name)}`
    if (!strengthByLift.has(key)) strengthByLift.set(key, { id: key, name, kind: 'resistance', dates: new Map() })
    const lift = strengthByLift.get(key)
    const current = lift.dates.get(row.date)
    if (!current || estimate > current.estimate) lift.dates.set(row.date, { date: row.date, name, reps, load, estimate, source: row.source || 'Resistance log' })
  }
  const lifts = [...strengthByLift.values()].map((item) => ({ id: item.id, name: item.name, kind: item.kind, points: [...item.dates.values()].sort((a, b) => a.date.localeCompare(b.date)) }))
    .sort((a, b) => b.points.length - a.points.length || (a.kind === b.kind ? 0 : a.kind === 'workout' ? -1 : 1) || a.name.localeCompare(b.name))

  // A complete Monday–Sunday calendar week ends on the last Sunday <= report end.
  const weekday = new Date(`${end}T00:00:00Z`).getUTCDay()
  const muscleEnd = addDays(end, -weekday)
  const muscleStart = addDays(muscleEnd, -6)
  const muscle = muscleVolume(db, clientId, muscleStart, muscleEnd, { workingOnly: true })

  const wellness = (db.wellness || []).filter((row) => inRange(row, clientId, start, end))
  const srpe = (db.srpe || []).filter((row) => inRange(row, clientId, start, end))
  const finalWeekStart = addDays(end, -6)
  const sleep = wellness.filter((row) => row.date >= finalWeekStart).map((row) => number(row.sleep)).filter((value) => value != null && value >= 1 && value <= 7)
  const efforts = srpe.map((row) => number(row.rpe)).filter((value) => value != null && value >= 1 && value <= 10)
  const uniqueWellnessDays = new Set(wellness.map((row) => row.date)).size
  const concerns = (db.concerns || []).filter((row) => row.clientId === clientId && row.status === 'Open' && row.date <= end)
  const assessments = (db.assessments || []).filter((row) => row.clientId === clientId && row.date <= end)
  const formal = formalAssessments(assessments)
  const outcome = (type) => { const first = baseline(formal, type), last = latest(formal, type); return { first, last, inPeriod: !!last && last.date >= start } }
  const movement = outcome('movement'), body = outcome('body_comp'), fitness = outcome('fitness')
  movement.comparable = sameProtocol(movement.first, movement.last)
  body.comparable = sameMethod(body.first, body.last)
  fitness.comparable = !!fitness.first && !!fitness.last && fitness.first.id !== fitness.last.id
  movement.latestScore = movement.last ? movementScore(movement.last.data) : null
  movement.firstScore = movement.first ? movementScore(movement.first.data) : null

  const loadDates = datesBetween(addDays(end, -27), end)
  const loadMap = dailySum((db.srpe || []).filter((row) => row.clientId === clientId && row.date <= end && number(row.tl) != null), clientId, 'tl')
  const load7 = loadDates.slice(-7).map((date) => loadMap[date] || 0)
  const monotony = Object.keys(loadMap).some((date) => date >= loadDates.at(-7) && date <= end) && sdev(load7) > 0 ? trainingMonotony(load7) : null
  const strain = monotony == null ? null : trainingStrain(load7)
  const acwr = acwrSeries(loadMap, loadDates).at(-1)
  const loadCoverage = { logged7: loadDates.slice(-7).filter((date) => Object.hasOwn(loadMap, date)).length, logged28: loadDates.filter((date) => Object.hasOwn(loadMap, date)).length }

  return { start, end, days, workouts, workoutDates, activeWeeks, bookings: { completed: completedBookings, total: eligibleBookings.length, unresolved: unresolvedBookings, cancelled: cancelledBookings, percent: eligibleBookings.length ? Math.round(completedBookings / eligibleBookings.length * 100) : null },
    working, totalKnownVolume, missingVolumeSets, lifts, muscle: { ...muscle, start: muscleStart, end: muscleEnd },
    wellness: { rows: wellness, days: uniqueWellnessDays, sleepMean: mean(sleep), sleepCount: sleep.length, sleepStart: finalWeekStart },
    effort: { rows: srpe, mean: mean(efforts), count: efforts.length }, concerns, assessments: { movement, body, fitness },
    load: { acwr, monotony, strain, ...loadCoverage }, issues: (db._loadIssues || []).filter((issue) => ['clients', 'workouts', 'exercises', 'sessions', 'wellness', 'srpe', 'assessments', 'concerns'].includes(issue.table)) }
}
