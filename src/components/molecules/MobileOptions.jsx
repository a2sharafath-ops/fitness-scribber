import { useId, useState } from 'react'
import Icon from '../atoms/Icon'

export default function MobileOptions({ label = 'Filters', activeCount = 0, children, className = '' }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return <>
    <button type="button" className="mobile-options-toggle" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
      {label}{activeCount > 0 && ` (${activeCount})`} <Icon name="chevron-down" size={14} />
    </button>
    <div id={id} className={`mobile-options-content ${className}`} data-expanded={open}>{children}</div>
  </>
}
