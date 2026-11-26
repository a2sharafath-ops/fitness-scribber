import { useCallback, useEffect, useId, useRef, useState } from 'react'
import './HelperTip.css'

export default function HelperTip({ label, text }) {
  const id = useId()
  const trigger = useRef(null)
  const tip = useRef(null)
  const [open, setOpen] = useState(false)

  const place = useCallback(() => {
    if (!tip.current?.matches(':popover-open')) return
    const anchor = trigger.current.getBoundingClientRect()
    const { width, height } = tip.current.getBoundingClientRect()
    const inset = 8
    const gap = 6
    const below = anchor.bottom + height + gap <= window.innerHeight - inset
    tip.current.style.left = Math.max(inset, Math.min(anchor.left, window.innerWidth - width - inset)) + 'px'
    tip.current.style.top = Math.max(inset, below ? anchor.bottom + gap : anchor.top - height - gap) + 'px'
  }, [])

  useEffect(() => {
    if (!open) return
    function dismissOnEscape(event) {
      if (event.key !== 'Escape' || !tip.current?.matches(':popover-open')) return
      event.preventDefault()
      event.stopPropagation()
      tip.current.hidePopover()
    }

    window.addEventListener('keydown', dismissOnEscape, true)
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      window.removeEventListener('keydown', dismissOnEscape, true)
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [open, place])

  return <span className="helper-tip">
    <button ref={trigger} type="button" className="helper-tip-trigger"
      aria-label={`Help with ${label}`} aria-controls={id} aria-expanded={open}
      aria-describedby={open ? id : undefined} popoverTarget={id}>i</button>
    <span ref={tip} id={id} className="helper-tip-popover" popover="auto" role="tooltip"
      onToggle={(event) => {
        const visible = event.currentTarget.matches(':popover-open')
        if (visible) place()
        setOpen(visible)
      }}>{text}</span>
  </span>
}
