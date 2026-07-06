import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Avatar from '../components/atoms/Avatar'
import Button from '../components/atoms/Button'
import Tag from '../components/atoms/Tag'
import Icon from '../components/atoms/Icon'
import { ClientForm } from '../components/organisms/forms/ClientForms'
import { useData } from '../store/DataContext'
import { useModal } from '../store/ModalContext'
import { fmtDate } from '../lib/dates'

const LEVEL = { Beginner: 'blue', Intermediate: 'purple', Advanced: 'orange' }

export default function ClientsPage() {
  const { db } = useData()
  const { openModal } = useModal()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')

  const active = db.clients.filter((c) => c.status === 'Active').length
  const term = q.trim().toLowerCase()
  const filtered = db.clients.filter((c) =>
    (status === 'all' || c.status === status) &&
    (!term || [c.name, c.email, c.goal].some((v) => String(v || '').toLowerCase().includes(term))),
  )

  return (
    <>
      <div className="topbar">
        <div><h1>Clients</h1><div className="sub">{db.clients.length} total · {active} active</div></div>
        <Button onClick={() => openModal(<ClientForm />)}>＋ Add Client</Button>
      </div>

      <div className="flex gap" style={{ marginBottom: 14, flexWrap: 'wrap' }}>
        <div className="search-field">
          <span className="search-ic" aria-hidden="true"><Icon name="search" size={16} /></span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email or goal…"
            aria-label="Search clients" />
          {q && <button className="search-clear" aria-label="Clear search" onClick={() => setQ('')}>×</button>}
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status" style={{ width: 'auto' }}>
          <option value="all">All statuses</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {filtered.length ? (
          <table>
            <thead><tr><th>Client</th><th>Goal</th><th>Level</th><th>Plan</th><th>Status</th><th>Joined</th></tr></thead>
            <tbody>
              {filtered.map((c) => (
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
        ) : (
          <div className="empty" style={{ padding: 40 }}>
            <div className="big">🔍</div>
            {db.clients.length ? 'No clients match your search.' : 'No clients yet — add your first client.'}
          </div>
        )}
      </div>
    </>
  )
}
