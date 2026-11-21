import { useState } from 'react'
import Icon from '../atoms/Icon'

function readSeen(storageKey) {
  try { return new Set(JSON.parse(localStorage.getItem(storageKey)) || []) }
  catch { return new Set() }
}

export default function OrbitNotifications({ notices, open, onToggle, onClose, onOpen, scope }) {
  const storageKey = `orbit:notification-read:${scope}`
  const [seen, setSeen] = useState(() => readSeen(storageKey))
  const [unreadOnly, setUnreadOnly] = useState(false)
  const unread = notices.filter(({ id }) => !seen.has(id))
  const visible = unreadOnly ? unread : notices
  const markRead = (ids) => {
    const next = new Set([...seen, ...ids])
    setSeen(next)
    try { localStorage.setItem(storageKey, JSON.stringify([...next].slice(-250))) }
    catch { /* Keep the selection available until the tab closes. */ }
  }

  return <div className="gb-bellwrap">
    <button type="button" className="orbit-icon-button gb-bell" onClick={onToggle} aria-label="Notifications" aria-expanded={open} aria-controls="orbit-notifications">
      <Icon name="bell" size={18} />
      {unread.length > 0 && <span className="gb-badge" aria-label={`${unread.length} unread`}>{unread.length}</span>}
    </button>
    {open && <>
      <div className="gb-overlay" aria-hidden="true" onClick={onClose} />
      <section className="gb-drop" id="orbit-notifications" aria-label="Notifications">
        <header className="orbit-notification-controls">
          <div role="group" aria-label="Filter notifications">
            <button type="button" aria-pressed={!unreadOnly} onClick={() => setUnreadOnly(false)}>All</button>
            <button type="button" aria-pressed={unreadOnly} onClick={() => setUnreadOnly(true)}>Unread</button>
          </div>
          <button type="button" disabled={!unread.length} onClick={() => markRead(unread.map(({ id }) => id))}>Mark all read</button>
        </header>
        <p className="orbit-notification-count" role="status">{unread.length} unread</p>
        {visible.map(({ id, label, icon, path }) => <div key={id} className="orbit-notification-row">
          <button type="button" onClick={() => { markRead([id]); onOpen(path) }}>
            <Icon name={icon} size={16} /><span>{label}<small>{seen.has(id) ? 'Read' : 'Unread'}</small></span>
          </button>
          {!seen.has(id) && <button type="button" className="orbit-notification-mark" title="Mark as read" aria-label={`Mark as read: ${label}`} onClick={() => markRead([id])}><Icon name="check" size={16} /></button>}
        </div>)}
        {!visible.length && <p className="gb-empty">{unreadOnly ? 'No unread notifications.' : 'You’re all caught up.'}</p>}
      </section>
    </>}
  </div>
}
