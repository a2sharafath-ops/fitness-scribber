import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Avatar from '../atoms/Avatar'
import Button from '../atoms/Button'
import Icon from '../atoms/Icon'
import { readinessScore } from '../../lib/calc'
import { bookingPlan, bookingWorkout, bookingWorkoutAction, bookingWorkoutStatus, durationLabel, hasDuration, scheduledBooking, sessionPath, trainingBooking } from '../../lib/schedule'

function bookingDestination(db, booking, today) {
  const path = sessionPath(booking)
  if (!trainingBooking(booking)) {
    const label = { Assessment: 'Open assessments', 'Check-in': 'Open check-ins' }[booking.type] || 'Open client'
    return { path, label }
  }
  return bookingWorkoutAction(db, booking, today) || { path, label: 'Open training' }
}

export default function DashboardBookings({ db, bookings, roster, next, today, onDetails, onPlan, onBook }) {
  const [selectedId, setSelectedId] = useState(null)
  const gesture = useRef(null)
  const count = bookings.length
  const booking = bookings.find((entry) => entry.id === selectedId) || next || bookings.find((entry) => {
    const workout = bookingWorkout(db, entry)
    return workout ? workout.status === 'in_progress' : scheduledBooking(entry)
  }) || bookings[0]
  const index = bookings.findIndex((entry) => entry.id === booking?.id)
  const shift = (direction) => setSelectedId(bookings[(index + direction + count) % count].id)
  const destination = booking && bookingDestination(db, booking, today)
  const plan = booking && bookingPlan(db, booking)
  const workout = booking && bookingWorkout(db, booking)
  const client = booking && roster.get(booking.clientId)
  const title = workout?.title || plan?.name || booking?.type || 'Training session'
  const program = plan && db.programAssignments?.find((assignment) =>
    assignment.clientId === booking.clientId && assignment.data?.schedule?.some((entry) => entry.prescriptionId === plan.id))?.name
  const readiness = client && readinessScore(db, client.id, today)
  const subject = booking && `${client.name} at ${booking.time || 'unscheduled time'}`
  const startSwipe = (event) => {
    if (event.pointerType === 'mouse' || event.target.closest('button, a')) return
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY }
  }
  const endSwipe = (event) => {
    const start = gesture.current
    gesture.current = null
    if (start?.id !== event.pointerId || count < 2) return
    const dx = event.clientX - start.x, dy = event.clientY - start.y
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) shift(dx < 0 ? 1 : -1)
  }
  const browseWithArrows = (event) => {
    if (event.target !== event.currentTarget || count < 2 || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return
    event.preventDefault()
    shift(event.key === 'ArrowRight' ? 1 : -1)
  }
  const updateTilt = (event) => {
    if (event.pointerType !== 'mouse' || !matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)').matches) return
    const deck = event.currentTarget
    const { left, top, width, height } = deck.getBoundingClientRect()
    deck.style.setProperty('--booking-tilt-x', `${(0.5 - (event.clientY - top) / height) * 4}deg`)
    deck.style.setProperty('--booking-tilt-y', `${((event.clientX - left) / width - 0.5) * 4}deg`)
  }
  const resetTilt = (event) => {
    event.currentTarget.style.removeProperty('--booking-tilt-x')
    event.currentTarget.style.removeProperty('--booking-tilt-y')
  }

  return <section className="db-card orbit-today" id="dashboard-schedule" aria-labelledby="orbit-today-title">
    <header className="db-head">
      <h2 id="orbit-today-title">Today’s sessions</h2>
      <Link className="db-link" to="/schedule">View schedule</Link>
    </header>
    {booking ? <>
        <div className="orbit-booking-deck" data-count={Math.min(count, 3)} tabIndex={count > 1 ? 0 : undefined}
          role="group" aria-roledescription="carousel" aria-label="Today’s bookings" aria-live="polite"
          onKeyDown={browseWithArrows} onPointerDown={startSwipe}
          onPointerUp={endSwipe} onPointerCancel={() => { gesture.current = null }}
          onPointerMove={updateTilt} onPointerLeave={resetTilt}>
          <article className="orbit-booking-feature" key={booking.id}>
            <div className="orbit-booking-meta">
              <p className="orbit-booking-time">{booking.time || 'Time not set'}{hasDuration(booking) && ' · ' + durationLabel(booking)}</p>
              <span className="orbit-booking-status">{!workout && booking.id === next?.id ? 'Next scheduled' : bookingWorkoutStatus(booking, workout)}</span>
            </div>
            <div><h3>{title}</h3><p>{client.name}{program && program !== title && ' · ' + program}</p></div>
            <div className="orbit-booking-actions">
              <div className="orbit-booking-client">
                <Avatar name={client.name} size={35} />
                <p>{readiness == null ? 'No readiness score today' : `Client readiness · ${readiness}/100`}</p>
              </div>
              <Link className="btn" to={destination.path} aria-label={`${destination.label} for ${subject}`}>{destination.label}</Link>
            </div>
          </article>
        </div>
        <div className="orbit-booking-tools">
          <Button variant="ghost" aria-haspopup="dialog" aria-label={`Booking details for ${subject}`} onClick={() => onDetails(booking)}>Details</Button>
          {plan && <Button variant="ghost" aria-haspopup="dialog" onClick={() => onPlan(plan)}>View plan</Button>}
        </div>
        {count > 1 && <div className="orbit-booking-controls" role="group" aria-label="Browse bookings">
          <Button variant="ghost" className="orbit-booking-previous" aria-label="Previous booking" onClick={() => shift(-1)}><Icon name="chevron-right" size={14} /><span>Previous</span></Button>
          <div className="orbit-booking-position"><p aria-live="polite">{index + 1} of {count}</p><div className="orbit-carousel-dots">
            {bookings.map((entry) => <button key={entry.id} type="button"
              aria-label={`Show booking for ${roster.get(entry.clientId).name} at ${entry.time || 'unscheduled time'}`}
              aria-current={entry.id === booking.id ? 'true' : undefined} onClick={() => setSelectedId(entry.id)} />)}
          </div></div>
          <Button variant="ghost" aria-label="Next booking" onClick={() => shift(1)}><span>Next</span><Icon name="chevron-right" size={14} /></Button>
        </div>}
    </> : <div className="orbit-booking-feature orbit-booking-empty">
      <span className="orbit-booking-empty-icon" aria-hidden="true"><Icon name="calendar" size={20} /></span>
      <h3>No bookings today.</h3>
      <Button aria-haspopup="dialog" onClick={onBook}>Book session</Button>
    </div>}
  </section>
}
