// §0.4 — explicit consent to collect health data and share it with the trainer,
// captured with timestamps BEFORE any screening question is asked.
export default function ConsentStep({ consent, onChange }) {
  const toggle = (k) => (e) => onChange({ ...consent, [k]: e.target.checked ? new Date().toISOString() : null })
  return (
    <>
      <h3 className="scr-step-title">Before we start</h3>
      <p className="scr-step-sub">Your answers include health information, so we need your consent first.</p>
      <div className="scr-banner">
        This screening asks about your health so your trainer can plan safe, effective training.
        It is not medical advice and it is not a medical diagnosis. Your answers are stored
        confidentially and shared only with your trainer.
      </div>
      <label className="scr-check">
        <input type="checkbox" checked={!!consent.collect} onChange={toggle('collect')} />
        <span>I consent to this app collecting and storing the health information I provide in this screening.</span>
      </label>
      <label className="scr-check">
        <input type="checkbox" checked={!!consent.share} onChange={toggle('share')} />
        <span>I consent to sharing my screening answers with my assigned trainer.</span>
      </label>
    </>
  )
}
