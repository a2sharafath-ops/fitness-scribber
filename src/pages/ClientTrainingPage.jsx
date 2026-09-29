import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import Button from '../components/atoms/Button'
import ClientWorkoutFlow from '../components/organisms/ClientWorkoutFlow'
import WorkoutPlanner from '../components/organisms/WorkoutPlanner'
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
  const completedAppointments = db.sessions.filter((item) => item.clientId === id && item.status === 'Completed')
    .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)
  const selectDate = (date, scroll = false) => {
    if (logging) return
    setSearchParams(date === today ? {} : { date })
    if (scroll) document.getElementById('selected-workout')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <>
      <div className="topbar training-topbar">
        <div><h1>Training</h1><div className="sub">Plan sessions, record actual work, and review history.</div></div>
        {!logging && <div className="flex gap">
          <Button variant="ghost" size="sm" onClick={() => openModal(<QuickLogMenu clientId={id} />)}>＋ Quick log</Button>
          <Link className="btn ghost sm" to={`/clients/${id}/check-ins`}>Check-ins</Link>
        </div>}
      </div>

      <section className="card training-program" aria-labelledby="training-program-title">
        <div>
          <div className="overview-eyebrow">CURRENT PROGRAMME</div>
          <h2 id="training-program-title">{plan ? plan.name : 'No programme assigned'}</h2>
          <p className="muted">{plan ? `${plan.desc || 'Custom programme'} · ${plan.items?.length || 0} exercises in the programme`
            : 'Use the weekly planner below to prescribe a session for this client.'}</p>
        </div>
        {!logging && <Link className="btn ghost sm" to="/workouts">Programme library →</Link>}
      </section>

      <section id="selected-workout" className="training-session" aria-labelledby="training-session-title">
        <div className="training-section-head">
          <div>
            <h2 id="training-session-title">{selectedDate === today ? 'Today’s session' : `Session · ${fmtDate(selectedDate)}`}</h2>
            <p className="muted">Prescribed targets and recorded sets stay separate in the workout.</p>
          </div>
          {!logging && <div className="training-date-controls">
            <label htmlFor="training-date">Workout date</label>
            <input id="training-date" type="date" value={selectedDate} onChange={(event) => selectDate(event.target.value)} />
            {selectedDate !== today && <Button variant="ghost" size="sm" onClick={() => selectDate(today)}>Today</Button>}
          </div>}
        </div>
        <ClientWorkoutFlow key={`${id}:${selectedDate}`} client={client} date={selectedDate} onRunStateChange={setLogging} />
        {logging && <p className="training-save-note">Save &amp; exit in the workout before switching dates or opening the planner.</p>}
      </section>

      {!logging && <>
        <section className="training-planner" aria-labelledby="training-planner-title">
          <div className="training-section-head">
            <div><h2 id="training-planner-title">Plan the week</h2><p className="muted">Choose a day to prescribe. Copy sessions across days or clients from the planner.</p></div>
          </div>
          <WorkoutPlanner client={client} focusDate={selectedDate} />
        </section>

        <section className="card training-history" aria-labelledby="training-history-title">
          <div className="training-section-head">
            <div><h2 id="training-history-title">Session history</h2><p className="muted">Workout logs and booked appointment status are separate records.</p></div>
          </div>
          <div className="training-history-grid">
            <div>
              <h3>Completed workout logs</h3>
              {workouts.length ? workouts.map((item) => <button key={item.id} className="training-history-row"
                onClick={() => selectDate(item.date, true)}>
                <span><strong>{item.title || 'Workout'}</strong><small>{fmtDate(item.date)} · {item.main?.length || 0} exercises</small></span>
                <span>View summary →</span>
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
        </section>

        <details className="card training-assistance">
          <summary>Coach assistance</summary>
          <p className="muted">Optional context for the trainer; review every suggestion before applying it.</p>
          <AICoach client={client} />
        </details>
      </>}
    </>
  )
}
