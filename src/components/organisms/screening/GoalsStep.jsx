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
      <p className="scr-step-sub">What are you here to achieve? Pick one main goal.</p>
      <ChipSelect single options={GOAL_OPTIONS} value={goals.primary} onChange={(v) => set('primary', v)} ariaLabel="Primary goal" />
      <p className="scr-step-sub" style={{ margin: '14px 0 6px' }}>Any secondary goals? (pick as many as apply)</p>
      <ChipSelect options={GOAL_OPTIONS.filter((o) => o !== goals.primary)} value={goals.secondary} onChange={(v) => set('secondary', v)} ariaLabel="Secondary goals" />
      <div style={{ marginTop: 14 }}>
        <Field label="In your own words: what does success look like, and by when?">
          <textarea value={goals.smart || ''} onChange={(e) => set('smart', e.target.value)} placeholder={'e.g. "Run 5 km without stopping in 12 weeks" or "Lose 6 kg by June"'} />
        </Field>
      </div>
      <div className="row3">
        <Field label="Target metric (optional)">
          <select value={goals.target?.metric || ''} onChange={setT('metric')}>
            <option value="">—</option>{['weight', 'body-fat %', 'distance', 'lift', 'other'].map((o) => <option key={o}>{o}</option>)}
          </select>
        </Field>
        <Field label="Target value"><input value={goals.target?.value || ''} onChange={setT('value')} placeholder="e.g. −6 kg" /></Field>
        <Field label="Target date"><input type="date" value={goals.target?.date || ''} onChange={setT('date')} /></Field>
      </div>
      <Field label="Specific event or deadline? (what & when)"><input value={goals.event || ''} onChange={(e) => set('event', e.target.value)} placeholder="e.g. Half marathon — Oct 4" /></Field>
      {goals.secondary?.length > 0 && (
        <Field label="If you had to rank your goals, what's the order? (trade-offs help your trainer)">
          <input value={goals.priority || ''} onChange={(e) => set('priority', e.target.value)} placeholder="e.g. 1) fat loss 2) strength" />
        </Field>
      )}
    </>
  )
}
