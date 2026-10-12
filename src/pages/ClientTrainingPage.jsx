import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import Button from '../components/atoms/Button'
import SegToggle from '../components/molecules/SegToggle'
import ClientWorkoutFlow from '../components/organisms/ClientWorkoutFlow'
import WorkoutPlanner from '../components/organisms/WorkoutPlanner'
import TrainingDayPanel from '../components/organisms/TrainingDayPanel'
import { QuickLogMenu } from '../components/organisms/forms/LogForms'
import { useData } from '../store/DataContext'
import { useModal } from '../store/ModalContext'
import { todayISO, fmtDate } from '../lib/dates'
import { trainingDay } from '../lib/trainingDay'

const validDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false
  const parsed = new Date(value)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

export default function ClientTrainingPage() {
  const { id } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { db, tz } = useData()
  const { openModal } = useModal()
  const [logging, setLogging] = useState(false)
  const [historyType, setHistoryType] = useState('workouts')
  const [historyRequest, setHistoryRequest] = useState(0)
  useEffect(() => {
    if (!historyRequest) return
    const heading = document.getElementById('selected-day-title')
    heading?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    heading?.focus({ preventScroll: true })
  }, [historyRequest, searchParams])
  const client = db.clients.find((item) => item.id === id)
  if (!client) return null
  const today = todayISO(tz)
  const requestedDate = searchParams.get('date')
  const selectedDate = validDate(requestedDate) ? requestedDate : today
  const assignedPrograms = (db.programAssignments || []).filter(a => a.clientId === id).sort((a,b) => b.data.start.localeCompare(a.data.start))
  const plan = db.plans.find((item) => item.id === client.planId)
  const workouts = (db.workouts || []).filter((item) => item.clientId === id && item.status === 'completed').sort((a, b) => b.date.localeCompare(a.date))
  const appointments = db.sessions.filter((item) => item.clientId === id && String(item.status).toLowerCase() === 'completed').sort((a, b) => b.date.localeCompare(a.date))
  const showRunner = searchParams.get('run') === '1' && trainingDay(db, id, selectedDate, today).canRun
  const selectDate = (date) => { setLogging(false); setHistoryRequest(0); setSearchParams({ date }) }
  const closeRunner = () => { setLogging(false); setSearchParams({ date: selectedDate }) }
  const reviewHistory = (workout) => {
    setLogging(false)
    setSearchParams({ date: workout.date, workout: workout.id })
    setHistoryRequest((count) => count + 1)
  }

  return <>
    <div className="topbar training-topbar"><h1>Training</h1>{!logging && <Button variant="ghost" size="sm" onClick={() => openModal(<QuickLogMenu clientId={id} />)}>＋ Quick log</Button>}</div>
    <section className="card training-program" aria-labelledby="training-program-title"><div className="training-program-copy">
      <span className="overview-eyebrow">Programs</span><h2 id="training-program-title">{assignedPrograms.length ? 'Assigned programs' : plan?.name || 'No program assigned'}</h2>
      {assignedPrograms.map(a => <p key={a.id}><Link to={`/workouts?assignment=${a.id}&clientId=${id}`}>{a.name} →</Link><small> · {fmtDate(a.data.start)} · {a.data.weeks} weeks</small></p>)}
    </div>{!logging && <Link className="btn ghost sm" to={`/workouts?clientId=${id}`}>Program library →</Link>}</section>
    {showRunner && <section id="workout-log" className="training-session" aria-label={`Workout logging for ${fmtDate(selectedDate)}`}>
      <div className="training-runner-head"><span>Logging · {fmtDate(selectedDate)}</span>{!logging && <Button variant="ghost" size="sm" onClick={closeRunner}>Close</Button>}</div>
      <ClientWorkoutFlow key={`${id}:${selectedDate}`} client={client} date={selectedDate} startOnOpen onRunStateChange={setLogging} onSessionComplete={closeRunner} />
      {logging && <p className="training-save-note">Save &amp; exit before opening the calendar.</p>}
    </section>}
    {!showRunner && <>
      <div id="selected-workout" className="training-planner"><WorkoutPlanner client={client} focusDate={selectedDate} onSelectDate={selectDate}>
        <TrainingDayPanel key={`${id}:${selectedDate}:${searchParams.get('workout') || ''}`} client={client} date={selectedDate} today={today} selectedWorkoutId={searchParams.get('workout')} onSelectDate={selectDate} />
      </WorkoutPlanner></div>
      <details className="card training-history" open={searchParams.get('history') === 'workouts' || undefined}><summary id="training-history-title">Session history</summary>
        <SegToggle options={[[ 'workouts', `Workout logs (${workouts.length})` ], [ 'appointments', `Appointments (${appointments.length})` ]]} value={historyType} onChange={setHistoryType} ariaLabel="History type" />
        <div className="training-history-list" role="region" aria-label="Session history entries" tabIndex={0}>
          {historyType === 'workouts' ? workouts.length ? workouts.map((item) => <button key={item.id} className="training-history-row" onClick={() => reviewHistory(item)}>
            <span><strong>{item.title || 'Workout'}</strong><small>{fmtDate(item.date)} · Workout log</small></span><span>Review day →</span>
          </button>) : <p className="muted">No completed workout logs yet.</p>
            : appointments.length ? appointments.map((item) => <div key={item.id} className="training-history-row static">
              <span><strong>{item.type || 'Appointment'}</strong><small>{fmtDate(item.date)} · {item.time || 'Time not set'} · {item.dur || '—'} min</small></span><span>Completed</span>
            </div>) : <p className="muted">No completed appointments yet.</p>}
        </div>
      </details>
    </>}
  </>
}
