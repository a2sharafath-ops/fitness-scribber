import { useEffect } from 'react'
import { Link, Outlet, useLocation, useOutletContext, useParams } from 'react-router-dom'
import Avatar from '../atoms/Avatar'
import ClientSubnav, { ClientSectionPicker } from './ClientSubnav'
import { useData } from '../../store/DataContext'

export default function ClientLayout() {
  const theme = useOutletContext()
  const { id } = useParams()
  const { pathname, hash } = useLocation()
  const { db, saveStatus } = useData()
  const client = db.clients.find((item) => item.id === id)

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const target = hash && hash !== '#workout-log' && document.getElementById(hash.slice(1))
      if (target) target.scrollIntoView()
      else window.scrollTo(0, 0)
    })
    return () => cancelAnimationFrame(frame)
  }, [pathname, hash])

  if (!client) {
    return <div className="empty" style={{ padding: 40 }}>
      <div className="big">Client unavailable</div>
      <p>Client unavailable.</p>
      <Link to="/clients">Back to clients</Link>
    </div>
  }

  const messagePath = `/messages?clientId=${encodeURIComponent(client.id)}`
  const reportPath = `/report/${client.id}`
  return (
    <div className="client-workspace" key={client.id}>
      <header className="client-workspace-header">
        <div className="client-workspace-identity">
          <Avatar name={client.name} size={44} />
          <div>
            <div className="client-workspace-name">{client.name}</div>
            <div className="sub">{client.goal || 'No goal recorded'}</div>
          </div>
        </div>
        <ClientSectionPicker client={client} messagePath={messagePath} reportPath={reportPath} />
        <div className="client-workspace-actions">
          <Link className="btn ghost" to={messagePath}>Message</Link>
          <Link className="btn ghost" to={reportPath}>Report</Link>
        </div>
      </header>
      {saveStatus !== 'idle' && <div className={'client-save-status ' + saveStatus} role={saveStatus === 'failed' ? 'alert' : 'status'}>
        {saveStatus === 'saving' ? 'Saving changes…' : saveStatus === 'saved' ? 'Changes saved' : 'Some changes may be unsaved. Review the data warning before continuing.'}
      </div>}
      <ClientSubnav client={client} />
      <Outlet context={theme} />
    </div>
  )
}
