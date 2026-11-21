import { isClosedTrainingDay, isSession } from './planner'
import { activeBooking, bookingWorkout, scheduledBooking, trainingBookings } from './schedule'

// Calendar cells and the selected-day panel share client/date eligibility rules.
export function trainingDay(db, clientId, date, today, { unlinkedOnly = false } = {}) {
  const prescription = (db.prescriptions || []).find((row) => row.clientId === clientId && row.date === date && isSession(row)) || null
  const workouts = (db.workouts || []).filter((row) => row.clientId === clientId && row.date === date && (!unlinkedOnly || !row.bookingId))
  const discarded = workouts.filter((row) => row.status === 'discarded')
  const completed = workouts.filter((row) => row.status === 'completed')
  const pending = workouts.find((row) => row.status === 'in_progress') || workouts.find((row) => !['completed', 'discarded'].includes(row.status)) || null
  const appointment = (db.sessions || []).find((row) => row.clientId === clientId && row.date === date && String(row.status).toLowerCase() === 'completed') || null
  const closed = isClosedTrainingDay(db, clientId, date, today)
  const bookings = trainingBookings(db, clientId, date).filter(activeBooking)
  const openBookings = bookings.map(booking => ({ booking, workout: bookingWorkout(db, booking) })).filter(({ booking, workout }) =>
    workout?.status === 'in_progress' || scheduledBooking(booking) && !['completed', 'discarded'].includes(workout?.status))
  const scheduled = openBookings.length
  const running = openBookings.some(({ workout }) => workout?.status === 'in_progress')
  const bookedLogs = completed.filter((workout) => bookings.some(booking => booking.id === workout.bookingId)).length
  const status = running ? 'progress' : scheduled ? 'booked'
    : completed.length ? 'completed' : pending ? pending.status === 'in_progress' ? 'progress' : 'ready'
    : appointment ? 'appointment' : prescription ? 'planned' : 'empty'
  const label = scheduled && bookedLogs ? `${bookedLogs} logged · ${scheduled} left`
    : { booked: `${scheduled} booked`,
    completed: completed.length > 1 ? `${completed.length} logs` : 'Logged', progress: 'In progress', ready: 'Ready', appointment: 'Booking completed', planned: 'Planned', empty: 'No plan' }[status]
  const title = (scheduled ? pending?.title || prescription?.name : completed[0]?.title || pending?.title) || (appointment ? 'Appointment completed' : prescription?.name)
    || (prescription ? 'Prescribed workout' : date < today ? 'No workout recorded' : 'No workout planned')
  const canRun = !completed.length && date <= today && (pending?.status === 'in_progress' || !bookings.length && date === today && !closed && Boolean(pending || prescription))
  return { prescription, completed, discarded, pending, appointment, closed, status, label, title, canRun, scheduled, bookedLogs,
    canEditPlan: Boolean(prescription && !completed.length && !appointment && !pending),
    canPlan: !closed && !prescription && !pending,
    canDeletePlan: Boolean(prescription && !closed && !pending) }
}
