// Compact load-response readout for a single planner day cell.
// Purely presentational: receives the four metrics as props and renders
// labelled chips. The letter label is a non-color cue for accessibility.
const abbr = (n) => {
  if (n == null) return '—'
  const v = Math.round(n)
  return Math.abs(v) >= 1000 ? +(v / 1000).toFixed(1) + 'k' : String(v)
}

const readinessColor = (r) =>
  r == null ? 'var(--muted)' : r >= 65 ? 'var(--green)' : r >= 45 ? 'var(--blue)' : 'var(--accent)'
const acwrColor = (a) =>
  a == null ? 'var(--muted)' : a >= 0.8 && a <= 1.3 ? 'var(--green)' : a > 1.5 ? 'var(--accent)' : 'var(--blue)'
const monoColor = (m) => (!m ? 'var(--muted)' : m > 2 ? 'var(--accent)' : 'var(--green)')

export default function DayMetrics({ readiness, acwr, monotony, strain }) {
  const chips = [
    { k: 'R', label: 'Readiness', val: readiness == null ? '—' : readiness, color: readinessColor(readiness) },
    { k: 'ACWR', label: 'Acute:chronic ratio', val: acwr == null ? '—' : acwr.toFixed(2), color: acwrColor(acwr) },
    { k: 'Mono', label: 'Monotony (7d)', val: monotony ? monotony.toFixed(1) : '—', color: monoColor(monotony) },
    { k: 'Strain', label: 'Strain (7d)', val: strain ? abbr(strain) : '—', color: 'var(--muted)' },
  ]
  return (
    <div className="day-metrics">
      {chips.map((c) => (
        <span className="dm-chip" key={c.k} title={`${c.label}: ${c.val}`} style={{ color: c.color }}>
          <span className="dm-k">{c.k}</span>
          {c.val}
        </span>
      ))}
    </div>
  )
}
