import { itemsToBlocks } from '../../../lib/program'
import { runBlocks } from '../../../lib/workout'
import { toDisp, unitName } from '../../../lib/units'

const plannedBlocks = (prescription) => prescription?.blocks?.length
  ? prescription.blocks : itemsToBlocks(prescription?.items)

function PlannedSet({ row, index, units }) {
  const target = [
    row.prescribedReps != null ? `${row.prescribedReps} reps` : null,
    row.prescribedLoadKg != null ? `${toDisp(row.prescribedLoadKg, units)} ${unitName(units)}` : null,
    row.prescribedIntensityValue != null ? `${row.prescribedIntensityValue} intensity` : null,
  ].filter(Boolean).join(' · ')
  return <li>Set {row.setNumber ?? index + 1}: {target || 'Target not recorded'}</li>
}

function LoggedSet({ row, index, units }) {
  const value = row.done ? [
    (row.reps ?? row.pReps) != null ? `${row.reps ?? row.pReps} reps` : null,
    (row.load ?? row.pLoadKg) != null ? `${toDisp(row.load ?? row.pLoadKg, units)} ${unitName(units)}` : null,
  ].filter(Boolean).join(' · ') : 'Skipped'
  return <li>Set {row.n ?? index + 1}: {value || 'Completed; values not recorded'}</li>
}

// Mirrors the builder's block order while presenting recorded values as facts.
// It never synthesizes a prescription for a completed workout.
export default function DayBlockReview({ prescription, workout, units }) {
  if (workout) {
    const blocks = runBlocks(workout)
    return blocks.length ? <div className="training-day-blocks">
      {blocks.map((block) => <section key={block.key} className="training-day-block" aria-label={block.title}>
        <h3>{block.title}</h3>
        {block.items.map((item) => <div key={item.id} className="training-day-exercise">
          <strong>{item.name}</strong>
          {item.setRows?.length ? <ol>{item.setRows.map((row, index) => <LoggedSet key={row.n ?? index} row={row} index={index} units={units} />)}</ol>
            : <p className="muted">{item.doneSets ?? item.sets ?? '—'} sets · {item.doneReps ?? item.reps ?? '—'} reps
              {(item.doneWeight ?? item.weight) != null ? ` · ${toDisp(item.doneWeight ?? item.weight, units)} ${unitName(units)}` : ''}</p>}
        </div>)}
      </section>)}
    </div> : <p className="muted">No exercise details in this workout log.</p>
  }
  const blocks = plannedBlocks(prescription)
  return blocks?.length ? <div className="training-day-blocks">
    {blocks.map((block, index) => <section key={block.blockId || index} className="training-day-block" aria-label={block.blockType}>
      <h3>{block.blockType}</h3>
      {block.exercises?.length ? block.exercises.map((exercise, exerciseIndex) => <div key={exercise.exerciseId || exerciseIndex} className="training-day-exercise">
        <strong>{exercise.exerciseName}</strong>
        <ol>{(exercise.sets || []).map((row, rowIndex) => <PlannedSet key={row.setId || rowIndex} row={row} index={rowIndex} units={units} />)}</ol>
      </div>) : <p className="muted">No exercises in this block.</p>}
    </section>)}
  </div> : <p className="muted">No prescribed blocks for this date.</p>
}
