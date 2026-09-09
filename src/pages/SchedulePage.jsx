import { useState } from 'react'
import Button from '../components/atoms/Button'
import Tag from '../components/atoms/Tag'
import Icon from '../components/atoms/Icon'
import SessionForm from '../components/organisms/forms/SessionForm'
import { useData } from '../store/DataContext'
import { useModal } from '../store/ModalContext'
import { todayISO, fmtDay } from '../lib/dates'
import { colorFor } from '../lib/format'
import {useNavigate} from 'react-router-dom'
import useCoachSessions from '../hooks/useCoachSessions'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const SSTATUS = { Confirmed: 'green', Pending: 'orange', Completed: 'blue', Cancelled: 'gray' }

export default function SchedulePage() {
  const { db, tz } = useData()
  const { openModal } = useModal()
  const pooling=useCoachSessions(),navigate=useNavigate()
  const entries=[...db.sessions,...pooling.rows.map(row=>({id:`pool-${row.id}`,clientId:row.clientId,date:row.date,time:row.sessionAt?new Intl.DateTimeFormat('en-GB',{timeZone:row.timeZone||'UTC',hour:'2-digit',minute:'2-digit'}).format(new Date(row.sessionAt)):'',type:'Workout',status:row.status==='complete'?'Completed':row.status==='stop'?'Cancelled':'Confirmed',pooling:true}))]
  const openSession=s=>s.pooling?navigate(`/clients/${s.clientId}#governed-workouts`):openModal(<SessionForm session={s}/> )
  const now = new Date()
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() + 1 })
  const today = todayISO(tz)
  const monthName = new Date(ym.y, ym.m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const first = new Date(ym.y, ym.m - 1, 1)
  const start = new Date(first)
  start.setDate(1 - ((first.getDay() + 6) % 7))
  const cells = []
  for (let i = 0; i < 42; i++) {
    const dd = new Date(start); dd.setDate(start.getDate() + i)
    const iso = dd.toISOString().slice(0, 10)
    const evs = entries.filter((s) => s.date === iso).sort((a, b) => a.time.localeCompare(b.time))
    cells.push({ iso, day: dd.getDate(), other: dd.getMonth() !== ym.m - 1, evs })
  }
  const upcoming = entries.filter((s) => s.date >= today).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
  const shift = (dir) => setYm((p) => { let m = p.m + dir, y = p.y; if (m < 1) { m = 12; y-- } if (m > 12) { m = 1; y++ }; return { y, m } })

  return (
    <>
      <div className="topbar">
        <div><p className="coach-eyebrow">Appointments and workouts</p><h1>Calendar</h1><div className="sub">{upcoming.length} upcoming items</div></div>
        <Button onClick={() => openModal(<SessionForm />)}>Book session</Button>
      </div>
      {pooling.error&&<p className="coach-inline-warning" role="alert">Workout dates could not be refreshed. Coaching appointments are still shown.</p>}
      <div className="grid" style={{ gridTemplateColumns: '2.4fr 1fr', alignItems: 'start' }}>
        <div className="card">
          <div className="flex between" style={{ marginBottom: 14 }}>
            <Button variant="ghost" size="sm" onClick={() => shift(-1)}>←</Button>
            <strong style={{ fontSize: 16 }}>{monthName}</strong>
            <Button variant="ghost" size="sm" onClick={() => shift(1)}>→</Button>
          </div>
          <div className="cal-grid">
            {DAYS.map((d) => <div className="cal-head" key={d}>{d}</div>)}
            {cells.map((cell) => (
              <div key={cell.iso} className={'cal-cell' + (cell.other ? ' other' : '') + (cell.iso === today ? ' today' : '')}
                onClick={() => openModal(<SessionForm date={cell.iso} />)}>
                <div className="cal-date">{cell.day}</div>
                {cell.evs.slice(0, 3).map((s) => {
                  const c = db.clients.find((x) => x.id === s.clientId)
                  return <div key={s.id} className="cal-evt" style={{ background: colorFor(c?.name || '?') + '22', color: colorFor(c?.name || '?') }}
                    onClick={(e) => { e.stopPropagation(); openSession(s) }}>{s.time} {c?.name.split(' ')[0] || '?'}</div>
                })}
                {cell.evs.length > 3 && <div className="muted" style={{ fontSize: 10 }}>+{cell.evs.length - 3} more</div>}
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="section-title" style={{ margin: '0 0 12px' }}>Upcoming</div>
          {upcoming.length ? upcoming.slice(0, 8).map((s) => {
            const c = db.clients.find((x) => x.id === s.clientId)
            return (
              <div key={s.id} className="session-row" style={{ cursor: 'pointer' }} onClick={() => openSession(s)}>
                <span className="dot" style={{ background: colorFor(c?.name || '?') }} />
                <div style={{ flex: 1 }}><strong>{c?.name || '?'}</strong><div className="muted" style={{ fontSize: 12 }}>{fmtDay(s.date)} · {s.time} · {s.type}</div></div>
                <Tag color={SSTATUS[s.status]}>{s.status}</Tag>
              </div>
            )
          }) : <div className="empty"><div className="big"><Icon name="calendar" size={40} /></div>No upcoming sessions</div>}
        </div>
      </div>
    </>
  )
}
