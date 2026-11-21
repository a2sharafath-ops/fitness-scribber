import { useLayoutEffect, useRef } from 'react'

export default function DashboardSegments({ label, options, value, onChange }) {
  const group = useRef(null)
  useLayoutEffect(() => {
    const node = group.current
    const active = node?.querySelector('[aria-pressed="true"]')
    if (!active) return
    const position = () => {
      node.style.setProperty('--selection-x', `${active.offsetLeft}px`)
      node.style.setProperty('--selection-y', `${active.offsetTop}px`)
      node.style.setProperty('--selection-width', `${active.offsetWidth}px`)
      node.style.setProperty('--selection-height', `${active.offsetHeight}px`)
    }
    position()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(position)
    observer.observe(node)
    observer.observe(active)
    return () => observer.disconnect()
  }, [value])

  return <div ref={group} className="db-tabs orbit-segments" role="group" aria-label={label}>
    <span className="orbit-selection-thumb" aria-hidden="true" />
    {options.map(([id, text]) => <button key={id} type="button" aria-pressed={value === id} onClick={() => onChange(id)}>{text}</button>)}
  </div>
}
