import Field from '../../atoms/Field'
import { DECLARATION_TEXT, PARQ_COPYRIGHT, PARQ_ATTRIBUTION, PARQ_CITATION, PARQ_DISCLAIMER } from '../../../lib/parq'

// PAR-Q+ §1E — Participant Declaration, captured as a typed e-signature.
// The full legal block (copyright, citation, liability disclaimer) renders here.
export default function ParqDeclarationStep({ declaration, onChange, today }) {
  const d = declaration || { name: '', signature: '', guardian: '', witness: '', date: today }
  const set = (k) => (e) => onChange({ ...d, date: d.date || today, [k]: e.target.value })
  return (
    <>
      <h3 className="scr-step-title">Participant Declaration</h3>
      <p className="scr-step-sub">Please read and sign to complete the PAR-Q+.</p>
      <div className="scr-declaration">{DECLARATION_TEXT}</div>
      <div className="row2">
        <Field label="Full name"><input value={d.name} onChange={set('name')} autoComplete="name" /></Field>
        <Field label="Signature (type your full name)"><input value={d.signature} onChange={set('signature')} /></Field>
      </div>
      <div className="row2">
        <Field label="Signature of Parent/Guardian/Care Provider (if applicable)"><input value={d.guardian} onChange={set('guardian')} /></Field>
        <Field label="Witness (optional)"><input value={d.witness} onChange={set('witness')} /></Field>
      </div>
      <Field label="Date"><input type="date" value={d.date || today} onChange={set('date')} /></Field>
      <div className="scr-legal">
        {PARQ_COPYRIGHT} · {PARQ_ATTRIBUTION}
        <br />Citation: {PARQ_CITATION}
        <br />{PARQ_DISCLAIMER}
      </div>
    </>
  )
}
