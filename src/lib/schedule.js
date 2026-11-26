import { addDays, coachClock, fmtDay } from './dates'

export const scheduleClock = coachClock
export const minute = time => Number(time?.slice(0, 2)) * 60 + Number(time?.slice(3, 5))
export const clockTime = n => Number.isFinite(n) ? `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}` : '—'
export const hasDuration = s => Number.isFinite(Number(s.dur)) && Number(s.dur) > 0
export const durationLabel = s => hasDuration(s) ? `${s.dur} min` : 'Duration not recorded'
export const sessionEnd = s => hasDuration(s) ? clockTime(minute(s.time) + Number(s.dur)) : '—'
// Keep the normal coaching day visible, extending to whole hours for bookings.
export function calendarTimeRange(rows) {
  const valid = rows.filter(s => Number.isFinite(minute(s.time)) && hasDuration(s))
  return {
    start: Math.max(0, Math.min(300, ...valid.map(s => Math.floor(minute(s.time) / 60) * 60))),
    end: Math.min(1440, Math.max(1320, ...valid.map(s => Math.ceil((minute(s.time) + Number(s.dur)) / 60) * 60))),
  }
}
export const trainingBooking = s => /^(1-on-1 Training|Personal training)$/i.test(s?.type || '')
export const scheduleSort = (a, b) => (a.date + a.time).localeCompare(b.date + b.time)
export const weekOf = date => addDays(date, -((new Date(date + 'T12:00:00Z').getUTCDay() + 6) % 7))
export const activeBooking = s => s.status !== 'Cancelled'
export const beforeNow = (s, clock) => s.date < clock.today || s.date === clock.today && s.time <= clock.time
export const sessionPath = s => `/clients/${encodeURIComponent(s.clientId)}/${trainingBooking(s) ? `training?date=${s.date}&booking=${encodeURIComponent(s.id)}#training-bookings` : s.type === 'Assessment' ? 'assessments' : s.type === 'Check-in' ? 'check-ins?view=wellness' : ''}`
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const at = (rows, s) => (rows || []).filter(p => p.clientId === s.clientId && p.date === s.date)

export function trainingBookings(db, clientId, date) {
  return at(db.sessions, { clientId, date }).filter(trainingBooking).sort(scheduleSort)
}

export function bookingWorkout(db, booking) {
  return (db.workouts || []).find(row => row.bookingId === booking.id && row.clientId === booking.clientId && row.date === booking.date) || null
}

export function workoutReviewPath(workout) {
  const params = new URLSearchParams({ date: workout.date, workout: workout.id })
  if (workout.bookingId) params.set('booking', workout.bookingId)
  return `/clients/${encodeURIComponent(workout.clientId)}/training?${params}#selected-workout`
}

export const scheduledBooking = booking => ['Pending', 'Confirmed'].includes(booking.status)

export function bookingWorkoutStatus(booking, workout) {
  const workoutState = { completed: 'Workout logged', in_progress: 'Workout in progress', discarded: 'Workout discarded' }[workout?.status]
  if (workoutState) return `${workoutState} · ${booking.status ? 'Booking ' + booking.status.toLowerCase() : 'Booking status unavailable'}`
  if (booking.status === 'Completed') return trainingBooking(booking) ? 'Booking completed · No workout log' : 'Booking completed'
  return booking.status === 'Pending' ? 'Scheduled' : booking.status || 'Booking'
}

export function canRunBookingWorkout(booking, workout, today) {
  if (!trainingBooking(booking) || ['completed', 'discarded'].includes(workout?.status)) return false
  return workout?.status === 'in_progress'
    || (booking.date === today && scheduledBooking(booking))
    || (booking.status === 'Completed' && booking.date <= today)
}

export function bookingWorkoutAction(db, booking, today) {
  if (!trainingBooking(booking)) return null
  const workout = bookingWorkout(db, booking)
  if (['completed', 'discarded'].includes(workout?.status)) {
    return { path: workoutReviewPath(workout), label: 'Review workout' }
  }
  if (canRunBookingWorkout(booking, workout, today)) {
    const path = sessionPath(booking).split('#')[0]
    const label = workout?.status === 'in_progress' ? 'Resume workout' : booking.status === 'Completed' ? 'Log workout' : 'Start workout'
    return { path: path + '&run=1#workout-log', label }
  }
  return null
}

