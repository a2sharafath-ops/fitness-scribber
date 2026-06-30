import { useParams, useNavigate } from 'react-router-dom'
import Avatar from '../components/atoms/Avatar'
import Button from '../components/atoms/Button'
import Tag from '../components/atoms/Tag'
import Kpi from '../components/atoms/Kpi'
import ReadinessTag from '../components/molecules/ReadinessTag'
import ConcernCard from '../components/molecules/ConcernCard'
import WorkoutPlanner from '../components/organisms/WorkoutPlanner'
import { AssignPlanForm, InviteAthleteForm } from '../components/organisms/forms/ClientForms'
import ConcernForm from '../components/organisms/forms/ConcernForm'
import { BodyMetricForm } from '../components/organisms/forms/LogForms'
import { hasBackend } from '../lib/supabase'
import { useData } from '../store/DataContext'
import { useModal } from '../store/ModalContext'
import { fmtDate } from '../lib/dates'
import { lastNDates, todayISO } from '../lib/dates'
import { readinessFor, readinessScore, dailySum, acwrSeries, trainingMonotony, trainingStrain } from '../lib/calc'

const SSTATUS = { Confirmed: 'green', Pending: 'orange', Completed: 'blue', Cancelled: 'gray' }

export default function ClientDetailPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const { db, commit, tz } = useData()
  const { openModal } = useModal()
  const c = db.clients.find((x) => x.id === id)
  if (!c) return <Button className="back" variant="ghost" onClick={() => nav('/clients')}>← Clients</Button>

  const plan = c.planId ? db.plans.find((p) => p.id === c.planId) : null
  const exName = (eid) => db.exercises.find((e) => e.id === eid)?.name || '?'
  const sessions = db.sessions.filter((s) => s.clientId === id).sort((a, b) => b.date.localeCompare(a.date))
  const concerns = db.concerns.filter((x) => x.clientId === id)

  // Load-Response snapshot KPIs (charts/detail live in the Command Center)
  const today = todayISO(tz)
  const intMap = dailySum(db.srpe, c.id, 'tl')
  const last7 = lastNDates(7, tz).map((d) => intMap[d] || 0)
  const mono = trainingMonotony(last7)
  const strain = trainingStrain(last7)
  const acwr = acwrSeries(intMap, lastNDates(28, tz)).filter((v) => v != null).slice(-1)[0]
  const rScore = readinessScore(db, c.id, today) ?? (() => {
    const d = [...lastNDates(28, tz)].reverse().find((x) => readinessScore(db, c.id, x) != null)
    return d ? readinessScore(db, c.id, d) : null
  })()

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
          <Button variant="ghost" onClick={() => openModal(<BodyMetricForm clientId={c.id} />)}>＋ Log Progress</Button>
          {hasBackend && <Button variant="ghost" onClick={() => openModal(<InviteAthleteForm client={c} />)}>🎟️ Invite</Button>}
        </div>
      </div>

      {/* Load-Response snapshot — full charts/breakdowns live in the Command Center */}
      <div className="flex between" style={{ marginBottom: 12 }}>
        <div className="section-title" style={{ margin: 0 }}>Load-Response snapshot</div>
        <Button variant="ghost" size="sm" onClick={() => nav('/command/' + c.id)}>Open full dashboard →</Button>
      </div>
      <div className="kpi-strip">
        <Kpi label="Readiness" value={rScore ?? '—'} delta="composite /100" onClick={() => nav('/clients/' + c.id + '/metric/readiness')} />
        <Kpi label="ACWR" value={acwr ? acwr.toFixed(2) : '—'} delta={acwr ? (acwr >= 0.8 && acwr <= 1.3 ? 'sweet spot' : acwr > 1.3 ? 'elevated' : 'low') : ''} deltaColor={acwr ? (acwr >= 0.8 && acwr <= 1.3 ? 'var(--green)' : 'var(--accent)') : 'var(--muted)'} onClick={() => nav('/clients/' + c.id + '/metric/acwr')} />
        <Kpi label="Monotony (7d)" value={mono} delta={mono > 2 ? 'high — vary load' : 'healthy'} deltaColor={mono > 2 ? 'var(--accent)' : 'var(--green)'} onClick={() => nav('/clients/' + c.id + '/metric/monotony')} />
        <Kpi label="Strain (7d)" value={strain.toLocaleString()} delta="load × monotony" onClick={() => nav('/clients/' + c.id + '/metric/strain')} />
      </div>

      <div className="grid cards-2" style={{ marginTop: 16, alignItems: 'start' }}>
        <div className="card">
          <div className="flex between"><div className="section-title" style={{ margin: 0 }}>Assigned Plan</div>
            <Button variant="ghost" size="sm" onClick={() => openModal(<AssignPlanForm client={c} />)}>Change</Button></div>
          {plan ? (
            <div style={{ marginTop: 12 }}>
              <strong>{plan.name}</strong><div className="muted" style={{ fontSize: 12, marginBottom: 12 }}>{plan.desc}</div>
              {plan.items.map((it, i) => (
                <div className="ex-item" key={i}><div style={{ flex: 1 }}><strong>{exName(it.exId)}</strong>
                  <div className="muted" style={{ fontSize: 12 }}>{it.sets} × {it.reps} · rest {it.rest}</div></div></div>
              ))}
            </div>
          ) : (
            <div className="empty" style={{ padding: 30 }}><div className="big">📋</div>No plan assigned
              <div><Button size="sm" style={{ marginTop: 10 }} onClick={() => openModal(<AssignPlanForm client={c} />)}>Assign plan</Button></div>
            </div>
          )}
        </div>
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

      {/* Workout planner overview */}
      <div style={{ marginTop: 16 }}><WorkoutPlanner client={c} /></div>

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
