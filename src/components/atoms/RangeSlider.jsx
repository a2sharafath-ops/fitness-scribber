import { useId } from 'react'

// Empty ratings stay unrecorded until the user interacts with the slider.
export default function RangeSlider({ label, value, min, max, lo, hi, onChange, variant }) {
  const id = useId()
  const rated = value !== '' && value != null
  const inputValue = rated ? value : Math.round((min + max) / 2)
  return (
    <div className={'field rating-slider' + (variant === 'wellness' ? ' wellness-slider' : '')}>
      <div className="rating-slider-head"><label htmlFor={id}>{label}</label><output htmlFor={id}>{rated ? value : '—'}</output></div>
      <input id={id} type="range" min={min} max={max} step="1" value={inputValue}
        aria-describedby={`${id}-ends`} aria-valuetext={rated ? `${value} of ${max}` : 'Not rated'}
        onChange={(e) => onChange(+e.target.value)}
        onPointerUp={(e) => { if (!rated) onChange(+e.currentTarget.value) }}
        onKeyUp={(e) => { if (!rated && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(e.key)) onChange(+e.currentTarget.value) }} />
      {variant === 'wellness' && <div className="rating-slider-ticks" aria-hidden="true">{Array.from({ length: max - min + 1 }, (_, index) => <span key={index}>{min + index}</span>)}</div>}
      <div className="rating-slider-ends" id={`${id}-ends`}>
        <span>{min} · {lo}</span><span>{max} · {hi}</span>
      </div>
    </div>
  )
}