// A date-level prescription can be previewed for any training booking on that day.
export function bookingDayPlan(db, s) {
  if (!trainingBooking(s)) return null
  const plans = at(db.prescriptions, s)
  return plans.length === 1 ? plans[0] : null
}

// Moving a booking can also move a uniquely linked plan. When several bookings
// share the date, none of them owns the day-level prescription.
export function bookingPlan(db, s) {
  const plan = bookingDayPlan(db, s)
  if (!plan) return null
  const bookings = at(db.sessions, s).filter(p => activeBooking(p) && trainingBooking(p))
  return bookings.length <= 1 ? plan : null
}

export function scheduleLock(db, s, clock = scheduleClock(new Date(), db.settings?.tz)) {
  if (!['Pending', 'Confirmed'].includes(s.status)) return 'Only pending or confirmed bookings can be moved.'
  if (beforeNow(s, clock)) return 'This session has started or is in the past. Update its status instead.'
  if (trainingBooking(s) && at(db.workouts, s).some(row => !row.bookingId || row.bookingId === s.id)) return 'A workout record is linked to this booking or its original day. Review it in Training.'
  return ''
}

export function bookingConflicts(db, original, next, clock = scheduleClock(new Date(), db.settings?.tz)) {
  const issues = [], add = (title, detail, row) => issues.push({ title, detail, path: row ? sessionPath(row) : null })
  const changedTime = !original || ['date', 'time', 'dur', 'clientId', 'type'].some(k => original[k] !== next?.[k])
  if (original && !equal(db.sessions.find(s => s.id === original.id), original)) add('Booking changed', 'Close this window and reopen the latest booking before trying again.')
  if (original && !next) {
    const lock = scheduleLock(db, original, clock)
    if (lock) add('Session protected', lock)
    return issues
  }
  if (!next) return issues
  if (original && next.id !== original.id) add('Booking identity cannot change', 'Close this window and reopen the booking.')
  if (!['Pending', 'Confirmed', 'Completed', 'Cancelled', 'Missed'].includes(next.status)) add('Choose a valid status', 'Select a booking status from the list.')
  if (!db.clients.some(c => c.id === next.clientId)) add('Client unavailable', 'Choose an existing client.')
  if (original && next.clientId !== original.clientId) add('Client cannot change', 'Create a separate booking for the other client.')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(next.date) || Number.isNaN(Date.parse(next.date + 'T12:00:00Z')) || new Date(next.date + 'T12:00:00Z').toISOString().slice(0, 10) !== next.date) add('Choose a valid date', 'Select a date from the calendar.')
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(next.time) || !Number.isInteger(next.dur) || next.dur < 15 || next.dur > 480 || minute(next.time) + next.dur > 1440) add('Check the time and duration', 'Use 15–480 minutes, ending on the same day.')
  if (issues.length) return issues
  if (!changedTime && original?.status === next.status) return issues
  if (changedTime && original) {
    if (original.status !== next.status) add('Change one thing at a time', 'Save the schedule change first, then update the booking status.')
    const lock = scheduleLock(db, original, clock)
    if (lock) add('Session protected', lock)
    if (trainingBooking(original) && original.type !== next.type && at(db.prescriptions, original).length) add('Workout linked to this booking', 'Keep the training type. Cancel this booking and create a separate appointment if needed.')
  }
  if (changedTime && beforeNow(next, clock)) add('Choose a future time', 'Move the session to a time that has not started.')
  // Status-only updates to past records remain possible. Reactivating a cancelled
  // booking checks occupancy again, but marking a past booking complete does not.
  if (activeBooking(next) && (changedTime || original?.status === 'Cancelled')) {
    for (const s of db.sessions.filter(s => s.id !== original?.id && activeBooking(s) && s.date === next.date)) {
      if (minute(next.time) < minute(s.time) + Number(s.dur) && minute(s.time) < minute(next.time) + next.dur)
        add('Coach time already occupied', `${db.clients.find(c => c.id === s.clientId)?.name || 'Client'} · ${s.time}–${sessionEnd(s)}. Choose another time or shorten the session.`, s)
    }
    if (original && original.date !== next.date && trainingBooking(original)) {
      const movingPlan = bookingPlan(db, original)
      if (at(db.prescriptions, original).length && !movingPlan) add('Workout link is ambiguous', 'More than one training booking or prescription exists on the original day. Review them before moving this session.', original)
      if (movingPlan && at(db.workouts, next).length) add('Workout already recorded', 'The existing prescription cannot move onto a day with workout records.', next)
      if (movingPlan && at(db.sessions, next).some(s => s.status === 'Completed')) add('Day already completed', 'The existing prescription cannot move onto a day with a completed appointment.', next)
      if (movingPlan && (at(db.prescriptions, next).length || (db.programAssignments || []).some(a => a.clientId === next.clientId && a.data?.schedule?.some(p => p.date === next.date))))
        add('Day already prescribed', `${fmtDay(next.date)} has a workout for this client. Open it, or choose an unprescribed day.`, next)
    }
  }
  return issues
}

