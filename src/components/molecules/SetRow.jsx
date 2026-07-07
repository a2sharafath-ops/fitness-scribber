// One prescribed set inside an exercise card. Presentational: dynamic fields
// swap on the parent exercise's intensityType (spec 2.2), values arrive via
// props and edits are raised through onChange / onRemove / status cycling.
import { targetKg, hrZone, subjectiveEffort, subjectiveTargetBand } from '../../lib/program'

// Exact prescribing scales from NSCA Table 18.10.
// RPE carries the table's half-point ratings (9.5, 8.5, 7.5, 6.5); RIR is the
// reps-in-reserve column, 0 (maximal) through 10.
const RPE_SCALE = [10, 9.5, 9, 8.5, 8, 7.5, 7, 6.5, 6, 5.5, 5, 4.5, 4, 3.5, 3, 2, 1]
const RIR_SCALE = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
const STATUS_NEXT = { Pending: 'Completed', Completed: 'Failed', Failed: 'Pending' }
const STATUS_ICON = { Pending: '·', Completed: '✓', Failed: '✗' }

export default function SetRow({ set, intensityType, tmKg, maxHr, toDisp, dispToKg, unitName, onChange, onRemove }) {
  const num = (k) => (e) => onChange(k, e.target.value === '' ? null : +e.target.value)
  const kg = (k) => (e) => onChange(k, dispToKg(e.target.value))
  // RPE/RIR map to their exact %1RM band (NSCA Table 18.10) so they, like %1RM,
  // resolve a suggested working-load band against the Training Max.
  const subjective = intensityType === 'RPE' || intensityType === 'RIR'
  const effort = subjective ? subjectiveEffort(intensityType, set.prescribedIntensityValue) : null
  const pctCalc = intensityType === '%1RM' ? targetKg(tmKg, set.prescribedIntensityValue) : null
  const loadBand = subjective ? subjectiveTargetBand(tmKg, intensityType, set.prescribedIntensityValue) : null
  // Placeholder / hint for the working-load field: a single number for %1RM,
  // the exact kg band for RPE/RIR.
  const loadHint = intensityType === '%1RM'
    ? (pctCalc != null ? String(toDisp(pctCalc)) : '')
    : loadBand
      ? (loadBand.open ? `≤ ${toDisp(loadBand.high)}`
        : loadBand.low === loadBand.high ? String(toDisp(loadBand.high))
          : `${toDisp(loadBand.low)}–${toDisp(loadBand.high)}`)
      : ''
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
            <input readOnly tabIndex={-1} aria-label="Calculated target weight" value={pctCalc != null ? toDisp(pctCalc) : tmKg ? '' : 'no TM'} /></label>
        </>
      )}
      {intensityType === 'RPE' && (
        <>
          <label className="sf"><span>RPE</span>
            <select value={set.prescribedIntensityValue ?? ''} aria-label="Target RPE" onChange={num('prescribedIntensityValue')}>
              <option value="">—</option>
              {RPE_SCALE.map((r) => <option key={r} value={r}>{r}</option>)}
            </select></label>
          {effort && (
            <label className="sf sf-calc" title={`${effort.label} — ${effort.band} of 1RM (NSCA Table 18.10)`}>
              <span>%1RM</span>
              <input readOnly tabIndex={-1} aria-label="Percent of 1RM from RPE (Table 18.10)" value={effort.band} /></label>
          )}
        </>
      )}
      {intensityType === 'RIR' && (
        <>
          <label className="sf"><span>RIR</span>
            <select value={set.prescribedIntensityValue ?? ''} aria-label="Target reps in reserve" onChange={num('prescribedIntensityValue')}>
              <option value="">—</option>
              {RIR_SCALE.map((r) => <option key={r} value={r}>{r}</option>)}
            </select></label>
          {effort && (
            <label className="sf sf-calc" title={`${effort.label} — ${effort.band} of 1RM (NSCA Table 18.10)`}>
              <span>%1RM</span>
              <input readOnly tabIndex={-1} aria-label="Percent of 1RM from RIR (Table 18.10)" value={effort.band} /></label>
          )}
        </>
      )}
      {intensityType === 'Seconds' && (
        <label className="sf"><span>Seconds</span>
          <input type="number" min="0" value={set.prescribedIntensityValue ?? ''} aria-label="Duration in seconds" onChange={num('prescribedIntensityValue')} /></label>
      )}
      {intensityType === 'Minutes' && (
        <label className="sf"><span>Minutes</span>
          <input type="number" min="0" step="0.5" value={set.prescribedIntensityValue ?? ''} aria-label="Duration in minutes" onChange={num('prescribedIntensityValue')} /></label>
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
      {['%1RM', 'RPE', 'RIR', 'Seconds', 'Minutes'].includes(intensityType) && (
        <label className="sf"><span>Load ({unitName()})</span>
          <input type="number" value={toDisp(set.prescribedLoadKg) ?? ''} aria-label="Working load" onChange={kg('prescribedLoadKg')} placeholder={loadHint} /></label>
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
