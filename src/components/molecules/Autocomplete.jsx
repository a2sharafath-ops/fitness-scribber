import { useState } from 'react'

// Text input with a filtered suggestions dropdown. Substring, case-insensitive
// match against `options` (a string[]) — more reliable and consistent across
// browsers than a native <datalist>. Free text is allowed: onChange fires on
// every keystroke; picking a suggestion just sets the value.
export default function Autocomplete({ value, onChange, options, placeholder, ariaLabel, max = 8, className, inputClassName }) {
  const [open, setOpen] = useState(false)
  const [hi, setHi] = useState(0)
  const q = String(value || '').trim().toLowerCase()
  const matches = q
    ? options.filter((o) => o.toLowerCase().includes(q)).slice(0, max)
    : options.slice(0, max)
  // Hide once the text is an exact single match (nothing left to suggest).
  const show = open && matches.length > 0 && !(matches.length === 1 && matches[0].toLowerCase() === q)
  const pick = (name) => { onChange(name); setOpen(false) }

  return (
    <div className={'ac-wrap' + (className ? ' ' + className : '')}>
      <input
        className={inputClassName} value={value} placeholder={placeholder} aria-label={ariaLabel} autoComplete="off"
        role="combobox" aria-expanded={show} aria-autocomplete="list"
        onChange={(e) => { onChange(e.target.value); setOpen(true); setHi(0) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (!show) return
          if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(h + 1, matches.length - 1)) }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)) }
          else if (e.key === 'Enter') { e.preventDefault(); pick(matches[hi]) }
          else if (e.key === 'Escape') setOpen(false)
        }}
      />
      {show && (
        <ul className="ac-list" role="listbox">
          {matches.map((m, i) => (
            <li key={m} role="option" aria-selected={i === hi}
              className={'ac-opt' + (i === hi ? ' hi' : '')}
              onMouseEnter={() => setHi(i)}
              onMouseDown={(e) => { e.preventDefault(); pick(m) }}>
              {m}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
