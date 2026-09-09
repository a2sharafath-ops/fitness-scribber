import { NavLink } from 'react-router-dom'
import { poolingConfig } from '../../lib/pooling/config'

// Coach-facing sections use familiar task names. Specialist analysis routes
// remain reachable from Details and Progress without crowding primary navigation.
const tabsFor = (id) => [
  { to: `/clients/${id}`, label: 'Summary', end: true },
  { to: `/clients/${id}/profile`, label: 'Details' },
  { to: `/clients/${id}/assessments`, label: 'Assessments' },
  ...(poolingConfig().r1 ? [{ to: `/clients/${id}/pool`, label: 'Workouts' }] : []),
  { to: `/monitor/${id}`, label: 'Progress' },
]

export default function ClientSubnav({ client, tabsOnly = false }) {
  return (
    <div className="client-subnav">
      {!tabsOnly && <nav className="crumb" aria-label="Breadcrumb">
        <NavLink to="/clients" className="crumb-link">Clients</NavLink>
        <span className="crumb-sep" aria-hidden="true">›</span>
        <span className="crumb-cur">{client.name}</span>
      </nav>}
      <div className="tabs client-tabs" role="tablist" aria-label="Client sections">
        {tabsFor(client.id).map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end} role="tab"
            className={({ isActive }) => 'tab' + (isActive ? ' active' : '')}>
            {t.label}
          </NavLink>
        ))}
      </div>
    </div>
  )
}
