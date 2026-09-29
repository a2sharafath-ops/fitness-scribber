import { useState } from 'react'
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom'
import StrengthDashboard from '../components/organisms/StrengthDashboard'
import CurrentLiftsPerformance from '../components/organisms/CurrentLiftsPerformance'
import ClientTrainingLoad from '../components/organisms/ClientTrainingLoad'
import { useData } from '../store/DataContext'
import { useFormat } from '../hooks/useFormat'
import { compare, formalAssessments, movementScore, summarize } from '../lib/assessment'
import { fmtDate, todayISO } from '../lib/dates'
import { appointmentCompletion, assessmentPair } from '../lib/progress'

const signed = (value, suffix) => value == null ? '—' : `${value > 0 ? '+' : ''}${value} ${suffix}`
const progressViews = [
  { id: 'strength', label: 'Strength', description: 'Performed lifts & 1RM records' },
  { id: 'training-load', label: 'Training load', description: 'Effort, resistance & conditioning' },
  { id: 'outcomes', label: 'Outcomes', description: 'Body, movement & fitness' },
  { id: 'attendance', label: 'Completion', description: 'Bookings & workout logs' },
]

function BodyMetric({ label, field, first, last, comparable, weight, format }) {
  const from = first?.data?.[field]
  const to = last?.data?.[field]
  const hasPair = comparable && from != null && to != null
  const change = hasPair ? +(to - from).toFixed(1) : null
  return <div className="progress-body-metric">
    <span>{label}</span>
    <strong>{to == null ? '—' : weight ? format.fmtWt(to) : `${to}%`}</strong>
    <small>{hasPair ? `From ${weight ? format.fmtWt(from) : `${from}%`} · ${signed(weight ? format.toDisp(change) : change, weight ? format.unitName() : 'percentage points')}` : comparable ? 'Baseline or latest value missing; change unavailable.' : last ? `Latest · ${fmtDate(last.date)}` : 'No assessment recorded'}</small>
  </div>
}

function OutcomeCard({ title, path, first, last, comparable, children, empty }) {
  return <article className="progress-outcome">
    <h3>{title}</h3>
    {!last ? <p className="muted">{empty}</p> : <>
      <div className="progress-date-pair"><span>Baseline: {fmtDate(first.date)}</span><span>Latest: {fmtDate(last.date)}</span></div>
      {children}
      {!comparable && <p className="progress-footnote">Baseline only. Record a reassessment to compare change.</p>}
    </>}
    <Link className="progress-source-link" to={path}>Assessment history →</Link>
  </article>
}

