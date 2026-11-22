import { useState } from 'react'
import Button from '../../atoms/Button'
import SetLogRow from '../../molecules/SetLogRow'
import { runBlocks } from '../../../lib/workout'
import { toDisp, dispToKg, unitName } from '../../../lib/units'
import { calcSRPETL } from '../../../lib/calc'
import { maxWorkoutMinutes, workoutMinutes } from '../../../lib/workoutCorrection'

// Correct recorded details without changing the exercise list or reopening a
// completed session. The existing set rows remain the source of actual work.
export default function CompletedWorkoutEditor({ workout, units, sessionEffort, onSave, onCancel }) {
  const [original] = useState(workout)
  const [originalEffort] = useState(sessionEffort)
  const [draft, setDraft] = useState(() => structuredClone(original))
  const [initialMinutes] = useState(() => String(workoutMinutes(original.durationSec) ?? ''))
  const [minutes, setMinutes] = useState(initialMinutes)
  const [rpe, setRpe] = useState(() => String(originalEffort?.row?.rpe ?? ''))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const patchItem = (section, id, patch) => setDraft((current) => ({
    ...current,
    [section]: current[section].map((item) => item.id === id ? { ...item, ...patch } : item),
  }))
  const patchRow = (section, id, index, patch) => setDraft((current) => ({
    ...current,
    [section]: current[section].map((item) => item.id === id
      ? { ...item, setRows: item.setRows.map((row, i) => i === index ? { ...row, ...patch } : row) }
      : item),
  }))
  const save = async () => {
    if (saving) return
    const title = draft.title.trim()
    if (!title) { setError('Enter a session name.'); return }
    let durationSec = draft.durationSec
    if (originalEffort && minutes !== initialMinutes) {
      if (!Number.isInteger(+minutes) || +minutes < 1 || +minutes > maxWorkoutMinutes) {
        setError('Enter the workout duration in whole minutes.')
        return
      }
      durationSec = +minutes * 60
    }
    const effort = originalEffort?.editable ? { expected: originalEffort.row, rpe: rpe === '' ? null : +rpe } : null
    setSaving(true)
    setError('')
    try {
      await onSave({ ...draft, title, ...(originalEffort ? { durationSec } : {}) }, original, effort)
    } catch (failure) { setError(failure.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="completed-editor">
      <fieldset className="completed-editor-fields" disabled={saving}>
      <div className="training-day-fields">
        <label>Session name<input value={draft.title} maxLength={100} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
        {originalEffort && (
          <>
            <div className="completed-editor-metrics">
              <label>Workout duration (minutes)<input type="number" min="1" max={maxWorkoutMinutes} step="1" value={minutes}
                onChange={(event) => setMinutes(event.target.value)} /></label>
              <label>Session RPE (1–10)<input type="number" min="1" max="10" step="1" value={rpe}
                disabled={!originalEffort.editable} placeholder="Not recorded" onChange={(event) => setRpe(event.target.value)} /></label>
            </div>
            {!originalEffort.editable && <p className="muted">The existing effort record can’t be linked to this workout. It can be edited in Training load.</p>}
            {+rpe >= 1 && +rpe <= 10 && +minutes > 0 && <p className="muted">Training load · {calcSRPETL(+rpe, +minutes)} AU</p>}
          </>
        )}
        <label>Session notes<textarea rows={2} value={draft.note || ''} onChange={(event) => setDraft({ ...draft, note: event.target.value })} /></label>
      </div>
      {error && <p role="alert" className="form-error">{error}</p>}
      <p className="muted">Correct existing sets below. The completed exercise list stays fixed.</p>
      {runBlocks(draft).map((block) => (
        <section key={block.key} className="training-day-block" aria-label={block.title}>
          <h3>{block.title}</h3>
          {block.items.map((item) => (
            <div key={item.id} className="training-day-exercise">
              <strong>{item.name}</strong>
              {item.setRows?.length ? item.setRows.map((row, index) => (
                <SetLogRow key={row.n ?? index} row={row} units={units}
                  warmupBlock={block.section === 'warmup'}
                  onChange={(patch) => patchRow(block.section, item.id, index, patch)} />
              )) : (
                <div className="training-day-legacy-fields">
                  <label>Done sets<input type="number" min="0" value={item.doneSets ?? ''}
                    onChange={(event) => patchItem(block.section, item.id, { doneSets: event.target.value === '' ? null : +event.target.value })} /></label>
                  <label>Done reps<input type="number" min="0" value={item.doneReps ?? ''}
                    onChange={(event) => patchItem(block.section, item.id, { doneReps: event.target.value === '' ? null : +event.target.value })} /></label>
                  <label>Done load ({unitName(units)})<input type="number" min="0" step="0.5" value={item.doneWeight == null ? '' : toDisp(item.doneWeight, units)}
                    onChange={(event) => patchItem(block.section, item.id, { doneWeight: event.target.value === '' ? null : dispToKg(event.target.value, units) })} /></label>
                </div>
              )}
            </div>
          ))}
        </section>
      ))}
      <div className="flex gap training-day-actions">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button onClick={save}>{saving ? 'Saving…' : 'Save corrections'}</Button>
      </div>
      </fieldset>
    </div>
  )
}
