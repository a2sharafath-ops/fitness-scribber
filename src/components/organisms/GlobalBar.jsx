import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Icon from '../atoms/Icon'
import Brand from '../atoms/Brand'
import { useAuth } from '../../store/AuthContext'
import OrbitNotifications from './OrbitNotifications'
import { useData } from '../../store/DataContext'
import { useModal } from '../../store/ModalContext'
import { useConversations } from '../../hooks/useConversations'
import { openConcerns } from '../../lib/calc'
import { initials } from '../../lib/format'
import SessionForm from './forms/SessionForm'
import { ClientForm } from './forms/ClientForms'

const PAGES = [
  ['/', 'Dashboard'], ['/clients', 'Clients'], ['/workouts', 'Workouts'], ['/schedule', 'Schedule'],
  ['/progress', 'Progress'], ['/messages', 'Messages'], ['/concerns', 'Concerns'], ['/settings', 'Settings'],
]

export default function GlobalBar({ menuTrigger, onOpenNavigation, appearance }) {
  const { db } = useData()
  const { user } = useAuth()
  const { openModal } = useModal()
  const { byClient } = useConversations()
  const nav = useNavigate()
  const { pathname } = useLocation()
  const input = useRef(null)
  const actionMenu = useRef(null)
  const appearanceMenu = useRef(null)
  const [query, setQuery] = useState('')
  const [mobileSearch, setMobileSearch] = useState(false)
  const mobileSearchButton = useRef(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [bellOpen, setBellOpen] = useState(false)
  const notices = [
    ...Object.values(byClient).filter(({ unread }) => unread > 0).map(({ clientId, last, unread }) => ({
      id: `message:${clientId}:${last.id}:${unread}`, icon: 'message', path: '/messages?clientId=' + encodeURIComponent(clientId),
      label: `${db.clients.find(({ id }) => id === clientId)?.name || 'Client'} · ${unread} unread message${unread === 1 ? '' : 's'}`,
    })),
    ...openConcerns(db).map((concern) => ({
      id: 'concern:' + concern.id, icon: 'alert', path: '/concerns',
      label: `${db.clients.find(({ id }) => id === concern.clientId)?.name || 'Client'}: ${concern.category} · ${concern.severity}`,
    })),
  ]
  const term = query.trim().toLowerCase()
  const results = term ? [
    ...db.clients.map((client) => ({ path: '/clients/' + encodeURIComponent(client.id), name: client.name, kind: 'Client' })),
    ...(db.programs || []).filter((program) => !program.archivedAt).map((program) => ({ path: '/workouts?program=' + encodeURIComponent(program.id), name: program.name, kind: 'Program' })),
    ...PAGES.map(([path, name]) => ({ path, name, kind: 'Page' })),
  ].filter((entry) => entry.name?.toLowerCase().includes(term)).slice(0, 8) : []
  const page = pathname.startsWith('/clients/') ? 'Client workspace' : PAGES.find(([path]) => path === pathname)?.[1] || 'Trainer workspace'

  const showSearch = () => {
    setMobileSearch(true)
    requestAnimationFrame(() => input.current?.focus())
  }

  useEffect(() => {
    const shortcut = (event) => {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) { event.preventDefault(); showSearch() }
      if (event.key === 'Escape') {
        if (appearanceMenu.current?.open) appearanceMenu.current.open = false
        if (actionMenu.current?.open) actionMenu.current.open = false
        setBellOpen(false)
      }
    }
    window.addEventListener('keydown', shortcut)
    return () => window.removeEventListener('keydown', shortcut)
  }, [])
  const go = (path) => { setQuery(''); setSearchOpen(false); setMobileSearch(false); setActive(-1); nav(path) }
  const searchKey = (event) => {
    if (event.key === 'Escape') {
      setSearchOpen(false); setMobileSearch(false); setActive(-1)
      if (mobileSearchButton.current?.offsetWidth) mobileSearchButton.current.focus()
      return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (!results.length) return
      event.preventDefault()
      setSearchOpen(true)
      setActive((index) => event.key === 'ArrowDown' ? (index + 1) % results.length : (index < 1 ? results.length - 1 : index - 1))
    }
    if (event.key === 'Enter' && searchOpen && results.length) { event.preventDefault(); go(results[Math.max(active, 0)].path) }
  }
  const create = (action) => { actionMenu.current.open = false; action() }
  const showsResults = searchOpen && Boolean(term)

  return (
    <header className="global-bar orbit-toolbar" data-mobile-search={mobileSearch}>
      <button type="button" className="orbit-icon-button orbit-mobile-menu" ref={menuTrigger} onClick={onOpenNavigation} aria-label="Open navigation" aria-haspopup="dialog" aria-controls="orbit-mobile-navigation"><Icon name="menu" size={19} /></button>
      <button type="button" className="orbit-mobile-brand" aria-label="Orbit Trainer home" onClick={() => go('/')}><Brand ringOnly /><span>Orbit Trainer</span></button>
      <span className="orbit-crumb">{page}</span>
      <button type="button" className="orbit-icon-button orbit-mobile-search" ref={mobileSearchButton} onClick={() => mobileSearch ? setMobileSearch(false) : showSearch()}
        aria-label={mobileSearch ? 'Close search' : 'Open search'} aria-expanded={mobileSearch} aria-controls="orbit-search"><Icon name={mobileSearch ? 'close' : 'search'} size={18} /></button>
      <div className="gb-search" id="orbit-search" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setSearchOpen(false) }}>
        <Icon name="search" size={17} />
        <input ref={input} value={query} onChange={(event) => { setQuery(event.target.value); setActive(-1); setSearchOpen(true) }}
          onFocus={() => setSearchOpen(true)} onKeyDown={searchKey} placeholder="Search clients, programs, pages" aria-label="Search clients, programs and pages"
          role="combobox" autoComplete="off" aria-expanded={showsResults} aria-controls="orbit-search-results"
          aria-activedescendant={showsResults && results[active] ? 'orbit-search-result-' + active : undefined} />
        <kbd>⌘ K</kbd>
        <div id="orbit-search-results" role="listbox" aria-label="Search results" className="gb-results" hidden={!showsResults}>
          {results.map(({ path, name, kind }, index) => (
            <button type="button" key={path} id={'orbit-search-result-' + index} role="option" aria-selected={active === index}
              tabIndex={-1} onMouseDown={(event) => event.preventDefault()} onClick={() => go(path)}>
              <span>{name}</span><span className="muted">{kind}</span>
            </button>
          ))}
          {!results.length && showsResults && <p className="gb-empty" role="status">No results for “{query.trim()}”.</p>}
        </div>
      </div>
      <details className="orbit-toolbar-menu orbit-create-menu" ref={actionMenu}>
        <summary className="orbit-icon-button" aria-label="Create"><Icon name="plus" size={21} /></summary>
        <div className="orbit-toolbar-panel">
          <button type="button" onClick={() => create(() => openModal(<ClientForm />))}>Add client</button>
          <button type="button" onClick={() => create(() => openModal(db.clients.length ? <SessionForm /> : <ClientForm />))}>Book session</button>
          <button type="button" onClick={() => create(() => go('/workouts'))}>Open workout library</button>
        </div>
      </details>
      <details className="orbit-toolbar-menu" ref={appearanceMenu}>
        <summary className="orbit-icon-button" aria-label="Appearance"><Icon name={appearance.effectiveTheme === 'dark' ? 'sun' : 'moon'} size={18} /></summary>
        <div className="orbit-toolbar-panel orbit-appearance-panel">
          <strong>Appearance</strong>
          <div className="orbit-scheme" role="group" aria-label="Theme">
            {[['light', 'Light'], ['dark', 'Dark'], ['system', 'Match system']].map(([theme, label]) => (
              <button key={theme} type="button" aria-pressed={appearance.theme === theme} onClick={() => appearance.updateAppearance({ theme })}>{label}</button>
            ))}
          </div>
          <label htmlFor="orbit-frost">Frost <span>{appearance.frost}%</span></label>
          <input type="range" id="orbit-frost" min="0" max="100" value={appearance.frost} onChange={(event) => appearance.updateAppearance({ frost: Number(event.target.value) })} />
        </div>
      </details>
      <OrbitNotifications key={user?.id ?? 'local'} scope={user?.id ?? 'local'} notices={notices}
        open={bellOpen} onToggle={() => setBellOpen(!bellOpen)} onClose={() => setBellOpen(false)}
        onOpen={(path) => { setBellOpen(false); go(path) }} />
      <button type="button" className="gb-avatar" onClick={() => nav('/settings')} aria-label="Your settings">
        {initials(db.settings?.trainerName || 'Coach')}
      </button>
    </header>
  )
}
