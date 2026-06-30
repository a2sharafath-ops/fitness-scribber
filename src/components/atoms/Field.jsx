// Labelled form field wrapper.
export default function Field({ label, children }) {
  return (
    <label className="field" style={{ display: 'block' }}>
      <span style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>
        {label}
      </span>
      {children}
    </label>
  )
}
