import { NavLink } from 'react-router-dom'
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

export default function Sidebar() {
  const { db } = useData()
  const { totalUnread } = useConversations()
  const openCount = openConcerns(db).length
  return (
    <nav id="sidebar" aria-label="Main navigation">
      <Brand />
      {ITEMS.map(([to, ic, label, end]) => (
        <NavLink key={to} to={to} end={end} className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')} aria-label={label}>
          <span className="ic" aria-hidden="true"><Icon name={ic} /></span>
          <span>{label}</span>
          {to === '/concerns' && <span className={'nav-badge' + (openCount > 0 ? ' show' : '')}>{openCount}</span>}
          {to === '/messages' && <span className={'nav-badge' + (totalUnread > 0 ? ' show' : '')}>{totalUnread}</span>}
        </NavLink>
      ))}
      <div className="nav-spacer" />
      <NavLink to="/settings" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')} aria-label="Settings">
        <span className="ic" aria-hidden="true"><Icon name="settings" /></span>
        <span>Settings</span>
      </NavLink>
      <div className="sb-foot">Fitness Partner v2.0<br />{hasBackend ? 'Synced to your account' : 'All data saved locally'}</div>
    </nav>
  )
}
