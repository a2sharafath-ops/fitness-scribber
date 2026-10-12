import { isClosedTrainingDay, isSession } from './planner'

// Calendar cells and the selected-day panel share client/date eligibility rules.
export function trainingDay(db, clientId, date, today) {
  const prescription = (db.prescriptions || []).find((row) => row.clientId === clientId && row.date === date && isSession(row)) || null
  const workouts = (db.workouts || []).filter((row) => row.clientId === clientId && row.date === date)
  const completed = workouts.filter((row) => row.status === 'completed')
  const pending = workouts.find((row) => row.status === 'in_progress') || workouts.find((row) => row.status !== 'completed') || null
  const appointment = (db.sessions || []).find((row) => row.clientId === clientId && row.date === date && String(row.status).toLowerCase() === 'completed') || null
  const closed = isClosedTrainingDay(db, clientId, date, today)
  const status = completed.length ? 'completed' : pending ? pending.status === 'in_progress' ? 'progress' : 'ready'
    : appointment ? 'appointment' : prescription ? 'planned' : 'empty'
  const label = { completed: completed.length > 1 ? `${completed.length} logs` : 'Completed', progress: 'In progress', ready: 'Ready', appointment: 'Appt done', planned: 'Planned', empty: 'No plan' }[status]
  const title = completed[0]?.title || pending?.title || (appointment ? 'Appointment completed' : prescription?.name)
    || (prescription ? 'Prescribed workout' : date < today ? 'No workout recorded' : 'No workout planned')
  const canRun = !completed.length && date <= today && (pending?.status === 'in_progress' || date === today && !closed && Boolean(pending || prescription))
  return { prescription, completed, pending, appointment, closed, status, label, title, canRun,
    canEditPlan: Boolean(prescription && !completed.length && !appointment && !pending),
    canPlan: !closed && !prescription && !pending,
    canDeletePlan: Boolean(prescription && !closed && !pending) }
}
