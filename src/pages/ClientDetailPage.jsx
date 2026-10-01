import { Link, useParams } from 'react-router-dom'
import Button from '../components/atoms/Button'
import Icon from '../components/atoms/Icon'
import ConcernCard from '../components/molecules/ConcernCard'
import ClientWorkoutFlow from '../components/organisms/ClientWorkoutFlow'
import { InviteAthleteForm } from '../components/organisms/forms/ClientForms'
import ConcernForm from '../components/organisms/forms/ConcernForm'
import { QuickLogMenu } from '../components/organisms/forms/LogForms'
import { hasBackend } from '../lib/supabase'
import { useData } from '../store/DataContext'
import { useModal } from '../store/ModalContext'
import { toast, confirmDialog, promptDialog } from '../lib/toast'
import { latestOf } from '../lib/calc'
import { fmtDate, todayISO } from '../lib/dates'
import { forClient, baselineProgress, dueStatus, REASSESS_TYPES, DEFAULT_REASSESS_DAYS, TYPES } from '../lib/assessment'

const recordedLabel = (date, today) => date === today ? 'Recorded today' : `Last recorded ${fmtDate(date)}`

export default function ClientDetailPage() {
  const { id } = useParams()
  const { db, commit, tz } = useData()
  const { openModal } = useModal()
  const client = db.clients.find((item) => item.id === id)
  if (!client) return null

  const today = todayISO(tz)
  const currentTime = new Date().toLocaleTimeString('en-GB', { timeZone: tz || undefined, hour: '2-digit', minute: '2-digit', hour12: false })
  const trainingUrl = `/clients/${id}/training`
  const checkInsUrl = `/clients/${id}/check-ins`
  const assessmentsUrl = `/clients/${id}/assessments`
  const sessions = db.sessions.filter((s) => s.clientId === id)
  const nextSession = sessions
    .filter((s) => (s.date > today || (s.date === today && (!s.time || s.time >= currentTime)))
      && s.status !== 'Cancelled' && s.status !== 'Completed')
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''))[0]
  const earlierUnresolved = sessions.filter((s) => s.date === today && s.time && s.time < currentTime
    && s.status !== 'Cancelled' && s.status !== 'Completed')
  const todayW = (db.workouts || []).find((w) => w.clientId === id && w.date === today) || null
  const todayP = db.prescriptions.find((p) => p.clientId === id && p.date === today) || null
  const wellness = latestOf(db.wellness, id)
  const wearable = latestOf(db.wearable, id)
  const assessmentList = forClient(db.assessments, id)
  const baselines = baselineProgress(assessmentList)
  const interval = db.settings?.reassessIntervalDays || DEFAULT_REASSESS_DAYS
  const dueTypes = REASSESS_TYPES.filter((type) => dueStatus(assessmentList, type, interval).overdue)
  const typeLabel = (type) => TYPES.find((item) => item.key === type)?.label || type
  const concerns = db.concerns.filter((item) => item.clientId === id)
  const openConcerns = concerns.filter((item) => item.status === 'Open').sort((a, b) => b.date.localeCompare(a.date))
  const resolvedConcerns = concerns.filter((item) => item.status !== 'Open').sort((a, b) => b.date.localeCompare(a.date))

  const checkedIn = db.wellness.some((entry) => entry.clientId === id && entry.date === today)
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
  const concernCard = (concern) => <ConcernCard key={concern.id} concern={concern} clientName={client.name}
    session={concern.sessionId ? sessions.find((session) => session.id === concern.sessionId) : null}
    onResolve={() => resolve(concern.id)} onReopen={() => reopen(concern.id)}
    onEdit={() => openModal(<ConcernForm concern={concern} />)} onDelete={() => delConcern(concern.id)} />

  const activity = [
    ...sessions.filter((session) => session.status === 'Completed').map((session) => ({
      date: session.date, icon: 'check', title: `Completed session · ${session.type}`,
      meta: `${fmtDate(session.date)} · ${session.time} · ${session.dur} min`,
    })),
    ...db.wellness.filter((entry) => entry.clientId === id).map((entry) => ({
      date: entry.date, icon: 'heart', title: 'Wellness check-in', meta: fmtDate(entry.date),
    })),
    ...(db.maxes || []).filter((entry) => entry.clientId === id && entry.kind === 'e1rm').map((entry) => ({
      date: entry.date, icon: 'activity', title: `Estimated 1RM · ${entry.exercise}`,
      meta: `${fmtDate(entry.date)} · ${entry.valueKg} kg`,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4)

  const focusToday = Boolean(todayW || todayP) && (!nextSession || nextSession.date === today)
  const trainingAction = focusToday && todayW?.status === 'completed' ? 'View session'
    : focusToday && todayW?.status === 'in_progress' ? 'Resume session'
      : focusToday || nextSession ? 'Review session' : 'Plan a session'

  return (
    <>
      <div className="topbar overview-title">
        <h1>Overview</h1>
        <div className="flex gap">
          {hasBackend && <Button variant="ghost" onClick={() => openModal(<InviteAthleteForm client={client} />)}><Icon name="link" size={14} /> Invite</Button>}
          <Button onClick={() => openModal(<QuickLogMenu clientId={id} />)}>＋ Quick log</Button>
        </div>
      </div>

      <div className="overview-priority">
        <section className="card overview-next" aria-labelledby="next-session-title">
          <div className="overview-eyebrow">NEXT SESSION</div>
          <h2 id="next-session-title">{nextSession ? nextSession.type : 'No upcoming session booked'}</h2>
          {nextSession && <p className="muted">{`${nextSession.date === today ? 'Today' : fmtDate(nextSession.date)} · ${nextSession.time || 'Time not set'} · ${nextSession.dur || '—'} min · ${nextSession.status}`}</p>}
          <div className="overview-next-actions">
            {focusToday
              ? <Button onClick={() => document.getElementById('today-training')?.scrollIntoView({ behavior: 'smooth' })}>{trainingAction} →</Button>
              : <Link className="btn" to={trainingUrl}>{trainingAction} →</Link>}
            {nextSession && <Link className="btn ghost" to="/schedule">Open schedule</Link>}
          </div>
          {nextSession && nextSession.date !== today && todayP && <div className="overview-note">A workout is also prescribed for today.</div>}
        </section>

        <section className="card overview-attention" aria-labelledby="attention-title">
          <h2 id="attention-title">What needs review</h2>
          {openConcerns.length > 0 && <button className="overview-alert" onClick={() => document.getElementById('open-concerns')?.scrollIntoView({ behavior: 'smooth' })}>
            <strong>{openConcerns.length} open concern{openConcerns.length === 1 ? '' : 's'}</strong>
            <span>{openConcerns[0].category} · {openConcerns[0].text}</span>
            <span className="overview-alert-action">Review concern →</span>
          </button>}
          {earlierUnresolved.length > 0 && <Link className="overview-attention-link" to="/schedule">
            {earlierUnresolved.length} earlier session{earlierUnresolved.length === 1 ? '' : 's'} still awaiting a status update <span>Schedule →</span>
          </Link>}
          {baselines.done < baselines.total && <Link className="overview-attention-link" to={assessmentsUrl}>
            {baselines.total - baselines.done} onboarding baseline{baselines.total - baselines.done === 1 ? '' : 's'} missing <span>Assessments →</span>
          </Link>}
          {dueTypes.length > 0 && <Link className="overview-attention-link" to={assessmentsUrl}>
            Reassessment due: {dueTypes.map(typeLabel).join(', ')} <span>Review →</span>
          </Link>}
          {!checkedIn && <Link className="overview-attention-link" to={checkInsUrl}>
            Today’s check-in missing <span>Check-ins →</span>
          </Link>}
          {!openConcerns.length && !earlierUnresolved.length && baselines.done === baselines.total && !dueTypes.length && checkedIn &&
            <p className="muted">All caught up.</p>}
        </section>
      </div>

      <section className="card overview-checkin" aria-labelledby="checkin-title">
        <div className="flex between overview-section-head">
          <h2 id="checkin-title">Check-in snapshot</h2>
          <Link className="btn ghost sm" to={checkInsUrl}>View check-ins →</Link>
        </div>
        <div className="overview-checkin-grid">
          <div>
            <strong>Wellness</strong>
            {wellness ? <><div className="overview-source">{recordedLabel(wellness.date, today)} · {wellness.source || 'Source not recorded'}</div><p>Sleep {wellness.sleep ?? '—'}/7 · Stress {wellness.stress ?? '—'}/7 · Fatigue {wellness.fatigue ?? '—'}/7 · Soreness {wellness.soreness ?? '—'}/7</p></> : <p>Not recorded</p>}
          </div>
          <div>
            <strong>Wearable</strong>
            {wearable ? <><div className="overview-source">{recordedLabel(wearable.date, today)} · {wearable.source || 'Source not recorded'}</div><p>HRV {wearable.hrv ?? '—'} ms · Resting HR {wearable.rhr ?? '—'} bpm</p></> : <p>Not recorded</p>}
          </div>
        </div>
      </section>

      <section id="today-training" className="overview-workout" aria-labelledby="today-training-title">
        <div className="flex between overview-section-head">
          <h2 id="today-training-title">Today’s training</h2>
          <Link className="btn ghost sm" to={trainingUrl}>Full training planner →</Link>
        </div>
        <ClientWorkoutFlow client={client} date={today} presentation="overview" />
      </section>

      {openConcerns.length > 0 && <section id="open-concerns" className="overview-concerns" aria-labelledby="concerns-title">
        <div className="flex between overview-section-head">
          <h2 id="concerns-title">Open concerns</h2>
          <Button variant="ghost" size="sm" onClick={() => openModal(<ConcernForm clientId={id} />)}>＋ Flag a concern</Button>
        </div>
        <div className="overview-concern-list">{openConcerns.map(concernCard)}</div>
      </section>}

      <section className="card overview-activity" aria-labelledby="activity-title">
        <div className="flex between overview-section-head">
          <h2 id="activity-title">Recent activity</h2>
        </div>
        {activity.length ? activity.map((event, index) => <div className="act-row" key={`${event.date}-${index}`}>
          <span className="act-chip"><Icon name={event.icon} size={16} /></span>
          <span className="act-info"><span className="t">{event.title}</span><span className="s">{event.meta}</span></span>
        </div>) : <p className="muted">No recent activity.</p>}
        {resolvedConcerns.length > 0 && <details className="overview-history">
          <summary>Resolved concerns ({resolvedConcerns.length})</summary>
          <div className="overview-concern-list">{resolvedConcerns.map(concernCard)}</div>
        </details>}
      </section>

    </>
  )
}