export function scheduleRequest(db, original, next) {
  const plan = original && next && original.date !== next.date ? bookingPlan(db, original) : null
  return { original: original ? structuredClone(original) : null, next: next ? structuredClone(next) : null, plan: plan ? structuredClone(plan) : null,
    assignments: plan ? structuredClone((db.programAssignments || []).filter(a => a.data?.schedule?.some(s => s.prescriptionId === plan.id))) : [] }
}

export function applyScheduleRequest(db, request, clock = scheduleClock(new Date(), db.settings?.tz)) {
  const { original, next, plan, assignments } = request
  const issues = bookingConflicts(db, original, next, clock)
  if (issues.length) throw new Error(issues.map(i => `${i.title}: ${i.detail}`).join('\n'))
  const currentPlan = original && next && original.date !== next.date ? bookingPlan(db, original) : null
  if (!equal(currentPlan, plan) || assignments.some(a => !equal(a, (db.programAssignments || []).find(p => p.id === a.id)))) throw new Error('The workout or program changed. Reopen the booking and try again.')
  const currentAssignments = plan ? (db.programAssignments || []).filter(a => a.data?.schedule?.some(s => s.prescriptionId === plan.id)) : []
  if (currentAssignments.length !== assignments.length) throw new Error('The program changed. Reopen the booking and try again.')
  if (!original && db.sessions.some(s => s.id === next.id)) throw new Error('Booking already exists. Reopen the schedule.')
  if (original) db.sessions = db.sessions.filter(s => s.id !== original.id)
  if (next) db.sessions.push(structuredClone(next))
  if (plan) {
    db.prescriptions.find(p => p.id === plan.id).date = next.date
    for (const a of currentAssignments) for (const item of a.data.schedule) if (item.prescriptionId === plan.id) item.date = next.date
  }
}

export function freeScheduleSlots(db, original, next, clock, count = 3) {
  const result = []
  if (!next || original && scheduleLock(db, original, clock)) return result
  if (next.date && (!/^\d{4}-\d{2}-\d{2}$/.test(next.date) || Number.isNaN(Date.parse(next.date + 'T12:00:00Z')))) return result
  for (let day = 0; day < 14 && result.length < count; day++) {
    const date = addDays(next.date < clock.today ? clock.today : next.date, day)
    for (const time of [...new Set([next.time, ...Array.from({ length: 49 }, (_, i) => clockTime(420 + i * 15))])]) {
      const candidate = { ...next, date, time }
      if (!bookingConflicts(db, original, candidate, clock).length) { result.push(candidate); break }
    }
  }
  return result
}

// Give all overlapping bookings their own lane, including chained overlaps.
export function calendarLanes(rows) {
  const result = [], sorted = [...rows].sort((a, b) => minute(a.time) - minute(b.time) || b.dur - a.dur)
  let group = [], end = -1
  const flush = () => {
    const lanes = []
    for (const s of group) {
      let lane = lanes.findIndex(e => e <= minute(s.time))
      if (lane < 0) lane = lanes.length
      lanes[lane] = minute(s.time) + Number(s.dur)
      result.push({ session: s, lane, group })
    }
    for (const r of result.filter(r => r.group === group)) r.lanes = lanes.length
    group = []; end = -1
  }
  for (const s of sorted) { if (minute(s.time) >= end && group.length) flush(); group.push(s); end = Math.max(end, minute(s.time) + Number(s.dur)) }
  flush()
  return result
}
