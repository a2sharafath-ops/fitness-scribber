export default function AnthroCell({ label, value, unit }) {
  return (
    <div className="anthro-cell">
      <div className="a-l">{label}</div>
      <div className="a-v">
        {value ?? '—'}
        {value != null && unit ? <span style={{ fontSize: 12, color: 'var(--muted)' }}>{unit}</span> : null}
      </div>
    </div>
  )
}
