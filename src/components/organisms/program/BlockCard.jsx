// One workout block container (spec 2.1): type header, auto-1RM toggle and
// the exercises it holds. Presentational — state lives in the builder modal.
import ExerciseCard from './ExerciseCard'
import Button from '../../atoms/Button'
import { BLOCK_TYPES, newProgExercise } from '../../../lib/program'

const BLOCK_HINT = {
  'Warm-up': 'Mobility & activation — ignored for strength tracking',
  'Main Lifts': 'Primary compounds — drives 1RM baselines & failure flags',
  'Assisted': 'Isolation & accessory work',
  'Core/Others': 'Trunk stability, structural volume & everything else',
  'Cool-down': 'Recovery protocols',
}

export default function BlockCard({
  block, exercises, exListId, resolveTm, maxHr,
  toDisp, dispToKg, unitName,
  onChange, onRemove,
}) {
  const updEx = (ei) => (patch) =>
    onChange({ exercises: block.exercises.map((e, j) => (j === ei ? { ...e, ...patch } : e)) })
  const addEx = () =>
    onChange({ exercises: [...block.exercises, newProgExercise('', { order: block.exercises.length + 1, intensityType: block.blockType === 'Main Lifts' ? '%1RM' : 'Load' })] })
  const rmEx = (ei) => () =>
    onChange({ exercises: block.exercises.filter((_, j) => j !== ei).map((e, j) => ({ ...e, order: j + 1 })) })

  return (
    <div className="block-card">
      <div className="block-head">
        <select className="block-type" value={block.blockType} aria-label="Block type"
          onChange={(e) => onChange({ blockType: e.target.value, autoCalculate1RM: e.target.value === 'Main Lifts' })}>
          {BLOCK_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
        <span className="muted block-hint">{BLOCK_HINT[block.blockType]}</span>
        {block.blockType === 'Main Lifts' && (
          <label className="block-auto">
            <input type="checkbox" checked={!!block.autoCalculate1RM}
              onChange={(e) => onChange({ autoCalculate1RM: e.target.checked })} />
            auto-1RM
          </label>
        )}
        <button className="x" aria-label="Remove block" onClick={onRemove}>×</button>
      </div>
      {block.exercises.map((e, ei) => (
        <ExerciseCard key={e.exerciseId} ex={e} exercises={exercises} exListId={exListId}
          tmKg={resolveTm(e.exerciseName)} maxHr={maxHr}
          toDisp={toDisp} dispToKg={dispToKg} unitName={unitName}
          onChange={updEx(ei)} onRemove={rmEx(ei)} />
      ))}
      <Button variant="ghost" size="sm" onClick={addEx}>＋ Add exercise</Button>
    </div>
  )
}
