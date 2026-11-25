import { useState } from 'react'
import LiveSessionDialog from '../../../molecules/LiveSessionDialog'
import LivePlateCalculator from './LivePlateCalculator'
import LiveWorkoutOrder from './LiveWorkoutOrder'
import { LIVE_SET_TYPES, locateLive, rowMode, adjustedSetDuration, rowType, liveSetLoad, liveBlocks, previousLivePerformance, exerciseRestSeconds } from '../../../../lib/liveSession'
import { secToClock } from '../../../../lib/workout'
import { toDisp, dispToKg } from '../../../../lib/units'

export default function LiveSessionEditor({ editor, session, units, exercises, history, onAction, onEdit, onClose, onReload, onFinish, onDiscard, busy, error }) {
  const { kind, rowId, exerciseId, blockId } = editor
  const { item, row } = locateLive(session, rowId || exerciseId)
  const block = liveBlocks(session).find((entry) => entry.id === blockId)
  const confirmedLoad = row ? liveSetLoad(row) : null
  const [mode, setMode] = useState(row ? rowMode(row) : 'reps')
  const [value, setValue] = useState(toDisp(confirmedLoad, units) ?? '')
  const [plates, setPlates] = useState(false)
  const libraryItem = exercises.find((entry) => entry.id === item?.exId || entry.id === item?.exerciseId || entry.name?.toLowerCase() === item?.name?.toLowerCase())
  const submitAction = (action) => { if (onAction(action)) onClose() }
  const field = (name, label, value, { min = 0, max = 999, step = 1, required = false } = {}) => <label>{label}<input type="number" name={name} defaultValue={value ?? ''} min={min} max={max} step={step} required={required} /></label>
  if (kind === 'order') return <LiveWorkoutOrder session={session} onAction={onAction} onClose={onClose} />
  if (kind === 'set-options') {
    const index = item.setRows.findIndex((set) => set.id === row.id)
    return <LiveSessionDialog title="Set options" onClose={onClose}>
      <div className="ls-tools">
        <button type="button" className="ls-button" onClick={() => onEdit({ ...editor, kind: 'type' })}>Change set type</button>
        <button type="button" className="ls-button" onClick={() => onEdit({ ...editor, kind: 'target' })}>Edit target</button>
        <button type="button" className="ls-button" disabled={index === 0} onClick={() => submitAction({ type: 'move-set', id: row.id, beforeId: item.setRows[index - 1]?.id })}>Move set up</button>
        <button type="button" className="ls-button" disabled={index === item.setRows.length - 1} onClick={() => submitAction({ type: 'move-set', id: row.id, beforeId: item.setRows[index + 2]?.id })}>Move set down</button>
        <button type="button" className="ls-button ls-danger-text" onClick={() => submitAction({ type: 'skip-row', id: row.id })}>Skip set</button>
      </div>
      {error && <p className="ls-form-error" role="alert">{error}</p>}
    </LiveSessionDialog>
  }
  if (kind === 'history') {
    const previous = previousLivePerformance(history, session, item)
    return <LiveSessionDialog title={`Last performance · ${item.name}`} onClose={onClose}>
      {previous ? <><p>{previous.date}</p>{previous.rows.map((set, index) => <p className="ls-history-row" key={index}><strong>Set {index + 1}</strong><span>{set.mode === 'duration' ? secToClock(set.durationSeconds) : set.reps == null ? 'Reps not recorded' : `${set.reps} reps`}{set.load != null ? ` · ${toDisp(set.load, units)} ${units}` : ''}</span></p>)}</> : <p>No previous logged performance for this exercise.</p>}
    </LiveSessionDialog>
  }
  if (kind === 'about') return <LiveSessionDialog title={item.name} onClose={onClose}>
    <dl className="ls-about"><dt>Equipment</dt><dd>{libraryItem?.equip || 'Not recorded'}</dd><dt>Muscles worked</dt><dd>{libraryItem?.muscles?.join?.(', ') || libraryItem?.muscle || 'Not recorded'}</dd>
      <dt>How to perform it</dt><dd>{libraryItem?.instructions || libraryItem?.description || 'Instructions have not been added to this exercise.'}</dd></dl>
    {libraryItem?.video && /^https?:\/\//i.test(libraryItem.video) && <a href={libraryItem.video} target="_blank" rel="noreferrer">View exercise demonstration ↗</a>}
  </LiveSessionDialog>
  if (kind === 'reload') return <LiveSessionDialog title="Load the saved session?" onClose={onClose} confirm="Keep draft & reload" onSubmit={onReload}>
    <p>A recovery copy of this draft will be kept on this browser. The session will reload its saved record.</p>
    {error && <p role="alert">{error}</p>}
  </LiveSessionDialog>
  if (kind === 'finish' || kind === 'discard') return <LiveSessionDialog title={kind === 'finish' ? 'Finish workout?' : 'Discard workout?'} onClose={onClose}
    confirm={kind === 'finish' ? 'Continue to finish' : 'Discard workout'} busy={busy} onSubmit={kind === 'finish' ? onFinish : onDiscard}>
    <p>{kind === 'finish' ? 'Review your effort and duration next to finish the session.' : 'This ends the session and marks it discarded. The original plan, adjustments and recorded sets stay available for review.'}</p>
    {error && <p role="alert">{error}</p>}
  </LiveSessionDialog>
  let title, content, submit, confirm
  switch (kind) {
    case 'weight':
    case 'complete-set': {
      const completing = kind === 'complete-set'
      const isTimed = rowMode(row) === 'duration'
      const target = toDisp(row.pLoadKg, units)
      const hasPlates = /barbell|plates|plate.loaded/i.test(libraryItem?.equip || item.name)
      title = completing ? `Log set · ${item.name}` : 'Enter weight'
      confirm = completing ? 'Mark set done' : 'Confirm weight'
      content = <>
        <label>Actual weight ({units})<input type="number" name="load" min="0" max={units === 'lb' ? 4409.25 : 2000}
          step="0.01" value={value} required={completing && target != null} onChange={(event) => setValue(event.target.value)} /></label>
        {(target != null || hasPlates) && <div className="ls-tools">
          {target != null && <button type="button" className="ls-button" onClick={() => setValue(target)}>Use target ({target} {units})</button>}
          {hasPlates && <button type="button" className="ls-button" onClick={() => setPlates(true)}>Plate calculator…</button>}
        </div>}
        {completing && field('metric', isTimed ? 'Actual duration (seconds)' : 'Actual reps', isTimed ? row.durationSeconds : row.reps,
          { min: isTimed ? 1 : 0, max: isTimed ? 35999 : 999, required: true })}
      </>
      submit = (form) => {
        const weight = form.get('load')
        const load = weight === '' ? null
          : Number(weight) === toDisp(confirmedLoad, units) ? confirmedLoad
          : Number(weight) === target ? row.pLoadKg : dispToKg(weight, units)
        submitAction(completing
          ? { type: 'done', id: row.id, actual: { load, metric: Number(form.get('metric')) } }
          : { type: 'row', id: row.id, patch: { load } })
      }
      break
    }
    case 'result':
      title = 'Enter reps or duration'
      content = <><fieldset className="ls-mode"><legend className="ls-sr-only">Measurement</legend>{['reps', 'duration'].map((key) => <label key={key}>
        <input type="radio" name="mode" value={key} checked={mode === key} onChange={() => setMode(key)} />{key === 'reps' ? 'Reps' : 'Duration'}</label>)}</fieldset>
        <div hidden={mode !== 'reps'}>{field('reps', 'Actual reps', row.reps)}</div>
        <div hidden={mode !== 'duration'}>{field('durationSeconds', 'Actual duration (seconds)', row.durationSeconds, { min: 1, max: 35999 })}<p className="ls-hint">Apply an empty duration to use the set stopwatch.</p></div></>
      submit = (form) => submitAction({ type: 'row', id: row.id, patch: { mode,
        reps: form.get('reps') === '' ? null : Number(form.get('reps')),
        durationSeconds: form.get('durationSeconds') === '' ? null : Number(form.get('durationSeconds')) } })
      break
    case 'type':
      title = 'Change set type'
      content = <label>Set type<select name="type" defaultValue={rowType(row)}>{Object.entries(LIVE_SET_TYPES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      submit = (form) => submitAction({ type: 'row', id: row.id, patch: { type: form.get('type'), purpose: ['warmup', 'cooldown'].includes(form.get('type')) ? form.get('type') : 'working' } })
      break
    case 'target':
      title = 'Edit set targets'
      content = <>{field('pLoadKg', `Target weight (${units})`, toDisp(row.pLoadKg, units), { max: units === 'lb' ? 4409 : 2000, step: 0.01 })}
        {field('pReps', 'Target reps', row.pReps)}{field('pDurationSeconds', 'Target duration (seconds)', adjustedSetDuration(row), { min: 1, max: 35999 })}
        <p className="ls-hint">This adjusts this session. The original target remains in Original plan.</p></>
      submit = (form) => submitAction({ type: 'row', id: row.id, patch: {
        pLoadKg: form.get('pLoadKg') === '' ? null : String(form.get('pLoadKg')) === String(toDisp(row.pLoadKg, units)) ? row.pLoadKg : dispToKg(form.get('pLoadKg'), units),
        pReps: form.get('pReps') === '' ? null : Number(form.get('pReps')),
        pDurationSeconds: form.get('pDurationSeconds') === '' ? null : Number(form.get('pDurationSeconds')) } })
      break
    case 'effort':
      title = 'Enter set effort'
      content = <><label>Effort metric<select name="effortType" defaultValue={row.effortType || 'RIR'}><option>RIR</option><option>RPE</option></select></label>
        {field('effort', 'Actual effort', row.effort, { max: 10, step: 0.5 })}
        {row.effort != null && <p>Recorded effort · {row.effort} {row.effortType || 'RIR'}</p>}</>
      submit = (form) => submitAction({ type: 'row', id: row.id, patch: { effortType: form.get('effortType'), effort: form.get('effort') === '' ? null : Number(form.get('effort')) } })
      break
    case 'rest':
      title = `Rest duration · ${item.name}`
      content = <>{field('seconds', 'Rest between sets (seconds)', exerciseRestSeconds(session, item), { min: 1, max: 900, required: true })}<p className="ls-hint">Applies to upcoming rest countdowns.</p></>
      submit = (form) => submitAction({ type: 'rest-duration', id: item.id, seconds: Number(form.get('seconds')) })
      break
    case 'settings':
      title = 'Workout settings'
      content = <><label>Weight units<select name="units" defaultValue={units}><option value="kg">Kilograms (kg)</option><option value="lb">Pounds (lb)</option></select></label>
        {field('rest', 'Default rest (seconds)', session.liveState.settings.defaultRestSeconds, { min: 1, max: 900, required: true })}</>
      submit = (form) => submitAction({ type: 'settings', settings: { units: form.get('units'), defaultRestSeconds: Number(form.get('rest')) } })
      break
    case 'add-block':
      title = 'Add block'
      content = <label>Block name<input name="name" maxLength={60} required /></label>
      submit = (form) => submitAction({ type: 'add-block', name: String(form.get('name')) })
      break
    case 'add-exercise':
    case 'replace':
      title = kind === 'replace' ? `Replace ${item.name}` : `Add exercise · ${block.title}`
      content = <><label>Exercise<input name="name" list="live-exercise-library" maxLength={100} required autoComplete="off" /></label>
        <datalist id="live-exercise-library">{exercises.map((entry) => <option key={entry.id} value={entry.name} />)}</datalist>
        {kind === 'replace' && <p className="ls-hint">The replacement starts with new sets. Previous sets stay with the original exercise.</p>}</>
      submit = (form) => { const name = String(form.get('name')).trim(); const entry = exercises.find((exercise) => exercise.name === name)
        submitAction({ type: kind, id: item?.id, blockId, name, exerciseId: entry?.id }) }
      break
    case 'superset':
      title = 'Create superset'
      content = <label>Pair with<select name="partner">{block.items.filter((entry) => entry.id !== item.id && !entry.supersetId && !entry.skipped).map((entry) => <option value={entry.id} key={entry.id}>{entry.name}</option>)}</select></label>
      submit = (form) => submitAction({ type: 'superset', id: item.id, partnerId: form.get('partner') })
      break
    default: return null
  }
  return <><LiveSessionDialog title={title} confirm={confirm} onClose={onClose} onSubmit={submit}>
    {content}{error && <p className="ls-form-error" role="alert">{error}</p>}
  </LiveSessionDialog>{plates && <LivePlateCalculator units={units} onClose={() => setPlates(false)} onUse={setValue} />}</>
}
