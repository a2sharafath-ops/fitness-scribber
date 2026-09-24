import Button from '../atoms/Button'
import Icon from '../atoms/Icon'
import { ONBOARDING_TYPES, formalAssessments, hasBaselineRecord, typeMeta, latest, dueStatus } from '../../lib/assessment'
import { fmtDate } from '../../lib/dates'

// Onboarding baseline completeness + reassessment-due status per type.
// Presentational: raises onAdd(type). `list` = this client's assessments.
export default function AssessmentChecklist({ list, intervalDays, onAdd }) {
  const formal = formalAssessments(list)
  const done = ONBOARDING_TYPES.filter((t) => hasBaselineRecord(formal, t)).length
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
          const has = hasBaselineRecord(formal, t)
          const l = latest(formal, t)
          const due = l ? dueStatus(formal, t, intervalDays) : null
          return (
            <div className="ac-row" key={t}>
              <span className={'ac-check' + (has ? ' on' : '')}>{has ? '✓' : '○'}</span>
              <span className="ac-name"><Icon name={m.icon} size={15} /> {m.label}</span>
              {has ? (
                <span className="ac-meta">
                  <span className="muted">{fmtDate(l.date)}</span>
                  {due?.overdue
                    ? <span className="ac-due overdue" title={`Coach reminder date ${fmtDate(due.dueDate)}`}>Review date passed</span>
                    : due && due.daysLeft <= 14 ? <span className="ac-due soon" title={`Coach reminder date ${fmtDate(due.dueDate)}`}>review in {due.daysLeft}d</span> : null}
                </span>
              ) : (
                <span className="ac-meta">{l && <span className="muted">Reassessment exists; baseline missing</span>}<Button size="sm" variant="ghost" onClick={() => onAdd(t)}>Add baseline</Button></span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
