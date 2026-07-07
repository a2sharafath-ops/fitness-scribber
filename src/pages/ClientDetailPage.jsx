import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Avatar from '../components/atoms/Avatar'
import Button from '../components/atoms/Button'
import Tag from '../components/atoms/Tag'
import ReadinessTag from '../components/molecules/ReadinessTag'
import SegToggle from '../components/molecules/SegToggle'
import ConcernCard from '../components/molecules/ConcernCard'
import PlannerWidget from '../components/organisms/PlannerWidget'
import AICoach from '../components/organisms/AICoach'
import LoadResponseDashboard from '../components/organisms/LoadResponseDashboard'
import StrengthDashboard from '../components/organisms/StrengthDashboard'
import ProfilePanel from '../components/organisms/ProfilePanel'
import ClientSubnav from '../components/templates/ClientSubnav'
import CheckInModal from '../components/organisms/workout/CheckInModal'
import RPEModal from '../components/organisms/workout/RPEModal'
import { InviteAthleteForm } from '../components/organisms/forms/ClientForms'
import ConcernForm from '../components/organisms/forms/ConcernForm'
import { BodyMetricForm, QuickLogMenu } from '../components/organisms/forms/LogForms'
import { hasBackend } from '../lib/supabase'
import { useData } from '../store/DataContext'
import { useModal } from '../store/ModalContext'
import { uid } from '../lib/format'
import { toast, confirmDialog, promptDialog } from '../lib/toast'
import { calcSRPETL } from '../lib/calc'
import { fmtDate } from '../lib/dates'
import { lastNDates, todayISO } from '../lib/dates'
import { readinessFor, readinessScore, dailySum, acwrSeries, latestOf, rolling30Baseline, deviationPct } from '../lib/calc'
import { forClient, baselineProgress } from '../lib/assessment'
import Icon from '../components/atoms/Icon'

const SSTATUS = { Confirmed: 'green', Pending: 'orange', Completed: 'blue', Cancelled: 'gray' }

// Compact health metric card (Figma: Client Detail metrics row).
function MetricCard({ label, value, unit, state, color }) {
  return (
    <div className="metric-card">
      <div className="m-l">{label}</div>
      <div className="m-v">{value}{unit ? <span>{unit}</span> : null}</div>
      {state && <div className="m-s" style={{ color }}><span className="m-dot" style={{ background: color }} />{state}</div>}
    </div>
  )
}

