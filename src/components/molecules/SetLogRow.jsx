import { toDisp, dispToKg, unitName } from '../../lib/units'

// One set inside the block-by-block session runner. Shows the coach's prescribed
// target for the set and lets the athlete log what they actually did: load,
// reps, and the effort metric the set was prescribed in (RIR or RPE). Ticking
// "done" pre-fills the actuals from the prescription so only differences need
// typing. Presentational — all state changes are raised via onChange(patch).
const RPE_SCALE = [10, 9.5, 9, 8.5, 8, 7.5, 7, 6.5, 6, 5.5, 5]
const RIR_SCALE = [0, 1, 2, 3, 4, 5, 6]

export default function SetLogRow({ row, units, onChange }) {
  const effortType = row.effortType === 'RPE' ? 'RPE' : 'RIR'
  const scale = effortType === 'RPE' ? RPE_SCALE : RIR_SCALE

  // Prescribed-target hint, e.g. "5 reps @ 2 RIR · 100 kg".
  const intUnit = row.pIntensityType === 'RIR' ? ' RIR' : row.pIntensityType === 'RPE' ? ' RPE' : row.pIntensityType === '%1RM' ? '% 1RM' : ''
  const target = [
    row.pReps != null && row.pReps !== '' ? `${row.pReps} reps` : null,
    row.pIntensityValue != null ? `@ ${row.pIntensityValue}${intUnit}` : null,
    row.pLoadKg != null ? `${toDisp(row.pLoadKg, units)} ${unitName(units)}` : null,
  ].filter(Boolean).join(' · ') || 'log your set'

  // Ticking done fills blank actuals from the prescription.
  const toggleDone = (checked) => onChange(checked
    ? {
      done: true,
      load: row.load ?? row.pLoadKg ?? null,
      reps: row.reps ?? (row.pReps != null && !Number.isNaN(+row.pReps) ? +row.pReps : null),
      effort: row.effort ?? row.pIntensityValue ?? null,
    }
    : { done: false })

  const numOrNull = (v) => (v === '' ? null : +v)

  return (
    <div className={'slog' + (row.done ? ' done' : '')}>
      <span className="slog-n">{row.n}</span>
      <span className="slog-target" title="Prescribed target">{target}</span>
      <label className="slog-f"><span>Load ({unitName(units)})</span>
        <input type="number" step="0.5" inputMode="decimal" value={row.load == null ? '' : toDisp(row.load, units)}
          placeholder={row.pLoadKg != null ? String(toDisp(row.pLoadKg, units)) : '—'} aria-label={`Set ${row.n} load`}
          onChange={(e) => onChange({ load: e.target.value === '' ? null : dispToKg(e.target.value, units) })} /></label>
      <label className="slog-f"><span>Reps</span>
        <input type="number" min="0" inputMode="numeric" value={row.reps ?? ''} aria-label={`Set ${row.n} reps`}
          placeholder={row.pReps != null ? String(row.pReps) : '—'}
          onChange={(e) => onChange({ reps: numOrNull(e.target.value) })} /></label>
      <label className="slog-f"><span>{effortType}</span>
        <select value={row.effort ?? ''} aria-label={`Set ${row.n} ${effortType}`}
          onChange={(e) => onChange({ effort: numOrNull(e.target.value) })}>
          <option value="">—</option>
          {scale.map((v) => <option key={v} value={v}>{v}</option>)}
        </select></label>
      <label className="slog-done" title="Mark set completed">
        <input type="checkbox" checked={!!row.done} onChange={(e) => toggleDone(e.target.checked)} aria-label={`Set ${row.n} done`} />
      </label>
    </div>
  )
}
