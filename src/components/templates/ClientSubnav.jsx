import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import Icon from '../atoms/Icon'

const sections = (id) => [
  { to: `/clients/${id}`, label: 'Overview', end: true },
  { to: `/clients/${id}/training`, label: 'Training' },
  { to: `/clients/${id}/progress`, label: 'Progress' },
  { to: `/clients/${id}/check-ins`, label: 'Check-ins' },
  { to: `/clients/${id}/assessments`, label: 'Assessments' },
  { to: `/clients/${id}/profile`, label: 'Profile' },
]

export function ClientSectionPicker({ client, messagePath, reportPath }) {
  const { pathname, search, hash } = useLocation()
  const navigate = useNavigate()
  const options = sections(client.id)
  const current = options.find(({ to, end }) => pathname === to || (!end && pathname.startsWith(to + '/')))
  const sectionLabel = current?.label ?? (pathname.endsWith('/srpetl') ? 'Progress' : 'Check-ins')
  const onSectionRoot = current?.to === pathname && !search && !hash

  return <span className="orbit-select-wrap client-section-picker">
    <select aria-label="Client sections and actions" value={onSectionRoot ? current.to : ''}
      onChange={event => navigate(event.target.value)}>
      {!onSectionRoot && <option value="" disabled hidden>{sectionLabel}</option>}
      <optgroup label="Client sections">
        {options.map(({ to, label }) => <option key={to} value={to}>{label}</option>)}
      </optgroup>
      <optgroup label="Client actions">
        <option value={messagePath}>Message</option>
        <option value={reportPath}>Report</option>
        <option value="/clients">All clients</option>
      </optgroup>
    </select>
    <Icon name="chevron-down" size={16} aria-hidden="true" />
  </span>
}

export default function ClientSubnav({ client }) {
  const { pathname } = useLocation()
  const metricDetail = pathname.startsWith(`/clients/${client.id}/metric/`)
  const metricSection = metricDetail && pathname.endsWith('/srpetl') ? 'Progress' : 'Check-ins'
  return (
    <div className="client-subnav">
      <nav className="crumb" aria-label="Breadcrumb">
        <NavLink to="/clients" end className="crumb-link">← All clients</NavLink>
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
