import { useState } from 'react'
import { fmtDate, fmtDateRange } from '../../lib/dates'
import { dashboardWeeks } from '../../lib/dashboard'
import DashboardSegments from '../molecules/DashboardSegments'

const RANGES = [[4, '4 weeks'], [8, '8 weeks']]

export default function DashboardWeekly({ bookings, monday }) {
  const [count, setCount] = useState(4)
  const [selected, setSelected] = useState(null)
  const [hovered, setHovered] = useState(null)
  const weeks = dashboardWeeks(bookings, monday, count)
  const active = weeks.find((week) => week.from === (hovered ?? selected)) || weeks.at(-1)
  const max = Math.max(1, ...weeks.map((week) => week.booked))
  const activePosition = (weeks.indexOf(active) + .5) / weeks.length * 100

  return <section className="db-card orbit-weekly" aria-labelledby="orbit-weekly-heading">
    <header className="db-head"><h2 id="orbit-weekly-heading">Weekly sessions</h2>
      <DashboardSegments label="Weekly sessions range" options={RANGES} value={count}
        onChange={(range) => { setCount(range); setSelected(null); setHovered(null) }} />
    </header>
    <div className="orbit-weekly-summary"><div className="orbit-weekly-legend"><span>Completed</span><span>Booked</span></div>
      <span><strong>{weeks.reduce((sum, week) => sum + week.completed, 0)}</strong> completed</span>
    </div>
    <div className="orbit-weekly-plot" style={{ '--weeks': count }}>
      <div className="orbit-weekly-scale" aria-hidden="true"><span>{max}</span><span>0</span></div>
      <div className="orbit-weekly-bars" role="group" aria-label="Sessions by week"
        onPointerLeave={() => setHovered(null)}>
      {weeks.map((week, index) => <button key={week.from} type="button" style={{ '--week-delay': `${index * 22}ms` }}
        aria-pressed={active.from === week.from} onClick={() => setSelected(week.from)} onFocus={() => setSelected(week.from)}
        onPointerEnter={(event) => { if (event.pointerType === 'mouse') setHovered(week.from) }}
        onKeyDown={(event) => {
          const offset = { ArrowLeft: -1, ArrowRight: 1 }[event.key]
          if (!offset) return
          event.preventDefault()
          event.currentTarget.parentElement.children[Math.min(weeks.length - 1, Math.max(0, index + offset))]?.focus()
        }}
        aria-label={`Week of ${fmtDate(week.from)}, ${week.booked} booked, ${week.completed} completed`}>
        <span key={count} className="orbit-weekly-pair" aria-hidden="true"><i style={{ height: `${week.completed / max * 100}%` }} /><i style={{ height: `${week.booked / max * 100}%` }} /></span>
      </button>)}
      <div className="orbit-weekly-tooltip" data-hovered={Boolean(hovered)} style={{ '--weekly-tooltip-x': `${activePosition}%` }} aria-hidden="true">
        <strong>{fmtDate(active.from)}</strong><span>{active.booked} booked · {active.completed} completed</span>
      </div>
      </div>
      <div className="orbit-weekly-axis" data-count={count} aria-hidden="true">
        {weeks.map(week => <span className="orbit-weekly-date" key={week.from}>{fmtDate(week.from).split(',')[0]}</span>)}
      </div>
    </div>
    <p className="db-note" aria-live="polite"><strong>{fmtDateRange(active.from, active.through)}</strong> · {active.booked} booked · {active.completed} completed</p>
  </section>
}
