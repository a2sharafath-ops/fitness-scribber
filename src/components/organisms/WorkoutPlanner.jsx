import { useState } from 'react'
import Button from '../atoms/Button'
import PrescriptionModal from './PrescriptionModal'
import { useData } from '../../store/DataContext'
import { useModal } from '../../store/ModalContext'
import { useFormat } from '../../hooks/useFormat'
import { weekDates, fmtDate, todayISO } from '../../lib/dates'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function WorkoutPlanner({ client }) {
  const { db, tz } = useData()
  const { openModal } = useModal()
  const { fmtVL } = useFormat()
  const [weekStart, setWeekStart] = useState(0)
  const wk = weekDates(weekStart, tz)
  const today = todayISO(tz)

  return (
    <div className="card">
      <div className="flex between">
        <div className="section-title" style={{ margin: 0 }}>Workout Planner</div>
        <div className="flex gap">
          <Button variant="ghost" size="sm" onClick={() => setWeekStart(weekStart - 7)}>←</Button>
          <Button variant="ghost" size="sm" onClick={() => setWeekStart(0)}>This week</Button>
          <Button variant="ghost" size="sm" onClick={() => setWeekStart(weekStart + 7)}>→</Button>
        </div>
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted)', margin: '8px 0' }}>
        Week of {fmtDate(wk[0])} — click a day to prescribe
      </div>
      <div className="plan-week">
        {DAYS.map((dn, i) => {
          const dt = wk[i]
          const pres = db.prescriptions.filter((p) => p.clientId === client.id && p.date === dt)
          const vl = pres.reduce((a, p) => a + p.items.reduce((s, it) => s + (it.volumeLoad || 0), 0), 0)
          const exItems = pres.flatMap((p) => p.items).slice(0, 4)
          return (
            <div
              key={dt}
              className={'plan-day' + (dt === today ? ' today' : '')}
              role="button"
              tabIndex={0}
              aria-label={`Prescribe ${dn} ${dt}`}
              onClick={() => openModal(<PrescriptionModal clientId={client.id} date={dt} />, true)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(<PrescriptionModal clientId={client.id} date={dt} />, true) } }}
            >
              <div className="pd-date">{dn} {+dt.slice(8, 10)}</div>
              {exItems.map((it, j) => (
                <div className="plan-ex" key={j}>{it.exercise}{it.group ? <span className="superset-tag">SS {it.group}</span> : null}</div>
              ))}
              {vl ? <div className="plan-vl">VL {fmtVL(vl)}</div> : <div className="plan-vl" style={{ color: 'var(--muted)' }}>—</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
