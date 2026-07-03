import Field from '../../atoms/Field'
import SegToggle from '../../molecules/SegToggle'
import YesNoRow from '../../molecules/YesNoRow'
import { HHQ_CONDITIONS, HHQ_SYMPTOMS } from '../../../lib/screening'

// HHQ §2C personal medical history + symptom check, §2D CVD/metabolic risk factors.
// Red-flag weighting is applied silently server-side of the UI — nothing shown here.
export default function HhqMedicalStep({ conditions, symptoms, risk, onChange }) {
  const setC = (id, patch) => onChange('conditions', { ...conditions, [id]: { ...conditions[id], ...patch } })
  const setS = (id) => (v) => onChange('symptoms', { ...symptoms, [id]: v })
  const setR = (k, v) => onChange('risk', { ...risk, [k]: v })
  return (
    <>
      <h3 className="scr-step-title">Medical history</h3>
      <p className="scr-step-sub">Do you currently have, or have you ever been diagnosed with, the following?</p>
      {HHQ_CONDITIONS.map((x) => {
        const v = conditions[x.id] || {}
        return (
          <div className="yn-row" key={x.id}>
            <div className="yn-q">
              <div>{x.label}</div>
              {(v.status === 'past' || v.status === 'current') && (
                <div className="yn-list"><input value={v.note || ''} onChange={(e) => setC(x.id, { note: e.target.value })} placeholder="Details (what / when / treatment)" aria-label={'Details: ' + x.label} /></div>
              )}
            </div>
            <SegToggle options={[['no', 'No'], ['past', 'Past'], ['current', 'Current']]} value={v.status || 'no'} onChange={(s) => setC(x.id, { status: s })} ariaLabel={x.label} />
          </div>
        )
      })}
      <h3 className="scr-step-title" style={{ marginTop: 14 }}>Do you currently experience any of these?</h3>
      {HHQ_SYMPTOMS.map((x) => (
        <YesNoRow key={x.id} text={x.label} value={symptoms[x.id]} onChange={setS(x.id)} />
      ))}
      <h3 className="scr-step-title" style={{ marginTop: 14 }}>Family & lifestyle risk factors</h3>
      <YesNoRow text="Heart attack, coronary revascularization, or sudden death in your father/brother before 55, or mother/sister before 65?" value={risk.familyHistory} onChange={(v) => setR('familyHistory', v)} />
      <div className="yn-row">
        <div className="yn-q">
          Do you smoke, or have you quit within the last 6 months?
          {risk.smoking === 'current' && (
            <div className="yn-list"><input value={risk.packsPerDay || ''} onChange={(e) => setR('packsPerDay', e.target.value)} placeholder="Packs/day" aria-label="Packs per day" /></div>
          )}
        </div>
        <SegToggle options={[['never', 'Never'], ['former', 'Former'], ['quit_lt_6mo', 'Quit < 6 mo'], ['current', 'Current']]} value={risk.smoking || ''} onChange={(v) => setR('smoking', v)} ariaLabel="Smoking" />
      </div>
      <YesNoRow text="Do you use vaping / nicotine products?" value={risk.vaping} onChange={(v) => setR('vaping', v)} />
      <YesNoRow text="Have you been told you have high cholesterol / abnormal lipids?" value={risk.highCholesterol} onChange={(v) => setR('highCholesterol', v)} />
      <YesNoRow text="Have you been told you have elevated fasting blood glucose / A1c?" value={risk.highGlucose} onChange={(v) => setR('highGlucose', v)} />
      <Field label="Alcohol (units/week, optional)"><input value={risk.alcohol || ''} onChange={(e) => setR('alcohol', e.target.value)} /></Field>
    </>
  )
}
