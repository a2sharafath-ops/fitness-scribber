import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useOutletContext } from 'react-router-dom'
import { Bar, Line } from 'react-chartjs-2'
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
import { coachTimeZone, fmtDate, fmtDateRange, fmtDay } from '../lib/dates'
import { baseOptions } from '../lib/chartSetup'
import { dashboardActivity, dashboardClientPath, dashboardClock, dashboardData, dashboardReadiness, dashboardWeeks } from '../lib/dashboard'
import { scheduleSort, sessionPath, weekOf } from '../lib/schedule'
import './DashboardPage.css'

function Heading({ icon, tone, children, action }) {
  return <div className="db-head"><h2><span className={`db-section-icon db-${tone}`}><Icon name={icon} size={17} /></span>{children}</h2>{action}</div>
}

function Tabs({ label, options, value, onChange }) {
  return <div className="db-tabs" role="group" aria-label={label}>{options.map(([id, text]) => <button key={id} type="button" aria-pressed={value === id} onClick={() => onChange(id)}>{text}</button>)}</div>
}

function DashboardList({ label, rows, moreLabel }) {
  const visibleCount = 4
  const hidden = rows.length - visibleCount
  return <div className="db-list" aria-label={label}>
    {rows.slice(0, visibleCount)}
    {hidden > 0 && <details className="db-more-rows">
      <summary><span>Show {hidden} more {moreLabel}{hidden === 1 ? '' : 's'}</span><span>Show fewer {moreLabel}s</span></summary>
      {rows.slice(visibleCount)}
    </details>}
  </div>
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
  const [reviewFilter, setReviewFilter] = useState(null)
  const [checkinFilter, setCheckinFilter] = useState('missing')
  const [metric, setMetric] = useState('sessions')
  const [period, setPeriod] = useState('30')
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
  const reviewCategory = reviewFilter || (reviewFirst.length || !followup.length ? 'review' : 'followup')
  const reviewRows = reviewCategory === 'review' ? reviewFirst : followup
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
  const daily = period === '7'
  const activity = dashboardActivity(db, { today, days: +period, metric, bucketDays: daily ? 1 : 7 })
  const metricEmpty = { sessions: 'No bookings marked complete in this period.', checkins: 'No check-ins recorded in this period.',
    load: 'No session load recorded in this period.', completion: 'No bookings marked complete or missed in this period.',
    readiness: 'No readiness scores recorded in this period.' }[metric]
  const metricLabel = { sessions: 'Completed bookings', checkins: 'Recorded check-ins', load: 'Recorded session load (sRPE · AU)',
    completion: 'Booking completion rate', readiness: 'Average group readiness' }[metric]
  const isTrend = metric === 'readiness' || metric === 'completion'
  const ActivityChart = isTrend ? Line : Bar
  const activityValue = value => value == null ? 'No records' : metric === 'completion' ? `${value}%` : metric === 'readiness' ? `${value}/100` : value
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
    interaction: { mode: 'index', intersect: false },
    onHover: (_event, points) => { if (points.length) setChartSelection(points[0].index) },
    plugins: { ...base.plugins, legend: { display: false }, tooltip: { callbacks: {
      title: ([item]) => activity.buckets[item.dataIndex].label,
      label: ({ raw }) => activityValue(raw),
    } } },
    scales: { x: { ...base.scales.x, grid: { display: false }, ticks: { ...base.scales.x.ticks, maxRotation: 0, autoSkip: true, maxTicksLimit: 7 } },
      y: { ...base.scales.y, beginAtZero: true, max: isTrend ? 100 : undefined, ticks: { ...base.scales.y.ticks, precision: 0 } } },
  }
  const chartData = { labels: activity.buckets.map(b => fmtDay(b.from)), datasets: [{ label: metricLabel, data: activity.buckets.map(b => b.value),
    ...(isTrend ? { borderColor: '#dc465e', backgroundColor: '#dc465e22', pointBackgroundColor: '#dc465e', fill: true, tension: .25 }
      : { backgroundColor: '#dc465e', borderRadius: 5, maxBarThickness: 40 }) }] }

  return <div className="coach-dashboard">
    <header className="db-title"><div><p className="db-date">{fmtDay(today)} · {clock.time} {coachTimeZone(tz).replaceAll('_', ' ')}</p><h1>{db.settings?.trainerName ? `Welcome, ${db.settings.trainerName.trim().split(/\s+/)[0]}.` : 'Dashboard'}</h1></div><div className="db-actions"><Button variant="ghost" onClick={showWeeklyReport}><Icon name="calendar" size={16} /> Weekly report</Button><Button onClick={book}><Icon name="calendar" size={16} /> Book session</Button><details className="db-menu"><summary>More actions <Icon name="chevron-down" size={14} /></summary><div className="db-menu-list">{[['Add client', () => openModal(<ClientForm />)], ['Record assessment', () => pick('assessment')], ['Assign a program', () => pick('program')]].map(([text, action]) => <button key={text} type="button" onClick={e => { e.currentTarget.closest('details').open = false; action() }}>{text}</button>)}</div></details></div></header>
    {!db.clients.length && <section className="db-card db-onboard"><h2>Start with your first client</h2><p>Add a client, record a baseline, then plan their training.</p><div className="db-actions"><Button onClick={() => openModal(<ClientForm />)}>＋ Add client</Button><span>2. Record baseline</span><span>3. Plan training</span></div></section>}
    <div className="orbit-dashboard-grid">
      <div className="orbit-dashboard-column">
      <DashboardBookings key={today} db={db} bookings={bookings} roster={roster} next={next} today={today} onBook={book} onPlan={showPlan}
        onDetails={(booking) => openModal(<SessionForm session={booking} />)} />
      <section className="db-card orbit-review" id="dashboard-review">
        <Heading icon="alert" tone="review">Needs review</Heading>
        <Tabs label="Review category" options={[[ 'review', `Review first · ${reviewFirst.length}` ], ['followup', `Follow-up · ${followup.length}`]]}
          value={reviewCategory} onChange={setReviewFilter} />
        <DashboardList key={reviewCategory} label="Client review queue" moreLabel="review item" rows={reviewRows.map(r =>
          <div key={r.key} className={`db-row db-review-item db-tone-${r.tone}`}>
            <div className="db-info"><strong>{r.client.name}</strong><small>{r.reason}</small><span className="db-review-detail">{r.detail}</span></div>
            <Link className="db-link db-row-action" aria-label={`Review ${r.reason} for ${r.client.name}`} to={r.path}>Review →</Link>
          </div>)} />
        {!reviewRows.length && <div className="db-inline-empty">
          <p>{reviewCategory === 'review' ? 'No priority items to review.' : 'No follow-ups due.'}</p>
          {reviewCategory === 'review' && followup.length > 0 && <button type="button" className="db-link" onClick={() => setReviewFilter('followup')}>View follow-ups →</button>}
        </div>}
      </section>
      </div>
      <div className="orbit-dashboard-column">
      <section className="db-card orbit-coaching" aria-labelledby="orbit-coaching-title">
        <header className="db-head"><h2 id="orbit-coaching-title">Coaching overview</h2></header>
        <div className="db-stats">
          <button className="db-stat" type="button" onClick={() => pick('overview')}><span>Active clients</span><strong>{clients.length}</strong></button>
          <button className="db-stat" type="button" onClick={() => jump('dashboard-schedule')}><span>Bookings today</span><strong>{bookings.length}</strong></button>
          <button className="db-stat" type="button" onClick={() => jump('dashboard-checkins')}><span>Checked in today</span><strong>{recorded.length}<small> / {clients.length}</small></strong></button>
        </div>
        <div className="db-chart-controls">
          <Tabs label="Activity metric" options={[[ 'sessions', 'Bookings completed' ], ['checkins', 'Check-ins'], ['load', 'Session load'],
            ['completion', 'Completion rate'], ['readiness', 'Group readiness']]} value={metric} onChange={(value) => { setChartSelection(null); setMetric(value) }} />
          <Tabs label="Activity period" options={[[ '7', '7d' ], ['30', '30d'], ['90', '90d']]} value={period}
            onChange={(value) => { setChartSelection(null); setPeriod(value) }} />
        </div>
        <p className="db-chart-heading">{metricLabel} · {fmtDateRange(activity.start, activity.end)}</p>
        {activity.hasData ? <><div className="db-chart" tabIndex={0} aria-label={`${metricLabel}. Use the arrow keys to view each ${daily ? 'day' : 'week'}`}
          onKeyDown={(event) => {
            if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return
            event.preventDefault()
            setChartSelection((index) => Math.max(0, Math.min(activity.buckets.length - 1, (index ?? -1) + (event.key === 'ArrowRight' ? 1 : -1))))
          }}>
          <ActivityChart data={chartData} options={chartOptions} aria-hidden="true" />
        </div><p className="db-note" aria-live="polite">{chartSelection == null ? `Hover or use the arrow keys to view a ${daily ? 'day' : 'week'}.` : `${activity.buckets[chartSelection].label} · ${activityValue(activity.buckets[chartSelection].value)}`}</p></> :
          <p className="db-chart-empty">{metricEmpty}</p>}
        {metric === 'completion' && <p className="db-note">Share of bookings marked complete among bookings marked complete or missed.</p>}
        {metric === 'load' && <button className="db-link" type="button" onClick={() => pick('load')}>View a client’s load records →</button>}
      </section>
      <DashboardWeekly bookings={ownedBookings} monday={monday} />
      <section className="db-card orbit-readiness" id="dashboard-checkins" aria-labelledby="orbit-readiness-title">
        <header className="db-head"><h2 id="orbit-readiness-title">Group readiness today</h2><button className="db-link" type="button" disabled={!clients.length} onClick={() => openModal(<BulkWellnessForm />, true)}>Record check-ins</button></header>
        <div className="orbit-readiness-overview">
          {group.average != null && <div className="orbit-readiness-ring" style={{ background: readinessRing }} aria-label="Average readiness">
            <strong>{group.average}<small>/100</small></strong>
          </div>}
          <div><strong>{group.count ? `${group.count} of ${clients.length} scored today` : 'No readiness scores today'}</strong>
            <p className="db-note">{[
              group.older > 0 && `${group.older} with an earlier check-in`,
              group.missing > 0 && `${group.missing} with no check-in on record`,
              group.unscored > 0 && `${group.unscored} checked in today without a score`,
            ].filter(Boolean).join(' · ')}</p>
            {group.count > 0 && <ul className="orbit-readiness-legend"><li>{group.high} higher</li><li>{group.medium} middle</li><li>{group.low} lower</li></ul>}
          </div>
        </div>
        <Tabs label="Check-in status" options={[[ 'missing', `Still to check in · ${missing.length}` ], ['recorded', `Recorded · ${recorded.length}`]]} value={checkinFilter} onChange={setCheckinFilter} />
        <DashboardList key={checkinFilter} label="Client check-ins" moreLabel="client" rows={checkinRows.map((client) => {
          const last = db.wellness.filter((entry) => entry.clientId === client.id && entry.date && entry.date <= today).sort((a, b) => b.date.localeCompare(a.date))[0]
          return <div className="db-row" key={client.id}><div className="db-info"><strong>{client.name}</strong><small>{last ? last.date === today ? 'Checked in today' : `Last check-in ${fmtDate(last.date)}` : 'No check-in on record'}</small></div>
            <Link className="db-link" to={dashboardClientPath(client.id, '/check-ins?view=wellness')}>View check-ins</Link></div>
        })} />
        {!checkinRows.length && <p className="db-note">{!clients.length ? 'No active clients.' : checkinFilter === 'missing' ? 'Everyone has checked in.' : 'No check-ins recorded today.'}</p>}
      </section>
      </div>
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
      <section className="db-card orbit-plans">
        <Heading icon="dumbbell" tone="clients" action={<span className="db-date">Today</span>}>Planned workouts {plans.length > 0 && <span className="db-count">{plans.length}</span>}</Heading>
        {plans.length > 0 ? <div className="db-list" aria-label="Today’s prescribed workouts">{plans.map(p =>
          <div className="db-row" key={p.id}><span className="db-avatar">{initials(p.client.name)}</span>
            <div className="db-info"><strong>{p.client.name}</strong><small>{p.name || 'Planned workout'}{p.workoutStatus && ` · ${p.workoutStatus}`}</small></div>
            <Link className="db-link db-row-action" to={dashboardClientPath(p.clientId, `/training?date=${today}`)}>Training →</Link>
          </div>)}</div>
          : <div className="db-inline-empty"><p>No workouts planned today.</p>{clients.length > 0 && <Link className="db-link" to="/clients">Open clients →</Link>}</div>}
      </section>
      <section className="db-card orbit-snapshot"><header className="db-head"><h2>Training snapshot</h2></header>
        <div className="db-trend-bottom"><div><h3>Booking completion · 30 days</h3><strong className="db-metric">{completion.total ? `${completion.completed} / ${completion.total}` : '—'}</strong><p>{completion.total ? `${completion.missed} missed · ${completion.pending} awaiting status` : 'No past bookings recorded.'}</p><Link className="db-link" to="/schedule">Review bookings →</Link></div>
          <div><h3>Latest strength estimate</h3>{strength ? <><strong className="db-metric">{fmtWt(+strength.valueKg)} <small>estimated 1RM</small></strong><p>{roster.get(strength.clientId).name} · {strength.exercise} · {fmtDay(strength.date)}</p><Link className="db-link" to={dashboardClientPath(strength.clientId, '/progress#strength')}>View strength →</Link></> : <p>No strength estimates recorded.</p>}</div></div>
      </section>
      {noProgram.length > 0 && <section className="db-card orbit-program-followup">
        <header className="db-head"><h2>Program assignments</h2></header>
        <div className="db-inline-empty"><p>{noProgram.length} active client{noProgram.length === 1 ? '' : 's'} without a current or upcoming program.</p>
          <button type="button" className="db-link" onClick={() => pick('program', noProgram)}>Assign a program →</button></div>
      </section>}
    </div>
  </div>
}
