// One prescribed set inside an exercise card. Presentational: dynamic fields
// swap on the parent exercise's intensityType (spec 2.2), values arrive via
// props and edits are raised through onChange / onRemove / status cycling.
import { targetKg, hrZone } from '../../lib/program'

const RPE_SCALE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
const STATUS_NEXT = { Pending: 'Completed', Completed: 'Failed', Failed: 'Pending' }
const STATUS_ICON = { Pending: '·', Completed: '✓', Failed: '✗' }

export default function SetRow({ set, intensityType, tmKg, maxHr, toDisp, dispToKg, unitName, onChange, onRemove }) {
  const num = (k) => (e) => onChange(k, e.target.value === '' ? null : +e.target.value)
  const kg = (k) => (e) => onChange(k, dispToKg(e.target.value))
  const calc = intensityType === '%1RM' ? targetKg(tmKg, set.prescribedIntensityValue) : null
  const done = set.status !== 'Pending'

  return (
    <div className={'set-row' + (set.status === 'Completed' ? ' ok' : set.status === 'Failed' ? ' fail' : '')}>
      <span className="set-n">{set.setNumber}</span>

      {intensityType === '%1RM' && (
        <>
          <label className="sf"><span>%1RM</span>
            <input type="number" value={set.prescribedIntensityValue ?? ''} aria-label="Percent of 1RM" onChange={num('prescribedIntensityValue')} /></label>
          <label className="sf sf-calc" title="Training Max × input percentage">
            <span>Target {unitName()}</span>
            <input readOnly tabIndex={-1} aria-label="Calculated target weight" value={calc != null ? toDisp(calc) : tmKg ? '' : 'no TM'} /></label>
        </>
      )}
      {intensityType === 'RPE' && (
        <label className="sf"><span>RPE</span>
          <select value={set.prescribedIntensityValue ?? ''} aria-label="Target RPE" onChange={num('prescribedIntensityValue')}>
            <option value="">—</option>
            {RPE_SCALE.map((r) => <option key={r} value={r}>{r}</option>)}
          </select></label>
      )}
      {intensityType === 'Load' && (
        <label className="sf"><span>Load ({unitName()})</span>
          <input type="number" value={toDisp(set.prescribedLoadKg) ?? ''} aria-label="Prescribed load" onChange={kg('prescribedLoadKg')} /></label>
      )}
      {intensityType === 'Target HR' && (
        <>
          <label className="sf"><span>BPM / %max</span>
            <input type="number" value={set.prescribedIntensityValue ?? ''} aria-label="Target heart rate" onChange={num('prescribedIntensityValue')} /></label>
          <span className="sf-zone">{hrZone(set.prescribedIntensityValue, maxHr) || '—'}</span>
        </>
      )}

      <label className="sf"><span>Reps</span>
        <input type="number" value={set.prescribedReps ?? ''} aria-label="Prescribed reps" onChange={num('prescribedReps')} /></label>
      {(intensityType === '%1RM' || intensityType === 'RPE') && (
        <label className="sf"><span>Load ({unitName()})</span>
          <input type="number" value={toDisp(set.prescribedLoadKg) ?? ''} aria-label="Working load" onChange={kg('prescribedLoadKg')} placeholder={calc != null ? String(toDisp(calc)) : ''} /></label>
      )}
      <label className="sf sf-sm"><span>Tempo</span>
        <input value={set.prescribedTempo || ''} placeholder="31X1" aria-label="Tempo" onChange={(e) => onChange('prescribedTempo', e.target.value)} /></label>
      <label className="sf sf-sm"><span>Rest s</span>
        <input type="number" value={set.prescribedRestSeconds ?? ''} aria-label="Rest seconds" onChange={num('prescribedRestSeconds')} /></label>

      <button type="button"
        className={'set-status s-' + set.status.toLowerCase()}
        title={`Status: ${set.status} — click to cycle`}
        aria-label={`Set ${set.setNumber} status ${set.status}`}
        onClick={() => onChange('status', STATUS_NEXT[set.status])}>
        {STATUS_ICON[set.status]}
      </button>
      {done && (
        <>
          <label className="sf sf-sm"><span>Done reps</span>
            <input type="number" value={set.completedReps ?? ''} aria-label="Completed reps" onChange={num('completedReps')} /></label>
          <label className="sf sf-sm"><span>Done {unitName()}</span>
            <input type="number" value={toDisp(set.completedLoadKg) ?? ''} aria-label="Completed load" onChange={kg('completedLoadKg')} /></label>
        </>
      )}
      <button className="x" aria-label="Remove set" onClick={onRemove}>×</button>
    </div>
  )
}
