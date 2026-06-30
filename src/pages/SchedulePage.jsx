import { useState } from 'react'
import Button from '../components/atoms/Button'
import Tag from '../components/atoms/Tag'
import SessionForm from '../components/organisms/forms/SessionForm'
import { useData } from '../store/DataContext'
import { useModal } from '../store/ModalContext'
import { todayISO, fmtDay } from '../lib/dates'
import { colorFor } from '../lib/format'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const SSTATUS = { Confirmed: 'green', Pending: 'orange', Completed: 'blue', Cancelled: 'gray' }

export default function SchedulePage() {
  const { db, tz } = useData()
  const { openModal } = useModal()
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
    const evs = db.sessions.filter((s) => s.date === iso).sort((a, b) => a.time.localeCompare(b.time))
    cells.push({ iso, day: dd.getDate(), other: dd.getMonth() !== ym.m - 1, evs })
  }
  const upcoming = db.sessions.filter((s) => s.date >= today).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
  const shift = (dir) => setYm((p) => { let m = p.m + dir, y = p.y; if (m < 1) { m = 12; y-- } if (m > 12) { m = 1; y++ }; return { y, m } })

  return (
    <>
      <div className="topbar">
        <div><h1>Schedule</h1><div className="sub">{upcoming.length} upcoming sessions</div></div>
        <Button onClick={() => openModal(<SessionForm />)}>＋ Book Session</Button>
      </div>
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
                    onClick={(e) => { e.stopPropagation(); openModal(<SessionForm session={s} />) }}>{s.time} {c?.name.split(' ')[0] || '?'}</div>
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
              <div key={s.id} className="session-row" style={{ cursor: 'pointer' }} onClick={() => openModal(<SessionForm session={s} />)}>
                <span className="dot" style={{ background: colorFor(c?.name || '?') }} />
                <div style={{ flex: 1 }}><strong>{c?.name || '?'}</strong><div className="muted" style={{ fontSize: 12 }}>{fmtDay(s.date)} · {s.time} · {s.type}</div></div>
                <Tag color={SSTATUS[s.status]}>{s.status}</Tag>
              </div>
            )
          }) : <div className="empty"><div className="big">📅</div>No upcoming sessions</div>}
        </div>
      </div>
    </>
  )
}
