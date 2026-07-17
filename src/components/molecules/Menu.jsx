import { useState } from 'react'
import Icon from '../atoms/Icon'

// Small "⋯" actions dropdown. `items`: [{ label, icon?, danger?, onClick }].
// Clicking the trigger toggles a popup; selecting an item runs its onClick.
// Danger items (e.g. Delete) render in the accent colour as a warning.
export default function Menu({ items, label = 'Actions' }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="menu-wrap">
      <button type="button" className="menu-btn" aria-haspopup="menu" aria-expanded={open} aria-label={label}
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}>⋯</button>
      {open && (
        <div className="menu-pop" role="menu">
          {items.map((it) => (
            <button key={it.label} type="button" role="menuitem"
              className={'menu-item' + (it.danger ? ' danger' : '')}
              onMouseDown={(e) => { e.preventDefault(); setOpen(false); it.onClick() }}>
              {it.icon && <Icon name={it.icon} size={14} />} {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
