import { useCallback, useEffect, useId, useRef, useState } from 'react'
import Icon from '../atoms/Icon'

export default function Menu({ items, label = 'Actions' }) {
  const id = useId()
  const triggerRef = useRef(null)
  const menuRef = useRef(null)
  const [open, setOpen] = useState(false)

  const place = useCallback(() => {
    const menu = menuRef.current
    const trigger = triggerRef.current.getBoundingClientRect()
    const gap = 4
    const edge = 8
    const { width, height } = menu.getBoundingClientRect()
    const above = trigger.bottom + height + gap > innerHeight - edge
      && trigger.top - height - gap >= edge
    const top = above ? trigger.top - height - gap : trigger.bottom + gap
    menu.style.top = Math.max(edge, Math.min(top, innerHeight - height - edge)) + 'px'
    menu.style.left = Math.max(edge, Math.min(trigger.right - width, innerWidth - width - edge)) + 'px'
  }, [])

  const show = (edge) => {
    const menu = menuRef.current
    menu.showPopover()
    place()
    const buttons = menu.querySelectorAll('button')
    const focused = edge === 'last' ? buttons[buttons.length - 1] : buttons[0]
    focused?.focus()
  }

  const close = () => {
    menuRef.current.hidePopover()
    triggerRef.current.focus()
  }

  useEffect(() => {
    if (!open) return undefined
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [open, place])

  const move = (event) => {
    if (event.key === 'Escape' || event.key === 'Tab') {
      if (event.key === 'Escape') event.preventDefault()
      close()
      return
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const buttons = [...menuRef.current.querySelectorAll('button')]
    const index = buttons.indexOf(document.activeElement)
    const last = buttons.length - 1
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? last
      : (index + (event.key === 'ArrowDown' ? 1 : last)) % buttons.length
    buttons[next]?.focus()
  }

  return (
    <div className="menu-wrap">
      <button type="button" ref={triggerRef} className="menu-btn" aria-haspopup="menu" aria-controls={id} popoverTarget={id}
        aria-expanded={open} aria-label={label} onClick={(event) => {
          event.preventDefault()
          if (menuRef.current.matches(':popover-open')) close()
          else show()
        }}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
          event.preventDefault()
          show(event.key === 'ArrowUp' ? 'last' : 'first')
        }}>
        <Icon name="more" size={20} />
      </button>
      <div id={id} ref={menuRef} className="menu-pop" popover="auto" role="menu" aria-label={label}
        onToggle={(event) => setOpen(event.currentTarget.matches(':popover-open'))} onKeyDown={move}>
        {items.map((item) => (
          <button key={item.label} type="button" role="menuitem" tabIndex={-1}
            className={'menu-item' + (item.danger ? ' danger' : '')}
            onClick={() => { close(); item.onClick() }}>
            {item.icon && <Icon name={item.icon} size={16} />} {item.label}
          </button>
        ))}
      </div>
    </div>
  )
}
