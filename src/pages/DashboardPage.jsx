import { useNavigate } from 'react-router-dom'
import Avatar from '../components/atoms/Avatar'
import Button from '../components/atoms/Button'
import Tag from '../components/atoms/Tag'
import Shape from '../components/atoms/Shape'
import StatCard from '../components/molecules/StatCard'
import ReadinessTag from '../components/molecules/ReadinessTag'
import ProgressBar from '../components/atoms/ProgressBar'
import BulkWellnessForm from '../components/organisms/forms/BulkWellnessForm'
import SessionForm from '../components/organisms/forms/SessionForm'
import { useData } from '../store/DataContext'
import { useModal } from '../store/ModalContext'
import { colorFor } from '../lib/format'
import { todayISO } from '../lib/dates'
import { squadRow, openConcerns, readinessFor } from '../lib/calc'

const RANK = { red: 0, yellow: 1, gray: 2, green: 3 }

export default function DashboardPage() {
  const { db, tz } = useData()
  const { openModal } = useModal()
  const nav = useNavigate()
  const today = todayISO(tz)

  const active = db.clients.filter((c) => c.status === 'Active').length
  const todaySessions = db.sessions.filter((s) => s.date === today)
  const upcoming = db.sessions.filter((s) => s.date >= today && s.status !== 'Completed').length
  const completed = db.sessions.filter((s) => s.status === 'Completed').length
  const revenue = db.clients.filter((c) => c.status === 'Active').reduce((a, c) => a + (c.plan === 'Premium' ? 180 : 120), 0)
  const highConcerns = openConcerns(db).filter((x) => x.severity === 'High')

  const squad = db.clients.map((c) => squadRow(db, c, tz)).sort((a, b) => RANK[a.r.color] - RANK[b.r.color] || b.openC - a.openC)
  const go = (id) => nav('/command/' + id)

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Welcome back, {db.settings.trainerName.split(' ')[0]} 👋</h1>
          <div className="sub">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
        </div>
        <div className="flex gap">
          <Button variant="ghost" onClick={() => openModal(<BulkWellnessForm />, true)}>📝 Bulk morning check-in</Button>
          <Button onClick={() => openModal(<SessionForm />)}>＋ Book Session</Button>
        </div>
      </div>

      {highConcerns.length > 0 && (
        <div className="alert-banner">
          <span className="ab-ic">🚩</span>
          <div style={{ flex: 1 }}>
            <strong>{highConcerns.length} high-severity concern{highConcerns.length > 1 ? 's' : ''} need attention</strong>
            <div className="muted" style={{ fontSize: 12 }}>{highConcerns.map((x) => db.clients.find((c) => c.id === x.clientId)?.name).filter(Boolean).join(', ')}</div>
          </div>
          <Button size="sm" onClick={() => nav('/concerns')}>Review</Button>
        </div>
      )}

      <div className="grid cards-4">
        <StatCard label="Active Clients" value={active} delta={'▲ ' + db.clients.length + ' total'} onClick={() => nav('/clients')} ariaLabel="Active clients, view all clients" />
        <StatCard label="Sessions Today" value={todaySessions.length} delta={upcoming + ' upcoming'} onClick={() => nav('/schedule')} ariaLabel="Sessions today, open schedule" />
        <StatCard label="Sessions Done" value={completed} delta="▲ all time" onClick={() => nav('/schedule')} ariaLabel="Sessions completed, open schedule" />
        <StatCard label="Est. Monthly Rev." value={'$' + revenue.toLocaleString()} delta={'▲ from ' + active + ' active'} onClick={() => nav('/clients')} ariaLabel="Estimated monthly revenue, view clients" />
      </div>

      <div className="section-title" style={{ marginTop: 24 }}>Squad Readiness &amp; Workload Overview</div>
      <div className="card" style={{ padding: 0, overflowX: 'auto', marginBottom: 24 }}>
        <table>
          <caption className="sr-only">Squad readiness and workload, sorted by risk</caption>
          <thead><tr><th>Client</th><th>Readiness</th><th>ACWR</th><th>Wellness</th><th>Concerns</th></tr></thead>
          <tbody>
            {squad.map((x) => (
              <tr key={x.c.id} className={'clickable risk-row-' + x.r.color} tabIndex={0} role="button"
                aria-label={`${x.c.name}, readiness ${x.r.label}, open Command Center`}
                onClick={() => go(x.c.id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(x.c.id) } }}>
                <td><div className="cell-user"><Avatar name={x.c.name} /><div><strong>{x.c.name}</strong><div className="muted" style={{ fontSize: 12 }}>{x.c.status} · {x.c.goal}</div></div></div></td>
                <td><ReadinessTag readiness={x.r} short /></td>
                <td>{x.acwr ? <span style={{ color: x.acwr >= 0.8 && x.acwr <= 1.3 ? 'var(--green)' : 'var(--accent)' }}>{x.acwr.toFixed(2)}</span> : '—'}</td>
                <td>{x.wellness != null ? x.wellness + '/28' : '—'}</td>
                <td>{x.openC ? <Tag color="orange"><Shape color="orange" /> {x.openC}</Tag> : <span className="muted">0</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid cards-2" style={{ marginTop: 16, alignItems: 'start' }}>
        <div className="card">
          <div className="flex between"><div className="section-title" style={{ margin: 0 }}>Today's Schedule</div>
            <Button variant="ghost" size="sm" onClick={() => nav('/schedule')}>View calendar</Button></div>
          <div style={{ marginTop: 12 }}>
            {todaySessions.length ? [...todaySessions].sort((a, b) => a.time.localeCompare(b.time)).map((s) => {
              const c = db.clients.find((x) => x.id === s.clientId)
              return (
                <div key={s.id} className="session-row row-link" role="button" tabIndex={0} aria-label={`${c.name} session at ${s.time}, edit`}
                  onClick={() => openModal(<SessionForm session={s} />)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(<SessionForm session={s} />) } }}>
                  <span className="dot" style={{ background: colorFor(c.name) }} />
                  <span className="session-time">{s.time}</span>
                  <div style={{ flex: 1 }}><Avatar name={c.name} size={28} /> <strong style={{ marginLeft: 6 }}>{c.name}</strong>
                    <div className="muted" style={{ fontSize: 12, marginLeft: 40 }}>{s.type} · {s.dur}min</div></div>
                  <Tag color={{ Confirmed: 'green', Pending: 'orange', Completed: 'blue', Cancelled: 'gray' }[s.status]}>{s.status}</Tag>
                </div>
              )
            }) : <div className="empty"><div className="big">☕</div>No sessions today. Enjoy the rest!</div>}
          </div>
        </div>
        <div className="card">
          <div className="section-title" style={{ margin: '0 0 12px' }}>Client Goals Progress</div>
          {db.clients.filter((c) => c.status === 'Active').map((c) => {
            const logs = db.logs.filter((l) => l.clientId === c.id).sort((a, b) => a.date.localeCompare(b.date))
            let pct = 50
            if (logs.length > 1) { const first = logs[0].squat, last = logs[logs.length - 1].squat; pct = Math.min(100, Math.round(((last - first) / first) * 100) + 40) }
            return (
              <div key={c.id} className="row-link" style={{ marginBottom: 6, padding: 8 }} role="button" tabIndex={0} aria-label={`${c.name}, open Command Center`}
                onClick={() => go(c.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(c.id) } }}>
                <div className="flex between">
                  <span><Avatar name={c.name} size={26} /> <strong style={{ marginLeft: 6 }}>{c.name}</strong> <ReadinessTag readiness={readinessFor(db, c.id)} short /></span>
                  <span className="muted" style={{ fontSize: 12 }}>{c.goal}</span>
                </div>
                <ProgressBar pct={pct} />
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
