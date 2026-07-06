import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Line } from 'react-chartjs-2'
import Button from '../components/atoms/Button'
import Icon from '../components/atoms/Icon'
import SegToggle from '../components/molecules/SegToggle'
import BulkWellnessForm from '../components/organisms/forms/BulkWellnessForm'
import SessionForm from '../components/organisms/forms/SessionForm'
import { useData } from '../store/DataContext'
import { useModal } from '../store/ModalContext'
import { initials } from '../lib/format'
import { todayISO, fmtDate, fmtDay, lastNDates } from '../lib/dates'
import { baseOptions } from '../lib/chartSetup'
import { squadRow, openConcerns } from '../lib/calc'

const RANK = { red: 0, yellow: 1, gray: 2, green: 3 }
const RANGE = { '1M': 30, '3M': 90, '6M': 180, '1Y': 365 }
const SSTATUS_CHIP = { Completed: ['sc-green', 'Completed'], Confirmed: ['sc-green', 'Confirmed'], Pending: ['sc-gray', 'Scheduled'], Cancelled: ['sc-gray', 'Cancelled'] }
const shortD = (iso) => fmtDate(iso).replace(/,? *\d{4}$/, '')
const daysAgo = (iso, today) => Math.round((Date.parse(today) - Date.parse(iso)) / 86400000)

function Stat({ chipBg, chipColor, icon, num, label, pillClass, pill, onClick }) {
  return (
    <button className="dash-stat" onClick={onClick} aria-label={`${label}: ${num}`}>
      <div className="dash-stat-head">
        <span className="dash-chip" style={{ background: chipBg, color: chipColor }}><Icon name={icon} size={18} /></span>
        {pill && <span className={'dash-pill ' + pillClass}>{pill}</span>}
      </div>
      <div className="dash-stat-num">{num}</div>
      <div className="dash-stat-label">{label}</div>
    </button>
  )
}

function StatusChip({ cls, label }) {
  return <span className={'sc ' + cls}><span className="sc-dot" />{label}</span>
}

