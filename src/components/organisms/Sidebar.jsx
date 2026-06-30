import { NavLink } from 'react-router-dom'
import { useData } from '../../store/DataContext'
import { openConcerns } from '../../lib/calc'

const ITEMS = [
  ['/', '📊', 'Dashboard', true],
  ['/clients', '👥', 'Clients'],
  ['/workouts', '🏋️', 'Workouts'],
  ['/schedule', '📅', 'Schedule'],
  ['/progress', '📈', 'Progress'],
  ['/concerns', '🚩', 'Concerns'],
]

export default function Sidebar() {
  const { db } = useData()
  const openCount = openConcerns(db).length
  return (
    <nav id="sidebar" aria-label="Main navigation">
      <div className="brand">
        <span className="logo" aria-hidden="true">💪</span>
        <span>FitScribe</span>
      </div>
      {ITEMS.map(([to, ic, label, end]) => (
        <NavLink key={to} to={to} end={end} className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')} aria-label={label}>
          <span className="ic" aria-hidden="true">{ic}</span>
          <span>{label}</span>
          {to === '/concerns' && <span className={'nav-badge' + (openCount > 0 ? ' show' : '')}>{openCount}</span>}
        </NavLink>
      ))}
      <div className="nav-spacer" />
      <NavLink to="/settings" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')} aria-label="Settings">
        <span className="ic" aria-hidden="true">⚙️</span>
        <span>Settings</span>
      </NavLink>
      <div className="sb-foot">FitScribe v2.0<br />All data saved locally</div>
    </nav>
  )
}
