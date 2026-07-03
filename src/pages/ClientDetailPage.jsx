import { useParams, useNavigate } from 'react-router-dom'
import Avatar from '../components/atoms/Avatar'
import Button from '../components/atoms/Button'
import Tag from '../components/atoms/Tag'
import ReadinessTag from '../components/molecules/ReadinessTag'
import ConcernCard from '../components/molecules/ConcernCard'
import WorkoutPlanner from '../components/organisms/WorkoutPlanner'
import AICoach from '../components/organisms/AICoach'
import TodayWorkout from '../components/organisms/workout/TodayWorkout'
import { InviteAthleteForm } from '../components/organisms/forms/ClientForms'
import ConcernForm from '../components/organisms/forms/ConcernForm'
import { BodyMetricForm } from '../components/organisms/forms/LogForms'
import { hasBackend } from '../lib/supabase'
import { useData } from '../store/DataContext'
import { useModal } from '../store/ModalContext'
import { uid } from '../lib/format'
import { calcSRPETL } from '../lib/calc'
import { fmtDate } from '../lib/dates'
import { lastNDates, todayISO } from '../lib/dates'
import { readinessFor, readinessScore, dailySum, acwrSeries, latestOf } from '../lib/calc'
import { forClient, baselineProgress } from '../lib/assessment'

const SSTATUS = { Confirmed: 'green', Pending: 'orange', Completed: 'blue', Cancelled: 'gray' }