export default function DashboardPage() {
  const { db, tz } = useData()
  const { openModal } = useModal()
  const nav = useNavigate()
  const [range, setRange] = useState('1M')
  const today = todayISO(tz)
  const nowHM = new Date().toTimeString().slice(0, 5)

  const active = db.clients.filter((c) => c.status === 'Active').length
  const todaySessions = [...db.sessions.filter((s) => s.date === today)].sort((a, b) => a.time.localeCompare(b.time))
  const upcoming = db.sessions.filter((s) => s.date >= today && s.status !== 'Completed' && s.status !== 'Cancelled').length
  const past = db.sessions.filter((s) => s.date <= today && s.status !== 'Cancelled')
  const done = past.filter((s) => s.status === 'Completed').length
  const adherence = past.length ? Math.round((done / past.length) * 100) : 0
  const openC = openConcerns(db)

  const squad = db.clients.map((c) => squadRow(db, c, tz)).sort((a, b) => RANK[a.r.color] - RANK[b.r.color] || b.openC - a.openC)
  const atRisk = squad.filter((x) => x.r.color === 'red').length
  const ready = squad.filter((x) => x.r.color === 'green').length
  const monitor = squad.filter((x) => x.r.color === 'yellow').length
  const tracked = squad.filter((x) => x.r.color !== 'gray').length

  // Client activity — completed sessions bucketed across the selected range.
  const days = RANGE[range]
  const dates = lastNDates(days, tz)
  const compByDate = {}
  db.sessions.forEach((s) => { if (s.status === 'Completed') compByDate[s.date] = (compByDate[s.date] || 0) + 1 })
  const perDay = dates.map((d) => compByDate[d] || 0)
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
        <div className="dash-stats">
          <Stat icon="users" chipBg="var(--tint-red)" chipColor="var(--accent)" num={active} label="Active clients"
            pillClass="sc-gray" pill={`${db.clients.length} total`} onClick={() => nav('/clients')} />
          <Stat icon="calendar" chipBg="#ebebfa" chipColor="#5856d6" num={todaySessions.length} label="Sessions today"
            pillClass="sc-indigo" pill={`${upcoming} upcoming`} onClick={() => nav('/schedule')} />
          <Stat icon="activity" chipBg="var(--tint-green)" chipColor="var(--green)" num={adherence + '%'} label="Session adherence"
            pillClass="sc-green" pill={`${done} done`} onClick={() => nav('/schedule')} />
          <Stat icon="alert" chipBg="var(--tint-amber)" chipColor="var(--accent2)" num={atRisk} label="At-risk clients"
            pillClass="sc-amber" pill={`${openC.length} concern${openC.length === 1 ? '' : 's'}`} onClick={() => nav('/concerns')} />
        </div>

        <div className="dash-insights">
          <div className="dash-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="dash-card-head">
              <div style={{ flex: 1 }}>
                <div className="dash-card-title">Client activity</div>
                <div className="dash-card-sub">Completed sessions across your roster</div>
              </div>
              <SegToggle options={Object.keys(RANGE).map((k) => [k, k])} value={range} onChange={setRange} ariaLabel="Activity range" />
            </div>
            {hasActivity ? (
              <>
                <div style={{ height: 220 }}><Line data={chartData} options={chartOpts} /></div>
                <div className="dash-xlabels"><span>{shortD(dates[0])}</span><span>{shortD(dates[dates.length - 1])}</span></div>
              </>
            ) : (
              <div className="empty" style={{ padding: '48px 20px' }}><div className="big"><Icon name="chart" size={40} /></div>No completed sessions in this range yet.</div>
            )}
          </div>

          <div className="dash-side">
            <div className="dash-ai">
              <div className="dash-ai-head">
                <span className="dash-ai-chip"><Icon name="sparkles" size={14} /></span>
                <span className="dash-ai-tag">CURIO AI</span>
              </div>
              <div className="dash-ai-title">{tracked === 0 ? 'Readiness needs data' : ready >= atRisk ? 'Roster recovery looks strong' : 'Several clients need attention'}</div>
              <div className="dash-ai-body">
                {tracked === 0
                  ? 'Log morning wellness or connect wearables so Curio can surface readiness insights across your roster.'
                  : `${ready} of ${tracked} tracked client${tracked === 1 ? '' : 's'} ${ready === 1 ? 'is' : 'are'} ready to train today${monitor ? `, ${monitor} to monitor` : ''}${atRisk ? `, and ${atRisk} at risk` : ''}. ${atRisk ? 'Review the at-risk list before programming their next block.' : 'Good window to progress well-recovered cohorts.'}`}
              </div>
            </div>

            {next ? (
              <button className="dash-next" onClick={() => openModal(<SessionForm session={next} />)}>
                <div className="dash-next-label">NEXT SESSION · {next.date === today ? next.time : fmtDay(next.date) + ' ' + next.time}</div>
                <div className="dash-next-title">{next.type} · {nextClient?.name || 'Client'}</div>
                <div className="dash-next-sub">{next.dur} min · {nextClient?.goal || 'Session'}</div>
              </button>
            ) : (
              <div className="dash-next" style={{ cursor: 'default' }}>
                <div className="dash-next-label">NEXT SESSION</div>
                <div className="dash-next-title">Nothing scheduled</div>
                <div className="dash-next-sub">Book a session to see it here.</div>
              </div>
            )}
          </div>
        </div>

        <div className="dash-lists">
          <div className="dash-list">
            <div className="dash-list-head">
              <div className="dash-list-title">Today's schedule</div>
              <button className="dash-viewall" onClick={() => nav('/schedule')}>View all</button>
            </div>
            {todaySessions.length ? todaySessions.map((s) => {
              const c = db.clients.find((x) => x.id === s.clientId)
              const isNext = next && s.id === next.id
              const [cls, label] = isNext && s.status !== 'Completed' ? ['sc-indigo', 'Up next'] : (SSTATUS_CHIP[s.status] || ['sc-gray', s.status])
              return (
                <button key={s.id} className="dash-row" onClick={() => openModal(<SessionForm session={s} />)}>
                  <span className="dash-time">{s.time}</span>
                  <span className="dash-rinfo"><div className="t">{s.type}</div><div className="s">{c?.name || 'Client'}</div></span>
                  <StatusChip cls={cls} label={label} />
                </button>
              )
            }) : <div className="empty"><div className="big"><Icon name="coffee" size={40} /></div>No sessions today. Enjoy the rest!</div>}
          </div>

          <div className="dash-list">
            <div className="dash-list-head">
              <div className="dash-list-title">Needs attention</div>
              <button className="dash-viewall" onClick={() => nav('/concerns')}>View all</button>
            </div>
            {attention.length ? attention.map((a) => (
              <button key={a.c.id} className="dash-row" onClick={() => nav('/command/' + a.c.id)}>
                <span className="dash-att-av" style={a.tone === 'red' ? { background: 'var(--tint-red)', color: 'var(--accent)' } : { background: 'var(--tint-amber)', color: 'var(--accent2)' }}>{initials(a.c.name)}</span>
                <span className="dash-rinfo"><div className="t">{a.c.name}</div><div className="s">{a.reason}</div></span>
                <StatusChip cls={a.tone === 'red' ? 'sc-red' : 'sc-amber'} label={a.chip} />
              </button>
            )) : <div className="empty" style={{ padding: 24 }}><div className="big"><Icon name="check" size={40} /></div>All clear — no clients need attention.</div>}
          </div>
        </div>
      </div>
    </>
  )
}
