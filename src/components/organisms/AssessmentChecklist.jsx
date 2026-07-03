import Button from '../atoms/Button'
import { ONBOARDING_TYPES, typeMeta, latest, dueStatus } from '../../lib/assessment'
import { fmtDate } from '../../lib/dates'

// Onboarding baseline completeness + reassessment-due status per type.
// Presentational: raises onAdd(type). `list` = this client's assessments.
export default function AssessmentChecklist({ list, intervalDays, onAdd }) {
  const done = ONBOARDING_TYPES.filter((t) => list.some((a) => a.type === t)).length
  const pct = Math.round((done / ONBOARDING_TYPES.length) * 100)

  return (
    <div className="card">
      <div className="flex between" style={{ marginBottom: 10 }}>
        <div className="section-title" style={{ margin: 0 }}>Onboarding &amp; reassessment</div>
        <span className="muted" style={{ fontSize: 12, fontWeight: 700 }}>{done}/{ONBOARDING_TYPES.length} baselines</span>
      </div>
      <div className="ac-bar"><div className="ac-bar-fill" style={{ width: pct + '%' }} /></div>

      <div className="ac-grid">
        {ONBOARDING_TYPES.map((t) => {
          const m = typeMeta(t)
          const has = list.some((a) => a.type === t)
          const l = has ? latest(list, t) : null
          const due = has ? dueStatus(list, t, intervalDays) : null
          return (
            <div className="ac-row" key={t}>
              <span className={'ac-check' + (has ? ' on' : '')}>{has ? '✓' : '○'}</span>
              <span className="ac-name">{m.icon} {m.label}</span>
              {has ? (
                <span className="ac-meta">
                  <span className="muted">{fmtDate(l.date)}</span>
                  {due?.overdue
                    ? <span className="ac-due overdue">Reassess due</span>
                    : due && due.daysLeft <= 14 ? <span className="ac-due soon">due in {due.daysLeft}d</span> : null}
                </span>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => onAdd(t)}>Add baseline</Button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
