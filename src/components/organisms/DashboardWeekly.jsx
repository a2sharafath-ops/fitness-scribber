import { useState } from 'react'
import { fmtDate } from '../../lib/dates'
import { dashboardWeeks } from '../../lib/dashboard'

export default function DashboardWeekly({ bookings, monday }) {
  const [count, setCount] = useState(4)
  const [selected, setSelected] = useState(null)
  const weeks = dashboardWeeks(bookings, monday, count)
  const active = weeks.find((week) => week.from === selected) || weeks.at(-1)
  const max = Math.max(1, ...weeks.map((week) => week.booked))

  return <section className="db-card orbit-weekly" aria-labelledby="orbit-weekly-heading">
    <header className="db-head"><h2 id="orbit-weekly-heading">Weekly sessions</h2>
      <div className="db-tabs" role="group" aria-label="Weekly sessions range">
        {[4, 8].map((option) => <button key={option} type="button" aria-pressed={option === count}
          onClick={() => { setCount(option); setSelected(null) }}>{option} weeks</button>)}
      </div>
    </header>
    <div className="orbit-weekly-legend"><span>Booked</span><span>Completed</span></div>
    <div className="orbit-weekly-bars" style={{ '--weeks': count }} aria-label="Sessions by week">
      {weeks.map((week) => <button key={week.from} type="button"
        aria-pressed={active.from === week.from} onClick={() => setSelected(week.from)}
        aria-label={`Week of ${fmtDate(week.from)}, ${week.booked} booked, ${week.completed} completed`}>
        <span className="orbit-weekly-pair" aria-hidden="true"><i style={{ height: `${week.booked / max * 100}%` }} /><i style={{ height: `${week.completed / max * 100}%` }} /></span>
        <span>{fmtDate(week.from).split(',')[0]}</span>
      </button>)}
    </div>
    <p className="db-note" aria-live="polite">{fmtDate(active.from)}–{fmtDate(active.through)} · {active.booked} booked · {active.completed} completed</p>
  </section>
}
