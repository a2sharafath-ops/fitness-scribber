// One exercise inside a block: name (library datalist), intensity metric,
// superset link, and its set rows. Voice-parsed names that missed the synonym
// index render with an orange border and force a manual library selection
// before the builder allows a save (spec 5.2). Presentational only.
import SetRow from '../../molecules/SetRow'
import Autocomplete from '../../molecules/Autocomplete'
import { INTENSITY_TYPES, SUPERSET_GROUPS, newSet } from '../../../lib/program'

export default function ExerciseCard({
  ex, exercises, tmKg, tmInfo, maxHr,
  toDisp, dispToKg, unitName,
  onChange, onRemove,
  dragProps, dragHandleProps, isOver, isDragging,
}) {
  const liftNames = [...exercises.map((e) => e.name)].sort((a, b) => a.localeCompare(b))
  // Set 1 acts as the template row: edits to its prescription fields
  // auto-fill every later set that hasn't been edited individually
  // (copy-paste ergonomics). Touching a lower set opts it out.
  const PROPAGATE = ['prescribedReps', 'prescribedIntensityValue', 'prescribedLoadKg', 'prescribedTempo', 'prescribedRestSeconds']
  const setSet = (si) => (k, v) =>
    onChange({
      sets: ex.sets.map((s, j) => {
        if (j === si) return { ...s, [k]: v, ...(si > 0 && PROPAGATE.includes(k) ? { touched: true } : {}), ...(k === 'status' ? { flagged: false, e1rmApplied: false } : {}) }
        if (si === 0 && j > 0 && !s.touched && s.status === 'Pending' && PROPAGATE.includes(k)) return { ...s, [k]: v }
        return s
      }),
    })
  const addSet = () => {
    const last = ex.sets[ex.sets.length - 1]
    const next = last ? { ...structuredClone(last), setId: newSet().setId, setNumber: ex.sets.length + 1, completedReps: null, completedLoadKg: null, status: 'Pending' } : newSet(1)
    onChange({ sets: [...ex.sets, next] })
  }
  const removeSet = (si) => () =>
    onChange({ sets: ex.sets.filter((_, j) => j !== si).map((s, j) => ({ ...s, setNumber: j + 1 })) })

  return (
    <div className={'ex-card' + (ex.unmapped ? ' ex-unmapped' : '') + (isOver ? ' drag-over' : '') + (isDragging ? ' dragging' : '')} {...dragProps}>
      <div className="ex-head">
        <span className="drag-grip" title="Drag to reorder this exercise" aria-label="Reorder exercise" {...dragHandleProps}>⠿</span>
        <Autocomplete
          className="ac-grow" inputClassName="presc-ex"
          value={ex.exerciseName}
          options={liftNames}
          placeholder="Exercise name"
          ariaLabel="Exercise name"
          onChange={(v) => onChange({ exerciseName: v, unmapped: false, exerciseDbRef: null })}
        />
        <label className="sf"><span>Intensity</span>
          <select value={ex.intensityType} aria-label="Intensity metric" onChange={(e) => onChange({ intensityType: e.target.value })}>
            {INTENSITY_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select></label>
        <label className="sf"><span>Superset</span>
          <select value={ex.supersetLinkId || ''} aria-label="Superset group" onChange={(e) => onChange({ supersetLinkId: e.target.value || null })}>
            {SUPERSET_GROUPS.map((g) => <option key={g} value={g}>{g || 'None'}</option>)}
          </select></label>
        {['%1RM', 'RPE', 'RIR'].includes(ex.intensityType) && (
          <span className="ex-tm muted"
            title={tmInfo?.source === 'derived'
              ? `Derived: ${tmInfo.relPct}% of ${tmInfo.relTo} (${toDisp(tmInfo.refKg)} ${unitName()}). Log this lift's own 1RM to override.`
              : tmInfo?.source === 'assessment'
                ? 'From the latest fitness assessment. A recent training PR will override it.'
                : 'Training Max used for %1RM / RPE / RIR load targets'}>
            TM {tmKg ? `${toDisp(tmKg)} ${unitName()}` : '— none yet'}
            {tmInfo?.source === 'derived' && <span className="ex-tm-rel"> · {tmInfo.relPct}% of {tmInfo.relTo}</span>}
            {tmInfo?.source === 'assessment' && <span className="ex-tm-rel"> · assessment</span>}
          </span>
        )}
        <button className="x" aria-label="Remove exercise" onClick={onRemove}>×</button>
      </div>

      {ex.unmapped && (
        <div className="ex-validate" role="alert">
          ⚠ “{ex.exerciseName}” isn’t in the exercise library — pick the standard term to continue:
          <select aria-label="Validate exercise name" value=""
            onChange={(e) => e.target.value && onChange({ exerciseName: e.target.value, unmapped: false })}>
            <option value="">Select exercise…</option>
            {exercises.map((x) => <option key={x.id} value={x.name}>{x.name}</option>)}
          </select>
          <button type="button" className="link-btn" onClick={() => onChange({ unmapped: false })}>keep as typed</button>
        </div>
      )}

      {ex.sets.map((s, si) => (
        <SetRow key={s.setId} set={s} intensityType={ex.intensityType} tmKg={tmKg} maxHr={maxHr}
          toDisp={toDisp} dispToKg={dispToKg} unitName={unitName}
          onChange={setSet(si)} onRemove={removeSet(si)} />
      ))}
      <button type="button" className="link-btn" onClick={addSet}>＋ Add set</button>
      {ex.sets.length > 1 && <span className="muted" style={{ fontSize: 10, marginLeft: 8 }}>set 1 auto-fills the sets below until they’re edited</span>}
    </div>
  )
}
