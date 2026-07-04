import { useState } from 'react'
import Button from '../atoms/Button'
import SegToggle from '../molecules/SegToggle'
import DayMetrics from '../molecules/DayMetrics'
import WorkoutBuilderModal from './program/WorkoutBuilderModal'
import { useData } from '../../store/DataContext'
import { useModal } from '../../store/ModalContext'
import { useFormat } from '../../hooks/useFormat'
import { dailySum, dayMetrics } from '../../lib/calc'
import { programStats } from '../../lib/program'
import { weekDates, fmtDate, fmtDay, todayISO, monthGridDates, monthLabel, addMonths } from '../../lib/dates'

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function WorkoutPlanner({ client, featured = false, size }) {
  const sz = size || (featured ? 'featured' : 'default')
  const isFeatured = sz === 'featured'
  const isMedium = sz === 'medium'
  const { db, tz } = useData()
  const { openModal } = useModal()
  const { fmtVL } = useFormat()
  const [view, setView] = useState(isFeatured ? 'month' : 'week')
  const [anchor, setAnchor] = useState(todayISO(tz)) // any date within the shown month
  const [weekStart, setWeekStart] = useState(0)
  const [collapsed, setCollapsed] = useState(false)
  const today = todayISO(tz)

  const intMap = dailySum(db.srpe, client.id, 'tl')
  const prescribe = (dt) => openModal(<WorkoutBuilderModal clientId={client.id} date={dt} />, 'xl')
  const dayData = (dt) => {
    const presc = db.prescriptions.filter((p) => p.clientId === client.id && p.date === dt)
    const stats = presc.map(programStats).reduce((a, s) => ({ exercises: a.exercises + s.exercises, sets: a.sets + s.sets, volume: a.volume + s.volume }), { exercises: 0, sets: 0, volume: 0 })
    const names = presc.map((p) => (p.notes || '').trim()).filter(Boolean)
    const name = names.length ? names.join(' · ') : (stats.exercises ? `Session · ${stats.exercises} ex / ${stats.sets} sets` : null)
    return { vl: Math.round(stats.volume), name }
  }
  const open = (dt) => (e) => { if (!e.key || e.key === 'Enter' || e.key === ' ') { e.preventDefault?.(); prescribe(dt) } }

  // One-line summary shown when the card is collapsed.
  const shownDates = view === 'month' ? monthGridDates(anchor) : weekDates(weekStart, tz)
  const prescribedDates = new Set(db.prescriptions.filter((p) => p.clientId === client.id && programStats(p).exercises).map((p) => p.date))
  const plannedDays = shownDates.filter((d) => prescribedDates.has(d)).length
  const nextDate = [...prescribedDates].filter((d) => d >= today).sort()[0]
  const summary = `${plannedDays} session${plannedDays === 1 ? '' : 's'} ${view === 'month' ? 'this month' : 'this week'}${nextDate ? ` · next ${fmtDay(nextDate)}` : ''}`

  return (
    <div className={'card' + (isFeatured ? ' planner-featured' : '') + (isMedium ? ' planner-medium' : '')}>
      <div className="flex between" style={{ flexWrap: 'wrap', gap: 8 }}>
        <button className="planner-collapse" onClick={() => setCollapsed((v) => !v)}
          aria-expanded={!collapsed} aria-label={collapsed ? 'Expand workout planner' : 'Collapse workout planner'}>
          <span className="pc-caret" aria-hidden="true">{collapsed ? '▸' : '▾'}</span>
          <span className="section-title" style={{ margin: 0, fontSize: isFeatured ? 19 : undefined }}>Workout Planner</span>
        </button>
        {collapsed ? (
          <span className="planner-summary muted">{summary}</span>
        ) : (
          <div className="flex gap" style={{ flexWrap: 'wrap' }}>
            <SegToggle options={[['week', 'Week'], ['month', 'Month']]} value={view} onChange={setView} ariaLabel="Calendar view" />
            {view === 'month' ? (
              <div className="flex gap">
                <Button variant="ghost" size="sm" onClick={() => setAnchor(addMonths(anchor, -1))} aria-label="Previous month">←</Button>
                <Button variant="ghost" size="sm" onClick={() => setAnchor(today)}>Today</Button>
                <Button variant="ghost" size="sm" onClick={() => setAnchor(addMonths(anchor, 1))} aria-label="Next month">→</Button>
              </div>
            ) : (
              <div className="flex gap">
                <Button variant="ghost" size="sm" onClick={() => setWeekStart(weekStart - 7)} aria-label="Previous week">←</Button>
                <Button variant="ghost" size="sm" onClick={() => setWeekStart(0)}>This week</Button>
                <Button variant="ghost" size="sm" onClick={() => setWeekStart(weekStart + 7)} aria-label="Next week">→</Button>
              </div>
            )}
          </div>
        )}
      </div>

      {collapsed ? null : view === 'month' ? (
        <>
          <div style={{ margin: '10px 0 8px', fontSize: 14, fontWeight: 700 }}>
            {monthLabel(anchor)} <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>— click a day to prescribe</span>
          </div>
          <div className="plan-dow">{DOW.map((d) => <div key={d}>{d}</div>)}</div>
          <div className="plan-month">
            {monthGridDates(anchor).map((dt) => {
              const { vl, name } = dayData(dt)
              return (
                <div key={dt} className={'plan-cell' + (dt === today ? ' today' : '') + (dt.slice(0, 7) !== anchor.slice(0, 7) ? ' out' : '')}
                  role="button" tabIndex={0} aria-label={`Prescribe ${dt}`} onClick={open(dt)} onKeyDown={open(dt)}>
                  <div className="pc-date">{+dt.slice(8, 10)}{dt === today && <span className="pc-today">today</span>}</div>
                  {name && <div className="plan-session" title={name}>{name}</div>}
                  {vl ? <div className="plan-vl">VL {fmtVL(vl)}</div> : null}
                  {/* Load metrics for a day exist only once its session RPE is logged;
                      future days therefore show no ACWR/Mono/Strain projections. */}
                  {(dt === today || (dt > today && intMap[dt] !== undefined)) && <DayMetrics {...dayMetrics(db, client.id, dt, intMap)} />}
                </div>
              )
            })}
          </div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 12, color: 'var(--muted)', margin: '8px 0' }}>
            Week of {fmtDate(weekDates(weekStart, tz)[0])} — click a day to prescribe
          </div>
          <div className="plan-week">
            {weekDates(weekStart, tz).map((dt, i) => {
              const { vl, name } = dayData(dt)
              return (
                <div key={dt} className={'plan-day' + (dt === today ? ' today' : '')}
                  role="button" tabIndex={0} aria-label={`Prescribe ${DOW[i]} ${dt}`} onClick={open(dt)} onKeyDown={open(dt)}>
                  <div className="pd-date">{DOW[i]} {+dt.slice(8, 10)}</div>
                  {name ? <div className="plan-session" title={name}>{name}</div> : <div className="plan-rest muted">Rest / unplanned</div>}
                  {vl ? <div className="plan-vl">VL {fmtVL(vl)}</div> : <div className="plan-vl" style={{ color: 'var(--muted)' }}>—</div>}
                  {/* Load metrics for a day exist only once its session RPE is logged;
                      future days therefore show no ACWR/Mono/Strain projections. */}
                  {(dt === today || (dt > today && intMap[dt] !== undefined)) && <DayMetrics {...dayMetrics(db, client.id, dt, intMap)} />}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
