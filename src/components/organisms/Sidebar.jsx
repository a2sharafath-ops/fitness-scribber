import { Link, NavLink } from 'react-router-dom'
import { useData } from '../../store/DataContext'
import { useConversations } from '../../hooks/useConversations'
import { openConcerns } from '../../lib/calc'
import { hasBackend } from '../../lib/supabase'
import Brand from '../atoms/Brand'
import Icon from '../atoms/Icon'

const ITEMS = [
  ['/', 'dashboard', 'Dashboard', true],
  ['/clients', 'users', 'Clients'],
  ['/workouts', 'dumbbell', 'Workouts'],
  ['/schedule', 'calendar', 'Schedule'],
  ['/progress', 'chart', 'Progress'],
  ['/messages', 'message', 'Messages'],
  ['/concerns', 'alert', 'Concerns'],
]

export default function Sidebar({ collapsed, mobile, onCollapse, onNavigate }) {
  const { db } = useData()
  const { totalUnread } = useConversations()
  const openCount = openConcerns(db).length
  return (
    <nav id={mobile ? undefined : 'sidebar'} className="orbit-sidebar" aria-label="Main navigation">
      <div className="orbit-sidebar-head">
        <Link className="orbit-sidebar-home" to="/" onClick={onNavigate}><Brand workspace ringOnly={collapsed} /></Link>
        <button type="button" className="orbit-icon-button orbit-sidebar-toggle"
          onClick={mobile ? onNavigate : onCollapse}
          aria-label={mobile ? 'Close navigation' : collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          <Icon name={mobile ? 'close' : 'sidebar'} size={18} />
        </button>
      </div>
      {ITEMS.map(([to, ic, label, end]) => (
        <NavLink key={to} to={to} end={end} className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')} aria-label={label} title={collapsed ? label : undefined} onClick={onNavigate}>
          <span className="ic" aria-hidden="true"><Icon name={ic} /></span>
          <span className="orbit-nav-label">{label}</span>
          {to === '/concerns' && <span className={'nav-badge' + (openCount > 0 ? ' show' : '')}>{openCount}</span>}
          {to === '/messages' && <span className={'nav-badge' + (totalUnread > 0 ? ' show' : '')}>{totalUnread}</span>}
        </NavLink>
      ))}
      <div className="nav-spacer" />
      <NavLink to="/settings" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')} aria-label="Settings" title={collapsed ? "Settings" : undefined} onClick={onNavigate}>
        <span className="ic" aria-hidden="true"><Icon name="settings" /></span>
        <span className="orbit-nav-label">Settings</span>
      </NavLink>
      <div className="sb-foot">{hasBackend ? 'Synced to your account' : 'All data saved locally'}</div>
    </nav>
  )
}
