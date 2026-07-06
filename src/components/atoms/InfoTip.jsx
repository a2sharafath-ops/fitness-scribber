import { useState, useRef, useEffect } from 'react'

// Small "?" affordance that reveals a plain-language definition on hover, focus
// or tap. Presentational: pass { term, text } (usually spread from GLOSSARY).
export default function InfoTip({ term, text = '', label }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  return (
    <span className="infotip" ref={ref}>
      <button
        type="button"
        className="infotip-btn"
        aria-label={`What is ${term || label || 'this'}?`}
        title={text}
        aria-expanded={open}
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); setOpen((o) => !o) }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >?</button>
      {open && <span className="infotip-pop" role="tooltip">{term && <strong>{term}: </strong>}{text}</span>}
    </span>
  )
}
