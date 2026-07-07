import { useState } from 'react'
import Button from '../atoms/Button'
import Icon from '../atoms/Icon'
import SegToggle from '../molecules/SegToggle'
import TodayWorkout from './workout/TodayWorkout'
import WorkoutPlanner from './WorkoutPlanner'
import { useData } from '../../store/DataContext'
import { useFormat } from '../../hooks/useFormat'
import { programStats } from '../../lib/program'
import { weekDates, todayISO, fmtDay } from '../../lib/dates'

// Planner widget (Figma: Client Overview focus row). One persistent card:
// the header (caret, title, Day/Week/Month switch) never changes — only the
// body swaps between the collapsed summary, Today's Workout (Day), and the
// calendar planner (Week/Month). All underlying behaviour is unchanged.
const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

const rColor = (r) => (r == null ? 'var(--muted)' : r >= 65 ? 'var(--green)' : r >= 45 ? 'var(--blue)' : 'var(--accent)')
const aColor = (a) => (a == null ? 'var(--muted)' : a >= 0.8 && a <= 1.3 ? 'var(--green)' : a > 1.5 ? 'var(--accent)' : 'var(--blue)')

export default function PlannerWidget({ client, size = 'medium', todayProps }) {
  const [view, setView] = useState('collapsed')
  const { db, tz } = useData()
  const { fmtVL } = useFormat()
  const today = todayISO(tz)
  const expanded = view !== 'collapsed'

  const week = weekDates(0, tz)
  const planned = new Set(
    db.prescriptions
      .filter((p) => p.clientId === client.id && programStats(p).exercises > 0)
      .map((p) => p.date),
  )
  const plannedCount = week.filter((d) => planned.has(d)).length
  const { prescription, workout, context = {} } = todayProps || {}
  const pStats = prescription ? programStats(prescription) : null
  const todayName = workout
    ? (workout.status === 'completed' ? 'Session completed' : 'Session in progress')
    : pStats && pStats.exercises
      ? (prescription.notes || 'Prescribed session')
      : 'Rest / unplanned'
  const todayMeta = workout
    ? `${workout.items?.length || 0} exercises`
    : pStats && pStats.exercises
      ? `${pStats.exercises} ex · ${pStats.sets} sets · VL ${fmtVL(Math.round(pStats.volume))}`
      : 'Nothing prescribed for today'
  const open = (v) => (e) => {
    if (!e.key || e.key === 'Enter' || e.key === ' ') { e.preventDefault?.(); setView(v) }
  }

  return (
    <div className="card pw">
      {/* Persistent header — same in every state */}
      <div className="pw-head">
        <button className={'pw-caret' + (expanded ? ' open' : '')} onClick={() => setView(expanded ? 'collapsed' : 'day')}
          aria-expanded={expanded} aria-label={expanded ? 'Collapse workout planner' : 'Open workout planner — day, week and month'}>
          <span className="pw-caret-ic" aria-hidden="true">
            <Icon name="chevron-down" size={16} style={{ transform: expanded ? 'none' : 'rotate(-90deg)', transition: 'transform .15s' }} />
          </span>
          <span className="section-title" style={{ margin: 0 }}>Workout Planner</span>
          {!expanded && <span className="pw-caret-cue" aria-hidden="true">Tap to open</span>}
        </button>
        {!expanded && plannedCount > 0 && (
          <span className="pw-badge">{plannedCount} session{plannedCount === 1 ? '' : 's'} this week</span>
        )}
        <div className="nav-spacer" />
        <SegToggle
          options={[['day', 'Day'], ['week', 'Week'], ['month', 'Month']]}
          value={expanded ? view : null}
          onChange={setView}
          ariaLabel="Planner view"
        />
        {expanded && (
          <button className="pw-expand" onClick={() => setView('collapsed')} aria-label="Collapse planner">
            <Icon name="chevron-down" size={14} style={{ transform: 'rotate(180deg)' }} />
          </button>
        )}
      </div>

      {/* Body — swaps inside the same card */}
      <div className="pw-body pw-view" key={view}>
        {view === 'day' ? (
          <TodayWorkout {...todayProps} bare />
        ) : view === 'week' || view === 'month' ? (
          <WorkoutPlanner client={client} size={size} initialView={view} bare key={view} />
        ) : (
          <>
            <div className="pw-today" role="button" tabIndex={0} onClick={open('day')} onKeyDown={open('day')}>
              <div>
                <div className="pw-overline">TODAY · {fmtDay(today).toUpperCase()}</div>
                <div className="pw-trow">
                  <span className="pw-tname">{todayName}</span>
                  <span className="muted" style={{ fontSize: 12 }}>{todayMeta}</span>
                </div>
              </div>
              <div className="nav-spacer" />
              {context.readiness != null && (
                <span className="pw-chip">R <b style={{ color: rColor(context.readiness) }}>{context.readiness}</b></span>
              )}
              {context.acwr != null && (
                <span className="pw-chip">ACWR <b style={{ color: aColor(context.acwr) }}>{context.acwr.toFixed(2)}</b></span>
              )}
              <Button size="sm" onClick={(e) => { e.stopPropagation(); setView('day') }}>Open day</Button>
            </div>

            <div className="pw-week" aria-label="This week at a glance">
              {week.map((d, i) => {
                const isToday = d === today
                const isPlanned = planned.has(d)
                return (
                  <button key={d} className={'pw-day' + (isToday ? ' today' : '')} onClick={() => setView('week')}
                    aria-label={`${d}${isPlanned ? ' — session planned' : ' — rest'}`}>
                    <span className="dw">{DOW[i]}</span>
                    <span className={'pw-dot ' + (isToday ? 'today' : isPlanned ? 'planned' : 'rest')} />
                    <span className="dn">{+d.slice(8, 10)}</span>
                  </button>
                )
              })}
            </div>

            <div className="pw-hint muted">Click to expand — day, week &amp; month planners live in this widget</div>
          </>
        )}
      </div>
    </div>
  )
}
