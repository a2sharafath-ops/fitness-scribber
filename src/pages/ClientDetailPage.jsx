import { useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import Button from '../components/atoms/Button'
import Icon from '../components/atoms/Icon'
import ConcernCard from '../components/molecules/ConcernCard'
import OverviewTraining from '../components/organisms/OverviewTraining'
import OverviewCheckin from '../components/organisms/OverviewCheckin'
import { InviteAthleteForm } from '../components/organisms/forms/ClientForms'
import ConcernForm from '../components/organisms/forms/ConcernForm'
import SessionForm from '../components/organisms/forms/SessionForm'
import { QuickLogMenu, WellnessForm } from '../components/organisms/forms/LogForms'
import { hasBackend } from '../lib/supabase'
import { useData } from '../store/DataContext'
import { useModal } from '../store/ModalContext'
import { toast, confirmDialog, promptDialog } from '../lib/toast'
import { coachClock, fmtDate } from '../lib/dates'
import { forClient, formalAssessments, baselineProgress, dueStatus, REASSESS_TYPES, DEFAULT_REASSESS_DAYS, TYPES } from '../lib/assessment'
import { bookingWorkout, bookingWorkoutAction, scheduledBooking, sessionPath, trainingBooking, workoutReviewPath } from '../lib/schedule'
import { readinessScore } from '../lib/calc'
import { bookedCompletion } from '../lib/dashboard'
import { clientPrograms } from '../lib/clientPrograms'
import { fmtWt } from '../lib/units'

export default function ClientDetailPage() {
  const { id } = useParams()
  const { db, commit, tz, units } = useData()
  const { openModal } = useModal()
  const concernDetails = useRef(null)
  const client = db.clients.find((item) => item.id === id)
  if (!client) return null
  const { today, time: currentTime } = coachClock(new Date(), tz)
  const checkInsUrl = `/clients/${id}/check-ins`
  const concernsUrl = `${checkInsUrl}?view=concerns`
  const assessmentsUrl = `/clients/${id}/assessments`
  const sessions = db.sessions.filter((session) => session.clientId === id)
  const completion = bookedCompletion(sessions, today, new Set([id]))
  const readiness = readinessScore(db, id, today)
  const strength = (db.maxes || []).filter((row) => row.clientId === id && row.kind === 'e1rm' && row.date <= today && Number(row.valueKg) > 0)
    .sort((a, b) => b.date.localeCompare(a.date))[0]
  const program = clientPrograms(db, client, today)[0]
  const metrics = [
    { name: 'Booking completion', value: completion.total ? `${Math.round(completion.completed / completion.total * 100)}%` : '—',
      note: completion.total ? `${completion.completed} of ${completion.total} · past 30 days` : 'No past bookings in 30 days', path: `/clients/${id}/progress#attendance` },
    { name: 'Readiness today', value: readiness == null ? '—' : `${readiness}/100`,
      note: readiness == null ? 'No readiness score today' : 'Today’s recorded readiness', path: checkInsUrl },
    { name: 'Latest strength estimate', value: strength ? fmtWt(Number(strength.valueKg), units) : '—',
      note: strength ? `${strength.exercise} · ${fmtDate(strength.date)}` : 'No estimated 1RM recorded', path: `/clients/${id}/progress#strength` },
  ]
  const nextSession = sessions.filter((session) => (session.date > today || session.date === today && (!session.time || session.time >= currentTime))
    && scheduledBooking(session) && !['completed', 'discarded'].includes(bookingWorkout(db, session)?.status))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''))[0]
  const nextAction = nextSession && (bookingWorkoutAction(db, nextSession, today) || {
    path: sessionPath(nextSession),
    label: trainingBooking(nextSession) ? 'Open training' : { Assessment: 'Open assessments', 'Check-in': 'Open check-ins' }[nextSession.type],
  })
  const earlierUnresolved = sessions.filter((session) => session.date === today && session.time && session.time < currentTime
    && scheduledBooking(session))
  const assessmentList = forClient(db.assessments, id)
  const baselines = baselineProgress(assessmentList)
  const interval = db.settings?.reassessIntervalDays || DEFAULT_REASSESS_DAYS
  const dueTypes = REASSESS_TYPES.filter((type) => dueStatus(assessmentList, type, interval, today).overdue)
  const typeLabel = (type) => TYPES.find((item) => item.key === type)?.label || type
  const severityOrder = { High: 0, Medium: 1, Low: 2 }
  const openConcerns = db.concerns.filter((row) => row.clientId === id && row.status === 'Open')
    .sort((a, b) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3) || b.date.localeCompare(a.date))
  const checkedIn = db.wellness.some((entry) => entry.clientId === id && entry.date === today)
  const missingBaselines = baselines.total - baselines.done
  const reviewCount = openConcerns.length + (earlierUnresolved.length ? 1 : 0) + (missingBaselines || dueTypes.length ? 1 : 0) + (!checkedIn ? 1 : 0)
  const reviewConcern = (concernId) => {
    const details = concernDetails.current
    if (!details) return
    details.open = true
    details.scrollIntoView({ behavior: 'smooth', block: 'center' })
    details.querySelector('summary')?.focus({ preventScroll: true })
    document.getElementById(`overview-concern-${concernId}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }
  const resolve = async (concernId) => {
    const note = await promptDialog({ title: 'Resolve concern', message: 'Resolution note (optional):', multiline: true, confirmLabel: 'Resolve' })
    if (note === null) return
    commit((data) => { const concern = data.concerns.find((item) => item.id === concernId); concern.status = 'Resolved'; concern.resolution = note.trim() })
    toast('Concern resolved')
  }
  const reopen = (concernId) => {
    commit((data) => { const concern = data.concerns.find((item) => item.id === concernId); concern.status = 'Open'; concern.resolution = '' })
    toast('Concern reopened', 'info')
  }
  const delConcern = async (concernId) => {
    if (!await confirmDialog({ title: 'Delete concern', message: 'Delete this concern? This cannot be undone.', confirmLabel: 'Delete', danger: true })) return
    commit((data) => { data.concerns = data.concerns.filter((item) => item.id !== concernId) })
    toast('Concern deleted')
  }
  const activity = [
    ...sessions.filter((row) => row.status === 'Completed' && row.date <= today).map((row) => ({
      id: `session-${row.id}`, date: row.date, icon: 'check', title: `Completed booking · ${row.type}`,
      meta: `${fmtDate(row.date)} · ${row.time || 'Time not recorded'}`, to: bookingWorkoutAction(db, row, today)?.path || sessionPath(row),
    })),
    ...(db.workouts || []).filter((row) => row.clientId === id && row.status === 'completed' && row.date <= today).map((row) => ({
      id: `workout-${row.id}`, date: row.date, icon: 'dumbbell', title: `Completed workout · ${row.title || 'Workout'}`,
      meta: [fmtDate(row.date), sessions.find(session => session.id === row.bookingId)?.time,
        row.durationSec > 0 ? `${Math.round(row.durationSec / 60)} min` : null].filter(Boolean).join(' · '), to: workoutReviewPath(row),
    })),
    ...db.wellness.filter((row) => row.clientId === id && row.date <= today).map((row) => ({
      id: `wellness-${row.id}`, date: row.date, icon: 'heart', title: 'Wellness check-in', meta: `${fmtDate(row.date)} · ${row.source || 'Source not recorded'}`, to: checkInsUrl,
    })),
    ...formalAssessments(assessmentList).filter((row) => REASSESS_TYPES.includes(row.type) && row.date <= today).map((row) => ({
      id: `assessment-${row.id}`, date: row.date, icon: 'activity', title: `${typeLabel(row.type)} · ${row.phase === 'baseline' ? 'Baseline' : 'Reassessment'}`,
      meta: fmtDate(row.date), to: `${assessmentsUrl}/${row.type}`,
    })),
    ...(db.maxes || []).filter((row) => row.clientId === id && row.kind === 'e1rm' && row.date <= today).map((row) => ({
      id: `max-${row.id}`, date: row.date, icon: 'activity', title: `Estimated 1RM · ${row.exercise}`,
      meta: `${fmtDate(row.date)} · ${row.valueKg} kg`, to: `/clients/${id}/progress#strength`,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8)

  return <>
    <div className="topbar overview-title"><h1>Overview</h1><div className="flex gap">
      {hasBackend && <Button variant="ghost" onClick={() => openModal(<InviteAthleteForm client={client} />)}><Icon name="link" size={14} /> Invite</Button>}
      <Button onClick={() => openModal(<QuickLogMenu clientId={id} />)}>＋ Quick log</Button>
    </div></div>
    <div className="overview-metrics" role="group" aria-label="Client progress at a glance">
      {metrics.map(({ name, value, note, path }) => <Link className="card overview-metric" key={name} to={path}>
        <span>{name}</span><strong>{value}</strong><small>{note}</small><Icon name="chevron-right" size={16} aria-hidden="true" />
      </Link>)}
    </div>
    <section className="card overview-program" aria-labelledby="overview-program-title">
      <div><h2 id="overview-program-title">{program?.upcoming ? 'Upcoming program' : 'Current program'}</h2>
        <strong>{program?.name || 'No current or upcoming program'}</strong>
        {program?.note && <p>{program.note}</p>}
      </div>
      <Link className="btn ghost" to={`/clients/${id}/training${program ? '#training-program-title' : ''}`}>{program ? 'View program' : 'Open Training'}</Link>
    </section>
    <div className="overview-priority">
      <section className="card overview-next" aria-labelledby="next-session-title">
        <div className="overview-eyebrow">NEXT SESSION</div><h2 id="next-session-title">{nextSession ? nextSession.type : 'No upcoming session booked'}</h2>
        {nextSession && <p className="muted">{nextSession.date === today ? 'Today' : fmtDate(nextSession.date)} · {nextSession.time || 'Time not set'} · {nextSession.dur || '—'} min <span className="overview-booking-status">{nextSession.status}</span></p>}
        <div className="overview-next-actions">{nextSession ? <>{nextAction.label && <Link className="btn" to={nextAction.path}>{nextAction.label} →</Link>}<Button variant="ghost" onClick={() => openModal(<SessionForm session={nextSession} />)}>View booking</Button></>
          : <Button onClick={() => openModal(<SessionForm clientId={id} date={today} />)}>Book session</Button>}</div>
      </section>
      <section className="card overview-attention" aria-labelledby="attention-title">
        <div className="overview-review-head"><h2 id="attention-title">What needs review</h2><span className="overview-review-count">{reviewCount} item{reviewCount === 1 ? '' : 's'}</span></div>
        <div className="overview-review-list" aria-label="Items needing review">
          {openConcerns.map((concern) => <div className="overview-review-row concern" key={concern.id}><div><strong>{concern.category || 'Concern'}</strong><p title={concern.text}>{concern.text}</p><small>{fmtDate(concern.date)} · {concern.severity || 'Severity not recorded'}</small></div><button className="overview-text-link" onClick={() => reviewConcern(concern.id)}>Review →</button></div>)}
          {earlierUnresolved.length > 0 && <div className="overview-review-row"><div><strong>Session status</strong><p>{earlierUnresolved.length} earlier session{earlierUnresolved.length === 1 ? '' : 's'} awaiting an update</p></div><Link className="overview-text-link" to="/schedule">Review →</Link></div>}
          {(missingBaselines > 0 || dueTypes.length > 0) && <div className="overview-review-row"><div><strong>Assessments</strong><p>{[missingBaselines > 0 ? `${missingBaselines} baseline${missingBaselines === 1 ? '' : 's'} missing` : '', dueTypes.length > 0 ? `${dueTypes.length} reassessment${dueTypes.length === 1 ? '' : 's'} due` : ''].filter(Boolean).join(' · ')}</p></div><Link className="overview-text-link" to={assessmentsUrl}>Review →</Link></div>}
          {!checkedIn && <div className="overview-review-row"><strong>No check-in today</strong><button className="overview-text-link" onClick={() => openModal(<WellnessForm clientId={id} />)}>Record →</button></div>}
          {reviewCount === 0 && <p className="muted">All caught up.</p>}
        </div>
        <div className="overview-review-footer"><small>{openConcerns.length} open concern{openConcerns.length === 1 ? '' : 's'}</small><Link className="overview-text-link" to={concernsUrl}>All concerns →</Link></div>
      </section>
    </div>
    <OverviewTraining clientId={id} today={today} />
    <OverviewCheckin clientId={id} today={today} />
    <div className="overview-bottom">
      {openConcerns.length ? <details ref={concernDetails} id="open-concerns" className="card overview-concerns">
        <summary><Icon name="chevron-down" size={17} /><h2>Open concerns ({openConcerns.length})</h2></summary>
        <div className="overview-concern-list" aria-label="Open concern details">
          {openConcerns.map((concern) => <div id={`overview-concern-${concern.id}`} key={concern.id}><ConcernCard concern={concern} clientName={client.name}
            session={concern.sessionId ? sessions.find((session) => session.id === concern.sessionId) : null}
            onResolve={() => resolve(concern.id)} onReopen={() => reopen(concern.id)} onEdit={() => openModal(<ConcernForm concern={concern} />)} onDelete={() => delConcern(concern.id)} /></div>)}
          <Link className="overview-text-link" to={concernsUrl}>Concern history →</Link>
        </div>
      </details> : <section className="card overview-concerns" aria-labelledby="client-concerns-title">
        <h2 id="client-concerns-title">Open concerns</h2>
        <div className="overview-concerns-empty"><p className="muted">No open concerns.</p><Link className="overview-text-link" to={concernsUrl}>Concern history →</Link></div>
      </section>}
      <section className="card overview-activity" aria-labelledby="activity-title"><h2 id="activity-title">Recent activity</h2>
        <div className="overview-activity-list">{activity.length ? activity.map((event) => <Link className="act-row" key={event.id} to={event.to}><span className="act-chip"><Icon name={event.icon} size={16} /></span><span className="act-info"><span className="t">{event.title}</span><span className="s">{event.meta}</span></span></Link>) : <p className="muted">No recent activity.</p>}</div>
      </section>
    </div>
  </>
}
