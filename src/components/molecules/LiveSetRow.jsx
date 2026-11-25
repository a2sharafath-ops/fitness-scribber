import { LIVE_SET_TYPES, rowMode, adjustedSetDuration, rowType, liveSetLoad, timerElapsed, restRemainingMs } from '../../lib/liveSession'
import { toDisp, unitName } from '../../lib/units'
import { secToClock } from '../../lib/workout'
import Icon from '../atoms/Icon'

export default function LiveSetRow({ row, index, exercise, block, session, units, now, isNext, readOnly, onAction, onEdit }) {
  const skipped = !row.done && (block.skipped || exercise.skipped || row.skipped)
  const locked = row.done || skipped || readOnly
  const running = session.liveState.setTimer?.rowId === row.id
  const label = `set ${index + 1} of ${exercise.name}`
  const type = rowType(row)
  const load = liveSetLoad(row)
  const weight = load == null ? '—' : `${toDisp(load, units)} ${unitName(units)}`
  const metric = rowMode(row) === 'duration' ? row.durationSeconds == null ? '— sec' : secToClock(row.durationSeconds) : row.reps == null ? '— reps' : `${row.reps} reps`
  const effort = `${row.effort ?? '—'} ${row.effortType || 'RIR'}`
  const targetDuration = adjustedSetDuration(row)
  const targetMetric = targetDuration != null ? secToClock(targetDuration) : row.pReps != null ? `${row.pReps}${row.pRepsMax && row.pRepsMax !== row.pReps ? '–' + row.pRepsMax : ''} reps` : '—'
  const rest = session.liveState.rest
  const activeRest = rest?.rowId === row.id
  const showRest = exercise.restEnabled && !readOnly && !block.skipped && !exercise.skipped && !row.skipped && exercise.setRows.slice(index + 1).some((set) => !set.skipped)
  return <>
    <div className={'ls-set-row' + (row.done ? ' is-done' : '') + (skipped ? ' is-skipped' : '') + (isNext ? ' is-next' : '')}
      id={'live-set-' + row.id} role="group" aria-label={`Set ${index + 1} of ${exercise.name}`} aria-current={isNext ? 'step' : undefined}>
      <div className="ls-set-number">
        <span className="ls-number">{index + 1}</span>
        {isNext && <span className="ls-set-next">Next</span>}
        {type !== 'normal' && <small className="ls-set-type">{LIVE_SET_TYPES[type] || type}</small>}
      </div>
      <div className="ls-measure"><button type="button" className="ls-value" disabled={locked} onClick={() => onEdit('weight', row)} aria-label={`Weight for ${label}`}>{weight}</button>
        <small>{row.pLoadKg == null ? 'No weight target' : `Target ${toDisp(row.pLoadKg, units)} ${unitName(units)}`}</small></div>
      <div className="ls-measure"><button type="button" className="ls-value" disabled={locked || running} onClick={() => onEdit('result', row)} aria-label={`Reps or duration for ${label}`}>{metric}</button>
        <small>Target {targetMetric}</small>
        {(row.pIntensityValue != null || row.pTempo) && <small>{row.pIntensityValue != null ? `${row.pIntensityValue} ${row.pIntensityType || ''}` : ''}{row.pTempo ? ` · Tempo ${row.pTempo}` : ''}</small>}
      </div>
      <div className="ls-measure ls-effort-field"><button type="button" className="ls-value" disabled={locked || running} onClick={() => onEdit('effort', row)} aria-label={`Effort for ${label}`}>{effort}</button></div>
      <div className="ls-set-actions">{skipped ? <><small>Skipped</small>{!readOnly && !block.skipped && !exercise.skipped && <button type="button" className="ls-text" onClick={() => onAction({ type: 'skip-row', id: row.id })}>Restore</button>}</> : <>
        <button type="button" className="ls-done" aria-pressed={!!row.done} disabled={readOnly || running}
          aria-label={row.done ? `Undo done for ${label}` : `Mark ${label} done`} onClick={() => onAction({ type: 'done', id: row.id })}><span><Icon name="check" size={14} /></span>{row.done && !readOnly && <small>Undo</small>}</button>
        {!locked && <button type="button" className="ls-text ls-row-options" aria-label={`Options for ${label}`} onClick={() => onEdit('set-options', row)}><Icon name="more" size={20} /></button>}</>}
      </div>
    </div>
    {rowMode(row) === 'duration' && !locked && <div className="ls-set-stopwatch"><span role={running ? 'timer' : undefined}>{running ? secToClock(Math.floor(timerElapsed(session.liveState.setTimer, now) / 1000)) : row.durationSeconds == null ? 'Timed set' : 'Ready to log'}</span>
      <button type="button" className="ls-button" disabled={!running && (session.liveState.clock.paused || !!session.liveState.setTimer)} onClick={() => onAction({ type: 'set-timer', id: row.id })}>{running ? 'Stop timer' : row.durationSeconds == null ? 'Start timer' : 'Restart timer'}</button></div>}
    {showRest && <div className="ls-rest-between"><span>{activeRest ? restRemainingMs(rest, now) === 0 ? 'Rest complete' : session.liveState.clock.paused ? 'Rest paused' : 'Rest remaining' : 'Rest'}</span>
      <span role={activeRest ? 'timer' : undefined}>{secToClock(activeRest ? Math.ceil(restRemainingMs(rest, now) / 1000) : exercise.restSeconds ?? exercise.rest ?? session.liveState.settings.defaultRestSeconds)}</span></div>}
  </>
}
