import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Line } from 'react-chartjs-2'
import Button from '../components/atoms/Button'
import Icon from '../components/atoms/Icon'
import SegToggle from '../components/molecules/SegToggle'
import BulkWellnessForm from '../components/organisms/forms/BulkWellnessForm'
import SessionForm from '../components/organisms/forms/SessionForm'
import { ClientForm } from '../components/organisms/forms/ClientForms'
import { useData } from '../store/DataContext'
import { useModal } from '../store/ModalContext'
import { initials } from '../lib/format'
import { todayISO, fmtDate, fmtDay, lastNDates, addDays } from '../lib/dates'
import { baseOptions } from '../lib/chartSetup'
import { squadRow, openConcerns } from '../lib/calc'
import { programStats } from '../lib/program'
import { forClient, dueStatus, REASSESS_TYPES, DEFAULT_REASSESS_DAYS, typeMeta } from '../lib/assessment'
import { screeningsFor, programStatus, rescreenDue } from '../lib/screening'

const RANK = { red: 0, yellow: 1, gray: 2, green: 3 }
const RANGE = { '1M': 30, '3M': 90, '6M': 180, '1Y': 365 }
const METRICS = [['sessions', 'Sessions'], ['load', 'Load'], ['checkins', 'Check-ins']]
const METRIC_META = {
  sessions: { sub: 'Completed sessions across your roster', empty: 'No completed sessions' },
  load: { sub: 'Roster training load (sRPE) — total across clients', empty: 'No training load' },
  checkins: { sub: 'Morning check-ins logged across your roster', empty: 'No check-ins' },
}
const SSTATUS_CHIP = { Completed: ['sc-green', 'Completed'], Confirmed: ['sc-green', 'Confirmed'], Pending: ['sc-gray', 'Scheduled'], Cancelled: ['sc-gray', 'Cancelled'] }
const shortD = (iso) => fmtDate(iso).replace(/,? *\d{4}$/, '')
const daysAgo = (iso, today) => Math.round((Date.parse(today) - Date.parse(iso)) / 86400000)

function Stat({ chipBg, chipColor, icon, num, label, pillClass, pill, trend, onClick }) {
  return (
    <button className="dash-stat" onClick={onClick} aria-label={`${label}: ${num}`}>
      <div className="dash-stat-head">
        <span className="dash-chip" style={{ background: chipBg, color: chipColor }}><Icon name={icon} size={18} /></span>
        {pill && <span className={'dash-pill ' + pillClass}>{pill}</span>}
      </div>
      <div className="dash-stat-num">
        {num}
        {trend != null && trend !== 0 && (
          <span className="dash-trend" style={{ color: trend > 0 ? 'var(--green)' : 'var(--accent)' }}>{trend > 0 ? '▲' : '▼'} {Math.abs(trend)}%</span>
        )}
      </div>
      <div className="dash-stat-label">{label}</div>
    </button>
  )
}

function StatusChip({ cls, label }) {
  return <span className={'sc ' + cls}><span className="sc-dot" />{label}</span>
}

// A single shortcut button in the quick-actions strip.
function QuickAction({ icon, label, tint, color, onClick }) {
  return (
    <button className="qa-btn" onClick={onClick} aria-label={label}>
      <span className="qa-ic" style={{ background: tint, color }}><Icon name={icon} size={17} /></span>
      <span className="qa-label">{label}</span>
    </button>
  )
}

// One step in the empty-state "Get started" checklist.
function OnboardStep({ n, done, title, desc, action, onClick }) {
  return (
    <div className={'onb-step' + (done ? ' done' : '')}>
      <span className="onb-num">{done ? '✓' : n}</span>
      <div className="onb-txt"><div className="onb-title">{title}</div><div className="onb-desc">{desc}</div></div>
      {done ? <span className="onb-tick">Done</span> : <button className="onb-btn" onClick={onClick}>{action}</button>}
    </div>
  )
}

// Circular progress ring (SVG). `pct` 0–100.
function Ring({ pct, size = 76, stroke = 8, color }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface2)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fontSize={size * 0.26} fontWeight="800" fill="var(--text)">{pct}%</text>
    </svg>
  )
}

