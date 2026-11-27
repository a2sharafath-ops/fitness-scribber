import { useRef, useState } from 'react'
import Icon from '../atoms/Icon'

function readSeen(storageKey) {
  try { return new Set(JSON.parse(localStorage.getItem(storageKey)) || []) }
  catch { return new Set() }
}

export default function OrbitNotifications({ notices, open, exiting, onToggle, onOpen, scope }) {
  const storageKey = `orbit:notification-read:${scope}`
  const [seen, setSeen] = useState(() => readSeen(storageKey))
  const [unreadOnly, setUnreadOnly] = useState(false)
  const unreadFilter = useRef(null)
  const unread = notices.filter(({ id }) => !seen.has(id))
  const visible = unreadOnly ? unread : notices
  const updateSeen = (next) => {
    setSeen(next)
    try { localStorage.setItem(storageKey, JSON.stringify([...next].slice(-250))) }
    catch { /* Keep the selection available until the tab closes. */ }
  }
  const markRead = (ids) => updateSeen(new Set([...seen, ...ids]))
  const toggleRead = (id) => {
    const next = new Set(seen)
    if (next.has(id)) next.delete(id)
    else {
      next.add(id)
      if (unreadOnly) unreadFilter.current?.focus()
    }
    updateSeen(next)
  }

  return <div className="gb-bellwrap" data-panel="notifications" data-exiting={exiting || undefined}>
    <button type="button" className="orbit-icon-button gb-bell" onClick={onToggle} aria-label="Notifications" aria-expanded={open} aria-controls="orbit-notifications">
      <Icon name="bell" size={18} />
      {unread.length > 0 && <span className="gb-badge" aria-label={`${unread.length} unread`}>{unread.length}</span>}
    </button>
    {(open || exiting) && <>
      <section className="gb-drop" id="orbit-notifications" aria-label="Notifications" inert={exiting}>
        <header className="orbit-notification-controls">
          <div role="group" aria-label="Filter notifications">
            <button type="button" aria-pressed={!unreadOnly} onClick={() => setUnreadOnly(false)}>All</button>
            <button type="button" ref={unreadFilter} aria-pressed={unreadOnly} onClick={() => setUnreadOnly(true)}>Unread</button>
          </div>
          <button type="button" disabled={!unread.length} onClick={() => markRead(unread.map(({ id }) => id))}>Mark all read</button>
        </header>
        {visible.length > 0 && <p className="orbit-notification-count" role="status">{unread.length} unread</p>}
        {visible.map(({ id, label, icon, path }) => <div key={id} className="orbit-notification-row">
          <button type="button" onClick={() => { markRead([id]); onOpen(path) }}>
            <Icon name={icon} size={16} /><span>{label}<small>{seen.has(id) ? 'Read' : 'Unread'}</small></span>
          </button>
          <button type="button" className="orbit-notification-mark" onClick={() => toggleRead(id)}
            aria-label={`Mark as ${seen.has(id) ? 'unread' : 'read'}: ${label}`}>{seen.has(id) ? 'Mark unread' : 'Mark read'}</button>
        </div>)}
        {!visible.length && <p className="gb-empty" role="status">{unreadOnly ? 'No unread notifications.' : 'No notifications yet.'}</p>}
      </section>
    </>}
  </div>
}
