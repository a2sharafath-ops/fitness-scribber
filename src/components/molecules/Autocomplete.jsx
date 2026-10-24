import { useEffect, useId, useRef, useState } from 'react'

// Text input with a filtered suggestions dropdown. Substring, case-insensitive
// match against `options` (a string[]) — more reliable and consistent across
// browsers than a native <datalist>. Free text is allowed: onChange fires on
// every keystroke; picking a suggestion just sets the value.
export default function Autocomplete({ value, onChange, options, placeholder, ariaLabel, max = 8, className, inputClassName, filterOption, sortOptions, getOptionDescription, showAllMatches = false }) {
  const [open, setOpen] = useState(false)
  const [hi, setHi] = useState(0)
  const listId = useId()
  const listRef = useRef(null)
  const blurTimer = useRef(null)
  useEffect(() => () => clearTimeout(blurTimer.current), [])
  const q = String(value || '').trim().toLowerCase()
  const uniqueOptions = [...new Set(options)]
  const filtered = q ? uniqueOptions.filter((o) => filterOption ? filterOption(o, q) : o.toLowerCase().includes(q)) : uniqueOptions
  if (q && sortOptions) filtered.sort((a, b) => sortOptions(a, b, q))
  const matches = filtered.slice(0, q && showAllMatches ? filtered.length : max)
  // Hide once the text is an exact single match (nothing left to suggest).
  const show = open && matches.length > 0 && !(matches.length === 1 && matches[0].toLowerCase() === q)
  const activeIndex = Math.min(hi, matches.length - 1)
  const pick = (name) => { onChange(name); setOpen(false) }
  useEffect(() => {
    if (show) listRef.current?.children[activeIndex]?.scrollIntoView?.({ block: 'nearest' })
  }, [show, activeIndex])

  return (
    <div className={'ac-wrap' + (className ? ' ' + className : '')}>
      <input
        className={inputClassName} value={value} placeholder={placeholder} aria-label={ariaLabel} autoComplete="off"
        role="combobox" aria-expanded={show} aria-autocomplete="list"
        aria-controls={show ? listId : undefined} aria-activedescendant={show ? `${listId}-${activeIndex}` : undefined}
        title={value || undefined}
        onChange={(e) => { onChange(e.target.value); setOpen(true); setHi(0) }}
        onFocus={() => { clearTimeout(blurTimer.current); setOpen(true) }}
        onBlur={() => { clearTimeout(blurTimer.current); blurTimer.current = setTimeout(() => setOpen(false), 120) }}
        onKeyDown={(e) => {
          if (!show) return
          if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(h + 1, matches.length - 1)) }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)) }
          else if (e.key === 'Enter') { e.preventDefault(); pick(matches[activeIndex]) }
          else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setOpen(false) }
        }}
      />
      {show && (
        <ul ref={listRef} id={listId} className="ac-list" role="listbox" aria-label={`${ariaLabel || 'Text'} suggestions`}>
          {matches.map((m, i) => {
            const description = getOptionDescription?.(m, q)
            return (
            <li key={m} id={`${listId}-${i}`} role="option" aria-selected={i === activeIndex}
              aria-label={m} aria-describedby={description ? `${listId}-${i}-description` : undefined}
              className={'ac-opt' + (i === activeIndex ? ' hi' : '')}
              onMouseEnter={() => setHi(i)}
              onMouseDown={(e) => { e.preventDefault(); pick(m) }}>
              <span>{m}</span>
              {description && <small id={`${listId}-${i}-description`} className="ac-alias">{description}</small>}
            </li>
          )})}
        </ul>
      )}
    </div>
  )
}
