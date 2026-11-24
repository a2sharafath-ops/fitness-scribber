import { readinessScore } from './calc'
import { isSession } from './planner'
import { bookingDayPlan, bookingWorkout, bookingWorkoutAction, bookingWorkoutStatus, sessionPath, trainingBooking } from './schedule'

function bookingDestination(db, booking, today) {
  const path = sessionPath(booking)
  if (!trainingBooking(booking)) {
    const label = { Assessment: 'Open assessments', 'Check-in': 'Open check-ins' }[booking.type] || 'Open client'
    return { path, label }
  }
  return bookingWorkoutAction(db, booking, today) || { path, label: 'Open training' }
}

export function bookingSlide(db, booking, client, today, next) {
  const dayPlan = bookingDayPlan(db, booking)
  const plan = isSession(dayPlan) ? dayPlan : null
  const workout = trainingBooking(booking) ? bookingWorkout(db, booking) : null
  const originalWorkout = workout?.liveState?.original ? workout : null
  const title = workout?.title?.trim() || (plan && (plan.name?.trim() || 'Prescribed workout')) || booking.type || 'Training session'
  const program = plan && (!workout || workout.source === 'prescribed' && title === plan.name?.trim()) && db.programAssignments?.find((assignment) =>
    assignment.clientId === booking.clientId && assignment.data?.schedule?.some((entry) => entry.prescriptionId === plan.id))?.name
  const status = bookingWorkoutStatus(booking, workout)
  return {
    booking, client, plan, originalWorkout, title, program, status,
    state: workout?.status || booking.status?.toLowerCase(),
    subject: `${client.name} at ${booking.time || 'unscheduled time'}`,
    featuredStatus: !workout && booking.id === next?.id ? 'Next scheduled' : status,
    destination: bookingDestination(db, booking, today),
    readiness: readinessScore(db, client.id, today),
  }
}
