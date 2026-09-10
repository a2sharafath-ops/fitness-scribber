import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Line } from 'react-chartjs-2'
import Avatar from '../components/atoms/Avatar'
import Button from '../components/atoms/Button'
import ReadinessTag from '../components/molecules/ReadinessTag'
import ConcernCard from '../components/molecules/ConcernCard'
import PlannerWidget from '../components/organisms/PlannerWidget'
import AICoach from '../components/organisms/AICoach'
import ProfilePanel from '../components/organisms/ProfilePanel'
import ClientSubnav from '../components/templates/ClientSubnav'
import CheckInModal from '../components/organisms/workout/CheckInModal'
import RPEModal from '../components/organisms/workout/RPEModal'
import WorkoutBuilderModal from '../components/organisms/program/WorkoutBuilderModal'
import { InviteAthleteForm } from '../components/organisms/forms/ClientForms'
import ConcernForm from '../components/organisms/forms/ConcernForm'
import { QuickLogMenu } from '../components/organisms/forms/LogForms'
import { hasBackend } from '../lib/supabase'
import { useData } from '../store/DataContext'
import { useModal } from '../store/ModalContext'
import { uid } from '../lib/format'
import { toast, confirmDialog, promptDialog } from '../lib/toast'
import { calcSRPETL } from '../lib/calc'
import { applyWorkoutStrength, removeWorkoutStrength, resolveTrainingMax } from '../lib/program'
import { baseOptions } from '../lib/chartSetup'
import { fmtDate } from '../lib/dates'
import { lastNDates, todayISO } from '../lib/dates'
import { readinessFor, readinessScore, dailySum, acwrSeries, latestOf, rolling30Baseline, deviationPct } from '../lib/calc'
import { forClient, baselineProgress } from '../lib/assessment'
import Icon from '../components/atoms/Icon'

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
  const [profileOpen, setProfileOpen] = useState(false)
  const [trendKey, setTrendKey] = useState('stress') // which 30-day trend the chart shows
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

  // Training streak — consecutive weeks (ending this week) with a completed session.
  const hasCompletedInWeek = (k) => {
    const end = new Date(Date.parse(today) - k * 7 * 86400000)
    const start = new Date(end.getTime() - 6 * 86400000)
    const s0 = start.toISOString().slice(0, 10), e0 = end.toISOString().slice(0, 10)
    return pastS.some((x) => x.status === 'Completed' && x.date >= s0 && x.date <= e0)
  }
  let streak = 0
  while (streak < 52 && hasCompletedInWeek(streak)) streak++

  // 30-day trend chart — selectable metric across wellness check-ins + wearable data.
  const TRENDS = {
    stress: { label: 'Stress', src: 'wellness', field: 'stress', sub: 'Daily check-ins', max: 7, goodDown: true, color: '#34c759', bg: 'rgba(52,199,89,.08)' },
    sleep: { label: 'Sleep', src: 'wellness', field: 'sleep', sub: 'Daily check-ins', max: 7, goodDown: false, color: '#5856d6', bg: 'rgba(88,86,214,.08)' },
    fatigue: { label: 'Fatigue', src: 'wellness', field: 'fatigue', sub: 'Daily check-ins', max: 7, goodDown: true, color: '#e8850c', bg: 'rgba(232,133,12,.08)' },
    soreness: { label: 'Soreness', src: 'wellness', field: 'soreness', sub: 'Daily check-ins', max: 7, goodDown: true, color: '#af52de', bg: 'rgba(175,82,222,.08)' },
    hrv: { label: 'HRV', src: 'wearable', field: 'hrv', sub: 'Wearable data', goodDown: false, color: '#0b87c9', bg: 'rgba(11,135,201,.08)' },
    rhr: { label: 'Resting HR', src: 'wearable', field: 'rhr', sub: 'Wearable data', goodDown: true, color: '#fb404a', bg: 'rgba(251,64,74,.08)' },
  }
  const tm = TRENDS[trendKey]
  const D30 = lastNDates(30, tz)
  const trendMap = {}
  ;(db[tm.src] || []).forEach((r) => { if (r.clientId === c.id && r[tm.field] != null) trendMap[r.date] = r[tm.field] })
  const trendSeries = D30.map((d) => trendMap[d] ?? null)
  const sVals = trendSeries.filter((v) => v != null)
  const half = Math.floor(sVals.length / 2)
  const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null)
  const sDelta = sVals.length >= 4 ? avg(sVals.slice(half)) - avg(sVals.slice(0, half)) : null
  const thresh = tm.max ? 0.4 : (avg(sVals) || 0) * 0.03
  const trend = (() => {
    if (sDelta == null) return null
    if (Math.abs(sDelta) < thresh) return ['→ Stable', 'var(--tint-blue)', 'var(--blue)']
    const arrow = sDelta < 0 ? '↓ Decreasing' : '↑ Increasing'
    const good = sDelta < 0 ? tm.goodDown : !tm.goodDown
    return [arrow, good ? 'var(--tint-green)' : 'var(--tint-red)', good ? 'var(--green)' : 'var(--accent)']
  })()

  // Current program + unified activity feed.
  const plan = c.planId ? db.plans.find((x) => x.id === c.planId) : null
  const activity = [
    ...sessions.filter((x) => x.status === 'Completed').map((x) => ({
      date: x.date, icon: 'check', tint: 'var(--tint-green)', fg: 'var(--green)',
      title: `Completed session · ${x.type}`, meta: `${fmtDate(x.date)} · ${x.time} · ${x.dur} min` })),
    ...sessions.filter((x) => x.status === 'Cancelled').map((x) => ({
      date: x.date, icon: 'clock', tint: 'var(--tint-amber)', fg: 'var(--accent2)',
      title: `Session cancelled · ${x.type}`, meta: `${fmtDate(x.date)} · ${x.time}` })),
    ...(db.wellness || []).filter((w) => w.clientId === c.id).map((w) => ({
      date: w.date, icon: 'heart', tint: 'var(--tint-red)', fg: 'var(--accent)',
      title: 'Logged morning check-in', meta: `${fmtDate(w.date)} · sleep ${w.sleep}/7 · stress ${w.stress}/7` })),
    ...(db.maxes || []).filter((m) => m.clientId === c.id && m.kind === 'e1rm').map((m) => ({
      date: m.date, icon: 'activity', tint: '#ebebfa', fg: '#5856d6',
      title: `New personal best · ${m.exercise}`, meta: `${fmtDate(m.date)} · ${m.valueKg} kg e1RM` })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6)
  const restingHr = lastWear?.rhr ?? null
  const age = c.anthro?.age ?? null
  const saveWorkout = (w) => commit((d) => { d.workouts = [...(d.workouts || []).filter((x) => x.id !== w.id), w] })
  const saveTemplate = (plan) => commit((d) => { d.plans = [...d.plans, plan] })
  const clearWorkout = () => {
    if (!todayW) return
    // Deleting a session also undoes the auto 1RM peaks it fed into the ledger
    // (no-op for a session that was never completed).
    commit((d) => {
      d.workouts = (d.workouts || []).filter((x) => x.id !== todayW.id)
      removeWorkoutStrength(d, todayW.id)
    })
  }

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
    const wc = { ...w, durationSec, status: 'completed' }
    let peaks = []
    commit((d) => {
      d.workouts = [...(d.workouts || []).filter((x) => x.id !== w.id), wc]
      if (rpe != null) {
        const mins = Math.max(1, Math.round(durationSec ? durationSec / 60 : 30))
        d.srpe = [...d.srpe, { id: uid(), clientId: c.id, date: w.date, sessionId: null, rpe, duration: mins, tl: calcSRPETL(rpe, mins) }]
      }
      // Automatic strength tracking: only completed sessions feed the 1RM ledger
      // that the workout builder reads for Training Max / %1RM targets.
      peaks = applyWorkoutStrength(d, wc)
    })
    setRpeW(null)
    peaks.forEach((e, i) => setTimeout(() => toast(
      `New estimated 1RM — ${e.exercise}: ${e.valueKg} kg${e.tracked ? ' (assessment updated)' : ''}`, 'info', 6000), i * 350))
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
      <div className="topbar">
        <div>
          <h1>{c.name}</h1>
          <div className="sub">Clients / {c.name} / Overview</div>
        </div>
        <div className="flex gap">
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
          <div className="ch-stat"><div className="v">{streak}w</div><div className="l">STREAK</div></div>
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

      {/* Section tabs sit just above the metric cards (Figma: Client Detail) */}
      <ClientSubnav client={c} tabsOnly />

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

      {/* Stress trend + current program (Figma: Client Detail) */}
      <div className="overview-trend">
        <div className="card">
          <div className="flex between" style={{ flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div className="section-title" style={{ margin: 0 }}>{tm.label} trend</div>
              <div className="muted" style={{ fontSize: 12 }}>{tm.sub} · last 30 days</div>
            </div>
            <div className="flex gap">
              {trend && <span className="trend-chip" style={{ background: trend[1], color: trend[2] }}>{trend[0]}</span>}
              <select value={trendKey} onChange={(e) => setTrendKey(e.target.value)} aria-label="Trend metric"
                style={{ width: 'auto', padding: '6px 10px', fontSize: 12, fontWeight: 600 }}>
                {Object.entries(TRENDS).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
              </select>
            </div>
          </div>
          {sVals.length > 1 ? (
            <div style={{ height: 190, marginTop: 12 }}>
              <Line
                data={{ labels: D30.map((d) => d.slice(5)), datasets: [{ data: trendSeries, borderColor: tm.color, backgroundColor: tm.bg, fill: true, tension: 0.35, spanGaps: true, pointRadius: 2, borderWidth: 2 }] }}
                options={{ ...baseOptions(), plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { color: '#9a9ba2', maxTicksLimit: 6, font: { size: 9 } } }, y: { ...(tm.max ? { min: 0, max: tm.max, ticks: { color: '#9a9ba2', stepSize: 1 } } : { ticks: { color: '#9a9ba2' } }), grid: { color: '#eceae7' } } } }} />
            </div>
          ) : (
            <div className="empty" style={{ padding: '36px 20px' }}>
              No {tm.label.toLowerCase()} data yet — {tm.src === 'wellness' ? `trends appear once ${c.name.split(' ')[0]} logs morning wellness` : 'trends appear once wearable data syncs'}.
            </div>
          )}
        </div>
        <div className="card">
          <div className="m-l" style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.5px', color: '#9a9ba2' }}>CURRENT PROGRAM</div>
          {plan ? (
            <>
              <div style={{ fontSize: 17, fontWeight: 700, margin: '6px 0 2px' }}>{plan.name}</div>
              <div className="muted" style={{ fontSize: 12 }}>{plan.desc} · {plan.items?.length || 0} exercises</div>
              <div className="progress-bar"><div style={{ width: adherence + '%' }} /></div>
              <div className="flex between" style={{ marginTop: 8 }}>
                <span className="muted" style={{ fontSize: 12 }}>{doneS}/{pastS.length} sessions completed</span>
                <button className="link-btn" onClick={() => nav('/workouts')}>View program →</button>
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 15, fontWeight: 700, margin: '6px 0 2px' }}>No plan assigned</div>
              <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>Assign a training plan so sessions and progress track against it.</div>
              <button className="link-btn" onClick={() => nav('/workouts')}>Assign in Workouts →</button>
            </>
          )}
        </div>
      </div>

      {/* Planner widget — Today's Workout by default, expandable to the week/month
          planner from the same card, with the AI coach beside it as a chat */}
      <div className="cc-wrap" style={{ marginTop: 16 }}>
        <div className="cc-main">
          <PlannerWidget client={c} size="medium" todayProps={{
            client: c, today, workout: todayW, prescription: todayP, plans: db.plans, exercises: db.exercises,
            units, context: { readiness: rScore, acwr }, restingHr, age, bodyMassKg: c.anthro?.massKg ?? null,
            resolveTm: (name) => resolveTrainingMax(db, c.id, name, today).kg,
            onStart: startWorkout, onSave: saveWorkout, onComplete: requestComplete, onClear: clearWorkout, onTemplate: saveTemplate,
            onAddSession: () => openModal(<WorkoutBuilderModal clientId={c.id} date={today} />, 'xl'),
          }} />
        </div>
        <div className="cc-side"><AICoach client={c} /></div>
      </div>

      {/* Recent activity — sessions, check-ins and PBs in one feed (Figma: Client Detail) */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="flex between">
          <div className="section-title" style={{ margin: 0 }}>Recent activity</div>
          <Button variant="ghost" size="sm" onClick={() => nav('/monitor/' + c.id)}>View all</Button>
        </div>
        <div style={{ marginTop: 6 }}>
          {activity.length ? activity.map((ev, i) => (
            <div key={i} className="act-row">
              <span className="act-chip" style={{ background: ev.tint, color: ev.fg }}><Icon name={ev.icon} size={16} /></span>
              <span className="act-info"><span className="t">{ev.title}</span><span className="s">{ev.meta}</span></span>
            </div>
          )) : <div className="empty" style={{ padding: 24 }}>No activity yet — completed sessions, check-ins and PBs land here.</div>}
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