export default function DashboardPage() {
  const { db, tz } = useData()
  const { openModal } = useModal()
  const nav = useNavigate()
  const [range, setRange] = useState('1M')
  const [metric, setMetric] = useState('sessions')
  const today = todayISO(tz)
  const nowHM = new Date().toTimeString().slice(0, 5)

  const active = db.clients.filter((c) => c.status === 'Active').length
  const todaySessions = [...db.sessions.filter((s) => s.date === today)].sort((a, b) => a.time.localeCompare(b.time))
  const upcoming = db.sessions.filter((s) => s.date >= today && s.status !== 'Completed' && s.status !== 'Cancelled').length
  // Session adherence over a rolling 30-day window (vs the previous 30 days for a
  // trend) — far more honest than an all-time % on a tiny sample.
  const ADH_WIN = 30
  const winStart = addDays(today, -ADH_WIN + 1)
  const prevStart = addDays(today, -2 * ADH_WIN + 1)
  const adhPct = (rows) => (rows.length ? Math.round((rows.filter((s) => s.status === 'Completed').length / rows.length) * 100) : null)
  const inWin = db.sessions.filter((s) => s.status !== 'Cancelled' && s.date >= winStart && s.date <= today)
  const inPrev = db.sessions.filter((s) => s.status !== 'Cancelled' && s.date >= prevStart && s.date < winStart)
  const doneWin = inWin.filter((s) => s.status === 'Completed').length
  const adhWin = adhPct(inWin)
  const adhPrev = adhPct(inPrev)
  const adhTrend = adhWin != null && adhPrev != null ? adhWin - adhPrev : null
  const openC = openConcerns(db)

  const squad = db.clients.map((c) => squadRow(db, c, tz)).sort((a, b) => RANK[a.r.color] - RANK[b.r.color] || b.openC - a.openC)
  const atRisk = squad.filter((x) => x.r.color === 'red').length
  const ready = squad.filter((x) => x.r.color === 'green').length
  const monitor = squad.filter((x) => x.r.color === 'yellow').length
  const tracked = squad.filter((x) => x.r.color !== 'gray').length

  // Roster activity — the selected metric bucketed across the range.
  const days = RANGE[range]
  const dates = lastNDates(days, tz)
  const seriesByDate = {}
  if (metric === 'load') db.srpe.forEach((r) => { seriesByDate[r.date] = (seriesByDate[r.date] || 0) + (+r.tl || 0) })
  else if (metric === 'checkins') db.wellness.forEach((w) => { seriesByDate[w.date] = (seriesByDate[w.date] || 0) + 1 })
  else db.sessions.forEach((s) => { if (s.status === 'Completed') seriesByDate[s.date] = (seriesByDate[s.date] || 0) + 1 })
  const perDay = dates.map((d) => seriesByDate[d] || 0)
  const B = 12
  const buckets = Array.from({ length: B }, (_, i) => {
    const a = Math.floor((i * perDay.length) / B), b = Math.floor(((i + 1) * perDay.length) / B)
    return perDay.slice(a, b).reduce((x, y) => x + y, 0)
  })
  const hasActivity = buckets.some((v) => v > 0)
  const chartData = { labels: buckets.map((_, i) => i), datasets: [{ data: buckets, borderColor: '#fb404a', backgroundColor: 'rgba(251,64,74,.12)', fill: true, tension: 0.4, borderWidth: 2, pointRadius: 0, pointHoverRadius: 4 }] }
  const chartOpts = { ...baseOptions(), plugins: { legend: { display: false } }, scales: { x: { display: false, grid: { display: false } }, y: { beginAtZero: true, grid: { color: '#eceae7' }, ticks: { color: '#9a9ba2', precision: 0 } } } }

  // Next upcoming session (today from now, or later).
  const next = db.sessions
    .filter((s) => s.status !== 'Completed' && s.status !== 'Cancelled' && (s.date > today || (s.date === today && s.time >= nowHM)))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0]
  const nextClient = next && db.clients.find((c) => c.id === next.clientId)

  // Needs attention — real triage from concerns, readiness, and check-in recency.
  const attention = squad.map((x) => {
    const high = openConcerns(db, x.c.id).some((q) => q.severity === 'High')
    const dsince = x.lastCheckin ? daysAgo(x.lastCheckin, today) : null
    if (x.openC > 0) return { c: x.c, reason: `${x.openC} open concern${x.openC > 1 ? 's' : ''}`, tone: high ? 'red' : 'amber', chip: high ? 'Overdue' : 'At risk', rank: high ? 0 : 1 }
    if (x.r.color === 'red') return { c: x.c, reason: 'Readiness at-risk', tone: 'amber', chip: 'At risk', rank: 1 }
    if (dsince != null && dsince >= 8) return { c: x.c, reason: `No check-in for ${dsince}d`, tone: 'red', chip: 'Overdue', rank: 2 }
    if (dsince == null && x.c.status === 'Active') return { c: x.c, reason: 'No check-in yet', tone: 'amber', chip: 'At risk', rank: 3 }
    return null
  }).filter(Boolean).sort((a, b) => a.rank - b.rank).slice(0, 4)

  // Roster readiness meter — distribution of today's readiness across the roster.
  const noData = db.clients.length - tracked
  const readinessSegs = [
    { key: 'green', label: 'Ready', n: ready, color: 'var(--green)' },
    { key: 'yellow', label: 'Monitor', n: monitor, color: 'var(--accent2)' },
    { key: 'red', label: 'At-risk', n: atRisk, color: 'var(--accent)' },
    { key: 'gray', label: 'No data', n: noData, color: '#c6c7cc' },
  ]

  // Load-risk spotlight — injury-risk flags from ACWR (> 1.5) and monotony (> 2).
  const loadRisk = squad
    .filter((x) => (x.acwr != null && x.acwr > 1.5) || (x.mono > 2 && x.wkLoad > 0))
    .map((x) => ({
      c: x.c,
      reason: x.acwr != null && x.acwr > 1.5
        ? `ACWR ${x.acwr} · elevated injury risk`
        : `Monotony ${x.mono.toFixed(1)} · low variation`,
    }))

  // Today's training board — who has a workout prescribed today vs a rest day,
  // and who has no program assigned at all.
  const activeClients = db.clients.filter((c) => c.status === 'Active')
  const trainingToday = []
  const noPlan = []
  activeClients.forEach((c) => {
    const presc = db.prescriptions.filter((p) => p.clientId === c.id && p.date === today)
    const ex = presc.reduce((n, p) => n + programStats(p).exercises, 0)
    if (ex > 0) trainingToday.push({ c, name: presc.map((p) => (p.notes || '').trim()).filter(Boolean).join(' · ') || `${ex} exercise${ex === 1 ? '' : 's'}` })
    if (!c.planId) noPlan.push(c)
  })
  const restToday = activeClients.length - trainingToday.length

  // Morning check-in coverage — active clients who logged wellness today.
  const checkedInIds = new Set(db.wellness.filter((w) => w.date === today).map((w) => w.clientId))
  const checkedInCount = activeClients.filter((c) => checkedInIds.has(c.id)).length
  const checkinPct = activeClients.length ? Math.round((checkedInCount / activeClients.length) * 100) : 0
  const missingCheckin = activeClients.length - checkedInCount
  const ringColor = checkinPct >= 80 ? 'var(--green)' : checkinPct >= 40 ? 'var(--accent2)' : 'var(--accent)'

  // Curio AI — the single most useful action for right now, in priority order:
  // injury risk → missing check-ins → unassigned programs → at-risk readiness.
  const curio = (() => {
    const bulk = () => openModal(<BulkWellnessForm />, true)
    if (loadRisk.length) {
      const first = loadRisk[0]
      return { title: `${loadRisk.length} client${loadRisk.length > 1 ? 's' : ''} in the injury-risk zone`,
        body: `${first.c.name}${loadRisk.length > 1 ? ` and ${loadRisk.length - 1} other${loadRisk.length > 2 ? 's' : ''}` : ''} — ${first.reason.toLowerCase()}. Consider a deload before their next block.`,
        label: 'Review load', onClick: () => nav('/monitor/' + first.c.id) }
    }
    if (missingCheckin > 0 && activeClients.length) {
      return { title: `${missingCheckin} client${missingCheckin > 1 ? 's haven’t' : ' hasn’t'} checked in today`,
        body: 'Readiness is only as good as check-in coverage. Log or request morning check-ins to keep the roster current.',
        label: 'Bulk check-in', onClick: bulk }
    }
    if (noPlan.length) {
      return { title: `${noPlan.length} active client${noPlan.length > 1 ? 's have' : ' has'} no program`,
        body: 'Assign a training plan so sessions and progress track against it.',
        label: 'Assign programs', onClick: () => nav('/clients') }
    }
    if (atRisk) {
      return { title: `${atRisk} client${atRisk > 1 ? 's' : ''} at-risk today`,
        body: 'Review the at-risk list before programming their next block.',
        label: 'Review roster', onClick: () => nav('/clients') }
    }
    if (tracked === 0) {
      return { title: 'Readiness needs data',
        body: 'Log morning wellness or connect wearables so Curio can surface readiness insights across your roster.',
        label: 'Bulk check-in', onClick: bulk }
    }
    return { title: 'Roster recovery looks strong',
      body: `${ready} of ${tracked} tracked client${tracked === 1 ? '' : 's'} ${ready === 1 ? 'is' : 'are'} ready to train today. Good window to progress well-recovered cohorts.`,
      label: 'Plan workouts', onClick: () => nav('/workouts') }
  })()

  // Compliance to-do — reassessments due, screening gates / re-screens, across
  // the roster, most urgent first.
  const interval = db.settings?.reassessIntervalDays || DEFAULT_REASSESS_DAYS
  const todo = []
  activeClients.forEach((c) => {
    const alist = forClient(db.assessments, c.id)
    const scr = screeningsFor(db.screenings, c.id).complete
    if (scr && programStatus(scr) === 'gated') todo.push({ c, label: 'Screening pending clearance', chip: 'Gated', tone: 'red', rank: 0, onClick: () => nav('/clients/' + c.id + '/profile') })
    else if (scr && rescreenDue(scr, today)) todo.push({ c, label: 'Health re-screen due', chip: 'Re-screen', tone: 'amber', rank: 1, onClick: () => nav('/clients/' + c.id + '/profile') })
    REASSESS_TYPES.forEach((t) => {
      const d = dueStatus(alist, t, interval)
      if (d.has && d.overdue) todo.push({ c, label: `${typeMeta(t).label} reassessment due`, chip: 'Reassess', tone: 'amber', rank: 2, onClick: () => nav(`/clients/${c.id}/assessments/${t}`) })
    })
  })
  todo.sort((a, b) => a.rank - b.rank)

  // Recent bests — newest estimated-1RM peaks logged across the roster.
  const wins = (db.maxes || [])
    .filter((m) => m.kind === 'e1rm')
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .map((m) => ({ m, c: db.clients.find((x) => x.id === m.clientId) }))
    .filter((w) => w.c)
    .slice(0, 5)

  // Empty-state onboarding — show the "Get started" checklist only for a genuinely
  // new setup (no baselines, no check-ins, no sessions yet), so it never nags an
  // established trainer.
  const hasClients = db.clients.length > 0
  const hasBaseline = (db.assessments || []).length > 0
  const hasCheckin = (db.wellness || []).length > 0 || (db.wearable || []).length > 0
  const showOnboarding = !hasBaseline && !hasCheckin && db.sessions.length === 0

  const dateLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Dashboard</h1>
          <div className="sub">{dateLabel}</div>
        </div>
        <div className="flex gap">
          <Button variant="ghost" onClick={() => openModal(<BulkWellnessForm />, true)}><Icon name="clipboard" size={15} /> Bulk morning check-in</Button>
          <Button onClick={() => openModal(<SessionForm />)}>＋ Book Session</Button>
        </div>
      </div>

      <div className="dash">
        {showOnboarding && (
          <div className="dash-onboard">
            <div className="onb-head">
              <span className="onb-head-ic"><Icon name="sparkles" size={18} /></span>
              <div>
                <div className="onb-head-title">Welcome — let’s set up your roster</div>
                <div className="onb-head-sub">Three quick steps and your dashboard comes to life.</div>
              </div>
            </div>
            <div className="onb-steps">
              <OnboardStep n={1} done={hasClients} title="Add your first client" desc="Build your roster" action="Add client" onClick={() => openModal(<ClientForm />)} />
              <OnboardStep n={2} done={hasBaseline} title="Record a baseline" desc="Fitness, movement &amp; body-comp" action="Open a client" onClick={() => nav('/clients')} />
              <OnboardStep n={3} done={hasCheckin} title="Log morning check-ins" desc="Powers readiness &amp; load" action="Bulk check-in" onClick={() => openModal(<BulkWellnessForm />, true)} />
            </div>
          </div>
        )}

        <div className="dash-stats">
          <Stat icon="users" chipBg="var(--tint-red)" chipColor="var(--accent)" num={active} label="Active clients"
            pillClass="sc-gray" pill={`${db.clients.length} total`} onClick={() => nav('/clients')} />
          <Stat icon="calendar" chipBg="#ebebfa" chipColor="#5856d6" num={todaySessions.length} label="Sessions today"
            pillClass="sc-indigo" pill={`${upcoming} upcoming`} onClick={() => nav('/schedule')} />
          <Stat icon="activity" chipBg="var(--tint-green)" chipColor="var(--green)" num={adhWin != null ? adhWin + '%' : '—'} label="Adherence · 30d"
            pillClass="sc-green" pill={inWin.length ? `${doneWin}/${inWin.length} sessions` : 'no sessions'} trend={adhTrend} onClick={() => nav('/schedule')} />
          <Stat icon="alert" chipBg="var(--tint-amber)" chipColor="var(--accent2)" num={atRisk} label="At-risk clients"
            pillClass="sc-amber" pill={`${openC.length} concern${openC.length === 1 ? '' : 's'}`} onClick={() => nav('/concerns')} />
        </div>

        <div className="qa-bar">
          <QuickAction icon="users" label="Add client" tint="var(--tint-red)" color="var(--accent)" onClick={() => openModal(<ClientForm />)} />
          <QuickAction icon="calendar" label="Book session" tint="#ebebfa" color="#5856d6" onClick={() => openModal(<SessionForm />)} />
          <QuickAction icon="clipboard" label="Morning check-in" tint="var(--tint-green)" color="var(--green)" onClick={() => openModal(<BulkWellnessForm />, true)} />
          <QuickAction icon="dumbbell" label="Prescribe workout" tint="var(--tint-blue)" color="var(--blue)" onClick={() => nav('/workouts')} />
          <QuickAction icon="activity" label="Record assessment" tint="var(--tint-amber)" color="var(--accent2)" onClick={() => nav('/clients')} />
          <QuickAction icon="alert" label="Review concerns" tint="var(--tint-amber)" color="var(--accent2)" onClick={() => nav('/concerns')} />
        </div>

        {/* ── TODAY ── schedule, next session, today's programming */}
        <div className="dash-zone">Today</div>
        <div className="dash-lists">
          <div className="dash-list clickable" role="button" tabIndex={0}
            onClick={() => nav('/schedule')} onKeyDown={(e) => { if (e.key === 'Enter') nav('/schedule') }} aria-label="Open schedule">
            <div className="dash-list-head">
              <div className="dash-list-title">Today's schedule</div>
              <button className="dash-viewall" onClick={(e) => { e.stopPropagation(); nav('/schedule') }}>View all</button>
            </div>
            {todaySessions.length ? todaySessions.map((s) => {
              const c = db.clients.find((x) => x.id === s.clientId)
              const isNext = next && s.id === next.id
              const [cls, label] = isNext && s.status !== 'Completed' ? ['sc-indigo', 'Up next'] : (SSTATUS_CHIP[s.status] || ['sc-gray', s.status])
              return (
                <button key={s.id} className="dash-row" onClick={(e) => { e.stopPropagation(); openModal(<SessionForm session={s} />) }}>
                  <span className="dash-time">{s.time}</span>
                  <span className="dash-rinfo"><div className="t">{s.type}</div><div className="s">{c?.name || 'Client'}</div></span>
                  <StatusChip cls={cls} label={label} />
                </button>
              )
            }) : <div className="empty"><div className="big"><Icon name="coffee" size={40} /></div>No sessions today. Enjoy the rest!</div>}
          </div>

          <div className="dash-side">
            {next ? (
              <button className="dash-next" onClick={() => nav('/schedule')} aria-label="Open schedule">
                <div className="dash-next-label">NEXT SESSION · {next.date === today ? next.time : fmtDay(next.date) + ' ' + next.time}</div>
                <div className="dash-next-title">{next.type} · {nextClient?.name || 'Client'}</div>
                <div className="dash-next-sub">{next.dur} min · {nextClient?.goal || 'Session'}</div>
              </button>
            ) : (
              <button className="dash-next" onClick={() => nav('/schedule')} aria-label="Open schedule">
                <div className="dash-next-label">NEXT SESSION</div>
                <div className="dash-next-title">Nothing scheduled</div>
                <div className="dash-next-sub">Book a session to see it here.</div>
              </button>
            )}

            <div className="dash-card clickable" role="button" tabIndex={0}
              onClick={() => nav('/workouts')} onKeyDown={(e) => { if (e.key === 'Enter') nav('/workouts') }} aria-label="Open workouts">
              <div className="dash-card-head">
                <div style={{ flex: 1 }}>
                  <div className="dash-card-title">Today's training</div>
                  <div className="dash-card-sub">Prescribed workouts for {shortD(today)}</div>
                </div>
                <span className="muted" style={{ fontSize: 12 }}>{trainingToday.length} training · {restToday} rest</span>
              </div>
              {trainingToday.length ? trainingToday.slice(0, 4).map((t) => (
                <button key={t.c.id} className="dash-row" onClick={(e) => { e.stopPropagation(); nav('/clients/' + t.c.id) }}>
                  <span className="dash-att-av" style={{ background: 'var(--tint-blue)', color: 'var(--blue)' }}><Icon name="dumbbell" size={15} /></span>
                  <span className="dash-rinfo"><div className="t">{t.c.name}</div><div className="s">{t.name}</div></span>
                </button>
              )) : <div className="empty" style={{ padding: 20 }}><div className="big"><Icon name="coffee" size={34} /></div>No workouts prescribed today.</div>}
              {noPlan.length ? (
                <button className="dash-noplan" onClick={(e) => { e.stopPropagation(); nav('/clients') }}>
                  <Icon name="alert" size={13} /> {noPlan.length} active client{noPlan.length === 1 ? '' : 's'} with no program assigned
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {/* ── ROSTER HEALTH ── readiness, load, wins, attention */}
        <div className="dash-zone">Roster health</div>
        <div className="dash-insights">
          <div className="dash-card clickable" style={{ display: 'flex', flexDirection: 'column' }} role="button" tabIndex={0}
            onClick={() => nav('/schedule')} onKeyDown={(e) => { if (e.key === 'Enter') nav('/schedule') }} aria-label="Open schedule">
            <div className="dash-card-head">
              <div style={{ flex: 1 }}>
                <div className="dash-card-title">Roster activity</div>
                <div className="dash-card-sub">{METRIC_META[metric].sub}</div>
              </div>
              <span className="dash-chart-toggles" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                <SegToggle options={METRICS} value={metric} onChange={setMetric} ariaLabel="Activity metric" />
                <SegToggle options={Object.keys(RANGE).map((k) => [k, k])} value={range} onChange={setRange} ariaLabel="Activity range" />
              </span>
            </div>
            {hasActivity ? (
              <>
                <div style={{ height: 220 }}><Line data={chartData} options={chartOpts} /></div>
                <div className="dash-xlabels"><span>{shortD(dates[0])}</span><span>{shortD(dates[dates.length - 1])}</span></div>
              </>
            ) : (
              <div className="empty" style={{ padding: '48px 20px' }}><div className="big"><Icon name="chart" size={40} /></div>{METRIC_META[metric].empty} in this range yet.</div>
            )}
          </div>

          <div className="dash-side">
            <div className="dash-ai">
              <div className="dash-ai-head">
                <span className="dash-ai-chip"><Icon name="sparkles" size={14} /></span>
                <span className="dash-ai-tag">CURIO AI</span>
              </div>
              <div className="dash-ai-title">{curio.title}</div>
              <div className="dash-ai-body">{curio.body}</div>
              <button className="dash-ai-btn" onClick={curio.onClick}>{curio.label} →</button>
            </div>
          </div>
        </div>

        <div className="dash-health">
          <div className="dash-card dash-readiness clickable" role="button" tabIndex={0}
            onClick={() => nav('/clients')} onKeyDown={(e) => { if (e.key === 'Enter') nav('/clients') }} aria-label="Open clients roster">
            <div className="dash-card-head">
              <div style={{ flex: 1 }}>
                <div className="dash-card-title">Roster readiness</div>
                <div className="dash-card-sub">Today, from morning check-ins &amp; wearables</div>
              </div>
              <span className="muted" style={{ fontSize: 12 }}>{tracked} of {db.clients.length} with data</span>
            </div>
            <div className="rd-body">
              <div className="rd-main">
                {tracked ? (
                  <>
                    <div className="rd-bar">
                      {readinessSegs.filter((s) => s.n > 0).map((s) => (
                        <span key={s.key} className="rd-seg" style={{ flex: s.n, background: s.color }} title={`${s.label}: ${s.n}`} />
                      ))}
                    </div>
                    <div className="rd-legend">
                      {readinessSegs.map((s) => <span key={s.key} className="rd-leg"><i style={{ background: s.color }} />{s.label} <b>{s.n}</b></span>)}
                    </div>
                    <div className="rd-avatars">
                      {squad.filter((x) => x.r.color !== 'gray').slice(0, 16).map((x) => (
                        <span key={x.c.id} className={'rd-av rd-' + x.r.color} title={`${x.c.name} — ${x.r.label || x.r.color}`}>{initials(x.c.name)}</span>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="empty" style={{ padding: '20px 0' }}><div className="big"><Icon name="heart" size={34} /></div>No readiness data yet — log morning check-ins to populate.</div>
                )}
              </div>
              <div className="rd-checkin">
                <Ring pct={checkinPct} color={ringColor} />
                <div className="rd-checkin-lbl"><b>{checkedInCount}/{activeClients.length}</b> checked in today</div>
                {missingCheckin > 0 && (
                  <button className="rd-checkin-btn" onClick={(e) => { e.stopPropagation(); openModal(<BulkWellnessForm />, true) }}>
                    <Icon name="clipboard" size={13} /> Bulk check-in
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="dash-health-row">
            <div className="dash-card clickable" role="button" tabIndex={0}
              onClick={() => nav('/clients')} onKeyDown={(e) => { if (e.key === 'Enter') nav('/clients') }} aria-label="Load-risk clients">
              <div className="dash-card-head">
                <div style={{ flex: 1 }}>
                  <div className="dash-card-title">Load-risk spotlight {loadRisk.length ? <span className="dash-count-badge">{loadRisk.length}</span> : null}</div>
                  <div className="dash-card-sub">ACWR &amp; monotony injury-risk flags</div>
                </div>
              </div>
              {loadRisk.length ? loadRisk.slice(0, 4).map((x) => (
                <button key={x.c.id} className="dash-row" onClick={(e) => { e.stopPropagation(); nav('/monitor/' + x.c.id) }}>
                  <span className="dash-att-av" style={{ background: 'var(--tint-red)', color: 'var(--accent)' }}>{initials(x.c.name)}</span>
                  <span className="dash-rinfo"><div className="t">{x.c.name}</div><div className="s">{x.reason}</div></span>
                  <StatusChip cls="sc-red" label="Review load" />
                </button>
              )) : <div className="empty" style={{ padding: 20 }}><div className="big"><Icon name="check" size={34} /></div>No load-risk flags — training loads look balanced.</div>}
            </div>

            <div className="dash-list clickable" role="button" tabIndex={0}
              onClick={() => nav('/concerns')} onKeyDown={(e) => { if (e.key === 'Enter') nav('/concerns') }} aria-label="Open concerns">
              <div className="dash-list-head">
                <div className="dash-list-title">Needs attention</div>
                <button className="dash-viewall" onClick={(e) => { e.stopPropagation(); nav('/concerns') }}>View all</button>
              </div>
              {attention.length ? attention.map((a) => (
                <button key={a.c.id} className="dash-row" onClick={(e) => { e.stopPropagation(); nav('/clients/' + a.c.id) }}>
                  <span className="dash-att-av" style={a.tone === 'red' ? { background: 'var(--tint-red)', color: 'var(--accent)' } : { background: 'var(--tint-amber)', color: 'var(--accent2)' }}>{initials(a.c.name)}</span>
                  <span className="dash-rinfo"><div className="t">{a.c.name}</div><div className="s">{a.reason}</div></span>
                  <StatusChip cls={a.tone === 'red' ? 'sc-red' : 'sc-amber'} label={a.chip} />
                </button>
              )) : <div className="empty" style={{ padding: 24 }}><div className="big"><Icon name="check" size={40} /></div>All clear — no clients need attention.</div>}
            </div>
          </div>
        </div>

        {/* Compliance to-do + recent bests */}
        <div className="dash-health-row">
          <div className="dash-card clickable" role="button" tabIndex={0}
            onClick={() => nav('/clients')} onKeyDown={(e) => { if (e.key === 'Enter') nav('/clients') }} aria-label="Assessment & screening to-dos">
            <div className="dash-card-head">
              <div style={{ flex: 1 }}>
                <div className="dash-card-title">To-do {todo.length ? <span className="dash-count-badge">{todo.length}</span> : null}</div>
                <div className="dash-card-sub">Reassessments &amp; health screenings due</div>
              </div>
            </div>
            {todo.length ? todo.slice(0, 5).map((t, i) => (
              <button key={t.c.id + '-' + i} className="dash-row" onClick={(e) => { e.stopPropagation(); t.onClick() }}>
                <span className="dash-att-av" style={t.tone === 'red' ? { background: 'var(--tint-red)', color: 'var(--accent)' } : { background: 'var(--tint-amber)', color: 'var(--accent2)' }}>{initials(t.c.name)}</span>
                <span className="dash-rinfo"><div className="t">{t.c.name}</div><div className="s">{t.label}</div></span>
                <StatusChip cls={t.tone === 'red' ? 'sc-red' : 'sc-amber'} label={t.chip} />
              </button>
            )) : <div className="empty" style={{ padding: 20 }}><div className="big"><Icon name="check" size={34} /></div>All assessments &amp; screenings up to date.</div>}
          </div>

          <div className="dash-card">
            <div className="dash-card-head">
              <div style={{ flex: 1 }}>
                <div className="dash-card-title">Recent bests</div>
                <div className="dash-card-sub">New estimated-1RM peaks across your roster</div>
              </div>
            </div>
            {wins.length ? wins.map((w, i) => (
              <button key={(w.m.id || '') + '-' + i} className="dash-row" onClick={() => nav('/clients/' + w.c.id)}>
                <span className="dash-att-av" style={{ background: 'var(--tint-green)', color: 'var(--green)' }}><Icon name="activity" size={15} /></span>
                <span className="dash-rinfo"><div className="t">{w.c.name} · {w.m.exercise}</div><div className="s">{w.m.valueKg} kg 1RM · {shortD(w.m.date)}</div></span>
              </button>
            )) : <div className="empty" style={{ padding: 20 }}><div className="big"><Icon name="activity" size={34} /></div>No personal bests logged yet.</div>}
          </div>
        </div>
      </div>
    </>
  )
}
