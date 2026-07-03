import { toDisp, dispToKg, unitName } from '../../lib/units'
import { secToClock } from '../../lib/workout'

// One exercise in the Today's Workout list.
//   mode 'view' — static summary
//   mode 'edit' — editable fields + remove (pre-start)
//   mode 'run'  — editable fields + a "done" toggle (live session)
export default function ExerciseEditorRow({ ex, units, mode = 'view', onChange, onRemove }) {
  const patch = (k) => (e) => onChange?.({ [k]: e.target.value })
  const editable = mode !== 'view'

  if (!editable) {
    const load = ex.weight != null ? ` · ${toDisp(ex.weight, units)} ${unitName(units)}` : ''
    const target = ex.duration ? ex.duration : `${ex.reps} reps`
    return (
      <div className="ex-row">
        <div style={{ flex: 1 }}>
          <strong>{ex.name}</strong>
          <div className="muted" style={{ fontSize: 12 }}>{ex.sets} × {target}{load} · rest {secToClock(ex.rest)}</div>
        </div>
      </div>
    )
  }

  return (
    <div className={'ex-row' + (mode === 'run' && ex.done ? ' done' : '')}>
      {mode === 'run' && (
        <input type="checkbox" checked={!!ex.done} onChange={(e) => onChange?.({ done: e.target.checked })} aria-label={'Mark ' + ex.name + ' done'} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <input className="ex-name" value={ex.name} onChange={patch('name')} aria-label="Exercise name" />
        <div className="ex-fields">
          <label>Sets<input type="number" min="1" value={ex.sets} onChange={(e) => onChange?.({ sets: +e.target.value })} /></label>
          {ex.duration != null ? (
            <label>Time<input value={ex.duration} onChange={patch('duration')} placeholder="45s" /></label>
          ) : (
            <label>Reps<input value={ex.reps} onChange={patch('reps')} placeholder="10" /></label>
          )}
          <label>Weight ({unitName(units)})
            <input type="number" step="0.5" value={ex.weight == null ? '' : toDisp(ex.weight, units)}
              onChange={(e) => onChange?.({ weight: dispToKg(e.target.value, units) })} placeholder="—" />
          </label>
          <label>Rest (s)<input type="number" min="0" step="5" value={ex.rest} onChange={(e) => onChange?.({ rest: +e.target.value })} /></label>
        </div>
      </div>
      {mode === 'edit' && <button className="ex-del" onClick={onRemove} aria-label={'Remove ' + ex.name}>✕</button>}
    </div>
  )
}
