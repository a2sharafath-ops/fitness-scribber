import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../atoms/Icon'
import Avatar from '../atoms/Avatar'
import { bookingPlan, durationLabel, sessionPath, trainingBooking } from '../../lib/schedule'
import { trainingDay } from '../../lib/trainingDay'

function bookingDestination(db, booking, today) {
  const path = sessionPath(booking)
  if (!trainingBooking(booking)) return { path, label: 'Open booking' }
  const day = trainingDay(db, booking.clientId, booking.date, today)
  if (day.canRun && bookingPlan(db, booking)) {
    return { path: path + '&run=1#workout-log', label: day.pending?.status === 'in_progress' ? 'Resume workout' : 'Start workout' }
  }
  return { path, label: day.completed.length ? 'Review workout' : 'Open training' }
}

export default function DashboardBookings({ db, bookings, roster, next, today, onDetails, onPlan }) {
  const [selectedId, setSelectedId] = useState(null)
  const gesture = useRef(null)
  const upcoming = bookings.filter((booking) => ['Confirmed', 'Pending'].includes(booking.status))
  const booking = upcoming.find((entry) => entry.id === selectedId) || next || upcoming[0]
  const index = upcoming.findIndex((entry) => entry.id === booking?.id)
  const shift = (direction) => setSelectedId(upcoming[(index + direction + upcoming.length) % upcoming.length]?.id)
  const destination = booking && bookingDestination(db, booking, today)
  const plan = booking && bookingPlan(db, booking)
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

  return <div className="orbit-dashboard-column">
    <section className="db-card orbit-up-next" aria-labelledby="orbit-up-next-title">
      <header className="db-head"><h2 id="orbit-up-next-title">Up next</h2><Link className="db-link" to="/schedule">View schedule</Link></header>
      {booking ? <>
        <div className={'orbit-booking-deck' + (upcoming.length > 1 ? ' has-stack' : '')} tabIndex={upcoming.length > 1 ? 0 : undefined}
          role="group" aria-label="Today’s booking carousel" onKeyDown={browseWithArrows} onPointerDown={startSwipe}
          onPointerUp={endSwipe} onPointerCancel={() => { gesture.current = null }}>
          <article className="orbit-booking-feature" key={booking.id} aria-live="polite">
            <p className="orbit-booking-time">{booking.time || 'Time not set'}{booking.dur ? ' · ' + durationLabel(booking) : ''}</p>
            <div><h3>{plan?.name || booking.type || 'Training session'}</h3><p>{roster.get(booking.clientId)?.name}</p></div>
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
      </> : <p className="db-empty">No upcoming sessions today.</p>}
    </section>
    <section className="db-card orbit-today" id="dashboard-schedule">
      <header className="db-head"><h2>Today’s sessions</h2><span className="db-count">{bookings.length} booked</span></header>
      {bookings.length ? <div className="orbit-today-list">{bookings.map((entry) => {
        const client = roster.get(entry.clientId)
        const action = bookingDestination(db, entry, today)
        return <article className="orbit-today-booking" key={entry.id}>
          <Avatar name={client.name} />
          <div className="db-info"><strong>{client.name}</strong><small>{entry.time || 'Time not set'} · {entry.type}{entry.status === 'Pending' ? ' · Scheduled' : ' · ' + entry.status}</small></div>
          <Link className="orbit-icon-button" to={action.path} aria-label={`${action.label} for ${client.name} at ${entry.time}`} title={action.label}><Icon name="chevron-right" size={17} /></Link>
          <button className="db-link" type="button" aria-label={`Booking details for ${client.name} at ${entry.time}`} onClick={() => onDetails(entry)}>Details</button>
        </article>
      })}</div> : <p className="db-empty">No bookings today.</p>}
    </section>
  </div>
}
