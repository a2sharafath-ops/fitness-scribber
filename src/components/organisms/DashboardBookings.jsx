import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Avatar from '../atoms/Avatar'
import Button from '../atoms/Button'
import Icon from '../atoms/Icon'
import { bookingSlide } from '../../lib/bookingPresentation'
import { bookingWorkout, durationLabel, hasDuration, scheduledBooking } from '../../lib/schedule'

function BookingSlide({ slide, active, direction, cardRef }) {
  const { booking, client, title, program, subject, featuredStatus, destination, readiness } = slide
  return <article className={`orbit-booking-card ${active ? 'orbit-booking-feature' : 'orbit-booking-measure'}`}
    ref={active ? cardRef : undefined} inert={!active} aria-hidden={active ? undefined : true}
    style={active ? { '--booking-entry': `${direction * 55}px`, '--booking-entry-angle': `${direction * 3}deg` } : undefined}>
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

function BookingList({ slides, index, onChoose }) {
  const [expanded, setExpanded] = useState(false)
  const count = slides.length
  const previewSize = 3
  const showToggle = count > previewSize
  const first = expanded || !showToggle ? 0 : Math.min(Math.max(0, index - 1), count - previewSize)
  const end = expanded ? count : first + previewSize

  return <section className="db-card orbit-booking-list" aria-labelledby="orbit-booking-list-title">
    <header>
      <h2 id="orbit-booking-list-title">Today’s sessions</h2>
      {showToggle ? <button className="orbit-booking-list-toggle" type="button"
        aria-label={expanded ? 'Show fewer bookings' : `Show all ${count} bookings`}
        aria-controls="orbit-booking-rows" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
        {expanded ? 'Show fewer' : `Show all ${count}`} <Icon name="chevron-down" size={14} />
      </button> : <span className="orbit-booking-list-count">{count} {count === 1 ? 'booking' : 'bookings'}</span>}
    </header>
    <ul id="orbit-booking-rows">
      {slides.slice(first, end).map(({ booking, client, title, status, state, subject, destination }, offset) => {
        const active = index === first + offset
        const [primaryStatus, statusDetail] = status.split(' · ')
        const actionLabel = destination.label.startsWith('Open ') ? 'Open' : destination.label.replace(/ workout$/, '')
        return <li key={booking.id} className="orbit-booking-entry">
          <button className="orbit-booking-row" type="button" aria-current={active ? 'true' : undefined}
            onClick={() => onChoose(first + offset)}>
            <Avatar name={client.name} size={32} />
            <span className="orbit-booking-row-copy">
              <strong>{client.name}</strong>
              <small>{booking.time && <><time dateTime={booking.time}>{booking.time}</time> · </>}{title}</small>
              <span className="orbit-booking-row-status">
                <span data-state={state}>{primaryStatus}</span>
                {statusDetail && <small>{statusDetail}</small>}
              </span>
            </span>
            <Icon name={state === 'completed' ? 'check' : 'chevron-right'} size={15} />
          </button>
          <Link className="btn ghost orbit-booking-row-action" to={destination.path}
            aria-label={`${destination.label} for ${subject}`}>{actionLabel}</Link>
        </li>
      })}
    </ul>
  </section>
}

function resetTilt(deck) {
  if (!deck) return
  delete deck.dataset.hovering
  for (const property of ['tilt-x', 'tilt-y', 'shine-x', 'shine-y']) {
    deck.style.removeProperty(`--booking-${property}`)
  }
}

export default function DashboardBookings({ db, bookings, roster, next, today, reducedMotion, onDetails, onPlan, onBook }) {
  const [selectedId, setSelectedId] = useState(null)
  const [direction, setDirection] = useState(0)
  const cardRef = useRef(null)
  const deckRef = useRef(null)
  const departure = useRef(null)
  const gesture = useRef(null)
  const snapTimeout = useRef(null)
  useEffect(() => {
    const onBlur = () => resetTilt(deckRef.current)
    window.addEventListener('blur', onBlur)
    return () => window.removeEventListener('blur', onBlur)
  }, [])
  useEffect(() => () => {
    clearTimeout(snapTimeout.current)
    const animation = departure.current
    departure.current = null
    animation?.cancel()
  }, [])
  useEffect(() => {
    if (!reducedMotion) return
    resetTilt(deckRef.current)
    departure.current?.finish()
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
  const showFromList = (position) => {
    if (departure.current) return
    select(position)
    deckRef.current?.focus({ preventScroll: true })
    deckRef.current?.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: 'center' })
  }
  const startSwipe = (event) => {
    const deck = event.currentTarget
    resetTilt(deck)
    if (count < 2 || gesture.current || departure.current || event.button !== 0 || event.target.closest('button, a')) return
    clearTimeout(snapTimeout.current)
    delete deck.dataset.snapping
    gesture.current = {
      id: event.pointerId, x: event.clientX, y: event.clientY,
      lastX: event.clientX, lastTime: event.timeStamp, velocity: 0,
    }
    if (event.isTrusted) deck.setPointerCapture(event.pointerId)
  }
  const endSwipe = (event) => {
    const start = gesture.current
    if (start?.id !== event.pointerId) return
    gesture.current = null
    const deck = event.currentTarget
    const dx = event.clientX - start.x
    const distance = Math.abs(dx)
    const horizontal = distance > Math.abs(event.clientY - start.y)
    const flick = distance > 25 && Math.abs(start.velocity) > .45
    const commit = count > 1 && event.type === 'pointerup' && horizontal && (distance > 60 || flick)
    if (commit) shift(dx < 0 ? 1 : -1)
    if (!commit && !reducedMotion && deck.hasAttribute('data-dragging')) {
      deck.dataset.snapping = 'true'
      snapTimeout.current = setTimeout(() => { delete deck.dataset.snapping }, 450)
    }
    delete deck.dataset.dragging
    deck.style.removeProperty('--booking-drag')
    deck.style.removeProperty('--booking-drag-y')
    deck.style.removeProperty('--booking-rotate')
  }
  const browseWithArrows = (event) => {
    if (event.target !== event.currentTarget || count < 2 || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return
    event.preventDefault()
    shift(event.key === 'ArrowRight' ? 1 : -1)
  }
  const movePointer = (event) => {
    if (departure.current) return
    const deck = event.currentTarget
    const start = gesture.current
    if (start?.id === event.pointerId) {
      const dx = event.clientX - start.x
      start.velocity = (event.clientX - start.lastX) / Math.max(1, event.timeStamp - start.lastTime)
      start.lastX = event.clientX
      start.lastTime = event.timeStamp
      if (reducedMotion) return
      const dragging = Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(event.clientY - start.y)
      deck.toggleAttribute('data-dragging', dragging)
      const offset = dragging ? dx : 0
      deck.style.setProperty('--booking-drag-y', `${dragging && event.pointerType === 'mouse' ? Math.max(-20, Math.min(20, (event.clientY - start.y) * .25)) : 0}px`)
      deck.style.setProperty('--booking-drag', `${Math.max(-135, Math.min(135, offset))}px`)
      deck.style.setProperty('--booking-rotate', `${Math.max(-8, Math.min(8, offset * .045))}deg`)
      return
    }
    if (start || reducedMotion || event.pointerType !== 'mouse' || !matchMedia('(hover: hover) and (pointer: fine)').matches) return
    const { left, top, width, height } = deck.getBoundingClientRect()
    const padding = parseFloat(getComputedStyle(deck).paddingTop)
    const x = Math.max(0, Math.min(1, (event.clientX - left) / width))
    const y = Math.max(0, Math.min(1, (event.clientY - top - padding) / (height - padding)))
    deck.style.setProperty('--booking-tilt-x', `${((.5 - y) * 6).toFixed(2)}deg`)
    deck.style.setProperty('--booking-tilt-y', `${((x - .5) * 8).toFixed(2)}deg`)
    deck.style.setProperty('--booking-shine-x', `${(x * 100).toFixed(1)}%`)
    deck.style.setProperty('--booking-shine-y', `${(y * 100).toFixed(1)}%`)
    deck.dataset.hovering = 'true'
  }

  return <><section className="db-card orbit-today" id="dashboard-schedule" aria-labelledby="orbit-today-title">
    <header className="db-head">
      <h2 id="orbit-today-title">{count ? 'Up next' : 'Today’s sessions'}</h2>
      <Link className="db-link" to="/schedule">View schedule</Link>
    </header>
    {booking ? <>
        <div ref={deckRef} className="orbit-booking-deck" data-count={Math.min(count, 3)} tabIndex={count > 1 ? 0 : undefined}
          role="group" aria-roledescription="carousel" aria-label="Today’s bookings" aria-live="polite"
          onKeyDown={browseWithArrows} onPointerDown={startSwipe}
          onPointerUp={endSwipe} onPointerCancel={endSwipe} onLostPointerCapture={endSwipe}
          onPointerMove={movePointer} onPointerLeave={event => resetTilt(event.currentTarget)}>
          {slides.map(slide => <BookingSlide key={slide.booking.id} slide={slide} active={slide === selected} direction={direction} cardRef={cardRef} />)}
        </div>
        <div className="orbit-booking-tools">
          <Button variant="ghost" aria-haspopup="dialog" aria-label={`Booking details for ${selected.subject}`} onClick={event => onDetails(booking, event.currentTarget)}>Details</Button>
          {(selected.originalWorkout || selected.plan) && <Button variant="ghost" aria-haspopup="dialog" onClick={event => onPlan(selected, event.currentTarget)}>View plan</Button>}
        </div>
        {count > 1 && <div className="orbit-booking-controls" role="group" aria-label="Browse bookings">
          <Button variant="ghost" className="orbit-booking-previous" aria-label="Previous booking" onClick={() => shift(-1)}><Icon name="chevron-right" size={14} /><span>Previous</span></Button>
          <div className="orbit-booking-position"><p aria-live="polite">{index + 1} of {count}</p>
            {count <= 5 && <div className="orbit-carousel-dots">
              {slides.map(({ booking: entry, subject }, position) => <button key={entry.id} type="button"
                aria-label={`Show booking for ${subject}`} aria-current={entry.id === booking.id ? 'true' : undefined}
                onClick={() => select(position)} />)}
            </div>}
          </div>
          <Button variant="ghost" aria-label="Next booking" onClick={() => shift(1)}><span>Next</span><Icon name="chevron-right" size={14} /></Button>
        </div>}
    </> : <div className="orbit-booking-card orbit-booking-feature orbit-booking-empty">
      <span className="orbit-booking-empty-icon" aria-hidden="true"><Icon name="calendar" size={20} /></span>
      <h3>No bookings today.</h3>
      <Button aria-haspopup="dialog" onClick={onBook}>Book session</Button>
    </div>}
  </section>
    {count > 0 && <BookingList slides={slides} index={index} onChoose={showFromList} />}
  </>
}
