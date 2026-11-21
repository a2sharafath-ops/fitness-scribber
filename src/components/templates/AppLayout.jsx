import { useEffect, useRef, useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../organisms/Sidebar'
import GlobalBar from '../organisms/GlobalBar'
import SchemaWarning from '../organisms/SchemaWarning'
import { isLocalBuilderQA } from '../../lib/supabase'
import useOrbitAppearance from '../../hooks/useOrbitAppearance'
import './OrbitShell.css'

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const mobileNav = useRef(null)
  const menuTrigger = useRef(null)
  const appearance = useOrbitAppearance()
  useEffect(() => {
    const desktop = window.matchMedia?.('(min-width: 701px)')
    if (!desktop) return undefined
    const close = (event) => { if (event.matches) mobileNav.current?.close() }
    desktop.addEventListener('change', close)
    return () => desktop.removeEventListener('change', close)
  }, [])

  return (
    <div id="app" className="orbit-shell" data-sidebar-collapsed={collapsed}>
      <a href="#main" className="skip-link">Skip to content</a>
      <Sidebar collapsed={collapsed} onCollapse={() => setCollapsed(!collapsed)} />
      <dialog ref={mobileNav} id="orbit-mobile-navigation" className="orbit-drawer" aria-label="Main navigation"
        onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.close() }}
        onClose={() => menuTrigger.current?.focus()}>
        <Sidebar mobile onNavigate={() => mobileNav.current?.close()} />
      </dialog>
      <main id="main" tabIndex={-1}>
        <GlobalBar menuTrigger={menuTrigger} onOpenNavigation={() => mobileNav.current?.showModal()} appearance={appearance} />
        {isLocalBuilderQA && <p className="muted" role="status">Local testing · changes saved on this device</p>}
        <SchemaWarning />
        <Outlet context={appearance.effectiveTheme} />
      </main>
    </div>
  )
}
