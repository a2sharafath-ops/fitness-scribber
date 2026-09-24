import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import StrengthDashboard from '../components/organisms/StrengthDashboard'
import CurrentLiftsPerformance from '../components/organisms/CurrentLiftsPerformance'
import { useData } from '../store/DataContext'
import { useFormat } from '../hooks/useFormat'
import { compare, formalAssessments, movementScore, summarize } from '../lib/assessment'
import { fmtDate, todayISO } from '../lib/dates'
import { appointmentCompletion, assessmentPair } from '../lib/progress'

const signed = (value, suffix) => value == null ? '—' : `${value > 0 ? '+' : ''}${value} ${suffix}`

function BodyMetric({ label, field, first, last, comparable, weight, format }) {
  const from = first?.data?.[field]
  const to = last?.data?.[field]
  const hasPair = comparable && from != null && to != null
  const change = hasPair ? +(to - from).toFixed(1) : null
  return <div className="progress-metric">
    <span>{label}</span>
    <strong>{to == null ? '—' : weight ? format.fmtWt(to) : `${to}%`}</strong>
    <small>{last ? `Latest · ${fmtDate(last.date)}` : 'No assessment recorded'}</small>
    {hasPair && <small className="progress-delta">From {weight ? format.fmtWt(from) : `${from}%`} · {signed(weight ? format.toDisp(change) : change, weight ? format.unitName() : 'percentage points')}</small>}
    {comparable && !hasPair && <small>Baseline or latest value missing; change unavailable.</small>}
  </div>
}

function OutcomeCard({ title, path, first, last, comparable, children, empty }) {
  return <section className="card progress-outcome">
    <div className="progress-section-head"><h2>{title}</h2><Link className="progress-source-link" to={path}>Assessment history →</Link></div>
    {!last ? <p className="muted">{empty}</p> : <>
      <div className="progress-date-pair"><span>Baseline: {fmtDate(first.date)}</span><span>Latest: {fmtDate(last.date)}</span></div>
      {children}
      {!comparable && <p className="progress-footnote">Baseline only. Record a reassessment to compare change.</p>}
    </>}
  </section>
}

export default function ClientProgressPage() {
  const { id } = useParams()
  const { db, tz } = useData()
  const format = useFormat()
  const [days, setDays] = useState(30)
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
      <div><h1>Progress</h1><div className="sub">Dated outcomes and completed bookings for {client.name}</div></div>
      <Link className="btn ghost" to={`/clients/${id}/assessments`}>Record an assessment</Link>
    </div>

    <StrengthDashboard client={client} />
    <details className="progress-disclosure"><summary>Manage tracked lifts and 1RM entries</summary><CurrentLiftsPerformance client={client} /></details>

    <section className="card progress-body">
      <div className="progress-section-head"><div><h2>Body measurements</h2><p className="muted">Compare like measurements from recorded body composition assessments.</p></div><Link className="progress-source-link" to={`/clients/${id}/assessments/body_comp`}>Assessment history →</Link></div>
      {body.last ? <>
        <div className="progress-date-pair"><span>Baseline: {fmtDate(body.first.date)} · {body.first.data?.method || 'method not recorded'}</span><span>Latest: {fmtDate(body.last.date)} · {body.last.data?.method || 'method not recorded'}</span></div>
        <div className="progress-metric-grid">
          <BodyMetric label="Body mass" field="massKg" first={body.first} last={body.last} comparable={body.comparable} weight format={format} />
          <BodyMetric label="Body fat" field="bodyFatPct" first={body.first} last={body.last} comparable={body.comparable} format={format} />
          <BodyMetric label="Lean mass" field="leanMassKg" first={body.first} last={body.last} comparable={body.comparable} weight format={format} />
        </div>
        {!body.comparable && <p className="progress-footnote">Baseline only. Record a reassessment to compare change.</p>}
        {body.comparable && body.first.data?.method !== body.last.data?.method && <p className="progress-caution">Measurement methods differ or were not recorded; interpret these changes carefully.</p>}
      </> : <p className="muted">No body composition assessment yet. Record a baseline to start tracking change.</p>}
    </section>

    <div className="progress-outcome-grid">
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

    <section className="card progress-attendance">
      <div className="progress-section-head"><div><h2>Booked session completion</h2><p className="muted">Scheduled appointments, from {fmtDate(attendance.start)} through {fmtDate(attendance.end)}.</p></div><label className="progress-lift-select">Period <select value={days} onChange={(e) => setDays(Number(e.target.value))}><option value={30}>30 days</option><option value={90}>90 days</option></select></label></div>
      <div className="progress-attendance-main"><strong>{attendance.percent == null ? '—' : `${attendance.percent}%`}</strong><span>{attendance.total ? `${attendance.completed} completed of ${attendance.total} past, non-cancelled booked appointments` : 'No past booked appointments in this period'}</span></div>
      {attendance.total > 0 && <div className="progress-bar" role="progressbar" aria-label="Booked session completion" aria-valuenow={attendance.percent} aria-valuemin={0} aria-valuemax={100}><div style={{ width: `${attendance.percent}%` }} /></div>}
      {(attendance.total > 0 || attendance.cancelled > 0 || attendance.todayCompleted > 0) && <div className="progress-attendance-details"><span>{attendance.unresolved} past booking{attendance.unresolved === 1 ? '' : 's'} still Pending/Confirmed</span><span>{attendance.cancelled} cancelled excluded</span><span>{attendance.todayCompleted} completed today (outside past-booking rate)</span></div>}
      <p className="progress-footnote">Past Pending/Confirmed bookings need a status update; they are not labelled missed. Separately, {completedWorkouts} completed workout log{completedWorkouts === 1 ? '' : 's'} in this period. <Link to={`/clients/${id}/training`}>View Training →</Link></p>
    </section>
  </>
}
