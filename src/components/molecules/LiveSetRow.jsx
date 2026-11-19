import { LIVE_SET_TYPES, rowMode, rowType, timerElapsed, restRemainingMs } from '../../lib/liveSession'
import { toDisp, unitName } from '../../lib/units'
import { secToClock } from '../../lib/workout'

export default function LiveSetRow({ row, index, exercise, block, session, units, now, readOnly, onAction, onEdit }) {
  const skipped = !row.done && (block.skipped || exercise.skipped || row.skipped)
  const locked = row.done || skipped || readOnly
  const running = session.liveState.setTimer?.rowId === row.id
  const label = `set ${index + 1} of ${exercise.name}`
  const type = rowType(row)
  const weight = row.load == null ? '—' : `${toDisp(row.load, units)} ${unitName(units)}`
  const metric = rowMode(row) === 'duration' ? row.durationSeconds == null ? '— sec' : secToClock(row.durationSeconds) : row.reps == null ? '— reps' : `${row.reps} reps`
  const effort = `${row.effort ?? '—'} ${row.effortType || 'RIR'}`
  const targetMetric = row.pDurationSeconds != null ? secToClock(row.pDurationSeconds) : row.pReps != null ? `${row.pReps}${row.pRepsMax && row.pRepsMax !== row.pReps ? '–' + row.pRepsMax : ''} reps` : '—'
  const rest = session.liveState.rest
  const activeRest = rest?.rowId === row.id
  const showRest = exercise.restEnabled && !readOnly && !block.skipped && !exercise.skipped && !row.skipped && exercise.setRows.slice(index + 1).some((set) => !set.skipped)
  return <>
    <div className={'ls-set-row' + (row.done ? ' is-done' : '') + (skipped ? ' is-skipped' : '')} id={'live-set-' + row.id}>
      <div className="ls-set-number"><button type="button" className="ls-value ls-number" disabled={locked} onClick={() => onEdit('type', row)} aria-label={`Change type for ${label}`}>
        {index + 1}</button>{type !== 'normal' && <small className="ls-set-type">{LIVE_SET_TYPES[type] || type}</small>}</div>
      <div className="ls-measure"><button type="button" className="ls-value" disabled={locked} onClick={() => onEdit('weight', row)} aria-label={`Weight for ${label}`}>{weight}</button>
        <small>{row.pLoadKg == null ? 'No weight target' : `Target ${toDisp(row.pLoadKg, units)} ${unitName(units)}`}</small></div>
      <div className="ls-measure"><button type="button" className="ls-value" disabled={locked || running} onClick={() => onEdit('result', row)} aria-label={`Reps or duration for ${label}`}>{metric}</button>
        <button type="button" className="ls-target" disabled={locked} onClick={() => onEdit('target', row)} aria-label={`Edit target for ${label}`}>Target {targetMetric}</button>
        {(row.pIntensityValue != null || row.pTempo) && <small>{row.pIntensityValue != null ? `${row.pIntensityValue} ${row.pIntensityType || ''}` : ''}{row.pTempo ? ` · Tempo ${row.pTempo}` : ''}</small>}
      </div>
      <div className="ls-measure ls-effort-field"><button type="button" className="ls-value" disabled={locked || running} onClick={() => onEdit('effort', row)} aria-label={`Effort for ${label}`}>{effort}</button></div>
      <div className="ls-set-actions">{skipped ? <><small>Skipped</small>{!readOnly && !block.skipped && !exercise.skipped && <button type="button" className="ls-text" onClick={() => onAction({ type: 'skip-row', id: row.id })}>Restore</button>}</> : <>
        <button type="button" className="ls-done" aria-pressed={!!row.done} disabled={readOnly || running}
          aria-label={row.done ? `Undo done for ${label}` : `Mark ${label} done`} onClick={() => onAction({ type: 'done', id: row.id })}><span aria-hidden="true">✓</span>{row.done && !readOnly && <small>Undo</small>}</button>
        {!locked && <button type="button" className="ls-text ls-row-options" aria-label={`Options for ${label}`} onClick={() => onEdit('set-options', row)}>⋯</button>}</>}
      </div>
    </div>
    {rowMode(row) === 'duration' && !locked && <div className="ls-set-stopwatch"><span role="timer">{running ? secToClock(Math.floor(timerElapsed(session.liveState.setTimer, now) / 1000)) : 'Timed set'}</span>
      <button type="button" className="ls-button" disabled={!running && (session.liveState.clock.paused || !!session.liveState.setTimer)} onClick={() => onAction({ type: 'set-timer', id: row.id })}>{running ? 'Stop timer' : 'Start timer'}</button></div>}
    {showRest && <div className="ls-rest-between"><span>{activeRest ? restRemainingMs(rest, now) === 0 ? 'Rest complete' : session.liveState.clock.paused ? 'Rest paused' : 'Rest remaining' : 'Rest'}</span>
      <span role={activeRest ? 'timer' : undefined}>{secToClock(activeRest ? Math.ceil(restRemainingMs(rest, now) / 1000) : exercise.restSeconds ?? exercise.rest ?? session.liveState.settings.defaultRestSeconds)}</span></div>}
  </>
}
