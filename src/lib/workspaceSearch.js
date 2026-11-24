import { fmtDate } from './dates'
import { matchesExerciseSearch } from './exerciseSearch'
import { sessionPath, workoutReviewPath } from './schedule'
import { runBlocks } from './workout'
import { toDisp } from './units'

export const WORKSPACE_PAGES = [
  ['/', 'Dashboard'], ['/clients', 'Clients'], ['/workouts', 'Workouts'], ['/schedule', 'Schedule'],
  ['/progress', 'Progress'], ['/messages', 'Messages'], ['/concerns', 'Concerns'], ['/settings', 'Settings'], ['/session-setup', 'Session setup'],
]

export function workspaceSearch(db, messages, query, units) {
  const term = query.trim().toLowerCase()
  if (!term) return WORKSPACE_PAGES.slice(0, 4).map(([path, name]) => ({ key: path, path, name, kind: 'Page' }))
  const clients = new Map(db.clients.map((client) => [client.id, client]))
  const results = []
  const add = (key, path, name, kind, description = '', keywords = '', matched = false) => {
    if (matched || `${name} ${description} ${keywords}`.toLowerCase().includes(term)) results.push({ key, path, name, kind, description })
  }
  for (const [path, name] of WORKSPACE_PAGES) add(path, path, name, 'Page')
  for (const client of db.clients) add(client.id, `/clients/${encodeURIComponent(client.id)}`, client.name, 'Client', client.goal, client.email)
  for (const program of db.programs || []) {
    if (!program.archivedAt) add(program.id, `/workouts?program=${encodeURIComponent(program.id)}`, program.name, 'Program')
  }
  for (const exercise of db.exercises) {
    if (matchesExerciseSearch(exercise, term)) add(exercise.id, `/workouts?view=exercises&q=${encodeURIComponent(exercise.name)}`, exercise.name, 'Exercise', exercise.equip, '', true)
  }
  for (const booking of db.sessions) {
    const client = clients.get(booking.clientId)
    if (client) add(booking.id, sessionPath(booking), booking.type || 'Booking', 'Booking', `${client.name} · ${fmtDate(booking.date)} · ${booking.time}`, booking.date)
  }
  for (const workout of db.workouts || []) {
    const client = clients.get(workout.clientId)
    if (!client || !['completed', 'discarded'].includes(workout.status)) continue
    const path = workoutReviewPath(workout)
    const description = `${client.name} · ${fmtDate(workout.date)}`
    add(workout.id, path, workout.title || 'Workout', 'Workout log', description, workout.date)
    for (const { items } of runBlocks(workout)) for (const item of items) {
      item.setRows?.forEach((row, index) => {
        if (!row.done) return
        const value = row.mode === 'duration' ? row.durationSeconds == null ? '' : `${row.durationSeconds} sec` : row.reps == null ? '' : `${row.reps} reps`
        const load = row.load == null ? '' : `${toDisp(row.load, units)} ${units}`
        add(`${workout.id}:${item.id}:${index}`, path, `${item.name} · Set ${index + 1}`, 'Logged set', [description, value, load].filter(Boolean).join(' · '), workout.date)
      })
    }
  }
  for (const message of messages) {
    const client = clients.get(message.clientId)
    if (client && message.body) add(message.id, `/messages?clientId=${encodeURIComponent(client.id)}`, message.body, 'Message', [client.name, message.createdAt && fmtDate(message.createdAt.slice(0, 10))].filter(Boolean).join(' · '))
  }
  return results.sort((a, b) => Number(b.name.toLowerCase().startsWith(term)) - Number(a.name.toLowerCase().startsWith(term))).slice(0, 16)
}
