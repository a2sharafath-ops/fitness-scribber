// 1–N labelled slider with live value + low/high captions (used for Hooper & RPE).
export default function RangeSlider({ label, value, min, max, lo, hi, onChange }) {
  return (
    <div className="field">
      <label>
        {label} · <span>{value}</span>
      </label>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(+e.target.value)} />
      <div className="flex between" style={{ fontSize: 11, color: 'var(--muted)' }}>
        <span>{lo}</span>
        <span>{hi}</span>
      </div>
    </div>
  )
}
