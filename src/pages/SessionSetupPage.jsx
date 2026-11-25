import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import './SessionSetupPage.css'
import Icon from '../components/atoms/Icon'
import { ClientForm } from '../components/organisms/forms/ClientForms'
import SessionForm from '../components/organisms/forms/SessionForm'
import { bookingSlide } from '../lib/bookingPresentation'
import { dashboardBookings, dashboardClock } from '../lib/dashboard'
import { fmtDay } from '../lib/dates'
import { durationLabel, hasDuration } from '../lib/schedule'
import { useData } from '../store/DataContext'
import { useModal } from '../store/ModalContext'

export default function SessionSetupPage() {
  const { db, tz } = useData()
  const { openModal } = useModal()
  const [params, setParams] = useSearchParams()
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const refresh = () => setNow(new Date())
    const timer = setInterval(refresh, 60000)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])
  const clock = dashboardClock(now, tz)
  const { bookings, roster, next } = dashboardBookings(db, clock)
  const booking = bookings.find(item => item.id === params.get('booking')) || next || bookings[0]
  const slide = booking && bookingSlide(db, booking, roster.get(booking.clientId), clock.today, next)
  const book = event => openModal(db.clients.length ? <SessionForm date={clock.today} /> : <ClientForm />, false, event.currentTarget)

  return <section className="session-setup" aria-labelledby="setup-title">
    <header>
      <h1 id="setup-title"><span className="setup-mark" aria-hidden="true" />Orbit Trainer</h1>
      <p>{fmtDay(clock.today)} · {bookings.length} {bookings.length === 1 ? 'booking' : 'bookings'} today</p>
    </header>
    {slide ? <>
      <div className="setup-panel">
        <label className="setup-picker">
          <Icon name="search" size={19} />
          <select aria-label="Select a booking" value={booking.id}
            onChange={event => setParams({ booking: event.target.value }, { replace: true })}>
            {bookings.map(item => <option value={item.id} key={item.id}>{item.time || 'Time not set'} · {roster.get(item.clientId).name}</option>)}
          </select>
          <Icon name="chevron-down" size={16} />
        </label>
        <div className="setup-meta">
          <span><Icon name="clock" size={16} />{booking.time || 'Time not set'}</span>
          {hasDuration(booking) && <span><Icon name="timer" size={16} />{durationLabel(booking)}</span>}
          <span><Icon name="activity" size={16} />{slide.status}</span>
        </div>
      </div>
      <div className="setup-action" aria-live="polite">
        <h2>{slide.title}</h2>
        <p>{slide.client.name}</p>
        <Link className="setup-launch" to={slide.destination.path} aria-label={slide.destination.label + ' for ' + slide.subject}>
          <span><Icon name={['Start workout', 'Resume workout'].includes(slide.destination.label) ? 'fitness-play' : 'arrow-right'} size={24} /></span>{slide.destination.label}
        </Link>
      </div>
    </> : <div className="setup-panel setup-empty"><Icon name="calendar" size={24} /><h2>No bookings today</h2></div>}
    <footer>
      <button type="button" className="btn ghost" onClick={book}>{db.clients.length ? 'Book session' : 'Add client'}</button>
      <Link className="setup-schedule" to="/schedule">View schedule <Icon name="arrow-right" size={16} /></Link>
    </footer>
  </section>
}
