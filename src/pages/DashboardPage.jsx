import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bar } from 'react-chartjs-2'
import Button from '../components/atoms/Button'
import Icon from '../components/atoms/Icon'
import BulkWellnessForm from '../components/organisms/forms/BulkWellnessForm'
import SessionForm from '../components/organisms/forms/SessionForm'
import { ClientForm } from '../components/organisms/forms/ClientForms'
import { useData } from '../store/DataContext'
import { useModal } from '../store/ModalContext'
import { useFormat } from '../hooks/useFormat'
import { initials } from '../lib/format'
import { fmtDate, fmtDay } from '../lib/dates'
import { baseOptions } from '../lib/chartSetup'
import { dashboardActivity, dashboardClientPath, dashboardClock, dashboardData } from '../lib/dashboard'
import './DashboardPage.css'

function Empty({ title, detail, icon = 'calendar' }) {
  return <div className="db-empty"><span className="db-empty-icon"><Icon name={icon} size={20} /></span><strong>{title}</strong>{detail && <p>{detail}</p>}</div>
}

function Heading({ icon, tone, children, action }) {
  return <div className="db-head"><h2><span className={`db-section-icon db-${tone}`}><Icon name={icon} size={17} /></span>{children}</h2>{action}</div>
}

function Tabs({ label, options, value, onChange }) {
  return <div className="db-tabs" role="group" aria-label={label}>{options.map(([id, text]) => <button key={id} type="button" aria-pressed={value === id} onClick={() => onChange(id)}>{text}</button>)}</div>
}

