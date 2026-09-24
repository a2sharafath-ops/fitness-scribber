import { useEffect } from 'react'
import { Link, Outlet, useLocation, useParams } from 'react-router-dom'
import Avatar from '../atoms/Avatar'
import ClientSubnav from './ClientSubnav'
import { useData } from '../../store/DataContext'

export default function ClientLayout() {
  const { id } = useParams()
  const { pathname, hash } = useLocation()
  const { db, saveStatus } = useData()
  const client = db.clients.find((item) => item.id === id)

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const target = hash && document.getElementById(hash.slice(1))
      if (target) target.scrollIntoView()
      else window.scrollTo(0, 0)
    })
    return () => cancelAnimationFrame(frame)
  }, [pathname, hash])

  if (!client) {
    return <div className="empty" style={{ padding: 40 }}>
      <div className="big">Client unavailable</div>
      <p>This client may have been removed.</p>
      <Link to="/clients">Back to clients</Link>
    </div>
  }

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
        <div className="client-workspace-actions">
          <Link className="btn ghost" to={`/messages?clientId=${encodeURIComponent(client.id)}`}>Message</Link>
          <Link className="btn ghost" to={`/report/${client.id}`}>Report</Link>
        </div>
      </header>
      {saveStatus !== 'idle' && <div className={'client-save-status ' + saveStatus} role={saveStatus === 'failed' ? 'alert' : 'status'}>
        {saveStatus === 'saving' ? 'Saving changes…' : saveStatus === 'saved' ? 'Changes saved' : 'Changes may not have saved. Review the data warning before continuing.'}
      </div>}
      <ClientSubnav client={client} />
      <Outlet />
    </div>
  )
}
