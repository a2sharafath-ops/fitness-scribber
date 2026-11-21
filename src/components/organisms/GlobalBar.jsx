import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Icon from '../atoms/Icon'
import Brand from '../atoms/Brand'
import { useAuth } from '../../store/AuthContext'
import OrbitNotifications from './OrbitNotifications'
import { useData } from '../../store/DataContext'
import { useModal } from '../../store/ModalContext'
import { useConversations } from '../../hooks/useConversations'
import { openConcerns } from '../../lib/calc'
import { WORKSPACE_PAGES, workspaceSearch } from '../../lib/workspaceSearch'
import SessionForm from './forms/SessionForm'
import { ClientForm } from './forms/ClientForms'

export default function GlobalBar({ menuTrigger, onOpenNavigation, appearance }) {
  const { db, units } = useData()
  const { user } = useAuth()
  const { openModal, modalOpen } = useModal()
  const { byClient, messages } = useConversations()
  const nav = useNavigate()
  const { pathname } = useLocation()
  const toolbar = useRef(null)
  const input = useRef(null)
  const command = useRef(null)
  const searchTrigger = useRef(null)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [panel, setPanel] = useState(null)
  const [exiting, setExiting] = useState(null)
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
  const results = useMemo(() => workspaceSearch(db, messages, query, units), [db, messages, query, units])
  const page = pathname.startsWith('/clients/') ? 'Client workspace' : WORKSPACE_PAGES.find(([path]) => path === pathname)?.[1] || 'Trainer workspace'

  const showSearch = useCallback(() => {
    if (modalOpen || document.querySelector('.orbit-drawer[open]')) return
    setPanel(null)
    setExiting(null)
    if (!command.current.open) command.current.showModal()
    input.current.focus()
  }, [modalOpen])
  const closePanel = useCallback((restore = false, animate = true) => {
    const box = toolbar.current?.querySelector('[data-panel="' + panel + '"]')
    if (restore) box?.querySelector('summary, .gb-bell')?.focus()
    setExiting(animate && window.matchMedia?.('(prefers-reduced-motion: no-preference)')?.matches ? panel : null)
    setPanel(null)
  }, [panel])
  useEffect(() => {
    if (!exiting) return
    const timer = setTimeout(() => setExiting(null), 120)
    return () => clearTimeout(timer)
  }, [exiting])
  useEffect(() => {
    const shortcut = (event) => {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) { event.preventDefault(); showSearch() }
      if (event.key === 'Escape' && panel) { event.preventDefault(); closePanel(true) }
    }
    const outside = (event) => {
      const target = event.target.closest('.orbit-toolbar [data-panel]')
      if (panel && (!toolbar.current?.contains(event.target) || target && target.dataset.panel !== panel)) closePanel(false, !target)
    }
    window.addEventListener('keydown', shortcut)
    document.addEventListener('pointerdown', outside)
    return () => { window.removeEventListener('keydown', shortcut); document.removeEventListener('pointerdown', outside) }
  }, [panel, closePanel, showSearch])
  const closeSearch = () => {
    if (!command.current?.open) return
    command.current.close()
    setQuery('')
    setActive(0)
    searchTrigger.current?.focus()
  }
  const go = (path) => { closeSearch(); setPanel(null); setExiting(null); nav(path) }
  const searchKey = (event) => {
    if (!results.length) return
    const last = results.length - 1
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault()
      const offset = { ArrowDown: (active + 1) % results.length, ArrowUp: (active + last) % results.length, Home: 0, End: last }[event.key]
      setActive(offset)
      document.getElementById('orbit-search-result-' + offset)?.scrollIntoView({ block: 'nearest' })
    }
    if (event.key === 'Enter') { event.preventDefault(); go((results[active] || results[0]).path) }
  }
  const togglePanel = (name) => {
    if (panel === name) closePanel()
    else { setExiting(null); setPanel(name) }
  }
  const create = (action) => { closePanel(true, false); action() }

  return (
    <header ref={toolbar} className="global-bar orbit-toolbar">
      <button type="button" className="orbit-icon-button orbit-mobile-menu" ref={menuTrigger} onClick={() => { closePanel(false, false); onOpenNavigation() }} aria-label="Open navigation" aria-haspopup="dialog" aria-controls="orbit-mobile-navigation"><Icon name="menu" size={19} /></button>
      <button type="button" className="orbit-mobile-brand" aria-label="Orbit Trainer home" onClick={() => go('/')}><Brand ringOnly /><span>Orbit Trainer</span></button>
      <span className="orbit-crumb">{page}</span>
      <button ref={searchTrigger} type="button" className="orbit-search-trigger" onClick={showSearch} aria-label="Search workspace" aria-haspopup="dialog">
        <Icon name="search" size={17} /><span>Search clients, workouts, pages</span><kbd>⌘ K</kbd>
      </button>
      <dialog ref={command} className="orbit-command" aria-labelledby="orbit-command-title"
        onCancel={event => { event.preventDefault(); closeSearch() }}
        onClick={event => { if (event.target === event.currentTarget) closeSearch() }}>
        <div className="orbit-command-content">
          <div className="orbit-command-header"><h2 id="orbit-command-title">Search workspace</h2><button className="orbit-icon-button" type="button" onClick={closeSearch} aria-label="Close search"><Icon name="close" size={17} /></button></div>
          <div className="orbit-command-input"><Icon name="search" size={17} /><input ref={input} value={query} onChange={(event) => { setQuery(event.target.value); setActive(0) }}
            onKeyDown={searchKey} placeholder="Search clients, exercises, sessions and more" aria-label="Search workspace"
            role="combobox" autoComplete="off" aria-expanded="true" aria-controls="orbit-search-results"
            aria-activedescendant={results[active] ? 'orbit-search-result-' + active : undefined} /></div>
          <div id="orbit-search-results" role="listbox" aria-label="Search results" className="orbit-command-results">
            {results.map(({ key, path, name, kind, description }, index) => (
              <button type="button" key={kind + key} id={'orbit-search-result-' + index} role="option" aria-selected={active === index}
                tabIndex={-1} onPointerMove={event => { if (event.pointerType === 'mouse') setActive(index) }} onMouseDown={event => event.preventDefault()} onClick={() => go(path)}>
                <span><strong>{name}</strong>{description && <small>{description}</small>}</span><small>{kind}</small>
              </button>
            ))}
            {!results.length && <p className="gb-empty" role="status">No results for “{query.trim()}”.</p>}
          </div>
        </div>
      </dialog>
      <details className="orbit-toolbar-menu orbit-create-menu" data-panel="create" data-exiting={exiting === 'create' || undefined} open={panel === 'create' || exiting === 'create'}>
        <summary className="orbit-icon-button" aria-label="Create" aria-expanded={panel === 'create'} onClick={event => { event.preventDefault(); togglePanel('create') }}><Icon name="plus" size={18} /><span>Create</span></summary>
        <div className="orbit-toolbar-panel" inert={exiting === 'create'}>
          <button type="button" onClick={() => create(() => openModal(<ClientForm />))}>Add client</button>
          <button type="button" onClick={() => create(() => openModal(db.clients.length ? <SessionForm /> : <ClientForm />))}>Book session</button>
          <button type="button" onClick={() => create(() => go('/workouts'))}>Open workout library</button>
        </div>
      </details>
      <details className="orbit-toolbar-menu" data-panel="appearance" data-exiting={exiting === 'appearance' || undefined} open={panel === 'appearance' || exiting === 'appearance'}>
        <summary className="orbit-icon-button" aria-label="Appearance" aria-expanded={panel === 'appearance'} onClick={event => { event.preventDefault(); togglePanel('appearance') }}><Icon name={appearance.effectiveTheme === 'dark' ? 'sun' : 'moon'} size={18} /></summary>
        <div className="orbit-toolbar-panel orbit-appearance-panel" inert={exiting === 'appearance'}>
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
        open={panel === 'notifications'} exiting={exiting === 'notifications'} onToggle={() => togglePanel('notifications')}
        onOpen={go} />
    </header>
  )
}
