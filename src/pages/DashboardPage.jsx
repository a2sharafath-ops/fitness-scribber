import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useOutletContext } from 'react-router-dom'
import { Bar } from 'react-chartjs-2'
import Button from '../components/atoms/Button'
import Icon from '../components/atoms/Icon'
import DashboardBookings from '../components/organisms/DashboardBookings'
import DashboardWeekly from '../components/organisms/DashboardWeekly'
import DashboardInsights from '../components/organisms/DashboardInsights'
import DayBlockReview from '../components/organisms/program/DayBlockReview'
import ModalShell from '../components/molecules/ModalShell'
import BulkWellnessForm from '../components/organisms/forms/BulkWellnessForm'
import SessionForm from '../components/organisms/forms/SessionForm'
import { ClientForm } from '../components/organisms/forms/ClientForms'
import { useData } from '../store/DataContext'
import { useModal } from '../store/ModalContext'
import { useFormat } from '../hooks/useFormat'
import { initials } from '../lib/format'
import { fmtDate, fmtDay } from '../lib/dates'
import { baseOptions } from '../lib/chartSetup'
import { dashboardActivity, dashboardClientPath, dashboardClock, dashboardData, dashboardReadiness, dashboardWeeks } from '../lib/dashboard'
import { scheduleSort, sessionPath, weekOf } from '../lib/schedule'
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
  const { db, tz, units } = useData()
  const { openModal, closeModal } = useModal()
  const nav = useNavigate()
  const { hash: locationHash } = useLocation()
  const theme = useOutletContext()
  const { fmtWt } = useFormat()
  const [now, setNow] = useState(() => new Date())
  const [reviewFilter, setReviewFilter] = useState('review')
  const [checkinFilter, setCheckinFilter] = useState('missing')
  const [metric, setMetric] = useState('sessions')
  const [period, setPeriod] = useState('28')
  const [chartSelection, setChartSelection] = useState(null)
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
  const group = dashboardReadiness(db, clients, today)
  const ownedBookings = db.sessions.filter((booking) => roster.has(booking.clientId))
  const monday = weekOf(today)
  const upcoming = ownedBookings.filter((booking) => booking.date > today && ['Pending', 'Confirmed'].includes(booking.status)).sort(scheduleSort).slice(0, 4)
  const insights = [
    { title: 'Check-in coverage', detail: `${recorded.length} of ${clients.length} active clients checked in today.`, path: '/#dashboard-checkins', action: 'View readiness' },
    { title: 'Items to review', detail: `${reviewFirst.length} to review and ${followup.length} follow-up items on the dashboard.`, path: '/#dashboard-review', action: 'View review queue' },
    { title: 'Booking completion', detail: completion.total ? `${completion.completed} of ${completion.total} bookings were completed in the past 30 days.` : 'There are no past bookings in the last 30 days.', path: '/schedule', action: 'View schedule' },
  ]
  const toPercent = (value) => group.count ? value * 100 / group.count : 0
  const highShare = toPercent(group.high)
  const midBoundary = highShare + toPercent(group.medium)
  const readinessRing = group.count ? `conic-gradient(var(--green) 0 ${highShare}%, #da9d38 ${highShare}% ${midBoundary}%, var(--accent) ${midBoundary}% 100%)` : 'var(--border)'
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
  const jump = id => document.getElementById(id)?.scrollIntoView({ behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
  const showWeeklyReport = () => {
    const [week] = dashboardWeeks(ownedBookings, monday, 1)
    openModal(<ModalShell title="Weekly report" onClose={() => closeModal()} footer={<Button variant="ghost" onClick={() => closeModal()}>Close</Button>}>
      <p>{fmtDate(week.from)}–{fmtDate(week.through)}</p>
      <dl className="orbit-report-stats">
        <div><dt>Booked sessions</dt><dd>{week.booked}</dd></div>
        <div><dt>Completed</dt><dd>{week.completed}</dd></div>
        <div><dt>Missed</dt><dd>{week.missed}</dd></div>
        <div><dt>Pending or confirmed</dt><dd>{week.booked - week.completed - week.missed}</dd></div>
      </dl>
    </ModalShell>)
  }
  const showPlan = (prescription) => openModal(<ModalShell title={prescription.name || 'Workout plan'} onClose={() => closeModal()}
    footer={<Button variant="ghost" onClick={() => closeModal()}>Close</Button>}>
    <p className="muted">{fmtDate(prescription.date)} · Planned targets</p>
    <DayBlockReview prescription={prescription} units={units} />
  </ModalShell>, true)
  useEffect(() => {
    if (locationHash === '#dashboard-review' || locationHash === '#dashboard-checkins') {
      document.getElementById(locationHash.slice(1))?.scrollIntoView()
    }
  }, [locationHash])
  const base = theme === 'dark' ? baseOptions('#4d414f', '#c4b8c5') : baseOptions('#e6dfe5', '#605762')
  const chartOptions = {
    ...base,
    onHover: (_event, points) => { if (points.length) setChartSelection(points[0].index) },
    plugins: { ...base.plugins, legend: { display: false }, tooltip: { callbacks: { title: items => { const b = activity.buckets[items[0].dataIndex]; return `${fmtDate(b.from)}–${fmtDate(b.through)} (${b.count} days)` } } } },
    scales: { x: { ...base.scales.x, grid: { display: false }, ticks: { ...base.scales.x.ticks, maxRotation: 0, autoSkip: true, maxTicksLimit: 7 } }, y: { ...base.scales.y, beginAtZero: true, suggestedMax: activity.hasData ? undefined : metric === 'load' ? 1000 : 10, ticks: { ...base.scales.y.ticks, precision: 0 } } },
  }
  const chartData = { labels: activity.buckets.map(b => fmtDay(b.from)), datasets: [{ label: metricLabel, data: activity.buckets.map(b => b.value), backgroundColor: '#dc465e', borderRadius: 5, maxBarThickness: 40 }] }

  return <div className="coach-dashboard">
    <header className="db-title"><div><p className="db-date">{fmtDay(today)} · {clock.time}</p><h1>{db.settings?.trainerName ? `Welcome, ${db.settings.trainerName.trim().split(/\s+/)[0]}.` : 'Dashboard'}</h1></div><div className="db-actions"><Button variant="ghost" onClick={showWeeklyReport}><Icon name="calendar" size={16} /> Weekly report</Button><Button onClick={book}><Icon name="calendar" size={16} /> Book session</Button><details className="db-menu"><summary>More actions <Icon name="chevron-down" size={14} /></summary><div className="db-menu-list">{[['Add client', () => openModal(<ClientForm />)], ['Record assessment', () => pick('assessment')], ['Assign a program', () => pick('program')]].map(([text, action]) => <button key={text} type="button" onClick={e => { e.currentTarget.closest('details').open = false; action() }}>{text}</button>)}</div></details></div></header>
    {!db.clients.length && <section className="db-card db-onboard"><h2>Start with your first client</h2><p>Add a client, record a baseline, then plan their training.</p><div className="db-actions"><Button onClick={() => openModal(<ClientForm />)}>＋ Add client</Button><span>2. Record baseline</span><span>3. Plan training</span></div></section>}
    <div className="orbit-dashboard-grid">
      <DashboardBookings db={db} bookings={bookings} roster={roster} next={next} today={today} onPlan={showPlan} onDetails={(booking) => openModal(<SessionForm session={booking} />)} />
      <div className="orbit-dashboard-column">
      <section className="db-card orbit-coaching" aria-labelledby="orbit-coaching-title">
        <header className="db-head"><h2 id="orbit-coaching-title">Coaching overview</h2></header>
        <div className="db-stats">
          <button className="db-stat" type="button" onClick={() => pick('overview')}><span>Active clients</span><strong>{clients.length}</strong></button>
          <button className="db-stat" type="button" onClick={() => jump('dashboard-schedule')}><span>Bookings today</span><strong>{bookings.length}</strong></button>
          <button className="db-stat" type="button" onClick={() => jump('dashboard-checkins')}><span>Checked in today</span><strong>{recorded.length}<small> / {clients.length}</small></strong></button>
        </div>
        <div className="db-chart-controls">
          <Tabs label="Activity metric" options={[[ 'sessions', 'Bookings completed' ], ['checkins', 'Check-ins'], ['load', 'Session load']]} value={metric} onChange={(value) => { setChartSelection(null); setMetric(value) }} />
          <label>Period <select aria-label="Activity period" value={period} onChange={event => { setChartSelection(null); setPeriod(event.target.value) }}><option value="28">28 days</option><option value="90">90 days</option></select></label>
        </div>
        <p className="db-chart-heading">{metricLabel} · {fmtDate(activity.start)}–{fmtDate(activity.end)}</p>
        {activity.hasData ? <><div className="db-chart" tabIndex={0} aria-label={`${metricLabel}. Use the arrow keys to view each week`}
          onKeyDown={(event) => {
            if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return
            event.preventDefault()
            setChartSelection((index) => Math.max(0, Math.min(activity.buckets.length - 1, (index ?? -1) + (event.key === 'ArrowRight' ? 1 : -1))))
          }}>
          <Bar data={chartData} options={chartOptions} aria-hidden="true" />
        </div><p className="db-note" aria-live="polite">{chartSelection == null ? 'Hover or use the arrow keys to view a week.' : `${activity.buckets[chartSelection].label} · ${activity.buckets[chartSelection].value ?? 'No records'}`}</p></> :
          <p className="db-chart-empty">No records in this period.</p>}
        {metric === 'load' && <button className="db-link" type="button" onClick={() => pick('load')}>View a client’s load records →</button>}
      </section>
      <DashboardWeekly bookings={ownedBookings} monday={monday} />
      </div>
      <section className="db-card orbit-review" id="dashboard-review"><Heading icon="alert" tone="review">Needs review <span className="db-count">{reviews.length}</span></Heading><Tabs label="Review category" options={[[ 'review', `Review first · ${reviewFirst.length}` ], ['followup', `Follow-up · ${followup.length}`]]} value={reviewFilter} onChange={setReviewFilter} /><div className="db-scroll" tabIndex={0} aria-label="Client review queue">{reviewRows.map(r => <div key={r.key} className={`db-row db-review-item db-tone-${r.tone}`}><div className="db-info"><strong>{r.client.name}</strong><small>{r.reason}</small><span className="db-review-detail">{r.detail}</span></div><Link className="db-link db-row-action" aria-label={`Review ${r.reason} for ${r.client.name}`} to={r.path}>Review →</Link></div>)}{!reviewRows.length && <Empty title={reviewFilter === 'review' ? 'No recorded items to review' : 'No follow-ups due'} detail={reviewFilter === 'review' ? 'Missing check-ins are listed below.' : undefined} icon="check" />}</div><footer className="db-card-footer"><span>Concerns, screening &amp; dated follow-ups</span><span>{reviewRows.length} items</span></footer></section>
      <section className="db-card orbit-readiness" id="dashboard-checkins" aria-labelledby="orbit-readiness-title">
        <header className="db-head"><h2 id="orbit-readiness-title">Group readiness today</h2><button className="db-link" type="button" disabled={!clients.length} onClick={() => openModal(<BulkWellnessForm />, true)}>Record check-ins</button></header>
        <div className="orbit-readiness-overview">
          <div className="orbit-readiness-ring" style={{ background: readinessRing }} aria-label="Average readiness">
            <strong>{group.average ?? '—'}{group.average != null && <small>/100</small>}</strong>
          </div>
          <div><strong>{group.count} of {clients.length} scored today</strong>
            <p className="db-note">{group.older} older · {group.missing} missing{group.unscored ? ` · ${group.unscored} without a score` : ''}</p>
            {group.count > 0 && <ul className="orbit-readiness-legend"><li>{group.high} higher</li><li>{group.medium} middle</li><li>{group.low} lower</li></ul>}
          </div>
        </div>
        <Tabs label="Check-in status" options={[[ 'missing', `Still to check in · ${missing.length}` ], ['recorded', `Recorded · ${recorded.length}`]]} value={checkinFilter} onChange={setCheckinFilter} />
        <div className="db-scroll" aria-label="Client check-ins" tabIndex={0}>{checkinRows.map((client) => {
          const last = db.wellness.filter((entry) => entry.clientId === client.id && entry.date && entry.date <= today).sort((a, b) => b.date.localeCompare(a.date))[0]
          return <div className="db-row" key={client.id}><div className="db-info"><strong>{client.name}</strong><small>{last ? last.date === today ? 'Checked in today' : `Last check-in ${fmtDate(last.date)}` : 'No dated check-in'}</small></div>
            <Link className="db-link" to={dashboardClientPath(client.id, '/check-ins?view=wellness')}>View check-ins</Link></div>
        })}{!checkinRows.length && <p className="db-note">No clients in this view.</p>}</div>
      </section>
      <DashboardInsights insights={insights} />
      <section className="db-card orbit-upcoming">
        <header className="db-head"><h2>Upcoming sessions</h2><Link className="db-link" to="/schedule">View schedule</Link></header>
        {upcoming.map((booking) => <Link key={booking.id} className="db-row orbit-upcoming-row" to={sessionPath(booking)}>
          <time dateTime={booking.date}>{fmtDay(booking.date)}</time>
          <div className="db-info"><strong>{roster.get(booking.clientId)?.name}</strong><small>{booking.type} · {booking.time}</small></div>
          <Icon name="chevron-right" size={16} />
        </Link>)}
        {!upcoming.length && <p className="db-note">No future bookings scheduled.</p>}
      </section>
      <section className="db-card orbit-plans"><Heading icon="dumbbell" tone="clients" action={<span className="db-date">Today</span>}>Planned workouts <span className="db-count">{plans.length}</span></Heading><div className="db-scroll" tabIndex={0} aria-label="Today’s prescribed workouts">{plans.map(p => <div className="db-row" key={p.id}><span className="db-avatar">{initials(p.client.name)}</span><div className="db-info"><strong>{p.client.name}</strong><small>{p.name || 'Planned workout'}{p.done ? ' · Completed' : ''}</small></div><Link className="db-link db-row-action" to={dashboardClientPath(p.clientId, `/training?date=${today}`)}>Training →</Link></div>)}{!plans.length && <Empty title="No workouts planned today" detail={clients.length ? 'Open a client to plan their training.' : 'Add a client to begin.'} icon="dumbbell" />}</div>{!!noProgram.length && <div className="db-notice"><span>{noProgram.length} client{noProgram.length === 1 ? '' : 's'} without a current or upcoming program</span><button className="db-link" type="button" onClick={() => pick('program', noProgram)}>View →</button></div>}</section>
      <section className="db-card orbit-snapshot"><header className="db-head"><h2>Training snapshot</h2></header>
        <div className="db-trend-bottom"><div><h3>Booking completion · 30 days</h3><strong className="db-metric">{completion.total ? `${completion.completed} / ${completion.total}` : '—'}</strong><p>{completion.total ? `${completion.missed} missed · ${completion.pending} awaiting status` : 'No past bookings recorded.'}</p><Link className="db-link" to="/schedule">Review bookings →</Link></div>
          <div><h3>Latest strength estimate</h3>{strength ? <><strong className="db-metric">{fmtWt(+strength.valueKg)} <small>estimated 1RM</small></strong><p>{roster.get(strength.clientId).name} · {strength.exercise} · {fmtDay(strength.date)}</p><Link className="db-link" to={dashboardClientPath(strength.clientId, '/progress#strength')}>View strength →</Link></> : <p>No strength estimates recorded.</p>}</div></div>
      </section>
    </div>
  </div>
}
