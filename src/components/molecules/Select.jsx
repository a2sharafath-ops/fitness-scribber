import { Children, Fragment, isValidElement, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from '../atoms/Icon'
import './Select.css'

function readOptions(children, group, groupDisabled = false) {
  return Children.toArray(children).flatMap(child => {
    if (!isValidElement(child)) return []
    const props = child.props
    if (child.type === Fragment) return readOptions(props.children, group, groupDisabled)
    if (child.type === 'optgroup') return readOptions(props.children, props.label, props.disabled)
    if (child.type !== 'option') return []
    const text = Children.toArray(props.children).join('').replace(/[\t\n\f\r ]+/g, ' ').trim()
    return [{
      value: String(props.value ?? text), label: props.label ?? text, group,
      disabled: Boolean(groupDisabled || props.disabled), hidden: props.hidden,
    }]
  })
}

export default function Select({ children, value, defaultValue, name, onChange, disabled, className = '', ...triggerProps }) {
  const id = useId()
  const backing = useRef(null)
  const trigger = useRef(null)
  const popup = useRef(null)
  const typeAhead = useRef({ text: '', timestamp: 0 })
  const [uncontrolled, setUncontrolled] = useState(defaultValue)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [panelHost, setPanelHost] = useState(null)
  const options = readOptions(children).map((option, index) => ({ ...option, index }))
  const selected = options.find(option => option.value === String(value ?? uncontrolled))
    ?? options.find(option => !option.disabled)
  const enabled = options.filter(option => !option.hidden && !option.disabled)

  useLayoutEffect(() => {
    // An open list inside an implicit label would add its options to the field's name.
    const label = trigger.current.closest('label')
    if (label) setPanelHost(label.parentElement)
  }, [])

  useEffect(() => {
    const input = backing.current
    const form = input.form
    if (value != null || !form) return
    const reset = () => setUncontrolled(defaultValue)
    form.addEventListener('reset', reset)
    return () => form.removeEventListener('reset', reset)
  }, [value, defaultValue])

  useLayoutEffect(() => {
    if (!open) return
    const place = event => {
      const panel = popup.current
      if (!panel.matches(':popover-open') || panel === event?.target) return
      const anchor = trigger.current.getBoundingClientRect()
      const edge = 8
      const gap = 4
      const width = Math.min(Math.max(anchor.width, 180), innerWidth - edge * 2)
      const below = innerHeight - anchor.bottom - gap - edge
      const above = anchor.top - gap - edge
      const height = Math.min(panel.scrollHeight + 2, 320)
      const placeAbove = height > below && above > below
      panel.style.width = width + 'px'
      panel.style.maxHeight = Math.max(32, Math.min(320, placeAbove ? above : below)) + 'px'
      panel.style.left = Math.max(edge, Math.min(anchor.right - width, innerWidth - width - edge)) + 'px'
      const top = placeAbove ? anchor.top - gap - panel.offsetHeight : anchor.bottom + gap
      panel.style.top = Math.max(edge, Math.min(top, innerHeight - panel.offsetHeight - edge)) + 'px'
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open])

  useEffect(() => {
    if (!open || active < 0) return
    const panel = popup.current
    const option = document.getElementById(id + '-' + active)
    if (!option) return
    const bounds = panel.getBoundingClientRect()
    const row = option.getBoundingClientRect()
    if (row.top < bounds.top) panel.scrollTop -= bounds.top - row.top + 5
    else if (row.bottom > bounds.bottom) panel.scrollTop += row.bottom - bounds.bottom + 5
  }, [active, id, open])

  function show(option = enabled.find(item => item.index === selected?.index) || enabled[0]) {
    if (!enabled.length) return
    trigger.current.focus({ preventScroll: true })
    popup.current.showPopover()
    setActive(option.index)
    setOpen(true)
  }

  function close() {
    popup.current.hidePopover()
    setOpen(false)
    typeAhead.current.text = ''
  }

  function choose(option) {
    close()
    if (!option || option.disabled || option.index === selected?.index) return
    const input = backing.current
    input.selectedIndex = option.index
    // Keep the form value and existing React change handlers in sync.
    input.dispatchEvent(new Event('change', { bubbles: true }))
  }

  function handleKey(event) {
    if (event.key === 'Escape' && open) {
      event.preventDefault()
      event.stopPropagation()
      close()
    } else if (event.key === 'Tab' && open) {
      close()
    } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault()
      const index = enabled.findIndex(option => option.index === active)
      const next = event.key === 'Home' ? enabled[0] : event.key === 'End' ? enabled.at(-1)
        : enabled[Math.max(0, Math.min(enabled.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)))]
      if (!open) show(event.key === 'Home' || event.key === 'End' ? next : undefined)
      else if (next) setActive(next.index)
    } else if (event.key === ' ' || (open && event.key === 'Enter')) {
      event.preventDefault()
      if (open) choose(enabled.find(option => option.index === active))
      else show()
    } else if (event.key.length === 1 && event.key !== ' ' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const timestamp = Date.now()
      const text = (timestamp - typeAhead.current.timestamp < 600 ? typeAhead.current.text : '') + event.key.toLowerCase()
      typeAhead.current = { text, timestamp }
      const query = [...text].every(letter => letter === text[0]) ? text[0] : text
      const start = enabled.findIndex(option => option.index === (open ? active : selected?.index)) + 1
      const ordered = query.length === 1 ? [...enabled.slice(start), ...enabled.slice(0, start)] : enabled
      const match = ordered.find(option => option.label.toLowerCase().startsWith(query))
      if (match) {
        event.preventDefault()
        if (open) setActive(match.index)
        else show(match)
      }
    }
  }

  const list = <span id={id} ref={popup} className="menu-pop orbit-select-options" popover="auto" role="listbox"
      aria-label={triggerProps['aria-label'] || 'Options'}
      onToggle={event => {
        const expanded = event.currentTarget.matches(':popover-open')
        if (!expanded) typeAhead.current.text = ''
        setOpen(expanded)
      }}>
      {options.filter(option => !option.hidden).map((option, index, visible) => <Fragment key={option.index}>
        {option.group && option.group !== visible[index - 1]?.group && <span className="orbit-select-group" aria-hidden="true">{option.group}</span>}
        <span id={id + '-' + option.index} role="option" aria-selected={option.index === selected?.index}
          aria-label={option.group ? `${option.label}, ${option.group}` : undefined}
          aria-disabled={option.disabled || undefined} data-active={option.index === active || undefined}
          className="menu-item" onMouseDown={event => event.preventDefault()} onClick={event => {
            event.preventDefault()
            if (!option.disabled) choose(option)
          }}>
          <span>{option.label}</span>
          {option.index === selected?.index && <Icon name="check" size={16} className="menu-selection" />}
        </span>
      </Fragment>)}
    </span>

  return <>
    <button {...triggerProps} ref={trigger} type="button" className={`orbit-select ${className}`.trim()}
      role="combobox" disabled={disabled} aria-expanded={open} aria-controls={id} popoverTarget={id}
      aria-activedescendant={open && active >= 0 ? id + '-' + active : undefined}
      onClick={event => {
        event.preventDefault()
        if (popup.current.matches(':popover-open')) close()
        else show()
      }} onKeyDown={handleKey} onKeyUp={event => {
        if (event.key === ' ') event.preventDefault()
      }}>
      <span className="orbit-select-value">{selected?.label || '—'}</span>
      <Icon name="chevron-down" size={14} />
    </button>
    <select ref={backing} hidden disabled={disabled} name={name} value={value} defaultValue={defaultValue}
      onChange={event => {
        if (value == null) setUncontrolled(event.target.value)
        onChange?.(event)
      }}>{children}</select>
    {panelHost ? createPortal(list, panelHost) : list}
  </>
}