export default function ClientDetailPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const { db, commit, tz, units } = useData()
  const { openModal } = useModal()
  const c = db.clients.find((x) => x.id === id)
  if (!c) return <Button className="back" variant="ghost" onClick={() => nav('/clients')}>← Clients</Button>

  const sessions = db.sessions.filter((s) => s.clientId === id).sort((a, b) => b.date.localeCompare(a.date))
  const concerns = db.concerns.filter((x) => x.clientId === id)

  // Readiness + ACWR still feed TodayWorkout's context; per-day metrics render inside the planner.
  const today = todayISO(tz)
  const intMap = dailySum(db.srpe, c.id, 'tl')
  const acwr = acwrSeries(intMap, lastNDates(28, tz)).filter((v) => v != null).slice(-1)[0]
  const rScore = readinessScore(db, c.id, today) ?? (() => {
    const d = [...lastNDates(28, tz)].reverse().find((x) => readinessScore(db, c.id, x) != null)
    return d ? readinessScore(db, c.id, d) : null
  })()

  // Today's Workout
  const workouts = db.workouts || []
  const todayW = workouts.find((w) => w.clientId === c.id && w.date === today) || null
  const lastWear = latestOf(db.wearable, c.id)
  const restingHr = lastWear?.rhr ?? null
  const age = c.anthro?.age ?? null
  const saveWorkout = (w) => commit((d) => { d.workouts = [...(d.workouts || []).filter((x) => x.id !== w.id), w] })
  const saveTemplate = (plan) => commit((d) => { d.plans = [...d.plans, plan] })
  const clearWorkout = () => { if (!todayW) return; commit((d) => { d.workouts = (d.workouts || []).filter((x) => x.id !== todayW.id) }) }
  const completeWorkout = (w) => {
    const maxHr = 220 - (age || 30)
    const rpe = w.hrMax ? Math.max(1, Math.min(10, Math.round((w.hrMax / maxHr) * 10))) : 6
    const minutes = w.durationSec ? Math.max(1, Math.round(w.durationSec / 60)) : 30
    commit((d) => {
      d.workouts = [...(d.workouts || []).filter((x) => x.id !== w.id), w]
      d.srpe = [...d.srpe, { id: uid(), clientId: c.id, date: w.date, sessionId: null, rpe, duration: minutes, tl: calcSRPETL(rpe, minutes) }]
    })
  }

  const baseProg = baselineProgress(forClient(db.assessments, c.id))

  const resolve = (cid) => { const note = prompt('Resolution note (optional):', ''); if (note === null) return; commit((d) => { const x = d.concerns.find((q) => q.id === cid); x.status = 'Resolved'; x.resolution = note.trim() }) }
  const reopen = (cid) => commit((d) => { const x = d.concerns.find((q) => q.id === cid); x.status = 'Open'; x.resolution = '' })
  const delConcern = (cid) => { if (confirm('Delete this concern?')) commit((d) => { d.concerns = d.concerns.filter((q) => q.id !== cid) }) }

  return (
    <>
      <button className="back" onClick={() => nav('/clients')}>← Back to clients</button>
      <div className="topbar">
        <div className="flex gap"><Avatar name={c.name} size={52} /><div>
          <h1>{c.name}</h1>
          <div className="sub">{c.email} · {c.phone} · <ReadinessTag readiness={readinessFor(db, c.id)} short /></div>
        </div></div>
        <div className="flex gap">
          <Button variant="ghost" onClick={() => nav('/clients/' + c.id + '/profile')}>👤 Profile</Button>
          <Button variant="ghost" onClick={() => nav('/clients/' + c.id + '/assessments')}>📋 Assessments</Button>
          <Button variant="ghost" onClick={() => openModal(<BodyMetricForm clientId={c.id} />)}>＋ Log Progress</Button>
          {hasBackend && <Button variant="ghost" onClick={() => openModal(<InviteAthleteForm client={c} />)}>🎟️ Invite</Button>}
        </div>
      </div>

      {baseProg.done < baseProg.total && (
        <div className="card onboard-banner" style={{ marginBottom: 12 }}>
          <div>
            <div style={{ fontWeight: 700 }}>📋 Onboarding assessments incomplete</div>
            <div className="muted" style={{ fontSize: 12 }}>{baseProg.done}/{baseProg.total} baselines recorded · missing {baseProg.missing.length}</div>
          </div>
          <Button size="sm" onClick={() => nav('/clients/' + c.id + '/assessments')}>Complete now →</Button>
        </div>
      )}

      {/* Load-Response now lives per-day inside the planner. Full charts/breakdowns are in the Command Center. */}
      <div className="flex between" style={{ marginBottom: 4 }}>
        <div className="section-title" style={{ margin: 0 }}>Load-Response by day</div>
        <Button variant="ghost" size="sm" onClick={() => nav('/command/' + c.id)}>Open full dashboard →</Button>
      </div>

      {/* Workout planner — the primary day-to-day tool, with the AI coach beside it as a chat */}
      <div className="cc-wrap" style={{ marginTop: 16 }}>
        <div className="cc-main"><WorkoutPlanner client={c} size="medium" /></div>
        <div className="cc-side"><AICoach client={c} /></div>
      </div>

      {/* Secondary: Today's Workout + Recent sessions. Today's Workout takes the
          full width only while a session is live; otherwise they sit side by side. */}
      <div className={'grid' + (todayW?.status === 'in_progress' ? '' : ' cards-2')} style={{ marginTop: 16, alignItems: 'start' }}>
        <TodayWorkout client={c} today={today} workout={todayW} plans={db.plans} exercises={db.exercises}
          units={units} context={{ readiness: rScore, acwr }} restingHr={restingHr} age={age} bodyMassKg={c.anthro?.massKg ?? null}
          onSave={saveWorkout} onComplete={completeWorkout} onClear={clearWorkout} onTemplate={saveTemplate} />

        <div className="card">
          <div className="section-title" style={{ margin: '0 0 10px' }}>Recent sessions</div>
          {sessions.slice(0, 6).map((s) => (
            <div key={s.id} className="flex between" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span>{fmtDate(s.date)} · {s.time}</span><Tag color={SSTATUS[s.status]}>{s.status}</Tag>
            </div>
          ))}
          {!sessions.length && <div className="muted">No sessions yet</div>}
          <Button variant="ghost" size="sm" style={{ marginTop: 12 }} onClick={() => nav('/command/' + c.id)}>View progress charts →</Button>
        </div>
      </div>

      {/* Concerns */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="flex between"><div className="section-title" style={{ margin: 0 }}>Flagged Concerns</div>
          <Button size="sm" onClick={() => openModal(<ConcernForm clientId={c.id} />)}>＋ Flag a concern</Button></div>
        <div style={{ marginTop: 12 }}>
          {concerns.length ? concerns.sort((a, b) => (b.status === 'Open') - (a.status === 'Open') || b.date.localeCompare(a.date)).map((x) => (
            <ConcernCard key={x.id} concern={x} clientName={c.name} session={x.sessionId ? db.sessions.find((s) => s.id === x.sessionId) : null}
              onResolve={() => resolve(x.id)} onReopen={() => reopen(x.id)} onEdit={() => openModal(<ConcernForm concern={x} />)} onDelete={() => delConcern(x.id)} />
          )) : <div className="empty" style={{ padding: 24 }}><div className="big">✅</div>No concerns flagged.</div>}
        </div>
      </div>
    </>
  )
}
