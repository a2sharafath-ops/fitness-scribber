// Compact KPI tile used in dashboards. Becomes an interactive button when onClick is supplied.
export default function Kpi({ label, value, delta, deltaColor, onClick }) {
  const interactive = typeof onClick === 'function'
  const body = (
    <>
      <div className="k-l">{label}</div>
      <div className="k-v">{value}</div>
      {delta != null && (
        <div className="k-d" style={deltaColor ? { color: deltaColor } : { color: 'var(--muted)' }}>
          {delta}
        </div>
      )}
      {interactive && <span className="k-go" aria-hidden="true">→</span>}
    </>
  )
  if (interactive) {
    return (
      <button type="button" className="kpi link" onClick={onClick}>
        {body}
      </button>
    )
  }
  return <div className="kpi">{body}</div>
}
