// Goals §3F — final consents & acknowledgements (all four required to submit).
const ACKS = [
  ['accurate', 'The information I have provided is accurate and complete to the best of my knowledge.'],
  ['share', 'I consent to this screening being shared with my assigned trainer.'],
  ['notMedicalAdvice', 'I understand this screening is not medical advice and does not replace physician clearance where indicated.'],
  ['reportChanges', 'I agree to tell my trainer if my health changes.'],
]

export default function FinalConsentStep({ acknowledgements, onChange }) {
  const a = acknowledgements || {}
  const toggle = (k) => (e) => onChange({ ...a, [k]: e.target.checked, at: new Date().toISOString() })
  return (
    <>
      <h3 className="scr-step-title">Almost done</h3>
      <p className="scr-step-sub">Please confirm the following to submit your screening.</p>
      {ACKS.map(([k, text]) => (
        <label className="scr-check" key={k}>
          <input type="checkbox" checked={!!a[k]} onChange={toggle(k)} />
          <span>{text}</span>
        </label>
      ))}
    </>
  )
}
