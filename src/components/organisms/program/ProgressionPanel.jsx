// Progression Rule Window (spec 3.2). Calendar duplication into a future
// microcycle stops here first. Every exercise carries its own editable
// scheme (+Load / +Percentage / +Reps / +Sets and increment), initialised
// from the block default; the block-level controls re-apply a scheme to all
// of that block's exercises at once. Unchecked exercises stay static.
import { useState } from 'react'
import Button from '../../atoms/Button'
import { defaultRuleFor } from '../../../lib/program'
import { fmtDay } from '../../../lib/dates'

const TYPE_LABEL = { load: '(+) Load', percentage: '(+) Percentage', reps: '(+) Reps', sets: '(+) Sets' }
const UNIT_HINT = { load: 'kg', percentage: '% points', reps: 'reps', sets: 'sets' }

const TypeValue = ({ rule, ariaBase, onChange }) => (
  <>
    <label className="sf"><span>Type</span>
      <select value={rule.type} aria-label={`${ariaBase} progression type`} onChange={(e) => onChange({ type: e.target.value })}>
        {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select></label>
    <label className="sf"><span>Value (+{UNIT_HINT[rule.type]})</span>
      <input type="number" step="0.5" value={rule.value} aria-label={`${ariaBase} progression value`}
        onChange={(e) => onChange({ value: +e.target.value })} /></label>
  </>
)

export default function ProgressionPanel({ blocks, dates, onConfirm, onBack }) {
  const [rules, setRules] = useState(() =>
    Object.fromEntries(blocks.map((b) => {
      const d = defaultRuleFor(b.blockType)
      return [b.blockId, {
        enabled: b.blockType !== 'Warm-up' && b.blockType !== 'Cool-down',
        type: d.type, value: d.value,
        exercises: Object.fromEntries(b.exercises.map((e) => [e.exerciseId, { enabled: true, type: d.type, value: d.value }])),
      }]
    })))

  const updBlock = (id, patch) => setRules((r) => ({ ...r, [id]: { ...r[id], ...patch } }))
  // Block-level scheme = "apply to all": overwrites every exercise's rule in the block.
  const setBlockScheme = (id) => (patch) => setRules((r) => {
    const br = { ...r[id], ...patch }
    br.exercises = Object.fromEntries(Object.entries(br.exercises).map(([eid, er]) => [eid, { ...er, ...patch }]))
    return { ...r, [id]: br }
  })
  const setExRule = (id, exId) => (patch) => setRules((r) => ({
    ...r, [id]: { ...r[id], exercises: { ...r[id].exercises, [exId]: { ...r[id].exercises[exId], ...patch } } },
  }))

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
              <input type="checkbox" checked={r.enabled} onChange={(e) => updBlock(b.blockId, { enabled: e.target.checked })} />
              <strong>{b.blockType} Block</strong>
              <span className="muted" style={{ fontSize: 11 }}>
                (default: {defaultRuleFor(b.blockType).type === 'load' ? 'Load' : 'Rep'} progression)
              </span>
            </label>
            {r.enabled && (
              <>
                <div className="prog-rule">
                  <span className="prog-all muted">Set all exercises:</span>
                  <TypeValue rule={r} ariaBase={b.blockType} onChange={setBlockScheme(b.blockId)} />
                </div>
                <div className="prog-exs">
                  {b.exercises.map((e) => {
                    const er = r.exercises[e.exerciseId]
                    return (
                      <div key={e.exerciseId} className={'prog-ex-row' + (er.enabled ? '' : ' off')}>
                        <label className="prog-ex">
                          <input type="checkbox" checked={er.enabled}
                            onChange={(ev) => setExRule(b.blockId, e.exerciseId)({ enabled: ev.target.checked })} />
                          {e.exerciseName || 'Unnamed exercise'}
                        </label>
                        {er.enabled
                          ? <span className="prog-ex-rule"><TypeValue rule={er} ariaBase={e.exerciseName || 'exercise'} onChange={setExRule(b.blockId, e.exerciseId)} /></span>
                          : <span className="muted" style={{ fontSize: 10 }}>stays static</span>}
                      </div>
                    )
                  })}
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
