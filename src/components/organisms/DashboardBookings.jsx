import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Avatar from '../atoms/Avatar'
import Button from '../atoms/Button'
import Icon from '../atoms/Icon'
import { readinessScore } from '../../lib/calc'
import { isSession } from '../../lib/planner'
import { bookingDayPlan, bookingWorkout, bookingWorkoutAction, bookingWorkoutStatus, durationLabel, hasDuration, scheduledBooking, sessionPath, trainingBooking } from '../../lib/schedule'

function bookingDestination(db, booking, today) {
  const path = sessionPath(booking)
  if (!trainingBooking(booking)) {
    const label = { Assessment: 'Open assessments', 'Check-in': 'Open check-ins' }[booking.type] || 'Open client'
    return { path, label }
  }
  return bookingWorkoutAction(db, booking, today) || { path, label: 'Open training' }
}

function bookingSlide(db, booking, client, today, next) {
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
    subject: `${client.name} at ${booking.time || 'unscheduled time'}`,
    featuredStatus: !workout && booking.id === next?.id ? 'Next scheduled' : status,
    destination: bookingDestination(db, booking, today),
    readiness: readinessScore(db, client.id, today),
  }
}

function BookingSlide({ slide, active, direction, cardRef }) {
  const { booking, client, title, program, subject, featuredStatus, destination, readiness } = slide
  return <article className={`orbit-booking-card ${active ? 'orbit-booking-feature' : 'orbit-booking-measure'}`}
    ref={active ? cardRef : undefined} inert={!active} aria-hidden={active ? undefined : true}
    style={active ? { '--booking-entry': `${direction * 42}px`, '--booking-entry-angle': `${direction * 3}deg` } : undefined}>
    <div className="orbit-booking-meta">
      <p className="orbit-booking-time">{booking.time || 'Time not set'}{hasDuration(booking) && ' · ' + durationLabel(booking)}</p>
      <span className="orbit-booking-status">{featuredStatus}</span>
    </div>
    <div><h3>{title}</h3><p>{client.name}{program && program !== title && ' · ' + program}</p></div>
    <div className="orbit-booking-actions">
      <div className="orbit-booking-client">
        <Avatar name={client.name} size={35} />
        <p>{readiness == null ? 'No readiness score today' : `Client readiness · ${readiness}/100`}</p>
      </div>
      {active ? <Link className="btn" to={destination.path} aria-label={`${destination.label} for ${subject}`}>{destination.label}</Link>
        : <span className="btn">{destination.label}</span>}
    </div>
  </article>
}

export default function DashboardBookings({ db, bookings, roster, next, today, reducedMotion, onDetails, onPlan, onBook }) {
  const [selectedId, setSelectedId] = useState(null)
  const [direction, setDirection] = useState(0)
  const cardRef = useRef(null)
  const departure = useRef(null)
  const gesture = useRef(null)
  useEffect(() => () => {
    const animation = departure.current
    departure.current = null
    animation?.cancel()
  }, [])
  useEffect(() => {
    if (reducedMotion) departure.current?.finish()
  }, [reducedMotion])
  const count = bookings.length
  const booking = bookings.find((entry) => entry.id === selectedId) || next || bookings.find((entry) => {
    const workout = bookingWorkout(db, entry)
    return workout ? workout.status === 'in_progress' : scheduledBooking(entry)
  }) || bookings[0]
  const index = bookings.findIndex((entry) => entry.id === booking?.id)
  const slides = bookings.map(entry => bookingSlide(db, entry, roster.get(entry.clientId), today, next))
  const selected = slides[index]
  const select = (position, motion = Math.sign(position - index)) => {
    if (position === index || !bookings[position] || departure.current) return
    const id = bookings[position].id
    const card = cardRef.current
    const show = () => {
      if (card?.contains(document.activeElement)) card.parentElement?.focus({ preventScroll: true })
      setDirection(motion)
      setSelectedId(id)
    }
    if (reducedMotion || !card?.animate) {
      show()
      return
    }
    const { transform, opacity } = getComputedStyle(card)
    const animation = card.animate([
      { transform, opacity },
      { transform: `translateX(${-motion * 110}px) rotate(${-motion * 7}deg) scale(.97)`, opacity: 0 },
    ], { duration: 165, easing: 'cubic-bezier(.4,0,.8,.3)', fill: 'forwards' })
    departure.current = animation
    card.dataset.leaving = 'true'
    const finish = () => {
      if (departure.current !== animation) return
      departure.current = null
      delete card.dataset.leaving
      animation.cancel()
      show()
    }
    animation.finished.then(finish, finish)
  }
  const shift = (offset) => select((index + offset + count) % count, offset)
  const startSwipe = (event) => {
    if (count < 2 || gesture.current || departure.current || event.button !== 0 || event.target.closest('button, a')) return
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY }
    if (event.isTrusted) event.currentTarget.setPointerCapture(event.pointerId)
  }
  const endSwipe = (event) => {
    const start = gesture.current
    if (start?.id !== event.pointerId) return
    gesture.current = null
    const dx = event.clientX - start.x, dy = event.clientY - start.y
    if (count > 1 && event.type === 'pointerup' && Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) shift(dx < 0 ? 1 : -1)
    event.currentTarget.removeAttribute('data-dragging')
    event.currentTarget.style.removeProperty('--booking-drag')
    event.currentTarget.style.removeProperty('--booking-rotate')
  }
  const browseWithArrows = (event) => {
    if (event.target !== event.currentTarget || count < 2 || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return
    event.preventDefault()
    shift(event.key === 'ArrowRight' ? 1 : -1)
  }
  const updateTilt = (event) => {
    if (departure.current || reducedMotion) return
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
          {slides.map(slide => <BookingSlide key={slide.booking.id} slide={slide} active={slide === selected} direction={direction} cardRef={cardRef} />)}
        </div>
        <div className="orbit-booking-tools">
          <Button variant="ghost" aria-haspopup="dialog" aria-label={`Booking details for ${selected.subject}`} onClick={event => onDetails(booking, event.currentTarget)}>Details</Button>
          {(selected.originalWorkout || selected.plan) && <Button variant="ghost" aria-haspopup="dialog" onClick={event => onPlan(selected, event.currentTarget)}>View plan</Button>}
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
          {slides.map(({ booking: entry, client, title, status }, position) => (
            <button key={entry.id} type="button" aria-current={entry.id === booking.id ? 'true' : undefined} onClick={() => select(position)}>
              <time>{entry.time || 'Time not set'}</time><span><strong>{client.name}</strong><small>{title}</small><small>{status}</small></span>
              <Icon name="chevron-right" size={15} />
            </button>
          ))}
        </details>}
    </> : <div className="orbit-booking-card orbit-booking-feature orbit-booking-empty">
      <span className="orbit-booking-empty-icon" aria-hidden="true"><Icon name="calendar" size={20} /></span>
      <h3>No bookings today.</h3>
      <Button aria-haspopup="dialog" onClick={onBook}>Book session</Button>
    </div>}
  </section>
}
