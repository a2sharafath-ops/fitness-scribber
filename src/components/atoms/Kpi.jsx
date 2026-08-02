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
    // A div (not a <button>) so the tile can safely contain its own interactive
    // controls — e.g. an InfoTip button or a view <select> in the label — which
    // a nested <button> would make invalid. Keyboard access is preserved.
    return (
      <div className="kpi link" role="button" tabIndex={0} onClick={onClick}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(e) } }}>
        {body}
      </div>
    )
  }
  return <div className="kpi">{body}</div>
}
