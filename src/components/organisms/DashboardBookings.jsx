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
  const [direction, setDirection] = useState(0)
  const gesture = useRef(null)
  const count = bookings.length
  const booking = bookings.find((entry) => entry.id === selectedId) || next || bookings.find((entry) => {
    const workout = bookingWorkout(db, entry)
    return workout ? workout.status === 'in_progress' : scheduledBooking(entry)
  }) || bookings[0]
  const index = bookings.findIndex((entry) => entry.id === booking?.id)
  const select = (position, motion = Math.sign(position - index)) => {
    if (position === index) return
    setDirection(motion)
    setSelectedId(bookings[position].id)
  }
  const shift = (offset) => select((index + offset + count) % count, offset)
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
    if (count < 2 || event.button !== 0 || event.target.closest('button, a')) return
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY }
    if (event.isTrusted) event.currentTarget.setPointerCapture(event.pointerId)
  }
  const endSwipe = (event) => {
    const start = gesture.current
    gesture.current = null
    event.currentTarget.removeAttribute('data-dragging')
    event.currentTarget.style.removeProperty('--booking-drag')
    event.currentTarget.style.removeProperty('--booking-rotate')
    if (start?.id !== event.pointerId || count < 2) return
    const dx = event.clientX - start.x, dy = event.clientY - start.y
    if (event.type === 'pointerup' && Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) shift(dx < 0 ? 1 : -1)
  }
  const browseWithArrows = (event) => {
    if (event.target !== event.currentTarget || count < 2 || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return
    event.preventDefault()
    shift(event.key === 'ArrowRight' ? 1 : -1)
  }
  const updateTilt = (event) => {
    const deck = event.currentTarget
    const start = gesture.current
    if (start?.id === event.pointerId) {
      const dx = event.clientX - start.x
      if (Math.abs(dx) > 4 && Math.abs(dx) > Math.abs(event.clientY - start.y)) {
        deck.dataset.dragging = 'true'
        deck.style.setProperty('--booking-drag', `${Math.max(-110, Math.min(110, dx))}px`)
        deck.style.setProperty('--booking-rotate', `${Math.max(-6, Math.min(6, dx * .04))}deg`)
      }
      return
    }
    if (event.pointerType !== 'mouse' || !matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)').matches) return
    const { left, top, width, height } = deck.getBoundingClientRect()
    deck.style.setProperty('--booking-tilt-x', `${(0.5 - (event.clientY - top) / height) * 4}deg`)
    deck.style.setProperty('--booking-tilt-y', `${((event.clientX - left) / width - 0.5) * 4}deg`)
    deck.style.setProperty('--booking-shine-x', `${(event.clientX - left) / width * 100}%`)
    deck.style.setProperty('--booking-shine-y', `${(event.clientY - top) / height * 100}%`)
    deck.dataset.hovering = 'true'
  }
  const resetTilt = (event) => {
    event.currentTarget.style.removeProperty('--booking-tilt-x')
    event.currentTarget.style.removeProperty('--booking-tilt-y')
    event.currentTarget.removeAttribute('data-hovering')
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
          onPointerUp={endSwipe} onPointerCancel={endSwipe} onLostPointerCapture={endSwipe}
          onPointerMove={updateTilt} onPointerLeave={resetTilt}>
          <article className="orbit-booking-feature" key={booking.id} style={{ '--booking-entry': `${direction * 42}px`, '--booking-entry-angle': `${direction * 3}deg` }}>
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
          <Button variant="ghost" aria-haspopup="dialog" aria-label={`Booking details for ${subject}`} onClick={event => onDetails(booking, event.currentTarget)}>Details</Button>
          {plan && <Button variant="ghost" aria-haspopup="dialog" onClick={event => onPlan(plan, event.currentTarget)}>View plan</Button>}
        </div>
        {count > 1 && <div className="orbit-booking-controls" role="group" aria-label="Browse bookings">
          <Button variant="ghost" className="orbit-booking-previous" aria-label="Previous booking" onClick={() => shift(-1)}><Icon name="chevron-right" size={14} /><span>Previous</span></Button>
          <div className="orbit-booking-position"><p aria-live="polite">{index + 1} of {count}</p><div className="orbit-carousel-dots">
            {bookings.map((entry, position) => <button key={entry.id} type="button"
              aria-label={`Show booking for ${roster.get(entry.clientId).name} at ${entry.time || 'unscheduled time'}`}
              aria-current={entry.id === booking.id ? 'true' : undefined} onClick={() => select(position)} />)}
          </div></div>
          <Button variant="ghost" aria-label="Next booking" onClick={() => shift(1)}><span>Next</span><Icon name="chevron-right" size={14} /></Button>
        </div>}
        {count > 1 && <details className="orbit-booking-list">
          <summary>All bookings today ({count})</summary>
          {bookings.map((entry, position) => {
            const person = roster.get(entry.clientId)
            const result = bookingWorkout(db, entry)
            return <button key={entry.id} type="button" aria-current={entry.id === booking.id ? 'true' : undefined} onClick={() => select(position)}>
              <time>{entry.time || 'Time not set'}</time><span><strong>{person.name}</strong><small>{result?.title || bookingPlan(db, entry)?.name || entry.type}</small>
                <small>{bookingWorkoutStatus(entry, result)}</small></span>
              <Icon name="chevron-right" size={15} />
            </button>
          })}
        </details>}
    </> : <div className="orbit-booking-feature orbit-booking-empty">
      <span className="orbit-booking-empty-icon" aria-hidden="true"><Icon name="calendar" size={20} /></span>
      <h3>No bookings today.</h3>
      <Button aria-haspopup="dialog" onClick={onBook}>Book session</Button>
    </div>}
  </section>
}
