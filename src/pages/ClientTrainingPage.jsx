import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import Button from '../components/atoms/Button'
import ClientWorkoutFlow from '../components/organisms/ClientWorkoutFlow'
import WorkoutPlanner from '../components/organisms/WorkoutPlanner'
import WorkoutBuilderModal from '../components/organisms/program/WorkoutBuilderModal'
import AICoach from '../components/organisms/AICoach'
import { QuickLogMenu } from '../components/organisms/forms/LogForms'
import { useData } from '../store/DataContext'
import { useModal } from '../store/ModalContext'
import { todayISO, fmtDate } from '../lib/dates'

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
  const client = db.clients.find((item) => item.id === id)
  if (!client) return null

  const today = todayISO(tz)
  const requestedDate = searchParams.get('date')
  const selectedDate = validDate(requestedDate) ? requestedDate : today
  const plan = db.plans.find((item) => item.id === client.planId)
  const workouts = (db.workouts || []).filter((item) => item.clientId === id && item.status === 'completed')
    .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10)
  const selectedCompleted = (db.workouts || []).find((item) => item.clientId === id && item.date === selectedDate && item.status === 'completed')
  const completedAppointments = db.sessions.filter((item) => item.clientId === id && item.status === 'Completed')
    .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)
  const runRequested = searchParams.get('run') === '1'
  const unfinishedWorkout = (db.workouts || []).some((item) => item.clientId === id && item.date === selectedDate && item.status === 'in_progress')
  const showRunner = runRequested && !selectedCompleted && (selectedDate === today || unfinishedWorkout)
  const closeRunner = () => {
    setLogging(false)
    setSearchParams(selectedDate === today ? {} : { date: selectedDate })
  }

  return (
    <>
      <div className="topbar training-topbar">
        <h1>Training</h1>
        {!logging && <div className="flex gap">
          <Button variant="ghost" size="sm" onClick={() => openModal(<QuickLogMenu clientId={id} />)}>＋ Quick log</Button>
          <Link className="btn ghost sm" to={`/clients/${id}/check-ins`}>Check-ins</Link>
        </div>}
      </div>

      <section className="card training-program" aria-labelledby="training-program-title">
        <div className="training-program-copy">
          <span className="overview-eyebrow">PROGRAMME</span>
          <h2 id="training-program-title">{plan ? plan.name : 'No programme assigned'}</h2>
          {plan && <span className="muted">{plan.items?.length || 0} exercises</span>}
        </div>
        {!logging && <Link className="btn ghost sm" to="/workouts">Programme library →</Link>}
      </section>

      {showRunner && <section id="workout-log" className="training-session" aria-label={`Workout logging for ${fmtDate(selectedDate)}`}>
        <div className="training-runner-head">
          <span>Logging · {fmtDate(selectedDate)}</span>
          {!logging && <Button variant="ghost" size="sm" onClick={closeRunner}>Close</Button>}
        </div>
        <ClientWorkoutFlow key={`${id}:${selectedDate}`} client={client} date={selectedDate}
          onRunStateChange={setLogging} onSessionComplete={closeRunner} />
        {logging && <p className="training-save-note">Save &amp; exit before opening the calendar.</p>}
      </section>}

      {!logging && <>
        <section id="selected-workout" className="training-planner" aria-label="Workout calendar">
          <WorkoutPlanner client={client} focusDate={selectedDate} title="Workout calendar" compactCopy />
        </section>

        <details className="card training-history">
          <summary id="training-history-title">Session history</summary>
          <div className="training-history-grid">
            <div>
              <h3>Completed workout logs</h3>
              {workouts.length ? workouts.map((item) => <button key={item.id} className="training-history-row"
                onClick={() => openModal(<WorkoutBuilderModal clientId={id} date={item.date} review />, 'xl')}>
                <span><strong>{item.title || 'Workout'}</strong><small>{fmtDate(item.date)} · {item.main?.length || 0} exercises</small></span>
                <span>Review day →</span>
              </button>) : <p className="muted">No completed workout logs yet.</p>}
            </div>
            <div>
              <h3>Completed appointments</h3>
              {completedAppointments.length ? completedAppointments.map((item) => <div key={item.id} className="training-history-row static">
                <span><strong>{item.type}</strong><small>{fmtDate(item.date)} · {item.time || 'Time not set'} · {item.dur || '—'} min</small></span>
                <span>Completed</span>
              </div>) : <p className="muted">No completed appointments yet.</p>}
            </div>
          </div>
        </details>

        <details className="card training-assistance">
          <summary>Coach assistance</summary>
          <p className="muted">Optional context for the trainer; review every suggestion before applying it.</p>
          <AICoach client={client} />
        </details>
      </>}
    </>
  )
}
