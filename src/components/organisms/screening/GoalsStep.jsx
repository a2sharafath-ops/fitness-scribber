import Select from '../../molecules/Select'
import Field from '../../atoms/Field'
import ChipSelect from '../../molecules/ChipSelect'
import { GOAL_OPTIONS } from '../../../lib/screening'

// Goals §3A — primary/secondary goals, SMART statement, target metric, event.
export default function GoalsStep({ goals, onChange }) {
  const set = (k, v) => onChange({ ...goals, [k]: v })
  const setT = (k) => (e) => set('target', { ...goals.target, [k]: e.target.value })
  return (
    <>
      <h3 className="scr-step-title">Your goals</h3>
      <p className="scr-step-sub">Choose one main goal.</p>
      <ChipSelect single options={GOAL_OPTIONS} value={goals.primary} onChange={(v) => set('primary', v)} ariaLabel="Primary goal" />
      <p className="scr-step-sub" style={{ margin: '14px 0 6px' }}>Choose any secondary goals that apply.</p>
      <ChipSelect options={GOAL_OPTIONS.filter((o) => o !== goals.primary)} value={goals.secondary} onChange={(v) => set('secondary', v)} ariaLabel="Secondary goals" />
      <div style={{ marginTop: 14 }}>
        <Field label="What does success look like, and by when?">
          <textarea value={goals.smart || ''} onChange={(e) => set('smart', e.target.value)} placeholder={'e.g. "Run 5 km without stopping in 12 weeks" or "Lose 6 kg by June"'} />
        </Field>
      </div>
      <div className="row3">
        <Field label="Target metric (optional)">
          <Select value={goals.target?.metric || ''} onChange={setT('metric')}>
            <option value="">—</option>{['weight', 'body-fat %', 'distance', 'lift', 'other'].map((o) => <option key={o}>{o}</option>)}
          </Select>
        </Field>
        <Field label="Target value"><input value={goals.target?.value || ''} onChange={setT('value')} placeholder="e.g. −6 kg" /></Field>
        <Field label="Target date"><input type="date" value={goals.target?.date || ''} onChange={setT('date')} /></Field>
      </div>
      <Field label="Event or deadline (include the date)"><input value={goals.event || ''} onChange={(e) => set('event', e.target.value)} placeholder="e.g. Half marathon — Oct 4" /></Field>
      {goals.secondary?.length > 0 && (
        <Field label="Rank your goals to help your trainer plan.">
          <input value={goals.priority || ''} onChange={(e) => set('priority', e.target.value)} placeholder="e.g. 1) fat loss 2) strength" />
        </Field>
      )}
    </>
  )
}
