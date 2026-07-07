import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../atoms/Icon'
import Avatar from '../atoms/Avatar'
import { useData } from '../../store/DataContext'
import { useConversations } from '../../hooks/useConversations'
import { openConcerns } from '../../lib/calc'
import { initials } from '../../lib/format'

// Global utility bar (Figma web shell): client search, notification bell
// with live counts (open concerns + unread messages), trainer avatar.
export default function GlobalBar() {
  const { db } = useData()
  const { totalUnread } = useConversations()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [bellOpen, setBellOpen] = useState(false)
  const concerns = openConcerns(db)
  const nCount = concerns.length + (totalUnread > 0 ? 1 : 0)
  const results = q.trim()
    ? db.clients.filter((c) => c.name.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 6)
    : []
  const go = (id) => { setQ(''); nav('/clients/' + id) }

  return (
    <div className="global-bar">
      <div className="gb-search">
        <Icon name="search" size={16} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search clients…" aria-label="Search clients" />
        {results.length > 0 && (
          <div className="gb-results">
            {results.map((c) => (
              <button key={c.id} onMouseDown={() => go(c.id)}>
                <Avatar name={c.name} size={26} /><span>{c.name}</span><span className="muted">{c.goal}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="gb-bellwrap">
        <button className="gb-bell" onClick={() => setBellOpen((v) => !v)} aria-label="Notifications" aria-expanded={bellOpen}>
          <Icon name="bell" size={18} />
          {nCount > 0 && <span className="gb-badge">{nCount}</span>}
        </button>
        {bellOpen && (
          <>
            <div className="gb-overlay" onClick={() => setBellOpen(false)} />
            <div className="gb-drop" role="menu">
              {totalUnread > 0 && (
                <button onClick={() => { setBellOpen(false); nav('/messages') }}>
                  <Icon name="message" size={15} /> {totalUnread} unread message{totalUnread > 1 ? 's' : ''}
                </button>
              )}
              {concerns.slice(0, 5).map((x) => {
                const cl = db.clients.find((k) => k.id === x.clientId)
                return (
                  <button key={x.id} onClick={() => { setBellOpen(false); nav('/concerns') }}>
                    <Icon name="alert" size={15} /> {cl?.name || 'Client'}: {x.category} · {x.severity}
                  </button>
                )
              })}
              {totalUnread === 0 && concerns.length === 0 && <div className="gb-empty">You're all caught up.</div>}
            </div>
          </>
        )}
      </div>
      <button className="gb-avatar" onClick={() => nav('/settings')} aria-label="Your settings">
        {initials(db.settings?.trainerName || 'Coach')}
      </button>
    </div>
  )
}
