import { useState, useRef, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import Icon from '../atoms/Icon'

// Small "⋯" actions dropdown. `items`: [{ label, icon?, danger?, onClick }].
// Clicking the trigger toggles a popup; selecting an item runs its onClick.
// Danger items (e.g. Delete) render in the accent colour as a warning.
//
// The popup is rendered into <body> through a portal and positioned to the
// trigger. Kept inline it was clipped by any ancestor with `overflow: hidden` —
// a collapsed assessment entry cut the menu off completely. A portal escapes
// every such ancestor, so the menu works wherever it is used.
export default function Menu({ items, label = 'Actions' }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const btnRef = useRef(null)
  const popRef = useRef(null)

  // Position against the trigger, flipping above it when there isn't room
  // below, and keeping the popup inside the viewport horizontally.
  useLayoutEffect(() => {
    if (!open) return undefined
    const place = () => {
      const b = btnRef.current?.getBoundingClientRect()
      const p = popRef.current?.getBoundingClientRect()
      if (!b || !p) return
      const gap = 4
      const up = b.bottom + p.height + gap > window.innerHeight && b.top - p.height - gap > 8
      setPos({
        top: up ? b.top - p.height - gap : b.bottom + gap,
        left: Math.max(8, Math.min(b.right - p.width, window.innerWidth - p.width - 8)),
      })
    }
    place()
    // `true` captures scrolls on inner containers too, not just the window.
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [open])

  const close = () => { setOpen(false); setPos(null) }

  return (
    <div className="menu-wrap">
      <button type="button" ref={btnRef} className="menu-btn" aria-haspopup="menu" aria-expanded={open} aria-label={label}
        onClick={() => (open ? close() : setOpen(true))}
        onBlur={() => setTimeout(close, 150)}>⋯</button>
      {open && createPortal(
        // Hidden until measured, so it never flashes at the wrong spot.
        <div ref={popRef} className="menu-pop" role="menu"
          style={{ top: pos?.top ?? 0, left: pos?.left ?? 0, visibility: pos ? 'visible' : 'hidden' }}>
          {items.map((it) => (
            <button key={it.label} type="button" role="menuitem"
              className={'menu-item' + (it.danger ? ' danger' : '')}
              onMouseDown={(e) => { e.preventDefault(); close(); it.onClick() }}>
              {it.icon && <Icon name={it.icon} size={14} />} {it.label}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </div>
  )
}
