import { useNavigate } from 'react-router-dom'
import Avatar from '../components/atoms/Avatar'
import Button from '../components/atoms/Button'
import Tag from '../components/atoms/Tag'
import { ClientForm } from '../components/organisms/forms/ClientForms'
import { useData } from '../store/DataContext'
import { useModal } from '../store/ModalContext'
import { fmtDate } from '../lib/dates'

const LEVEL = { Beginner: 'blue', Intermediate: 'purple', Advanced: 'orange' }

export default function ClientsPage() {
  const { db } = useData()
  const { openModal } = useModal()
  const nav = useNavigate()
  const active = db.clients.filter((c) => c.status === 'Active').length
  return (
    <>
      <div className="topbar">
        <div><h1>Clients</h1><div className="sub">{db.clients.length} total · {active} active</div></div>
        <Button onClick={() => openModal(<ClientForm />)}>＋ Add Client</Button>
      </div>
      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead><tr><th>Client</th><th>Goal</th><th>Level</th><th>Plan</th><th>Status</th><th>Joined</th></tr></thead>
          <tbody>
            {db.clients.map((c) => (
              <tr key={c.id} className="clickable" tabIndex={0} role="button" aria-label={`Open ${c.name}`}
                onClick={() => nav('/clients/' + c.id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); nav('/clients/' + c.id) } }}>
                <td><div className="cell-user"><Avatar name={c.name} /><div><strong>{c.name}</strong><div className="muted" style={{ fontSize: 12 }}>{c.email}</div></div></div></td>
                <td>{c.goal}</td>
                <td><Tag color={LEVEL[c.level]}>{c.level}</Tag></td>
                <td><Tag color={c.plan === 'Premium' ? 'purple' : 'gray'}>{c.plan}</Tag></td>
                <td><Tag color={c.status === 'Active' ? 'green' : 'gray'}>{c.status}</Tag></td>
                <td className="muted">{fmtDate(c.joined)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