export default function ClientDetailPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const { db, commit, tz, units } = useData()
  const { openModal } = useModal()
  const [win, setWin] = useState(7)         // rolling window for the analytics charts
  const [range, setRange] = useState(28)    // date range for the analytics charts
  const [profileOpen, setProfileOpen] = useState(false)
  const [checkinW, setCheckinW] = useState(null) // workout waiting to start until the check-in popup resolves
  const [rpeW, setRpeW] = useState(null)         // completed workout waiting for the RPE popup
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

  // Today's Workout — session state plus today's planner prescription, if any.
  const workouts = db.workouts || []
  const todayW = workouts.find((w) => w.clientId === c.id && w.date === today) || null
  const todayP = db.prescriptions.find((p) => p.clientId === c.id && p.date === today) || null
  const lastWear = latestOf(db.wearable, c.id)
  const well = latestOf(db.wellness, c.id)
  const hrvBase = lastWear ? rolling30Baseline(db, c.id, 'hrv', lastWear.date) : null
  const hrvDev = lastWear && hrvBase ? deviationPct(lastWear.hrv, hrvBase) : null
  const pastS = sessions.filter((s) => s.date <= today && s.status !== 'Cancelled')
  const doneS = pastS.filter((s) => s.status === 'Completed').length
  const adherence = pastS.length ? Math.round((doneS / pastS.length) * 100) : 0
  const restingHr = lastWear?.rhr ?? null
  const age = c.anthro?.age ?? null
  const saveWorkout = (w) => commit((d) => { d.workouts = [...(d.workouts || []).filter((x) => x.id !== w.id), w] })
  const saveTemplate = (plan) => commit((d) => { d.plans = [...d.plans, plan] })
  const clearWorkout = () => { if (!todayW) return; commit((d) => { d.workouts = (d.workouts || []).filter((x) => x.id !== todayW.id) }) }

  // Same flow as the athlete portal: ▶ Start pops the morning check-in (unless
  // already logged today); ✓ Complete pops the RPE + duration form.
  const checkedIn = db.wellness.some((w) => w.clientId === c.id && w.date === today)
  const startWorkout = (w) => { if (checkedIn) saveWorkout(w); else setCheckinW(w) }
  const submitCheckin = (v) => {
    const w = checkinW
    setCheckinW(null)
    commit((d) => {
      d.wellness = [...d.wellness, { id: uid(), clientId: c.id, ...v }]
      if (w) d.workouts = [...(d.workouts || []).filter((x) => x.id !== w.id), w]
    })
  }
  const skipCheckin = () => { const w = checkinW; setCheckinW(null); if (w) saveWorkout(w) }
  const requestComplete = (w) => setRpeW(w)
  const finishWorkout = (w, rpe, minutes) => {
    const durationSec = minutes != null ? Math.max(60, Math.round(minutes * 60)) : w.durationSec
    commit((d) => {
      d.workouts = [...(d.workouts || []).filter((x) => x.id !== w.id), { ...w, durationSec }]
      if (rpe != null) {
        const mins = Math.max(1, Math.round(durationSec ? durationSec / 60 : 30))
        d.srpe = [...d.srpe, { id: uid(), clientId: c.id, date: w.date, sessionId: null, rpe, duration: mins, tl: calcSRPETL(rpe, mins) }]
      }
    })
    setRpeW(null)
  }

  const baseProg = baselineProgress(forClient(db.assessments, c.id))

  const resolve = async (cid) => {
    const note = await promptDialog({ title: 'Resolve concern', message: 'Resolution note (optional):', multiline: true, confirmLabel: 'Resolve' })
    if (note === null) return
    commit((d) => { const x = d.concerns.find((q) => q.id === cid); x.status = 'Resolved'; x.resolution = note.trim() })
    toast('Concern resolved')
  }
  const reopen = (cid) => { commit((d) => { const x = d.concerns.find((q) => q.id === cid); x.status = 'Open'; x.resolution = '' }); toast('Concern reopened', 'info') }
  const delConcern = async (cid) => {
    if (!await confirmDialog({ title: 'Delete concern', message: 'Delete this concern? This cannot be undone.', confirmLabel: 'Delete', danger: true })) return
    commit((d) => { d.concerns = d.concerns.filter((q) => q.id !== cid) })
    toast('Concern deleted')
  }

  return (
    <>
      <ClientSubnav client={c} />
      <div className="topbar">
        <div>
          <h1>{c.name}</h1>
          <div className="sub">Clients / {c.name} / Overview</div>
        </div>
        <div className="flex gap">
          <Button variant="ghost" onClick={() => openModal(<BodyMetricForm clientId={c.id} />)}>＋ Log Progress</Button>
          {hasBackend && <Button variant="ghost" onClick={() => openModal(<InviteAthleteForm client={c} />)}><Icon name="link" size={14} /> Invite</Button>}
        </div>
      </div>

      {/* Client header card (Figma: Client Detail) — identity, quick stats & actions */}
      <div className="card client-header">
        <div className="ch-id" role="button" tabIndex={0} title="View full profile"
          onClick={() => setProfileOpen(true)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setProfileOpen(true) } }}>
          <Avatar name={c.name} size={64} />
          <div>
            <div className="ch-name">{c.name} <ReadinessTag readiness={readinessFor(db, c.id)} short /></div>
            <div className="ch-meta">Goal · {c.goal}{c.level ? ` · ${c.level}` : ''} · {c.email} · {c.phone}</div>
          </div>
        </div>
        <div className="ch-stats">
          <div className="ch-stat"><div className="v">{adherence}%</div><div className="l">ADHERENCE</div></div>
          <div className="ch-stat"><div className="v">{sessions.length}</div><div className="l">SESSIONS</div></div>
          <div className="ch-stat"><div className="v">{rScore ?? '—'}</div><div className="l">READINESS</div></div>
        </div>
        <div className="ch-actions">
          <Button variant="ghost" size="sm" onClick={() => nav('/messages')}>Message</Button>
          <Button variant="ghost" size="sm" onClick={() => nav('/monitor/' + c.id)}>Detailed logs</Button>
          <Button variant="ghost" size="sm" onClick={() => nav('/report/' + c.id)}>Report</Button>
          <Button size="sm" onClick={() => openModal(<QuickLogMenu clientId={c.id} />)}>＋ Quick log</Button>
        </div>
      </div>

      {baseProg.done < baseProg.total && (
        <div className="card onboard-banner" style={{ marginBottom: 12 }}>
          <div>
            <div style={{ fontWeight: 700 }}><Icon name="clipboard" size={14} /> Onboarding assessments incomplete</div>
            <div className="muted" style={{ fontSize: 12 }}>{baseProg.done}/{baseProg.total} baselines recorded · missing {baseProg.missing.length}</div>
          </div>
          <Button size="sm" onClick={() => nav('/clients/' + c.id + '/assessments')}>Complete now →</Button>
        </div>
      )}

      {/* Health metric cards (Figma: Client Detail) — latest wellness check-in + wearable */}
      <div className="metric-row">
        <MetricCard label="STRESS" value={well ? well.stress : '—'} unit={well ? '/7' : ''}
          state={well ? (well.stress >= 5 ? 'HIGH' : well.stress >= 3 ? 'MEDIUM' : 'LOW') : 'NO DATA'}
          color={well ? (well.stress >= 5 ? 'var(--accent)' : well.stress >= 3 ? 'var(--accent2)' : 'var(--green)') : 'var(--muted)'} />
        <MetricCard label="LAST HRV" value={lastWear ? lastWear.hrv : '—'} unit={lastWear ? 'ms' : ''}
          state={hrvDev == null ? (lastWear ? 'NO BASELINE' : 'NO DATA') : hrvDev < -8 ? 'SUPPRESSED' : 'STABLE'}
          color={hrvDev == null ? 'var(--muted)' : hrvDev < -8 ? 'var(--accent)' : 'var(--green)'} />
        <MetricCard label="RESTING HR" value={lastWear ? lastWear.rhr : '—'} unit={lastWear ? 'bpm' : ''}
          state={lastWear ? 'LATEST' : 'NO DATA'} color="var(--muted)" />
        <MetricCard label="SLEEP" value={well ? well.sleep : '—'} unit={well ? '/7' : ''}
          state={well ? (well.sleep >= 5 ? 'GOOD' : 'LOW') : 'NO DATA'}
          color={well ? (well.sleep >= 5 ? 'var(--green)' : 'var(--accent2)') : 'var(--muted)'} />
      </div>

      {/* Planner widget — Today's Workout by default, expandable to the week/month
          planner from the same card, with the AI coach beside it as a chat */}
      <div className="cc-wrap" style={{ marginTop: 16 }}>
        <div className="cc-main">
          <PlannerWidget client={c} size="medium" todayProps={{
            client: c, today, workout: todayW, prescription: todayP, plans: db.plans, exercises: db.exercises,
            units, context: { readiness: rScore, acwr }, restingHr, age, bodyMassKg: c.anthro?.massKg ?? null,
            onStart: startWorkout, onSave: saveWorkout, onComplete: requestComplete, onClear: clearWorkout, onTemplate: saveTemplate,
          }} />
        </div>
        <div className="cc-side"><AICoach client={c} /></div>
      </div>

      {/* Analytics — Load-Response + Strength context; rolling/range controls live here */}
      <div className="flex between" style={{ marginTop: 16, marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
        <div className="section-title" style={{ margin: 0 }}>Analytics</div>
        <div className="flex gap" style={{ flexWrap: 'wrap' }}>
          <span className="muted" style={{ fontSize: 11, fontWeight: 700 }}>ROLLING</span>
          <SegToggle options={[[1, 'Raw'], [7, '7-day'], [28, '28-day']]} value={win} onChange={setWin} ariaLabel="Rolling window" />
          <SegToggle options={[[28, '4 wk'], [56, '8 wk'], [90, '12 wk']]} value={range} onChange={setRange} ariaLabel="Date range" />
        </div>
      </div>
      <div className="overview-analytics" style={{ marginTop: 0 }}>
        <LoadResponseDashboard client={c} win={win} range={range} />
        <StrengthDashboard client={c} range={range >= 56 ? range : 90} />
      </div>

      {/* Secondary: Recent sessions (Today's Workout now lives in the planner widget above). */}
      <div className="grid cards-2" style={{ marginTop: 16, alignItems: 'start' }}>

        <div className="card">
          <div className="section-title" style={{ margin: '0 0 10px' }}>Recent sessions</div>
          {sessions.slice(0, 6).map((s) => (
            <div key={s.id} className="flex between" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span>{fmtDate(s.date)} · {s.time}</span><Tag color={SSTATUS[s.status]}>{s.status}</Tag>
            </div>
          ))}
          {!sessions.length && <div className="muted">No sessions yet</div>}
        </div>
      </div>

      {/* Concerns */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="flex between"><div className="section-title" style={{ margin: 0 }}>Flagged Concerns</div>
          <Button size="sm" onClick={() => openModal(<ConcernForm clientId={c.id} />)}><Icon name="flag" size={13} /> Flag a concern</Button></div>
        <div style={{ marginTop: 12 }}>
          {concerns.length ? concerns.sort((a, b) => (b.status === 'Open') - (a.status === 'Open') || b.date.localeCompare(a.date)).map((x) => (
            <ConcernCard key={x.id} concern={x} clientName={c.name} session={x.sessionId ? db.sessions.find((s) => s.id === x.sessionId) : null}
              onResolve={() => resolve(x.id)} onReopen={() => reopen(x.id)} onEdit={() => openModal(<ConcernForm concern={x} />)} onDelete={() => delConcern(x.id)} />
          )) : <div className="empty" style={{ padding: 24 }}><div className="big"><Icon name="flag" size={40} /></div>No concerns flagged.</div>}
        </div>
      </div>

      <ProfilePanel client={c} open={profileOpen} onClose={() => setProfileOpen(false)} />

      {checkinW && (
        <CheckInModal today={today} onSubmit={submitCheckin} onSkip={skipCheckin} onClose={() => setCheckinW(null)} />
      )}
      {rpeW && (
        <RPEModal workout={rpeW} age={age}
          onSubmit={(rpe, minutes) => finishWorkout(rpeW, rpe, minutes)}
          onSkip={(minutes) => finishWorkout(rpeW, null, minutes)} onClose={() => setRpeW(null)} />
      )}
    </>
  )
}
