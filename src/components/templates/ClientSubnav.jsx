import { NavLink, useLocation } from 'react-router-dom'

const sections = (id) => [
  { to: `/clients/${id}`, label: 'Overview', end: true },
  { to: `/clients/${id}/training`, label: 'Training' },
  { to: `/clients/${id}/progress`, label: 'Progress' },
  { to: `/clients/${id}/check-ins`, label: 'Check-ins' },
  { to: `/clients/${id}/assessments`, label: 'Assessments' },
  { to: `/clients/${id}/profile`, label: 'Profile' },
]

export default function ClientSubnav({ client }) {
  const { pathname } = useLocation()
  const metricDetail = pathname.startsWith(`/clients/${client.id}/metric/`)
  const metricSection = metricDetail && pathname.endsWith('/srpetl') ? 'Progress' : 'Check-ins'
  return (
    <div className="client-subnav">
      <nav className="crumb" aria-label="Breadcrumb">
        <NavLink to="/clients" end className="crumb-link">Clients</NavLink>
        <span className="crumb-sep" aria-hidden="true">›</span>
        <span className="crumb-cur">{client.name}</span>
      </nav>
      <nav className="tabs client-tabs" aria-label="Client sections">
        {sections(client.id).map(({ to, label, end }) => (
          <NavLink key={to} to={to} end={end}
            aria-current={metricDetail && label === metricSection ? 'page' : undefined}
            className={({ isActive }) => 'tab' + (isActive || (metricDetail && label === metricSection) ? ' active' : '')}>
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
