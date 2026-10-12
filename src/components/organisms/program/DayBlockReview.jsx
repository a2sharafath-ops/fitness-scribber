import { itemsToBlocks } from '../../../lib/program'
import { runBlocks } from '../../../lib/workout'
import { toDisp, unitName } from '../../../lib/units'

const plannedBlocks = (prescription) => prescription?.blocks?.length
  ? prescription.blocks : itemsToBlocks(prescription?.items)

function PlannedSet({ row, index, units, intensityType }) {
  const target = [
    row.prescribedReps != null ? `${row.prescribedReps}${row.prescribedRepsMax != null && row.prescribedRepsMax !== row.prescribedReps ? `–${row.prescribedRepsMax}` : ''} reps` : null,
    row.prescribedLoadKg != null ? `${toDisp(row.prescribedLoadKg, units)} ${unitName(units)}` : null,
    row.prescribedIntensityValue != null ? `${row.prescribedIntensityValue}${intensityType === '%1RM' ? '% 1RM' : ` ${intensityType}`}` : null,
    ['%1RM', 'Load'].includes(intensityType) && row.prescribedRir != null ? `${row.prescribedRir} RIR` : null,
  ].filter(Boolean).join(' · ')
  return <li>Set {row.setNumber ?? index + 1}: {target || 'Target not recorded'}</li>
}

function LoggedSet({ row, index, units, completed }) {
  const value = row.done ? [
    (row.reps ?? row.pReps) != null ? `${row.reps ?? row.pReps} reps` : null,
    (row.load ?? row.pLoadKg) != null ? `${toDisp(row.load ?? row.pLoadKg, units)} ${unitName(units)}` : null,
  ].filter(Boolean).join(' · ') : completed ? 'Skipped' : 'Not logged yet'
  return <li>Set {row.n ?? index + 1}: {value || 'Completed; values not recorded'}</li>
}

// Mirrors the builder's block order while presenting recorded values as facts.
// It never synthesizes a prescription for a completed workout.
export default function DayBlockReview({ prescription, workout, units, compact = false }) {
  if (compact) {
    const blocks = workout ? runBlocks(workout) : plannedBlocks(prescription)
    const loadText = (load) => load === 0 ? 'No external load' : load != null ? `${toDisp(load, units)} ${unitName(units)}` : 'Load not recorded'
    const collapse = (values) => !values.length ? 'No set details' : values.every((value) => value === values[0]) ? `${values.length} × ${values[0]}` : values.map((value, index) => `Set ${index + 1}: ${value}`).join(' · ')
    const detail = (item) => {
      if (workout) {
        if (item.setRows?.length) {
          const rows = item.setRows.filter((row) => row.done)
          return rows.length ? collapse(rows.map((row) => `${row.reps != null ? `${row.reps} reps` : 'Reps not recorded'} · ${loadText(row.load)}`)) : workout.status === 'completed' ? 'No completed sets' : 'Not logged yet'
        }
        return `${item.doneSets ?? '—'} recorded sets · ${item.doneReps ?? '—'} reps · ${loadText(item.doneWeight)}`
      }
      return collapse((item.sets || []).map((row) => [row.prescribedReps != null ? `${row.prescribedReps}${row.prescribedRepsMax != null && row.prescribedRepsMax !== row.prescribedReps ? `–${row.prescribedRepsMax}` : ''} reps` : null,
        row.prescribedLoadKg != null ? loadText(row.prescribedLoadKg) : null,
        row.prescribedIntensityValue != null && item.intensityType !== 'Load' ? `${item.intensityType === '%1RM' ? `${row.prescribedIntensityValue}% 1RM` : `${row.prescribedIntensityValue} ${item.intensityType || 'intensity'}`}` : null,
        ['%1RM', 'Load'].includes(item.intensityType) && row.prescribedRir != null ? `${row.prescribedRir} RIR` : null,
      ].filter(Boolean).join(' · ') || 'Target not recorded'))
    }
    const rows = (blocks || []).flatMap((block, blockIndex) => (workout ? block.items : block.exercises || []).map((item, index) => ({
      id: item.id || item.exerciseId || `${blockIndex}:${index}`, name: workout ? item.name : item.exerciseName,
      block: workout ? block.title : block.blockType, detail: detail(item),
    })))
    return rows.length ? <div className="training-exercise-list">{rows.map((row) => <div className="training-exercise-row" key={row.id}>
      <div><strong>{row.name}</strong><small>{row.block}</small></div><span>{row.detail}</span>
    </div>)}</div> : <p className="muted">No exercise details recorded.</p>
  }
  if (workout) {
    const blocks = runBlocks(workout)
    return blocks.length ? <div className="training-day-blocks">
      {blocks.map((block) => <section key={block.key} className="training-day-block" aria-label={block.title}>
        <h3>{block.title}</h3>
        {block.items.map((item) => <div key={item.id} className="training-day-exercise">
          <strong>{item.name}</strong>
          {item.setRows?.length ? <ol>{item.setRows.map((row, index) => <LoggedSet key={row.n ?? index} row={row} index={index} units={units} completed={workout.status === 'completed'} />)}</ol>
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
        <ol>{(exercise.sets || []).map((row, rowIndex) => <PlannedSet key={row.setId || rowIndex} row={row} index={rowIndex} units={units} intensityType={exercise.intensityType} />)}</ol>
      </div>) : <p className="muted">No exercises in this block.</p>}
    </section>)}
  </div> : <p className="muted">No prescribed blocks for this date.</p>
}
