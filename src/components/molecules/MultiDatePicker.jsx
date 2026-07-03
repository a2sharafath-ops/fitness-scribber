// Month-grid calendar with multi-select toggling (bulk-paste targets).
// Presentational: selection state is owned by the caller.
import { useState } from 'react'
import Button from '../atoms/Button'
import { monthGridDates, monthLabel, addMonths } from '../../lib/dates'

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function MultiDatePicker({ selected, minDate, sourceDate, onToggle }) {
  const [anchor, setAnchor] = useState(minDate)
  const toggle = (dt) => (e) => {
    if (e.key && e.key !== 'Enter' && e.key !== ' ') return
    e.preventDefault?.()
    if (dt > minDate) onToggle(dt)
  }
  return (
    <div>
      <div className="flex between" style={{ marginBottom: 8 }}>
        <div style={{ fontWeight: 700 }}>{monthLabel(anchor)}</div>
        <div className="flex gap">
          <Button variant="ghost" size="sm" onClick={() => setAnchor(addMonths(anchor, -1))} aria-label="Previous month">←</Button>
          <Button variant="ghost" size="sm" onClick={() => setAnchor(addMonths(anchor, 1))} aria-label="Next month">→</Button>
        </div>
      </div>
      <div className="plan-dow">{DOW.map((d) => <div key={d}>{d}</div>)}</div>
      <div className="plan-month cal-multi">
        {monthGridDates(anchor).map((dt) => {
          const out = dt.slice(0, 7) !== anchor.slice(0, 7)
          const disabled = dt <= minDate
          return (
            <div key={dt}
              className={'plan-cell' + (out ? ' out' : '') + (selected.has(dt) ? ' sel' : '') + (disabled ? ' dis' : '') + (dt === sourceDate ? ' src' : '')}
              role="button" tabIndex={disabled ? -1 : 0} aria-pressed={selected.has(dt)}
              aria-label={`${selected.has(dt) ? 'Deselect' : 'Select'} ${dt}`}
              onClick={toggle(dt)} onKeyDown={toggle(dt)}>
              <div className="pc-date">{+dt.slice(8, 10)}</div>
              {dt === sourceDate && <div className="muted" style={{ fontSize: 9 }}>source</div>}
              {selected.has(dt) && <div className="cal-check">✓</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
