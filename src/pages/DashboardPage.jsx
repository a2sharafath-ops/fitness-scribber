import HelperTip from '../components/atoms/HelperTip'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Bar, Line } from 'react-chartjs-2'
import Button from '../components/atoms/Button'
import Icon from '../components/atoms/Icon'
import DashboardBookings from '../components/organisms/DashboardBookings'
import DashboardWeekly from '../components/organisms/DashboardWeekly'
import DashboardInsights from '../components/organisms/DashboardInsights'
import DayBlockReview from '../components/organisms/program/DayBlockReview'
import { OriginalWorkoutPlan } from '../components/organisms/workout/live/LiveSessionReview'
import ModalShell from '../components/molecules/ModalShell'
import DashboardSegments from '../components/molecules/DashboardSegments'
import Select from '../components/molecules/Select'
import BulkWellnessForm from '../components/organisms/forms/BulkWellnessForm'
import SessionForm from '../components/organisms/forms/SessionForm'
import { ClientForm } from '../components/organisms/forms/ClientForms'
import { useData } from '../store/DataContext'
import { useModal } from '../store/ModalContext'
import { useFormat } from '../hooks/useFormat'
import useReducedMotion from '../hooks/useReducedMotion'
import { initials } from '../lib/format'
import { addDays, coachTimeZone, fmtDate, fmtDateRange, fmtDay } from '../lib/dates'
import { baseOptions, COLORS, shortLabel } from '../lib/chartSetup'
import { CLIENT_READINESS_PATH } from '../lib/clientRoutes'
import { dashboardActivity, dashboardClientPath, dashboardClock, dashboardData, dashboardReadiness, dashboardWeeks, readinessRoster } from '../lib/dashboard'
import { scheduleSort, sessionPath, weekOf } from '../lib/schedule'
import './DashboardPage.css'

const ACTIVITY_METRICS = [
  ['consistency', 'Training consistency'],
  ['completion', 'Booking completion'],
  ['sessions', 'Bookings completed'],
  ['checkins', 'Check-ins'],
  ['load', 'Session load'],
  ['readiness', 'Group readiness'],
]

function Heading({ icon, tone, children, action }) {
  return <div className="db-head"><h2><span className={`db-section-icon db-${tone}`}><Icon name={icon} size={17} /></span>{children}</h2>{action}</div>
}

