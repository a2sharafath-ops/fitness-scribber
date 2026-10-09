import { Link } from 'react-router-dom'
import { useData } from '../../store/DataContext'
import { fmtDate, fmtDay, weekDates } from '../../lib/dates'
import { programStats } from '../../lib/program'
import { isSession, isClosedTrainingDay } from '../../lib/planner'

export default function OverviewTraining({ clientId, today }) {
  const { db, tz } = useData()
  const workout = (db.workouts || []).find((row) => row.clientId === clientId && row.date === today)
  const prescription = db.prescriptions.find((row) => row.clientId === clientId && row.date === today && isSession(row))
  const completed = workout?.status === 'completed'
  const inProgress = workout?.status === 'in_progress'
  const hasWorkout = Boolean(workout || prescription)
  const closed = isClosedTrainingDay(db, clientId, today, today)
  const exercises = workout ? (workout.main || []).map((exercise) => ({ name: exercise.name, detail: `${exercise.setRows?.length || exercise.sets || 0} sets` }))
    : prescription?.blocks?.length ? prescription.blocks.flatMap((block) => block.exercises.map((exercise) => ({ name: exercise.exerciseName, detail: `${exercise.sets?.length || 0} sets` })))
      : (prescription?.items || []).map((exercise) => ({ name: exercise.exercise, detail: `${exercise.sets || 0} × ${exercise.reps ?? '—'}` }))
  const count = workout ? workout.main?.length || 0 : programStats(prescription).exercises
  const title = hasWorkout ? workout?.title || prescription?.name || 'Prescribed workout' : closed ? 'No workout logged' : 'No workout planned'
  const action = completed ? 'Review workout' : inProgress ? 'Resume workout' : closed ? 'Review day' : hasWorkout ? 'Start workout' : 'Plan workout'
  const url = `/clients/${clientId}/training?date=${today}${hasWorkout && !completed && (!closed || inProgress) ? '&run=1' : ''}`
  const minutes = workout?.durationSec > 0 ? Math.round(workout.durationSec / 60) : null
  const meta = hasWorkout ? `${completed ? 'Completed' : inProgress ? 'In progress' : 'Planned'} · ${count} exercise${count === 1 ? '' : 's'}${minutes ? ` · ${minutes} min` : ''}` : `Today · ${fmtDate(today)}`
  return <section id="today-training" className="card overview-workout" aria-labelledby="today-training-title">
    <div className="overview-section-head"><h2 id="today-training-title">Today’s training</h2></div>
    <div className="overview-training-status"><div><h3 title={title}>{title}</h3><p className="muted">{meta}</p></div><Link className={'btn' + (completed || closed && !hasWorkout ? ' ghost' : '')} to={url}>{action} →</Link></div>
    <div className="overview-week" aria-label="This week at a glance">{weekDates(0, tz).map((date) => {
      const logs = (db.workouts || []).filter((row) => row.clientId === clientId && row.date === date)
      const done = logs.some((row) => row.status === 'completed')
      const running = !done && logs.some((row) => row.status === 'in_progress')
      const planned = db.prescriptions.some((row) => row.clientId === clientId && row.date === date && isSession(row))
      const label = done ? 'Done' : running ? 'In progress' : planned ? 'Plan' : 'No plan'
      return <Link key={date} to={`/clients/${clientId}/training?date=${date}`} className={'overview-day' + (date === today ? ' today' : done ? ' done' : '')} aria-label={`${fmtDate(date)} · ${done ? 'Completed workout' : running ? 'Workout in progress' : planned ? 'Planned workout' : 'No workout planned'}`}>
        <span>{date === today ? 'Today' : fmtDay(date).split(',')[0]}</span><strong>{Number(date.slice(8))}</strong><span>{label}</span>
      </Link>
    })}</div>
    <div className="overview-training-footer">{hasWorkout && <details className="overview-training-details"><summary>Workout details</summary><div className="overview-exercises">{exercises.map((exercise, index) => <div key={index}><span>{exercise.name}</span><small>{exercise.detail}</small></div>)}</div></details>}</div>
  </section>
}
