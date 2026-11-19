import { useId, useRef } from 'react'

export default function LiveSessionMenu({ label, children }) {
  const id = useId()
  const trigger = useRef(null)
  const menu = useRef(null)
  const open = () => {
    menu.current.showPopover()
    const rect = trigger.current.getBoundingClientRect()
    const size = menu.current.getBoundingClientRect()
    menu.current.style.left = Math.max(8, Math.min(innerWidth - size.width - 8, rect.right - size.width)) + 'px'
    menu.current.style.top = Math.max(8, Math.min(innerHeight - size.height - 8, rect.bottom + 6)) + 'px'
    menu.current.querySelector('button:not(:disabled)')?.focus()
  }
  const close = () => { menu.current.hidePopover(); trigger.current.focus() }
  const keyDown = (event) => {
    if (event.key === 'Escape' || event.key === 'Tab') { close(); return }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const buttons = [...menu.current.querySelectorAll('button:not(:disabled)')]
    const index = buttons.indexOf(document.activeElement)
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 :
      (index + (event.key === 'ArrowUp' ? -1 : 1) + buttons.length) % buttons.length
    buttons[next]?.focus()
  }
  return <>
    <button type="button" className="ls-more" ref={trigger} aria-label={label} aria-haspopup="menu" popoverTarget={id}
      onClick={(event) => { event.preventDefault(); open() }}>⋯</button>
    <div id={id} ref={menu} className="ls-menu" popover="auto" role="menu" aria-label={label} onKeyDown={keyDown}
      onClick={(event) => { if (event.target.closest('button')) close() }}>{children}</div>
  </>
}
