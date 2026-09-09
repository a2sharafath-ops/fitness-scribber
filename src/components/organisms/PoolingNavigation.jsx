import {useEffect, useRef} from 'react'
import {Link, useLocation} from 'react-router-dom'
import {poolingNavigation, poolingSectionId} from '../../lib/pooling/navigation'
import './PoolingNavigation.css'

export default function PoolingNavigation({ready = true, ...scope}) {
  const location = useLocation()
  const focusedLocation = useRef(null)
  const groups = poolingNavigation(scope)
  const locks = [...new Set(Object.values(groups).flat().filter(item=>!item.to).map(item=>item.reason))]
  // React Router does not scroll to fragments after an async page load. Focus
  // the heading once per navigation, not again when a form refreshes its data.
  useEffect(() => {
    const id = poolingSectionId(location.hash)
    const key = `${location.key}:${location.pathname}:${location.hash}`
    if (!ready || !id || focusedLocation.current === key) return
    const frame = requestAnimationFrame(() => {
      const target = document.getElementById(id)
      if (!target) return
      target.focus({preventScroll: true})
      target.scrollIntoView({block: 'start', behavior: 'instant'})
      focusedLocation.current = key
    })
    return () => cancelAnimationFrame(frame)
  }, [ready, location.key, location.pathname, location.hash])
  const current = location.pathname + location.hash
  return <nav className="pooling-navigation card" aria-label="Pooling workflow">
    <h2 id="pooling-navigation" tabIndex={-1}>Workout workflow</h2>
    <p>Links only move you between screens. Preparing, saving and approving still require their own explicit actions.</p>
    {Object.entries(groups).map(([group, items]) => <div key={group}>
      <h3>{group === 'workflow' ? 'Workflow' : 'Review tools'}</h3>
      <ul>{items.map(({key, label, to, reason}) => <li key={key}>{to
        ? <Link to={to} aria-current={current === to ? 'location' : undefined}>{label}</Link>
        : <span aria-disabled="true" title={reason}>{label}<span className="sr-only"> — {reason}</span></span>
      }</li>)}</ul>
    </div>)}
    {!scope.clientId && <p>Choose a client from Clients to open their workout workflow.</p>}
    {!!scope.clientId && locks.map(reason=><p key={reason} className="pooling-lock">Unavailable steps: {reason}</p>)}
    <p>Save unfinished edits before moving to a different screen. A step link opens its section; use the named action inside that section to make a change.</p>
    <Link className="pooling-return" to={`${location.pathname}#pooling-navigation`} aria-label="Back to pooling steps">↑ Steps</Link>
  </nav>
}
