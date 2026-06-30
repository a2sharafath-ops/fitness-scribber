// Clickable, keyboard-accessible dashboard KPI card that navigates on activation.
export default function StatCard({ label, value, delta, onClick, ariaLabel }) {
  const act = () => onClick && onClick()
  return (
    <div
      className="card stat link"
      role="button"
      tabIndex={0}
      aria-label={ariaLabel || label}
      onClick={act}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          act()
        }
      }}
    >
      <div className="label">{label}</div>
      <div className="num">{value}</div>
      {delta && <div className="delta">{delta}</div>}
      <div className="card-go">→</div>
    </div>
  )
}