export default function ClientProgressPage() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { db, tz } = useData()
  const format = useFormat()
  const [days, setDays] = useState(30)
  const hashView = location.hash.slice(1)
  const activeView = progressViews.some((view) => view.id === hashView) ? hashView : hashView === 'history' ? 'training-load' : 'strength'
  const selectView = (view) => navigate({ pathname: location.pathname, search: location.search, hash: `#${view}` })
  const onViewKeyDown = (event, currentIndex) => {
    const lastIndex = progressViews.length - 1
    const nextIndex = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? (currentIndex + 1) % progressViews.length
      : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? (currentIndex + lastIndex) % progressViews.length
        : event.key === 'Home' ? 0 : event.key === 'End' ? lastIndex : null
    if (nextIndex == null) return
    event.preventDefault()
    const nextId = progressViews[nextIndex].id
    selectView(nextId)
    document.getElementById(nextId)?.focus()
  }
  const client = db.clients.find((item) => item.id === id)
  if (!client) return null

  const assessments = (db.assessments || []).filter((a) => a.clientId === id)
  const body = assessmentPair(assessments, 'body_comp')
  const movement = assessmentPair(assessments, 'movement')
  // Automatically generated lift peaks are displayed in Strength, not treated
  // as a new complete fitness reassessment.
  const fitness = assessmentPair(formalAssessments(assessments), 'fitness')
  const movementRows = movement.comparable ? compare('movement', movement.first, movement.last) : []
  const movementNow = movement.last ? movementScore(movement.last.data) : null
  const today = todayISO(tz)
  const attendance = appointmentCompletion(db.sessions, id, today, days)
  const completedWorkouts = (db.workouts || []).filter((w) => w.clientId === id && w.status === 'completed' && w.date >= attendance.start && w.date <= today).length

  return <>
    <div className="topbar progress-title">
      <div><span className="progress-eyebrow">Client / {client.name}</span><h1>Progress</h1><div className="sub">Compare recorded results, training exposure, and session completion. Dates and sources stay with every interpretation.</div></div>
      <div className="progress-title-actions"><Link className="btn" to={`/clients/${id}/training`}>Log training</Link></div>
    </div>

    <div className="progress-index" role="tablist" aria-label="Progress views">
      {progressViews.map((view, index) => <button key={view.id} type="button" role="tab" id={view.id} aria-selected={activeView === view.id} aria-controls={`progress-panel-${view.id}`} tabIndex={activeView === view.id ? 0 : -1} onClick={() => selectView(view.id)} onKeyDown={(event) => onViewKeyDown(event, index)}><strong>{view.label}</strong><span>{view.description}</span></button>)}
    </div>

    <section id="progress-panel-strength" className="card progress-panel" role="tabpanel" aria-labelledby="strength" tabIndex={0} hidden={activeView !== 'strength'}>
      {activeView === 'strength' && <>
      <StrengthDashboard client={client} />
      <details className="progress-disclosure"><summary>1RM history and coach entries</summary><CurrentLiftsPerformance client={client} /></details>
      </>}
    </section>

    <section id="progress-panel-training-load" className="card progress-panel" role="tabpanel" aria-labelledby="training-load" tabIndex={0} hidden={activeView !== 'training-load'}>
      {activeView === 'training-load' && <ClientTrainingLoad client={client} />}
    </section>

    <section id="progress-panel-outcomes" className="card progress-panel" role="tabpanel" aria-labelledby="outcomes" tabIndex={0} hidden={activeView !== 'outcomes'}>
      {activeView === 'outcomes' && <>
      <div className="progress-section-head"><div><span className="progress-eyebrow">03 / Reassessments</span><h2 id="progress-outcomes-title">Outcomes</h2><p>Show the latest result and its baseline together. Assessments remain the source of record.</p></div></div>
      <div className="progress-outcome-grid">
        <article className="progress-outcome progress-body"><h3>Body measurements</h3>
          {body.last ? <>
            <div className="progress-date-pair"><span>Baseline: {fmtDate(body.first.date)} · {body.first.data?.method || 'method not recorded'}</span><span>Latest: {fmtDate(body.last.date)} · {body.last.data?.method || 'method not recorded'}</span></div>
            <div className="progress-body-metrics">
              <BodyMetric label="Body mass" field="massKg" first={body.first} last={body.last} comparable={body.comparable} weight format={format} />
              <BodyMetric label="Body fat" field="bodyFatPct" first={body.first} last={body.last} comparable={body.comparable} format={format} />
              <BodyMetric label="Lean mass" field="leanMassKg" first={body.first} last={body.last} comparable={body.comparable} weight format={format} />
            </div>
            {!body.comparable && <p className="progress-footnote">Baseline only. Record a reassessment to compare change.</p>}
            {body.comparable && body.first.data?.method !== body.last.data?.method && <p className="progress-caution">Measurement methods differ or were not recorded; interpret these changes carefully.</p>}
          </> : <p className="muted">No body composition assessment yet. Record a baseline to start tracking change.</p>}
          <Link className="progress-source-link" to={`/clients/${id}/assessments/body_comp`}>Assessment history →</Link>
        </article>
        <OutcomeCard title="Movement" path={`/clients/${id}/assessments/movement`} {...movement} empty="No movement screen yet. Record a baseline to see this outcome.">
          {movementNow && <div className="progress-outcome-value">{movementNow.score}/{movementNow.max}<span>Latest {movementNow.protocol === 'nasm' ? 'movement quality' : 'screen score'}</span></div>}
          {movement.comparable && <div className="progress-compare-list">{movementRows.slice(0, 6).map((row) => <div key={row.label}><span>{row.label}</span><b>{row.from ?? '—'} → {row.to ?? '—'}{row.unit}</b></div>)}</div>}
          <p className="progress-footnote">Source: coach-recorded movement screen{movement.last?.data?.protocol === 'nasm' ? ' · NASM protocol' : ' · five-pattern screen'}.</p>
        </OutcomeCard>
        <OutcomeCard title="Fitness tests" path={`/clients/${id}/assessments/fitness`} {...fitness} empty="No formal fitness assessment yet. Record a baseline test to compare later.">
          {fitness.last && <><p className="progress-fitness-summary">{summarize(fitness.last)}</p><div className="progress-compare-list">{(fitness.last.data?.strength || []).slice(0, 4).map((test) => <div key={test.lift}><span>{test.lift}</span><b>{test.valueKg != null ? format.fmtWt(test.valueKg) : '—'}</b></div>)}</div></>}
          <p className="progress-footnote">Source: coach-recorded fitness assessment. Test labels and protocol are preserved; workout estimates appear in Strength.</p>
        </OutcomeCard>
      </div>
      </>}
    </section>

    <section id="progress-panel-attendance" className="card progress-panel progress-attendance" role="tabpanel" aria-labelledby="attendance" tabIndex={0} hidden={activeView !== 'attendance'}>
      {activeView === 'attendance' && <>
      <div className="progress-section-head"><div><span className="progress-eyebrow">04 / Follow-through</span><h2 id="progress-attendance-title">Booked session completion</h2><p>Past, non-cancelled appointments from {fmtDate(attendance.start)} through {fmtDate(attendance.end)}. Workout log completion is separate.</p></div><label className="progress-lift-select">Period <select value={days} onChange={(e) => setDays(Number(e.target.value))}><option value={30}>30 days</option><option value={90}>90 days</option></select></label></div>
      <div className="progress-attendance-layout"><div className="progress-attendance-main"><strong>{attendance.percent == null ? '—' : `${attendance.percent}%`}</strong><span>{attendance.total ? `${attendance.completed} of ${attendance.total} past bookings completed` : 'No past booked appointments in this period'}</span></div><div className="progress-attendance-track">{attendance.total > 0 && <div className="progress-bar" role="progressbar" aria-label="Booked session completion" aria-valuenow={attendance.percent} aria-valuemin={0} aria-valuemax={100}><div style={{ width: `${attendance.percent}%` }} /></div>}
      {(attendance.total > 0 || attendance.cancelled > 0 || attendance.todayCompleted > 0) && <div className="progress-attendance-details"><span>{attendance.unresolved} past booking{attendance.unresolved === 1 ? '' : 's'} still Pending/Confirmed</span><span>{attendance.cancelled} cancelled excluded</span><span>{attendance.todayCompleted} completed today (outside past-booking rate)</span></div>}
      </div></div>
      <p className="progress-footnote">Past Pending/Confirmed bookings need a status update; they are not labelled missed. Separately, {completedWorkouts} completed workout log{completedWorkouts === 1 ? '' : 's'} in this period. <Link to={`/clients/${id}/training`}>View Training →</Link></p>
      </>}
    </section>
  </>
}
