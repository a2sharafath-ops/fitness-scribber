import { NavLink } from 'react-router-dom'

// Shared breadcrumb + tab bar for every per-client screen, so the five client
// views (Overview, Profile, Assessments, Load & Strength, Monitoring) read as
// one record instead of scattered pages. Presentational — routing only.
const tabsFor = (id) => [
  { to: `/clients/${id}`, label: 'Overview', end: true },
  { to: `/clients/${id}/profile`, label: 'Profile' },
  { to: `/clients/${id}/assessments`, label: 'Assessments' },
  { to: `/command/${id}`, label: 'Load & Strength' },
  { to: `/monitor/${id}`, label: 'Monitoring' },
]

export default function ClientSubnav({ client }) {
  return (
    <div className="client-subnav">
      <nav className="crumb" aria-label="Breadcrumb">
        <NavLink to="/clients" className="crumb-link">Clients</NavLink>
        <span className="crumb-sep" aria-hidden="true">›</span>
        <span className="crumb-cur">{client.name}</span>
      </nav>
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
