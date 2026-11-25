import { Link, NavLink } from 'react-router-dom'
import { useData } from '../../store/DataContext'
import { useConversations } from '../../hooks/useConversations'
import { openConcerns } from '../../lib/calc'
import { fmtDay } from '../../lib/dates'
import { workoutReviewPath } from '../../lib/schedule'
import { initials } from '../../lib/format'
import Brand from '../atoms/Brand'
import Icon from '../atoms/Icon'

const GROUPS = [
  [
    ['/', 'dashboard', 'Dashboard'],
    ['/schedule', 'calendar', 'Schedule'],
    ['/session-setup', 'new-session', 'Session setup'],
  ],
  [
    ['/clients', 'studio-client', 'Clients'],
    ['/workouts', 'dumbbell', 'Workouts'],
    ['/progress', 'chart', 'Progress'],
  ],
  [
    ['/messages', 'message', 'Messages'],
    ['/concerns', 'alert', 'Concerns'],
  ],
]

const navClass = ({ isActive }) => 'nav-item' + (isActive ? ' active' : '')

export default function Sidebar({ collapsed, mobile, onCollapse, onNavigate }) {
  const { db } = useData()
  const { totalUnread } = useConversations()
  const counts = { '/messages': [totalUnread, 'unread'], '/concerns': [openConcerns(db).length, 'open'] }
  const trainer = db.settings?.trainerName?.trim() || 'Trainer'
  const clients = new Map(db.clients.map(client => [client.id, client.name]))
  const recent = collapsed ? [] : (db.workouts || [])
    .filter(workout => workout.status === 'completed' && workout.id && workout.date && clients.has(workout.clientId))
    .sort((a, b) => b.date.localeCompare(a.date) || String(b.completedAt || '').localeCompare(String(a.completedAt || '')))
    .slice(0, 3)

  return (
    <nav id={mobile ? undefined : 'sidebar'} className="orbit-sidebar" aria-label="Main navigation">
      <div className="orbit-sidebar-head">
        <Link className="orbit-sidebar-home" to="/" onClick={onNavigate} aria-label="Orbit Trainer home">
          <Brand ringOnly={collapsed} trainerLockup />
        </Link>
        <button type="button" className="orbit-icon-button orbit-sidebar-toggle"
          onClick={mobile ? onNavigate : onCollapse}
          aria-expanded={mobile ? undefined : !collapsed} aria-label={mobile ? 'Close navigation' : collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          <Icon name={mobile ? 'close' : 'sidebar'} size={18} />
        </button>
      </div>

      <div className="orbit-sidebar-scroll">
        {GROUPS.map(group => (
          <div className="orbit-sidebar-group" key={group[0][0]}>
            {group.map(([to, icon, label]) => {
              const [count, status] = counts[to] ?? []
              const name = count > 0 ? `${label}, ${count} ${status}` : label
              return <NavLink key={to} to={to} end={to === '/'} className={navClass}
                aria-label={name} title={collapsed ? name : undefined} onClick={onNavigate}>
                <span className="ic" aria-hidden="true"><Icon name={icon} /></span>
                <span className="orbit-nav-label">{label}</span>
                {count > 0 && <span className="nav-badge show" aria-hidden="true">{count}</span>}
              </NavLink>
            })}
          </div>
        ))}
        {recent.length > 0 && <details className="orbit-sidebar-recent">
          <summary className="nav-item">
            Recent sessions
            <Icon name="chevron-down" size={16} />
          </summary>
          <div className="orbit-sidebar-recent-list">
            {recent.map(workout => <Link key={workout.id} to={workoutReviewPath(workout)} onClick={onNavigate}>
              <strong>{workout.title || 'Workout'}</strong>
              <small>{[clients.get(workout.clientId), fmtDay(workout.date)].filter(Boolean).join(' · ')}</small>
            </Link>)}
          </div>
        </details>}
      </div>

      <div className="orbit-sidebar-footer">
        <NavLink to="/settings" className={state => `orbit-sidebar-account ${navClass(state)}`}
          aria-label={collapsed ? 'Settings' : `${trainer}, Settings`} title={collapsed ? 'Settings' : undefined} onClick={onNavigate}>
          {!collapsed && <>
            <span className="orbit-sidebar-avatar" aria-hidden="true">{initials(trainer)}</span>
            <span className="orbit-sidebar-account-label"><strong>{trainer}</strong><small>Settings</small></span>
          </>}
          <span className="ic" aria-hidden="true"><Icon name="settings" size={18} /></span>
        </NavLink>
      </div>
    </nav>
  )
}
