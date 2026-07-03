// Progression Rule Window (spec 3.2). Calendar duplication into a future
// microcycle stops here first: per block choose the scheme (+Load /
// +Percentage / +Reps / +Sets), the increment, and which exercises
// participate (unchecked → stays static). Presentational; the builder
// applies the rules on confirm.
import { useState } from 'react'
import Button from '../../atoms/Button'
import { defaultRuleFor } from '../../../lib/program'
import { fmtDay } from '../../../lib/dates'

const TYPE_LABEL = { load: '(+) Load', percentage: '(+) Percentage', reps: '(+) Reps', sets: '(+) Sets' }
const UNIT_HINT = { load: 'kg', percentage: '% points', reps: 'reps', sets: 'sets' }

export default function ProgressionPanel({ blocks, dates, onConfirm, onBack }) {
  const [rules, setRules] = useState(() =>
    Object.fromEntries(blocks.map((b) => {
      const d = defaultRuleFor(b.blockType)
      return [b.blockId, {
        enabled: b.blockType !== 'Warm-up' && b.blockType !== 'Cool-down',
        type: d.type, value: d.value,
        exercises: Object.fromEntries(b.exercises.map((e) => [e.exerciseId, true])),
      }]
    })))
  const upd = (id, patch) => setRules((r) => ({ ...r, [id]: { ...r[id], ...patch } }))
  const updEx = (id, exId, v) => setRules((r) => ({ ...r, [id]: { ...r[id], exercises: { ...r[id].exercises, [exId]: v } } }))

  return (
    <div>
      <div className="section-title" style={{ marginTop: 0 }}>Apply progression scheme across selected exercises?</div>
      <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
        Cloning to {dates.length} date{dates.length === 1 ? '' : 's'}: {dates.map(fmtDay).join(' · ')}
      </div>
      {blocks.map((b) => {
        const r = rules[b.blockId]
        return (
          <div key={b.blockId} className={'prog-block' + (r.enabled ? '' : ' off')}>
            <label className="prog-head">
              <input type="checkbox" checked={r.enabled} onChange={(e) => upd(b.blockId, { enabled: e.target.checked })} />
              <strong>{b.blockType} Block</strong>
              <span className="muted" style={{ fontSize: 11 }}>
                (default: {defaultRuleFor(b.blockType).type === 'load' ? 'Load' : 'Rep'} progression)
              </span>
            </label>
            {r.enabled && (
              <>
                <div className="prog-rule">
                  <label className="sf"><span>Type</span>
                    <select value={r.type} aria-label={`${b.blockType} progression type`} onChange={(e) => upd(b.blockId, { type: e.target.value })}>
                      {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select></label>
                  <label className="sf"><span>Value (+{UNIT_HINT[r.type]})</span>
                    <input type="number" step="0.5" value={r.value} aria-label={`${b.blockType} progression value`}
                      onChange={(e) => upd(b.blockId, { value: +e.target.value })} /></label>
                </div>
                <div className="prog-exs">
                  {b.exercises.map((e) => (
                    <label key={e.exerciseId} className="prog-ex">
                      <input type="checkbox" checked={r.exercises[e.exerciseId] !== false}
                        onChange={(ev) => updEx(b.blockId, e.exerciseId, ev.target.checked)} />
                      {e.exerciseName || 'Unnamed exercise'}
                      {r.exercises[e.exerciseId] === false && <span className="muted" style={{ fontSize: 10 }}> — stays static</span>}
                    </label>
                  ))}
                  {!b.exercises.length && <div className="muted" style={{ fontSize: 11 }}>No exercises in this block.</div>}
                </div>
              </>
            )}
          </div>
        )
      })}
      <div className="flex gap" style={{ marginTop: 12, justifyContent: 'flex-end' }}>
        <Button variant="ghost" onClick={onBack}>← Back to dates</Button>
        <Button onClick={() => onConfirm(rules)}>Apply & clone to {dates.length} date{dates.length === 1 ? '' : 's'}</Button>
      </div>
    </div>
  )
}