// ModalProvider renders outside the router. Navigation stays in the page callback.
function DashboardClientPicker({ clients, title, onChoose }) {
  const [query, setQuery] = useState('')
  const rows = clients.filter(c => c.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
  return <div className="db-picker"><h2>{title}</h2><label htmlFor="dashboard-client-search">Find client by name</label><input id="dashboard-client-search" placeholder="Search clients…" value={query} onChange={e => setQuery(e.target.value)} /><div className="db-picker-list">{rows.map(c => <button key={c.id} type="button" onClick={() => onChoose(c.id)}><span>{c.name}</span><Icon name="chevron-right" size={16} /></button>)}{!rows.length && <p>{clients.length ? 'No matching clients.' : 'Add an active client first.'}</p>}</div></div>
}

export default function DashboardPage() {
  const { db, tz } = useData()
  const { openModal, closeModal } = useModal()
  const nav = useNavigate()
  const { fmtWt } = useFormat()
  const [now, setNow] = useState(() => new Date())
  const [reviewFilter, setReviewFilter] = useState('review')
  const [checkinFilter, setCheckinFilter] = useState('missing')
  const [metric, setMetric] = useState('sessions')
  const [period, setPeriod] = useState('28')
  const [trendsOpen, setTrendsOpen] = useState(false)
  useEffect(() => {
    const refresh = () => setNow(new Date())
    const interval = setInterval(refresh, 60000)
    document.addEventListener('visibilitychange', refresh)
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', refresh) }
  }, [])
  const clock = dashboardClock(now, tz)
  const { today } = clock
  const { clients, roster, bookings, next, recorded, missing, reviews, plans, noProgram, completion, strength } = dashboardData(db, clock)
  const reviewFirst = reviews.filter(r => r.kind === 'review'), followup = reviews.filter(r => r.kind === 'followup')
  const reviewRows = reviewFilter === 'review' ? reviewFirst : followup
  const checkinRows = checkinFilter === 'missing' ? missing : recorded
  const coverage = clients.length ? Math.round(recorded.length / clients.length * 100) : 0
  const activity = dashboardActivity(db, { today, days: +period, metric })
  const metricLabel = { sessions: 'Completed bookings', checkins: 'Recorded check-ins', load: 'Recorded session load (sRPE · AU)' }[metric]
  const pick = (purpose, subset = clients) => {
    const title = { overview: 'Find a client', assessment: 'Record an assessment', program: 'Assign a program', load: 'Review training load' }[purpose]
    openModal(<DashboardClientPicker clients={subset} title={title} onChoose={async id => {
      if (!await closeModal()) return
      nav(purpose === 'program' ? `/workouts?clientId=${encodeURIComponent(id)}` : dashboardClientPath(id, purpose === 'assessment' ? '/assessments' : purpose === 'load' ? '/progress#training-load' : ''))
    }} />)
  }
  const book = () => openModal(db.clients.length ? <SessionForm date={today} /> : <ClientForm />)
  const jump = id => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const base = baseOptions()
  const chartOptions = {
    ...base,
    plugins: { ...base.plugins, legend: { display: false }, tooltip: { callbacks: { title: items => { const b = activity.buckets[items[0].dataIndex]; return `${fmtDate(b.from)}–${fmtDate(b.through)} (${b.count} days)` } } } },
    scales: { x: { ...base.scales.x, grid: { display: false }, ticks: { ...base.scales.x.ticks, maxRotation: 0, autoSkip: true, maxTicksLimit: 7 } }, y: { ...base.scales.y, beginAtZero: true, suggestedMax: activity.hasData ? undefined : metric === 'load' ? 1000 : 10, ticks: { ...base.scales.y.ticks, precision: 0 } } },
  }
  const chartData = { labels: activity.buckets.map(b => fmtDay(b.from)), datasets: [{ label: metricLabel, data: activity.buckets.map(b => b.value), backgroundColor: '#426e5d', borderRadius: 5, maxBarThickness: 40 }] }

  return <div className="coach-dashboard">
    <header className="db-title"><div><h1>Dashboard</h1><p className="db-date">{fmtDay(today)} · {clock.time}{tz ? ` · ${tz.replaceAll('_', ' ')}` : ''}</p></div><div className="db-actions"><Button onClick={book}><Icon name="calendar" size={16} /> Book session</Button><details className="db-menu"><summary>More actions <Icon name="chevron-down" size={14} /></summary><div className="db-menu-list">{[['Add client', () => openModal(<ClientForm />)], ['Record assessment', () => pick('assessment')], ['Assign a program', () => pick('program')]].map(([text, action]) => <button key={text} type="button" onClick={e => { e.currentTarget.closest('details').open = false; action() }}>{text}</button>)}</div></details></div></header>
    {!db.clients.length && <section className="db-card db-onboard"><h2>Start with your first client</h2><p>Add a client, record a baseline, then plan their training.</p><div className="db-actions"><Button onClick={() => openModal(<ClientForm />)}>＋ Add client</Button><span>2. Record baseline</span><span>3. Plan training</span></div></section>}
    <div className="db-stats">
      <button className="db-stat" type="button" onClick={() => pick('overview')}><span>Active clients</span><strong>{clients.length}</strong><i className="db-stat-icon db-clients"><Icon name="users" size={21} /></i></button>
      <button className="db-stat" type="button" onClick={() => jump('dashboard-schedule')}><span>Bookings today</span><strong>{bookings.length}</strong><i className="db-stat-icon db-schedule"><Icon name="calendar" size={21} /></i></button>
      <button className="db-stat" type="button" onClick={() => jump('dashboard-checkins')}><span>Checked in today</span><strong>{recorded.length}<small> / {clients.length}</small></strong><i className="db-stat-icon db-checkin"><Icon name="check" size={21} /></i></button>
    </div>
    <div className="db-grid">
      <section className="db-card db-work-card" id="dashboard-schedule"><Heading icon="calendar" tone="schedule" action={<Link className="db-link" to="/schedule">Full schedule →</Link>}>Today’s schedule</Heading><div className="db-scroll" tabIndex={0} aria-label="Today’s bookings">{bookings.map(s => <div key={s.id} className={`db-row${s.id === next?.id ? ' db-next' : ''}`}><span className="db-time">{s.time || '—'}</span><span className="db-avatar">{initials(roster.get(s.clientId).name)}</span><div className="db-info"><strong>{roster.get(s.clientId).name}</strong><small>{s.type} · {s.dur ?? s.duration ?? 60} min</small><span className={`db-badge ${s.status === 'Completed' ? 'db-green' : ''}`}>{s.id === next?.id ? 'Up next · ' : ''}{s.status === 'Pending' ? 'Scheduled' : s.status}</span></div><button className="db-link db-row-action" type="button" aria-label={`Booking details for ${roster.get(s.clientId).name} at ${s.time}`} onClick={() => openModal(<SessionForm session={s} />)}>Details →</button></div>)}{!bookings.length && <Empty title="No bookings today" detail="Use Book session when you’re ready." />}</div><footer className="db-card-footer"><span>{bookings.filter(s => s.status === 'Completed').length} completed · {bookings.length} booked</span><span>{fmtDay(today)}</span></footer></section>
      <section className="db-card db-work-card"><Heading icon="alert" tone="review">Needs review <span className="db-count">{reviews.length}</span></Heading><Tabs label="Review category" options={[[ 'review', `Review first · ${reviewFirst.length}` ], ['followup', `Follow-up · ${followup.length}`]]} value={reviewFilter} onChange={setReviewFilter} /><div className="db-scroll" tabIndex={0} aria-label="Client review queue">{reviewRows.map(r => <div key={r.key} className={`db-row db-review-item db-tone-${r.tone}`}><div className="db-info"><strong>{r.client.name}</strong><small>{r.reason}</small><span className="db-review-detail">{r.detail}</span></div><Link className="db-link db-row-action" aria-label={`Review ${r.reason} for ${r.client.name}`} to={r.path}>Review →</Link></div>)}{!reviewRows.length && <Empty title={reviewFilter === 'review' ? 'No recorded items to review' : 'No follow-ups due'} detail={reviewFilter === 'review' ? 'Missing check-ins are listed below.' : undefined} icon="check" />}</div><footer className="db-card-footer"><span>Concerns, screening &amp; dated follow-ups</span><span>{reviewRows.length} items</span></footer></section>
    </div>
    <div className="db-grid db-sub-grid">
      <section className="db-card db-checkin-card" id="dashboard-checkins"><Heading icon="check" tone="checkin" action={<button className="db-link" type="button" disabled={!clients.length} onClick={() => openModal(<BulkWellnessForm />, true)}>Record check-ins →</button>}>Today’s check-ins</Heading><div className="db-coverage"><div className="db-coverage-ring" style={{ '--coverage': `${coverage}%` }} role="progressbar" aria-label="Check-in coverage" aria-valuemin={0} aria-valuemax={100} aria-valuenow={coverage}><span>{coverage}<small>%</small></span></div><div><div className="db-big">{recorded.length}<small> / {clients.length}</small></div><p>Active clients with a wellness check-in</p></div></div><Tabs label="Check-in filter" options={[[ 'missing', `Not recorded · ${missing.length}` ], ['recorded', `Recorded · ${recorded.length}`]]} value={checkinFilter} onChange={setCheckinFilter} /><div className="db-scroll" tabIndex={0} aria-label="Check-in clients">{checkinRows.map(c => <div className="db-row" key={c.id}><span className="db-avatar">{initials(c.name)}</span><div className="db-info"><strong>{c.name}</strong></div><Link className="db-link db-row-action" to={dashboardClientPath(c.id, '/check-ins?view=wellness')}>{checkinFilter === 'missing' ? 'Open check-in' : 'View check-in'} →</Link></div>)}{!checkinRows.length && <Empty title={!clients.length ? 'No active clients yet' : checkinFilter === 'missing' ? 'Everyone has checked in' : 'No check-ins recorded'} icon="check" />}</div></section>
      <section className="db-card db-plans-card"><Heading icon="dumbbell" tone="clients" action={<span className="db-date">Today</span>}>Planned workouts <span className="db-count">{plans.length}</span></Heading><div className="db-scroll" tabIndex={0} aria-label="Today’s prescribed workouts">{plans.map(p => <div className="db-row" key={p.id}><span className="db-avatar">{initials(p.client.name)}</span><div className="db-info"><strong>{p.client.name}</strong><small>{p.name || 'Planned workout'}{p.done ? ' · Completed' : ''}</small></div><Link className="db-link db-row-action" to={dashboardClientPath(p.clientId, `/training?date=${today}`)}>Training →</Link></div>)}{!plans.length && <Empty title="No workouts planned today" detail={clients.length ? 'Open a client to plan their training.' : 'Add a client to begin.'} icon="dumbbell" />}</div>{!!noProgram.length && <div className="db-notice"><span>{noProgram.length} client{noProgram.length === 1 ? '' : 's'} without a current or upcoming program</span><button className="db-link" type="button" onClick={() => pick('program', noProgram)}>View →</button></div>}</section>
    </div>
    <details className="db-card db-fold" onToggle={e => setTrendsOpen(e.currentTarget.open)}><summary><strong>Roster trends &amp; recent records</strong><small>Activity, booked completion &amp; strength</small></summary><div className="db-trend-body"><div className="db-chart-controls"><Tabs label="Activity metric" options={[[ 'sessions', 'Bookings completed' ], ['checkins', 'Check-ins'], ['load', 'Session load']]} value={metric} onChange={setMetric} /><label>Period <select aria-label="Activity period" value={period} onChange={e => setPeriod(e.target.value)}><option value="28">28 days</option><option value="90">90 days</option></select></label></div><p className="db-chart-heading">{metricLabel} · 7-day totals{activity.buckets.at(-1).count !== 7 ? `; final period ${activity.buckets.at(-1).count} days` : ''} · {fmtDate(activity.start)}–{fmtDate(activity.end)}</p><div className="db-chart">{trendsOpen && <Bar data={chartData} options={chartOptions} role="img" aria-label={`${metricLabel} from ${activity.start} through ${activity.end}${activity.hasData ? '' : '. No records in this period.'}`} />}</div>{!activity.hasData && <p className="db-chart-empty">No records in this period.</p>}{metric === 'load' && <><p className="db-note">Recorded load only; missing logs do not establish rest days.</p><button className="db-link" type="button" onClick={() => pick('load')}>View a client’s load records →</button></>}<div className="db-trend-bottom"><div><h3>Booked session completion · 30 days</h3><strong className="db-metric">{completion.total ? `${completion.completed} / ${completion.total}` : '—'}</strong><p>{completion.total ? `${completion.missed} missed · ${completion.pending} need a status update` : 'No past bookings recorded.'}</p><p>Past, non-cancelled bookings through {fmtDay(activity.end)}.</p><Link className="db-link" to="/schedule">Review bookings →</Link></div><div><h3>Latest strength estimate</h3>{strength ? <><strong className="db-metric">{fmtWt(+strength.valueKg)} <small>estimated 1RM</small></strong><p>{roster.get(strength.clientId).name} · {strength.exercise} · {fmtDay(strength.date)}</p><Link className="db-link" to={dashboardClientPath(strength.clientId, '/progress#strength')}>View strength →</Link></> : <p>No strength estimates recorded.</p>}</div></div></div></details>
  </div>
}
