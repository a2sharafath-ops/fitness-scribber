import { useCallback, useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import Button from '../components/atoms/Button'
import Icon from '../components/atoms/Icon'
import SegToggle from '../components/molecules/SegToggle'
import ClientWorkoutFlow from '../components/organisms/ClientWorkoutFlow'
import WorkoutPlanner from '../components/organisms/WorkoutPlanner'
import TrainingDayPanel from '../components/organisms/TrainingDayPanel'
import { QuickLogMenu } from '../components/organisms/forms/LogForms'
import { useData } from '../store/DataContext'
import { useModal } from '../store/ModalContext'
import { todayISO, fmtDate, fmtDateRange } from '../lib/dates'
import { trainingDay } from '../lib/trainingDay'
import { bookingWorkout, bookingWorkoutAction, bookingWorkoutStatus, canRunBookingWorkout, trainingBookings } from '../lib/schedule'
import { blankWorkout, buildFromPlan, buildFromPrescription } from '../lib/workout'
import { resolveTrainingMax } from '../lib/program'
import { programPeriod } from '../lib/clientPrograms'

const validDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false
  const parsed = new Date(value)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

function BookingWorkoutSetup({ booking, client, db, prescription, onStart, onClose }) {
  const [source, setSource] = useState(prescription ? 'prescription' : 'blank')
  const [planId, setPlanId] = useState(db.plans[0]?.id || '')
  const label = booking.status === 'Completed' ? 'Log workout' : 'Start workout'
  const start = (event) => {
    event.preventDefault()
    const context = { clientId: client.id, date: booking.date,
      resolveTm: name => resolveTrainingMax(db, client.id, name, booking.date).kg }
    const template = db.plans.find(plan => plan.id === planId)
    if (source === 'library' && !template) return
    const workout = source === 'prescription' ? buildFromPrescription(prescription, context)
      : source === 'library' ? buildFromPlan(template, db.exercises, context)
      : { ...blankWorkout(context), warmup: [], main: [], cooldown: [] }
    onStart({ ...workout, id: `booking:${booking.id}`, bookingId: booking.id })
  }
  return <section id="workout-log" className="card training-booking-setup" aria-labelledby="booking-workout-title">
    <div className="training-runner-head"><span>{client.name} · {fmtDate(booking.date)} · {booking.time}</span>
      <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
    </div>
    <h2 id="booking-workout-title">{label}</h2>
    <p className="muted">Choose a starting plan for this booking. Any plan you copy stays intact.</p>
    <form onSubmit={start}>
      <label>Workout source<select value={source} onChange={event => setSource(event.target.value)}>
        {prescription && <option value="prescription">Copy day’s plan · {prescription.name || 'Prescribed workout'}</option>}
        {!!db.plans.length && <option value="library">Copy a library workout</option>}
        <option value="blank">Start with an empty workout</option>
      </select></label>
      {source === 'library' && <label>Library workout<select value={planId} onChange={event => setPlanId(event.target.value)}>
        {db.plans.map(plan => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
      </select></label>}
      <Button type="submit">{label}</Button>
    </form>
  </section>
}

export default function ClientTrainingPage() {
  const { id } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { db, tz } = useData()
  const { openModal } = useModal()
  const [loggingKey, setLoggingKey] = useState(null)
  const [bookingDraft, setBookingDraft] = useState(null)
  const [historyType, setHistoryType] = useState('workouts')
  const [historyRequest, setHistoryRequest] = useState(0)
  const [selectedProgramId, setSelectedProgramId] = useState('')
  useEffect(() => {
    if (!historyRequest) return
    const heading = document.getElementById('selected-day-title')
    heading?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    heading?.focus({ preventScroll: true })
  }, [historyRequest, searchParams])
  const today = todayISO(tz)
  const requestedDate = searchParams.get('date')
  const selectedDate = validDate(requestedDate) ? requestedDate : today
  const requestedBooking = searchParams.get('booking')
  const runnerKey = JSON.stringify([id, selectedDate, requestedBooking])
  const logging = loggingKey === runnerKey
  const changeLogging = useCallback((open) => setLoggingKey(open ? runnerKey : null), [runnerKey])
  const client = db.clients.find((item) => item.id === id)
  if (!client) return null
  const bookings = trainingBookings(db, id, selectedDate)
  const booking = bookings.find(row => row.id === requestedBooking)
  const linkedWorkout = booking && bookingWorkout(db, booking)
  const wantsRunner = searchParams.get('run') === '1'
  const legacyDay = trainingDay(db, id, selectedDate, today, { unlinkedOnly: true })
  const canRunBooking = booking && canRunBookingWorkout(booking, linkedWorkout, today)
  const starter = bookingDraft?.bookingId === booking?.id ? bookingDraft : null
  const assignedPrograms = (db.programAssignments || []).filter(a => a.clientId === id).map(assignment => {
    const period = programPeriod(assignment)
    const status = !period ? 'Dates unavailable' : today < period.start ? 'Upcoming' : today > period.end ? 'Past' : 'Current'
    return { ...assignment, period, status }
  }).sort((a, b) => {
    const rank = { Current: 0, Upcoming: 1, Past: 2, 'Dates unavailable': 3 }
    return rank[a.status] - rank[b.status] || (a.status === 'Upcoming' ? a.period.start.localeCompare(b.period.start)
      : (b.period?.start || b.data?.start || '').localeCompare(a.period?.start || a.data?.start || ''))
  })
  const selectedProgram = assignedPrograms.find(a => a.id === selectedProgramId) || assignedPrograms[0]
  const plan = db.plans.find((item) => item.id === client.planId)
  const workouts = (db.workouts || []).filter((item) => item.clientId === id && ['completed', 'discarded'].includes(item.status)).sort((a, b) => b.date.localeCompare(a.date))
  const appointments = db.sessions.filter((item) => item.clientId === id && String(item.status).toLowerCase() === 'completed').sort((a, b) => b.date.localeCompare(a.date))
  const showRunner = wantsRunner && (logging || (requestedBooking ? canRunBooking && (linkedWorkout || starter) : legacyDay.canRun))
  const selectDate = (date) => { setLoggingKey(null); setBookingDraft(null); setHistoryRequest(0); setSearchParams({ date }) }
  const closeRunner = () => {
    setLoggingKey(null)
    setBookingDraft(null)
    setSearchParams({ date: selectedDate, ...(booking ? { booking: booking.id } : {}) })
  }
  const reviewHistory = (workout) => {
    setLoggingKey(null)
    setBookingDraft(null)
    setSearchParams({ date: workout.date, workout: workout.id, ...(workout.bookingId ? { booking: workout.bookingId } : {}) })
    setHistoryRequest((count) => count + 1)
  }

  if (wantsRunner && canRunBooking && !linkedWorkout && !starter) return <BookingWorkoutSetup key={booking.id}
    booking={booking} client={client} db={db} prescription={legacyDay.prescription} onStart={setBookingDraft} onClose={closeRunner} />

  if (showRunner) return <section id="workout-log" className="training-session" aria-label={`Workout logging for ${fmtDate(selectedDate)}`}>
    {!logging && <div className="training-runner-head">
      <span>{client.name} · {booking ? `Booking at ${booking.time}` : 'Training'}</span><Button variant="ghost" size="sm" onClick={closeRunner}>Close</Button>
    </div>}
    <ClientWorkoutFlow key={runnerKey} client={client} date={selectedDate} booking={booking} starter={starter} startOnOpen onRunStateChange={changeLogging} onSessionComplete={closeRunner} />
  </section>

  return <>
    <div className="topbar training-topbar"><h1>Training</h1><Button variant="ghost" size="sm" onClick={() => openModal(<QuickLogMenu clientId={id} />)}>＋ Quick log</Button></div>
    <div className="training-workspace-grid">
      <div id="selected-workout" className="training-planner"><WorkoutPlanner client={client} focusDate={selectedDate} onSelectDate={selectDate}>
        <TrainingDayPanel key={JSON.stringify([runnerKey, searchParams.get('workout')])} client={client} date={selectedDate} today={today}
          bookings={bookings} selectedBooking={booking} selectedWorkoutId={searchParams.get('workout')} onSelectDate={selectDate} />
      </WorkoutPlanner></div>
      <div className="training-workspace-side">
        <section className="card training-program" aria-labelledby="training-program-title">
          <div className="training-program-head"><div className="training-program-copy">
            <h2 id="training-program-title">{assignedPrograms.length ? 'Assigned programs' : plan?.name || 'No program assigned'}</h2>
          </div><Link className="btn ghost sm" to={`/workouts?clientId=${encodeURIComponent(id)}`}>Assign from library →</Link></div>
          {assignedPrograms.length > 0 && <>
            <div className="training-program-list"><div className="training-program-assignment">
              <div className="training-program-copy">
                {assignedPrograms.length > 1 ? <>
                  <label className="training-program-copy-label" htmlFor="training-client-program">Client program</label>
                  <span className="orbit-select-wrap">
                    <select id="training-client-program" value={selectedProgram.id} onChange={e => setSelectedProgramId(e.target.value)}>
                      {assignedPrograms.map(a => <option key={a.id} value={a.id}>{a.name} · {a.status}{a.period ? ` · ${fmtDate(a.period.start)}` : ''}</option>)}
                    </select>
                    <Icon name="chevron-down" size={14} aria-hidden="true" />
                  </span>
                </> : <strong>{selectedProgram.name}</strong>}
                <div className="training-program-meta"><span className="training-program-status" data-status={selectedProgram.status}>{selectedProgram.status}</span>
                  {selectedProgram.period && <small>{fmtDateRange(selectedProgram.period.start, selectedProgram.period.end)}</small>}
                </div>
              </div>
              <Link className="btn sm" aria-label={`Edit client program: ${selectedProgram.name}`} to={`/workouts?assignment=${encodeURIComponent(selectedProgram.id)}&clientId=${encodeURIComponent(id)}`}>Edit client program →</Link>
            </div></div>
            <p className="training-program-note">Program edits apply to this client’s copy.</p>
          </>}
        </section>
        <details className="card training-history" open><summary id="training-history-title">Session history</summary>
          <SegToggle options={[[ 'workouts', `Workout logs (${workouts.length})` ], [ 'appointments', `Appointments (${appointments.length})` ]]} value={historyType} onChange={setHistoryType} ariaLabel="History type" />
          <div className="training-history-list" role="region" aria-label="Session history entries" tabIndex={0}>
            {historyType === 'workouts' ? workouts.length ? workouts.map((item) => <button key={item.id} className="training-history-row" onClick={() => reviewHistory(item)}>
              <span><strong>{item.title || 'Workout'}</strong><small>{fmtDate(item.date)} · {item.bookingId
                ? db.sessions.find(row => row.id === item.bookingId)?.time || 'Booked workout'
                : 'Unlinked'} · {item.status === 'discarded' ? 'Discarded · sets retained' : 'Workout log'}</small></span><span>Review workout →</span>
            </button>) : <p className="muted">No completed workout logs yet.</p>
              : appointments.length ? appointments.map((item) => {
                const action = bookingWorkoutAction(db, item, today)
                return <div key={item.id} className="training-history-row static">
                  <span><strong>{item.type || 'Appointment'}</strong><small>{fmtDate(item.date)} · {item.time || 'Time not set'} · {item.dur || '—'} min</small>
                    <small>{bookingWorkoutStatus(item, bookingWorkout(db, item))}</small></span>
                  {action && <Link className="overview-text-link" to={action.path} aria-label={`${action.label} for ${fmtDate(item.date)} at ${item.time}`}>{action.label}</Link>}
                </div>
              }) : <p className="muted">No completed appointments yet.</p>}
          </div>
        </details>
      </div>
    </div>
  </>
}
