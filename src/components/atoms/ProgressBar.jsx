export default function ProgressBar({ pct = 0 }) {
  return (
    <div className="progress-bar">
      <div style={{ width: Math.max(0, Math.min(100, pct)) + '%' }} />
    </div>
  )
}
