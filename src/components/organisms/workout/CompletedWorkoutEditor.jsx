import { useState } from 'react'
import Button from '../../atoms/Button'
import SetLogRow from '../../molecules/SetLogRow'
import { runBlocks } from '../../../lib/workout'
import { toDisp, dispToKg, unitName } from '../../../lib/units'

// Correct recorded details without changing the exercise list or reopening a
// completed session. The existing set rows remain the source of actual work.
export default function CompletedWorkoutEditor({ workout, units, onSave, onCancel }) {
  const [draft, setDraft] = useState(() => structuredClone(workout))
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
  const save = () => {
    const title = draft.title.trim()
    if (!title) { setError('Enter a session name.'); return }
    onSave({ ...draft, title })
  }

  return (
    <div className="completed-editor">
      <div className="training-day-fields">
        <label>Session name<input value={draft.title} maxLength={100} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
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
        <Button onClick={save}>Save corrections</Button>
      </div>
    </div>
  )
}
