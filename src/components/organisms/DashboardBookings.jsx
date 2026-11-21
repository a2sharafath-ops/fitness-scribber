import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../atoms/Icon'
import Avatar from '../atoms/Avatar'
import { bookingPlan, bookingWorkout, bookingWorkoutAction, bookingWorkoutStatus, durationLabel, sessionPath, trainingBooking } from '../../lib/schedule'

function bookingDestination(db, booking, today) {
  const path = sessionPath(booking)
  if (!trainingBooking(booking)) return { path, label: 'Open booking' }
  return bookingWorkoutAction(db, booking, today) || { path, label: 'Open training' }
}

export default function DashboardBookings({ db, bookings, roster, upcoming, next, today, onDetails, onPlan, onBook }) {
  const [selectedId, setSelectedId] = useState(null)
  const gesture = useRef(null)
  const booking = upcoming.find((entry) => entry.id === selectedId) || next || upcoming[0]
  const index = upcoming.findIndex((entry) => entry.id === booking?.id)
  const shift = (direction) => setSelectedId(upcoming[(index + direction + upcoming.length) % upcoming.length]?.id)
  const destination = booking && bookingDestination(db, booking, today)
  const plan = booking && bookingPlan(db, booking)
  const workout = booking && bookingWorkout(db, booking)
  const startSwipe = (event) => {
    if (event.pointerType === 'mouse' || event.target.closest('button, a')) return
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY }
  }
  const endSwipe = (event) => {
    const start = gesture.current
    gesture.current = null
    if (start?.id !== event.pointerId || upcoming.length < 2) return
    const dx = event.clientX - start.x, dy = event.clientY - start.y
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) shift(dx < 0 ? 1 : -1)
  }
  const browseWithArrows = (event) => {
    if (event.target !== event.currentTarget || upcoming.length < 2 || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return
    event.preventDefault()
    shift(event.key === 'ArrowRight' ? 1 : -1)
  }

  return <>
    {booking && <section className="db-card orbit-up-next" aria-labelledby="orbit-up-next-title">
      <header className="db-head"><h2 id="orbit-up-next-title">Up next</h2><Link className="db-link" to="/schedule">View schedule</Link></header>
        <div className={'orbit-booking-deck' + (upcoming.length > 1 ? ' has-stack' : '')} tabIndex={upcoming.length > 1 ? 0 : undefined}
          role="group" aria-label="Today’s booking carousel" onKeyDown={browseWithArrows} onPointerDown={startSwipe}
          onPointerUp={endSwipe} onPointerCancel={() => { gesture.current = null }}>
          <article className="orbit-booking-feature" key={booking.id} aria-live="polite">
            <p className="orbit-booking-time">{booking.time || 'Time not set'}{booking.dur ? ' · ' + durationLabel(booking) : ''}</p>
            <div><h3>{workout?.title || plan?.name || booking.type || 'Training session'}</h3><p>{roster.get(booking.clientId)?.name}</p></div>
            <div className="orbit-booking-actions"><Avatar name={roster.get(booking.clientId)?.name || 'Client'} /><Link className="btn" to={destination.path}>{destination.label}</Link></div>
          </article>
        </div>
        {plan && <div className="orbit-booking-plan"><button type="button" className="btn ghost sm" onClick={() => onPlan(plan)}>View plan</button></div>}
        {upcoming.length > 1 && <div className="orbit-booking-controls" aria-label="Browse bookings">
          <button type="button" className="orbit-icon-button" aria-label="Previous booking" onClick={() => shift(-1)}><span aria-hidden="true">‹</span></button>
          <div><p>{index + 1} of {upcoming.length}</p><div className="orbit-carousel-dots">
            {upcoming.map((entry, i) => <button key={entry.id} type="button" aria-label={`View booking ${i + 1}`} aria-current={entry.id === booking.id ? 'true' : undefined} onClick={() => setSelectedId(entry.id)} />)}
          </div></div>
          <button type="button" className="orbit-icon-button" aria-label="Next booking" onClick={() => shift(1)}><span aria-hidden="true">›</span></button>
        </div>}
    </section>}
    <section className="db-card orbit-today" id="dashboard-schedule">
      <header className="db-head"><h2>Today’s sessions</h2>{bookings.length > 0
        ? <span className="db-count">{bookings.length} booked</span>
        : <Link className="db-link" to="/schedule">View schedule</Link>}</header>
      {bookings.length ? <div className="orbit-today-list">{bookings.map((entry) => {
        const client = roster.get(entry.clientId)
        const action = bookingDestination(db, entry, today)
        const status = bookingWorkoutStatus(entry, bookingWorkout(db, entry))
        return <article className="orbit-today-booking" key={entry.id}>
          <Avatar name={client.name} />
          <div className="db-info"><strong>{client.name}</strong><small>{entry.time || 'Time not set'} · {entry.type}</small><small>{status}</small></div>
          <Link className="orbit-icon-button" to={action.path} aria-label={`${action.label} for ${client.name} at ${entry.time}`} title={action.label}><Icon name="chevron-right" size={17} /></Link>
          <button className="db-link" type="button" aria-label={`Booking details for ${client.name} at ${entry.time}`} onClick={() => onDetails(entry)}>Details</button>
        </article>
      })}</div> : <div className="db-inline-empty"><p>No bookings today.</p><button type="button" className="db-link" onClick={onBook}>Book session →</button></div>}
    </section>
  </>
}
