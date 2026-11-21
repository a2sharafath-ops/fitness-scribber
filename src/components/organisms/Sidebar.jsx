import { Link, NavLink } from 'react-router-dom'
import { useData } from '../../store/DataContext'
import { useConversations } from '../../hooks/useConversations'
import { openConcerns } from '../../lib/calc'
import { hasBackend } from '../../lib/supabase'
import { dashboardWeeks } from '../../lib/dashboard'
import { todayISO } from '../../lib/dates'
import { weekOf } from '../../lib/schedule'
import { initials } from '../../lib/format'
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
  const { db, tz } = useData()
  const { totalUnread } = useConversations()
  const openCount = openConcerns(db).length
  const [week] = dashboardWeeks(db.sessions, weekOf(todayISO(tz)), 1)
  const trainer = db.settings?.trainerName?.trim() || 'Trainer'
  return (
    <nav id={mobile ? undefined : 'sidebar'} className="orbit-sidebar" aria-label="Main navigation">
      <div className="orbit-sidebar-head">
        <Link className="orbit-sidebar-home" to="/" onClick={onNavigate}><Brand workspace ringOnly={collapsed} /></Link>
        <button type="button" className="orbit-icon-button orbit-sidebar-toggle"
          onClick={mobile ? onNavigate : onCollapse}
          aria-expanded={mobile ? undefined : !collapsed} aria-label={mobile ? 'Close navigation' : collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
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
      {!collapsed && <div className="orbit-sidebar-context">
        <section className="orbit-sidebar-week" aria-label="This week’s sessions">
          <span>This week</span>
          <p><strong>{week.completed}</strong> / {week.booked} booked</p>
          <progress value={week.completed} max={Math.max(1, week.booked)} aria-label="Completed bookings this week" aria-valuetext={`${week.completed} of ${week.booked} booked sessions completed`} />
        </section>
        <Link className="orbit-sidebar-profile" to="/settings" onClick={onNavigate} aria-label={`${trainer}, settings`}>
          <span aria-hidden="true">{initials(trainer)}</span><strong>{trainer}</strong><Icon name="chevron-right" size={15} />
        </Link>
      </div>}
      <div className="sb-foot">{hasBackend ? 'Synced to your account' : 'All data saved locally'}</div>
    </nav>
  )
}
