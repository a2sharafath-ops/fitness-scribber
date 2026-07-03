import Field from '../../atoms/Field'
import SegToggle from '../../molecules/SegToggle'
import YesNoRow from '../../molecules/YesNoRow'

// HHQ §2E medications & supplements, §2F musculoskeletal & injury history,
// §2G women's health (conditional; pregnancy carries forward from the PAR-Q+
// delay flag rather than being asked twice).
export default function HhqHealthStep({ meds, msk, womens, sex, pregnantFromParq, onChange }) {
  const m = (k) => (e) => onChange('meds', { ...meds, [k]: e.target.value })
  const k = (key) => (e) => onChange('msk', { ...msk, [key]: e.target.value })
  const w = (key, v) => onChange('womens', { ...womens, [key]: v })
  const showWomens = sex === 'Female' || pregnantFromParq
  return (
    <>
      <h3 className="scr-step-title">Medications & supplements</h3>
      <Field label="Prescription medications (name, reason — dose if you're comfortable)"><textarea value={meds.prescriptions || ''} onChange={m('prescriptions')} /></Field>
      <div className="row2">
        <Field label="Over-the-counter medications"><input value={meds.otc || ''} onChange={m('otc')} /></Field>
        <Field label="Vitamins / supplements / pre-workout"><input value={meds.supplements || ''} onChange={m('supplements')} /></Field>
      </div>
      <div className="yn-row">
        <div className="yn-q">Any medication that affects heart rate or blood pressure (e.g., beta-blockers)?</div>
        <SegToggle options={[['no', 'No'], ['yes', 'Yes'], ['unsure', 'Unsure']]} value={meds.hrbpMeds || ''} onChange={(v) => onChange('meds', { ...meds, hrbpMeds: v })} ariaLabel="HR/BP medication" />
      </div>
      <Field label="Known drug or other allergies (incl. anaphylaxis risk)"><input value={meds.allergies || ''} onChange={m('allergies')} /></Field>

      <h3 className="scr-step-title" style={{ marginTop: 14 }}>Injuries, pain & movement</h3>
      <Field label="Current pain? (where · how bad 0–10 · what makes it worse or better)"><textarea value={msk.currentPain || ''} onChange={k('currentPain')} /></Field>
      <div className="row2">
        <Field label="Past injuries (area, rough date, recovered?)"><input value={msk.pastInjuries || ''} onChange={k('pastInjuries')} /></Field>
        <Field label="Surgeries (what & when)"><input value={msk.surgeries || ''} onChange={k('surgeries')} /></Field>
      </div>
      <div className="row2">
        <Field label="Implants / prostheses (joint replacement, pacemaker…)"><input value={msk.implants || ''} onChange={k('implants')} /></Field>
        <Field label="Stiff or recurring 'problem' joints"><input value={msk.romLimits || ''} onChange={k('romLimits')} /></Field>
      </div>
      <Field label="Movements you've been told to avoid, or that reliably cause pain"><input value={msk.avoidMovements || ''} onChange={k('avoidMovements')} /></Field>
      <YesNoRow text="Balance problems or history of falls?" value={msk.balanceFalls} onChange={(v) => onChange('msk', { ...msk, balanceFalls: v })} />

      {showWomens && (
        <>
          <h3 className="scr-step-title" style={{ marginTop: 14 }}>Women's health</h3>
          {pregnantFromParq ? (
            <div className="scr-banner">You indicated on the previous section that you are pregnant — we've noted that here so you don't have to answer again.</div>
          ) : (
            <YesNoRow text="Are you currently pregnant, or could you be?" value={womens.pregnant} onChange={(v) => w('pregnant', v)} />
          )}
          <YesNoRow text="Postpartum within the last 6 months?" value={womens.postpartum} onChange={(v) => w('postpartum', v)} />
          <Field label="Anything relevant to training? (e.g., diastasis recti, pelvic floor, PCOS, cycle-related)"><input value={womens.notes || ''} onChange={(e) => w('notes', e.target.value)} /></Field>
        </>
      )}
    </>
  )
}