function AnimatedNumber({ value, reduced }) {
  const number = useRef(null)
  const shown = useRef(0)
  useEffect(() => {
    let frame
    const from = shown.current
    const start = performance.now()
    const tick = (now) => {
      const t = Math.min(1, (now - start) / 540)
      shown.current = Math.round(from + (value - from) * (1 - (1 - t) ** 3))
      if (number.current) number.current.textContent = String(shown.current)
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    if (!reduced && from !== value) frame = requestAnimationFrame(tick)
    else shown.current = value
    return () => cancelAnimationFrame(frame)
  }, [value, reduced])
  return <><span className="sr-only">{value}</span><span ref={number} aria-hidden="true">{reduced ? value : shown.current}</span></>
}

const CHART_GUIDE = {
  id: 'orbit-chart-guide',
  afterDraw(chart) {
    const guide = chart.canvas.parentElement.querySelector('.db-chart-guide')
    if (!guide) return
    const [active] = chart.getActiveElements()
    guide.hidden = !active
    if (!active) return
    guide.style.setProperty('--guide-x', `${active.element.x}px`)
    guide.style.top = `${chart.chartArea.top}px`
    guide.style.height = `${chart.chartArea.height}px`
  },
}

function DashboardList({ label, rows, moreLabel }) {
  const visibleCount = 4
  const hidden = rows.length - visibleCount
  return <div className="db-list" role="group" aria-label={label}>
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
  return <div className="db-picker"><h2>{title}</h2><label htmlFor="dashboard-client-search">Find client by name</label><input id="dashboard-client-search" placeholder="Search clients…" value={query} onChange={e => setQuery(e.target.value)} /><div className="db-picker-list">{rows.map(c => <button key={c.id} type="button" onClick={() => onChoose(c.id)}><span>{c.name}</span><Icon name="chevron-right" size={16} /></button>)}{!rows.length && <p>{clients.length ? 'No matching clients.' : 'Add an active client.'}</p>}</div></div>
}

export default function DashboardPage() {
  const { db, tz, units } = useData()
  const { openModal, closeModal } = useModal()
  const nav = useNavigate()
  const { hash: locationHash } = useLocation()
  const { fmtWt } = useFormat()
  const reduced = useReducedMotion()
  const [singleColumn, setSingleColumn] = useState(() => globalThis.window?.matchMedia?.('(max-width: 1000px)')?.matches ?? false)
  useEffect(() => {
    const layout = window.matchMedia?.('(max-width: 1000px)')
    if (!layout) return
    const update = () => setSingleColumn(layout.matches)
    update()
    layout.addEventListener('change', update)
    return () => layout.removeEventListener('change', update)
  }, [])
  const chartRef = useRef(null)
  const [now, setNow] = useState(() => new Date())
  const [reviewFilter, setReviewFilter] = useState(null)
  const [chosenCheckinFilter, setCheckinFilter] = useState(null)
  const [metric, setMetric] = useState('consistency')
  const [period, setPeriod] = useState('30')
  const [chartSelection, setChartSelection] = useState(null)
  const chooseMetric = (value) => {
    setChartSelection(null)
    setMetric(value)
  }
  useEffect(() => {
    const refresh = () => setNow(new Date())
    const interval = setInterval(refresh, 60000)
    document.addEventListener('visibilitychange', refresh)
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', refresh) }
  }, [])
  useEffect(() => {
    const close = (event) => {
      const menu = document.querySelector('.coach-dashboard .db-menu[open]')
      if (!menu) return
      if (event.type === 'keydown') {
        if (event.key !== 'Escape') return
        menu.querySelector('summary').focus()
      } else if (menu.contains(event.target)) return
      menu.open = false
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', close)
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', close) }
  }, [])
  const clock = dashboardClock(now, tz)
  const { today } = clock
  const { clients, roster, bookings, next, recorded, missing, reviews, plans, noProgram, completion, strength } = dashboardData(db, clock)
  const reviewFirst = reviews.filter(r => r.kind === 'review'), followup = reviews.filter(r => r.kind === 'followup')
  const reviewCategory = reviewFilter || (reviewFirst.length || !followup.length ? 'review' : 'followup')
  const reviewRows = reviewCategory === 'review' ? reviewFirst : followup
  const rankedCheckins = useMemo(() => readinessRoster(db, today), [db, today])
  const checkinFilter = chosenCheckinFilter ?? (missing.length || !recorded.length ? 'missing' : 'recorded')
  const checkinRows = rankedCheckins.filter(row => checkinFilter === 'missing' ? row.date !== today : row.date === today)
  const group = dashboardReadiness(db, clients, today)
  const ownedBookings = db.sessions.filter((booking) => roster.has(booking.clientId))
  const monday = weekOf(today)
  const [week] = dashboardWeeks(ownedBookings, monday, 1)
  const upcoming = ownedBookings.filter((booking) => booking.date > today && ['Pending', 'Confirmed'].includes(booking.status)).sort(scheduleSort).slice(0, 4)
  const insights = [
    { title: 'Check-in coverage', detail: `${recorded.length} of ${clients.length} active clients checked in today.`, path: CLIENT_READINESS_PATH, action: 'View readiness' },
    { title: 'Items to review', detail: [
      reviewFirst.length && `${reviewFirst.length} priority item${reviewFirst.length === 1 ? '' : 's'} to review`,
      followup.length && `${followup.length} follow-up${followup.length === 1 ? '' : 's'} due`,
    ].filter(Boolean).join(' · ') || 'No reviews or follow-ups due.',
      path: '/#dashboard-review', action: reviewFirst.length ? 'View priority items' : followup.length ? 'View follow-ups' : null,
      onSelect: () => {
        setReviewFilter(reviewFirst.length ? 'review' : 'followup')
        document.getElementById('dashboard-review')?.focus()
      } },
    { title: 'Booking completion', detail: completion.total ? `${completion.completed} of ${completion.total} bookings completed in the past 30 days.` : 'No past bookings in the last 30 days.', path: '/schedule', action: 'View schedule' },
    { title: 'Upcoming sessions', detail: upcoming.length ? `Next booking on ${fmtDay(upcoming[0].date)} at ${upcoming[0].time}.` : 'No upcoming bookings.', path: '/schedule', action: 'View upcoming sessions' },
  ]
  const toPercent = (value) => group.count ? value * 100 / group.count : 0
  const highShare = toPercent(group.high)
  const midBoundary = highShare + toPercent(group.medium)
  const daily = period === '7'
  const days = Number(period)
  const activity = useMemo(() => dashboardActivity(db, { today, days, metric, bucketDays: daily ? 1 : 7 }), [db, today, days, metric, daily])
  const trendSummaries = useMemo(() => ['consistency', 'completion', 'readiness'].map((key) => {
    const options = { days, bucketDays: days, metric: key }
    const current = dashboardActivity(db, { ...options, today }).buckets[0].value
    const previous = dashboardActivity(db, { ...options, today: addDays(today, -days) }).buckets[0].value
    return { key, current, delta: current != null && previous != null ? current - previous : null }
  }), [db, days, today])
  const metricEmpty = { sessions: 'No bookings marked complete in this period.', checkins: 'No check-ins recorded in this period.',
    load: 'No session load in this period.', completion: 'No bookings marked complete or missed in this period.',
    readiness: 'No readiness scores recorded in this period.', consistency: 'No prescribed training days in this period.' }[metric]
  const metricLabel = { sessions: 'Completed bookings', checkins: 'Recorded check-ins', load: 'Recorded session load (sRPE · AU)',
    completion: 'Booking completion rate', readiness: 'Average group readiness', consistency: 'Training consistency' }[metric]
  const isRate = metric === 'consistency' || metric === 'completion'
  const isTrend = metric === 'readiness' || isRate
  const ActivityChart = isTrend ? Line : Bar
  const activityValue = useCallback(value => value == null ? 'No records' : isRate ? `${value}%` : metric === 'readiness' ? `${value}/100` : value, [isRate, metric])
  const activeBucket = activity.buckets[chartSelection ?? activity.buckets.findLastIndex(bucket => bucket.value != null)]
  const describeBucket = useCallback(bucket => {
    if (!bucket?.samples || !isRate) return ''
    return metric === 'consistency' ? `${bucket.matched} of ${bucket.samples} prescribed client-days logged`
      : `${bucket.matched} of ${bucket.samples} completed or missed bookings`
  }, [isRate, metric])
  const pick = (purpose, subset = clients) => {
    const title = { overview: 'Find a client', assessment: 'Record an assessment', program: 'Assign a program', load: 'Review training load' }[purpose]
    openModal(<DashboardClientPicker clients={subset} title={title} onChoose={async id => {
      if (!await closeModal()) return
      nav(purpose === 'program' ? `/workouts?clientId=${encodeURIComponent(id)}` : dashboardClientPath(id, purpose === 'assessment' ? '/assessments' : purpose === 'load' ? '/progress#training-load' : ''))
    }} />)
  }
  const book = (event) => openModal(db.clients.length ? <SessionForm date={today} /> : <ClientForm />, false, event.currentTarget)
  const jump = id => document.getElementById(id)?.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'start' })
  const showWeeklyReport = (event) => {
    const [week] = dashboardWeeks(ownedBookings, monday, 1)
    openModal(<ModalShell title="Weekly report" onClose={() => closeModal()} footer={<Button variant="ghost" onClick={() => closeModal()}>Close</Button>}>
      <p>{fmtDate(week.from)}–{fmtDate(week.through)}</p>
      <dl className="orbit-report-stats">
        <div><dt>Booked sessions</dt><dd>{week.booked}</dd></div>
        <div><dt>Completed</dt><dd>{week.completed}</dd></div>
        <div><dt>Missed</dt><dd>{week.missed}</dd></div>
        <div><dt>Pending or confirmed</dt><dd>{week.booked - week.completed - week.missed}</dd></div>
      </dl>
    </ModalShell>, false, event.currentTarget)
  }
  const showPlan = ({ booking, client, plan, originalWorkout, title }, trigger) =>
    openModal(<ModalShell title={originalWorkout ? title : plan.name?.trim() || 'Workout plan'} onClose={() => closeModal()}
      footer={<Button variant="ghost" onClick={() => closeModal()}>Close</Button>}>
      <p className="muted">{[client.name, fmtDate(booking.date), booking.time].filter(Boolean).join(' · ')}</p>
      {originalWorkout ? <>
        <p className="muted">Original plan saved with this workout.</p>
        <OriginalWorkoutPlan session={originalWorkout} units={units} />
      </> : <>
        <p className="muted">Copy the day’s plan into this booking.</p>
        <DayBlockReview prescription={plan} units={units} />
      </>}
    </ModalShell>, true, trigger)
  useEffect(() => {
    if (locationHash === '#dashboard-review' || locationHash === '#dashboard-checkins') {
      document.getElementById(locationHash.slice(1))?.scrollIntoView()
    }
  }, [locationHash])
  const chartOptions = useMemo(() => {
    const base = baseOptions()
    const inspect = (_event, points) => { if (points.length) setChartSelection(points[0].index) }
    return {
      ...base,
      animation: reduced ? false : { duration: 360, easing: 'easeOutCubic' },
      interaction: { mode: 'index', intersect: false },
      onHover: inspect,
      onClick: inspect,
      plugins: { ...base.plugins, legend: { display: false }, tooltip: { callbacks: {
        title: ([item]) => activity.buckets[item.dataIndex].label,
        label: ({ raw }) => `${metricLabel}: ${activityValue(raw)}`,
        afterLabel: ({ dataIndex }) => describeBucket(activity.buckets[dataIndex]),
      } } },
      scales: { x: { ...base.scales.x, grid: { display: false }, ticks: { ...base.scales.x.ticks, maxRotation: 0, maxTicksLimit: 5 } },
        y: { ...base.scales.y, beginAtZero: true, max: isTrend ? 100 : undefined, ticks: { ...base.scales.y.ticks,
          maxTicksLimit: 5, precision: 0, ...(isRate && { callback: value => `${value}%` }) } } },
    }
  }, [reduced, activity, activityValue, isTrend, isRate, metricLabel, describeBucket])
  const chartData = useMemo(() => ({ labels: activity.buckets.map(b => shortLabel(b.from)), datasets: [{ label: metricLabel, data: activity.buckets.map(b => b.value),
    ...(isTrend ? { borderColor: COLORS.purple, backgroundColor: COLORS.purple + '22', pointBackgroundColor: COLORS.purple,
      pointRadius: 3, pointHoverRadius: 6, fill: true, tension: .25, spanGaps: false }
      : { backgroundColor: COLORS.purple, borderRadius: 5, maxBarThickness: 40 }) }] }), [activity, isTrend, metricLabel])
  const selectBucket = (index) => {
    setChartSelection(index)
    const chart = chartRef.current
    const point = chart?.getDatasetMeta(0).data[index]
    if (!point) return
    const elements = activity.buckets[index]?.value != null ? [{ datasetIndex: 0, index }] : []
    chart.setActiveElements(elements)
    chart.tooltip?.setActiveElements(elements, { x: point.x, y: point.y })
    chart.update('none')
  }
  const title = db.settings?.trainerName ? `Welcome, ${db.settings.trainerName.trim().split(/\s+/)[0]}.` : 'Dashboard'


  const bookingCard = (
      <DashboardBookings key={today} db={db} bookings={bookings} roster={roster} next={next} today={today} reducedMotion={reduced} onBook={book} onPlan={showPlan}
        onDetails={(booking, trigger) => openModal(<SessionForm session={booking} />, false, trigger)} />
  )
  const reviewCard = (
      <section className="db-card orbit-review" id="dashboard-review" tabIndex={-1} aria-labelledby="orbit-review-title">
        <header className="db-head">
          <h2 id="orbit-review-title">Needs review</h2>
          {reviewCategory === 'review' && <Link className="db-link" to="/concerns">View concerns</Link>}
        </header>
        <DashboardSegments label="Review category" options={[[ 'review', `Review first · ${reviewFirst.length}` ], ['followup', `Follow-ups · ${followup.length}`]]}
          value={reviewCategory} onChange={setReviewFilter} />
        {reviewRows.length > 0 ?
          <DashboardList key={reviewCategory} label="Client review queue" moreLabel="review item" rows={reviewRows.map(r =>
            <Link key={r.key} className="orbit-review-row" data-tone={r.tone} to={r.path}>
              <span className="orbit-review-marker" aria-hidden="true" />
              <span className="orbit-review-copy">
                <strong>{r.client.name}</strong>
                <span>{r.reason}</span>
                {r.detail && <small>{r.detail}</small>}
              </span>
              <Icon name="chevron-right" size={16} />
            </Link>)} /> :
          <div className="orbit-review-empty">
            <Icon name="check" size={18} />
            <p>{reviewCategory === 'review' ? 'No priority items to review.' : 'No follow-ups due.'}</p>
          </div>}
      </section>
  )
  const coachingCard = (
      <section className="db-card orbit-coaching" aria-labelledby="orbit-coaching-title">
        <header className="db-head"><h2 id="orbit-coaching-title">Coaching overview</h2></header>
        <div className="db-stats">
          <button className="db-stat" type="button" onClick={() => pick('overview')}><span>Active clients</span><strong><AnimatedNumber value={clients.length} reduced={reduced} /></strong></button>
          <button className="db-stat" type="button" onClick={showWeeklyReport}><span>Bookings this week</span><strong><AnimatedNumber value={week.booked} reduced={reduced} /></strong><small>{week.completed} completed</small></button>
        </div>
        <div className="orbit-today-metrics">
          <button className="db-link" type="button" onClick={() => jump('dashboard-schedule')}>{bookings.length} booked today</button>
          <button className="db-link" type="button" onClick={() => jump('dashboard-checkins')}>{recorded.length} of {clients.length} checked in today</button>
        </div>
        <div className="orbit-trend-head"><h3>Group trends</h3>
          <DashboardSegments label="Activity period" options={[[ '7', '7d' ], ['30', '30d'], ['90', '90d']]} value={period}
            onChange={(value) => { setChartSelection(null); setPeriod(value) }} />
        </div>
        <div className="db-stats orbit-trend-tiles">
          {trendSummaries.map(({ key, current, delta }) => <div className="db-stat" key={key}>
            <span>{{ consistency: 'Training consistency', completion: 'Booking completion rate', readiness: 'Avg. group readiness' }[key]}</span>
            <strong>{current == null ? '—' : <><AnimatedNumber value={current} reduced={reduced} /><small>{key === 'readiness' ? '/100' : '%'}</small></>}</strong>
            {delta != null && <small className="orbit-trend-change" data-tone={delta > 0 ? 'up' : delta < 0 ? 'down' : undefined} title="Compared with the previous period">{delta > 0 ? '+' : delta < 0 ? '−' : ''}{Math.abs(delta)} pt{Math.abs(delta) === 1 ? '' : 's'}</small>}
          </div>)}
        </div>
        <div className="orbit-metric-select">
          <span>Metric</span>
          <Select aria-label="Metric" value={metric} onChange={event => chooseMetric(event.target.value)}>
            {ACTIVITY_METRICS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
        </div>
        <p className="db-chart-heading"><span>{metricLabel} · {fmtDateRange(activity.start, activity.end)}</span>
          {metric === 'consistency' && <HelperTip label="Training consistency" text="Percentage of prescribed client-days with a completed workout log." />}
          {metric === 'completion' && <HelperTip label="Booking completion rate" text="Completed bookings divided by bookings marked complete or missed." />}
        </p>
        {activity.hasData ? <>
          <div className="orbit-activity-reading" aria-live="polite">
            <strong>{activityValue(activeBucket.value)}</strong>
            <span>{activeBucket.label}{describeBucket(activeBucket) && <small>{describeBucket(activeBucket)}</small>}</span>
          </div>
          <div className="db-chart" tabIndex={0} aria-label={`${metricLabel}. Use the arrow keys to view each ${daily ? 'day' : 'week'}`}
            onKeyDown={(event) => {
              if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return
              event.preventDefault()
              const next = activity.buckets.indexOf(activeBucket) + (event.key === 'ArrowRight' ? 1 : -1)
              selectBucket(Math.max(0, Math.min(activity.buckets.length - 1, next)))
            }}>
            <ActivityChart ref={chartRef} data={chartData} options={chartOptions} plugins={[CHART_GUIDE]} aria-hidden="true" />
            <span className="db-chart-guide" aria-hidden="true" hidden />
          </div><p className="db-note orbit-chart-instructions">Hover, tap, or use arrow keys to view a {daily ? 'day' : 'week'}.</p></> :
          <p className="db-chart-empty">{metricEmpty}</p>}
        {metric === 'load' && <button className="db-link" type="button" onClick={() => pick('load')}>View a client’s load records →</button>}
      </section>
  )
  const weeklyCard = (
      <DashboardWeekly bookings={ownedBookings} monday={monday} />
  )
  const readinessCard = (
      <section className="db-card orbit-readiness" id="dashboard-checkins" aria-labelledby="orbit-readiness-title">
        <header className="db-head">
          <h2 id="orbit-readiness-title">Group readiness today</h2>
          <div className="orbit-readiness-actions">
            <Link className="db-link" to={CLIENT_READINESS_PATH}>View readiness <Icon name="chevron-right" size={14} /></Link>
            <button className="db-link" type="button" disabled={!clients.length} onClick={event => openModal(<BulkWellnessForm />, true, event.currentTarget)}>Record check-ins</button>
          </div>
        </header>
        <div className="orbit-readiness-overview">
          {group.average != null && <div className="orbit-readiness-ring" style={{ '--readiness-high': highShare / 100, '--readiness-mid': midBoundary / 100 }} aria-label="Average readiness">
            <strong><AnimatedNumber value={group.average} reduced={reduced} /><small>/100</small></strong>
          </div>}
          <div><strong>{group.count ? `${group.count} of ${clients.length} scored today` : 'No readiness scores today'}</strong>
            <p className="db-note">{[
              group.older > 0 && `${group.older} with an earlier check-in`,
              group.missing > 0 && `${group.missing} with no check-in on record`,
              group.unscored > 0 && `${group.unscored} checked in today without a score`,
            ].filter(Boolean).join(' · ')}</p>
            {group.count > 0 && <ul className="orbit-readiness-legend" aria-label="Share of today’s scored check-ins">
              {[[group.high, 'Higher readiness', Math.round(highShare)], [group.medium, 'Moderate readiness', Math.round(midBoundary) - Math.round(highShare)],
                [group.low, 'Lower readiness', 100 - Math.round(midBoundary)]].map(([count, label, percent]) =>
                <li key={label}><span>{label}</span><strong title={`${count} of ${group.count} scored check-ins`}>{percent}%</strong></li>)}
            </ul>}
          </div>
        </div>
        <DashboardSegments label="Check-in status" options={[[ 'missing', `Still to check in · ${missing.length}` ], ['recorded', `Recorded · ${recorded.length}`]]} value={checkinFilter} onChange={setCheckinFilter} />
        <DashboardList key={checkinFilter} label="Client check-ins" moreLabel="client" rows={checkinRows.map(({ client, date, readiness }) => {
          return <div className="db-row" key={client.id}><div className="db-info"><strong>{client.name}</strong><small>{date ? date === today ? (readiness ? `Readiness · ${readiness.score}/100` : 'Checked in today') : `Last check-in ${fmtDate(date)}` : 'No check-in on record'}</small></div>
            <Link className="db-link" to={dashboardClientPath(client.id, '/check-ins?view=wellness')}>View check-ins</Link></div>
        })} />
        {!checkinRows.length && <p className="db-note">{!clients.length ? 'No active clients.' : checkinFilter === 'missing' ? 'Everyone has checked in.' : 'No check-ins recorded today.'}</p>}
      </section>
  )

  return <div className="coach-dashboard">
    <header className="db-title"><div><p className="db-date">{fmtDay(today)} · {clock.time} {coachTimeZone(tz).replaceAll('_', ' ')}</p><h1 aria-label={title}>{title.split(' ').map((word, index) => <span className="orbit-greeting-word" aria-hidden="true" key={index} style={{ '--word-delay': `${index * 65}ms` }}>{word}{' '}</span>)}</h1></div><div className="db-actions"><Button variant="ghost" className="db-report-desktop" onClick={showWeeklyReport}><Icon name="file-text" size={16} /> Weekly report</Button><Button variant={bookings.length ? 'primary' : 'ghost'} onClick={book}><Icon name="calendar" size={16} /> Book session</Button><details className="db-menu"><summary>More actions <Icon name="chevron-down" size={14} /></summary><div className="db-menu-list"><button type="button" className="db-report-mobile" onClick={event => { event.currentTarget.closest('details').open = false; showWeeklyReport() }}>Weekly report</button>{[['Add client', () => openModal(<ClientForm />)], ['Record assessment', () => pick('assessment')], ['Assign a program', () => pick('program')]].map(([text, action]) => <button key={text} type="button" onClick={e => { e.currentTarget.closest('details').open = false; action() }}>{text}</button>)}</div></details></div></header>
    {!db.clients.length && <section className="db-card db-onboard"><h2>Start with your first client</h2><p>Add a client, record a baseline, then plan training.</p><div className="db-actions"><Button icon="plus" onClick={() => openModal(<ClientForm />)}>Add client</Button><span>2. Record baseline</span><span>3. Plan training</span></div></section>}
    <div className="orbit-dashboard-grid">
      <div className="orbit-dashboard-column">
        {bookingCard}
        {reviewCard}
        {singleColumn && <>{coachingCard}{readinessCard}{weeklyCard}</>}
        <DashboardInsights insights={insights} />
        <section className="db-card orbit-plans">
          <Heading icon="dumbbell" tone="clients" action={<span className="db-date">Today</span>}>Planned workouts {plans.length > 0 && <span className="db-count">{plans.length}</span>}</Heading>
          {plans.length > 0 ? <div className="db-list" aria-label="Today’s prescribed workouts">{plans.map(p =>
            <div className="db-row" key={p.id}><span className="db-avatar">{initials(p.client.name)}</span>
              <div className="db-info"><strong>{p.client.name}</strong><small>{p.name || 'Planned workout'}{p.workoutStatus && ` · ${p.workoutStatus}`}</small></div>
              <Link className="db-link db-row-action" to={dashboardClientPath(p.clientId, `/training?date=${today}`)}>Training →</Link>
            </div>)}</div>
            : <div className="db-inline-empty"><p>No workouts planned today.</p>{clients.length > 0 && <Link className="db-link" to="/clients">Open clients →</Link>}</div>}
        </section>
        {noProgram.length > 0 && <section className="db-card orbit-program-followup">
          <header className="db-head"><h2>Program assignments</h2></header>
          <div className="db-inline-empty"><p>{noProgram.length} active {noProgram.length === 1 ? 'client needs' : 'clients need'} a current or upcoming program.</p>
            <button type="button" className="db-link" onClick={() => pick('program', noProgram)}>Assign a program →</button></div>
        </section>}
      </div>
      <div className="orbit-dashboard-column">
        {!singleColumn && <>{coachingCard}{weeklyCard}{readinessCard}</>}
        <section className="db-card orbit-upcoming">
          <header className="db-head"><h2>Upcoming sessions</h2><Link className="db-link" to="/schedule">View schedule</Link></header>
          {upcoming.map((booking) => <Link key={booking.id} className="db-row orbit-upcoming-row" to={sessionPath(booking)}>
            <time className="orbit-date-tile" dateTime={booking.date}>{fmtDate(booking.date).split(',')[0]}</time>
            <div className="db-info"><strong>{roster.get(booking.clientId)?.name}</strong><small>{booking.type} · {booking.time}</small></div>
            <Icon name="chevron-right" size={16} />
          </Link>)}
          {!upcoming.length && <p className="db-note">No upcoming bookings.</p>}
        </section>
        <section className="db-card orbit-snapshot"><header className="db-head"><h2>Training snapshot</h2></header>
          <div className="db-trend-bottom"><div><h3>Booking completion · 30 days</h3><strong className="db-metric">{completion.total ? `${completion.completed} of ${completion.total} completed` : '—'}</strong><p>{completion.total ? `${completion.missed} missed · ${completion.pending} awaiting status` : 'No past bookings recorded.'}</p><Link className="db-link" to="/schedule">Review bookings →</Link></div>
            <div><h3>Latest strength estimate</h3>{strength ? <><strong className="db-metric">{fmtWt(+strength.valueKg)} <small>estimated 1RM</small></strong><p>{roster.get(strength.clientId).name} · {strength.exercise} · {fmtDay(strength.date)}</p><Link className="db-link" to={dashboardClientPath(strength.clientId, '/progress#strength')}>View strength →</Link></> : <p>No strength estimates recorded.</p>}</div></div>
        </section>
      </div>
    </div>
  </div>
}
