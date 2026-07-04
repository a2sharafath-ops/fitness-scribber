import { toDisp, dispToKg, unitName } from '../../lib/units'
import { secToClock } from '../../lib/workout'

// One exercise in the Today's Workout list.
//   mode 'view' — static summary
//   mode 'edit' — editable fields + remove (pre-start)
//   mode 'run'  — editable fields + a "done" toggle (live session)
//   mode 'log'  — prescription is read-only; athlete records what was actually
//                 done (done sets / reps / load) + a "done" toggle
export default function ExerciseEditorRow({ ex, units, mode = 'view', onChange, onRemove }) {
  const patch = (k) => (e) => onChange?.({ [k]: e.target.value })
  const editable = mode !== 'view'
  const prescribed = `${ex.sets} × ${ex.duration ? ex.duration : ex.reps + ' reps'}${ex.weight != null ? ` · ${toDisp(ex.weight, units)} ${unitName(units)}` : ''} · rest ${secToClock(ex.rest)}`

  if (!editable) {
    return (
      <div className="ex-row">
        <div style={{ flex: 1 }}>
          <strong>{ex.name}</strong>
          <div className="muted" style={{ fontSize: 12 }}>{prescribed}</div>
        </div>
      </div>
    )
  }

  // Athlete logging against a coach prescription: ticking "done" pre-fills the
  // actuals with the prescribed targets; the athlete adjusts only what differed.
  if (mode === 'log') {
    const toggle = (checked) => onChange?.(checked
      ? { done: true, doneSets: ex.doneSets ?? (+ex.sets || null), doneReps: ex.doneReps ?? (parseInt(ex.reps, 10) || null), doneWeight: ex.doneWeight ?? ex.weight }
      : { done: false })
    return (
      <div className={'ex-row' + (ex.done ? ' done' : '')}>
        <input type="checkbox" checked={!!ex.done} onChange={(e) => toggle(e.target.checked)} aria-label={'Mark ' + ex.name + ' done'} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <strong>{ex.name}</strong>
          <div className="muted" style={{ fontSize: 12 }}>Prescribed: {prescribed}</div>
          <div className="ex-fields">
            <label>Done sets<input type="number" min="0" value={ex.doneSets ?? ''} placeholder={String(ex.sets)}
              onChange={(e) => onChange?.({ doneSets: e.target.value === '' ? null : +e.target.value })} /></label>
            <label>Done reps<input type="number" min="0" value={ex.doneReps ?? ''} placeholder={String(parseInt(ex.reps, 10) || '')}
              onChange={(e) => onChange?.({ doneReps: e.target.value === '' ? null : +e.target.value })} /></label>
            <label>Done load ({unitName(units)})
              <input type="number" step="0.5" value={ex.doneWeight == null ? '' : toDisp(ex.doneWeight, units)}
                placeholder={ex.weight != null ? String(toDisp(ex.weight, units)) : '—'}
                onChange={(e) => onChange?.({ doneWeight: dispToKg(e.target.value, units) })} />
            </label>
          </div>
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
