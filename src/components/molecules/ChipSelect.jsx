// Chip group: multi-select (value: array) or single-select (value: string).
export default function ChipSelect({ options, value, onChange, single, ariaLabel }) {
  const on = (o) => (single ? value === o : (value || []).includes(o))
  const toggle = (o) => {
    if (single) return onChange(on(o) ? '' : o)
    onChange(on(o) ? value.filter((x) => x !== o) : [...(value || []), o])
  }
  return (
    <div className="chips" role="group" aria-label={ariaLabel}>
      {options.map((o) => (
        <button key={o} type="button" className={'chip' + (on(o) ? ' on' : '')} aria-pressed={on(o)} onClick={() => toggle(o)}>
          {o}
        </button>
      ))}
    </div>
  )
}
