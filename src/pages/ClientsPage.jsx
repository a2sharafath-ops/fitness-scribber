import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Avatar from '../components/atoms/Avatar'
import Button from '../components/atoms/Button'
import Icon from '../components/atoms/Icon'
import SegToggle from '../components/molecules/SegToggle'
import { ClientForm } from '../components/organisms/forms/ClientForms'
import { useData } from '../store/DataContext'
import { useModal } from '../store/ModalContext'
import { todayISO } from '../lib/dates'
import { readinessFor, openConcerns } from '../lib/calc'

const daysAgo = (iso, today) => Math.round((Date.parse(today) - Date.parse(iso)) / 86400000)
const barColor = (a) => (a >= 80 ? 'var(--chart-green)' : a >= 50 ? 'var(--chart-yellow)' : '#ff9500')

export default function ClientsPage() {
  const { db, tz } = useData()
  const { openModal } = useModal()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [tab, setTab] = useState('all')
  const today = todayISO(tz)

  const adherence = (id) => {
    const past = db.sessions.filter((s) => s.clientId === id && s.date <= today && s.status !== 'Cancelled')
    return past.length ? Math.round((past.filter((s) => s.status === 'Completed').length / past.length) * 100) : null
  }
  const lastActive = (id) => {
    const ds = []
    db.wellness.forEach((w) => { if (w.clientId === id) ds.push(w.date) })
    db.sessions.forEach((s) => { if (s.clientId === id && s.status === 'Completed') ds.push(s.date) })
    db.logs.forEach((l) => { if (l.clientId === id) ds.push(l.date) })
    if (!ds.length) return null
    return daysAgo(ds.sort().slice(-1)[0], today)
  }

  const rows = db.clients.map((c) => {
    const plan = db.plans.find((p) => p.id === c.planId)
    const adh = adherence(c.id)
    const last = lastActive(c.id)
    const readiness = readinessFor(db, c.id).color
    const concerns = openConcerns(db, c.id).length
    let status
    if (c.status !== 'Active') status = { label: 'Inactive', cls: 'sc-gray' }
    else if (last != null && last >= 8) status = { label: 'Overdue', cls: 'sc-red' }
    else if (readiness === 'red' || concerns > 0 || (adh != null && adh < 50)) status = { label: 'At risk', cls: 'sc-amber' }
    else if (daysAgo(c.joined, today) <= 21) status = { label: 'New', cls: 'sc-blue' }
    else status = { label: 'On track', cls: 'sc-green' }
    return { c, plan, adh, last, status }
  })

  const term = q.trim().toLowerCase()
  const atRisk = (r) => r.status.label === 'At risk' || r.status.label === 'Overdue'
  const filtered = rows.filter((r) =>
    (tab === 'all' || (tab === 'active' && r.c.status === 'Active') || (tab === 'risk' && atRisk(r)) || (tab === 'inactive' && r.c.status !== 'Active')) &&
    (!term || [r.c.name, r.c.email, r.c.goal, r.plan?.name].some((v) => String(v || '').toLowerCase().includes(term))),
  )
  const active = db.clients.filter((c) => c.status === 'Active').length
  const lastLabel = (n) => (n == null ? '—' : n <= 0 ? 'Today' : n === 1 ? 'Yesterday' : `${n}d ago`)

  return (
    <>
      <div className="topbar">
        <div><h1>Clients</h1><div className="sub">{db.clients.length} total · {active} active</div></div>
        <Button onClick={() => openModal(<ClientForm />)}>＋ Add Client</Button>
      </div>

      <div className="cl-toolbar">
        <SegToggle
          options={[['all', `All · ${db.clients.length}`], ['active', 'Active'], ['risk', 'At risk'], ['inactive', 'Inactive']]}
          value={tab} onChange={setTab} ariaLabel="Filter clients"
        />
        <div className="search-field">
          <span className="search-ic" aria-hidden="true"><Icon name="search" size={16} /></span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search clients…" aria-label="Search clients" />
          {q && <button className="search-clear" aria-label="Clear search" onClick={() => setQ('')}>×</button>}
        </div>
      </div>

      <div className="cl-table">
        <div className="cl-head">
          <span>Client</span>
          <span className="cl-col-prog">Program</span>
          <span className="cl-col-adh">Adherence</span>
          <span className="cl-col-last">Last active</span>
          <span>Status</span>
          <span />
        </div>

        {filtered.map(({ c, plan, adh, last, status }) => (
          <button key={c.id} className="cl-row" onClick={() => nav('/clients/' + c.id)} aria-label={`Open ${c.name}`}>
            <span className="cl-client">
              <Avatar name={c.name} size={40} />
              <span className="cl-id"><span className="n">{c.name}</span><span className="e">{c.email}</span></span>
            </span>
            <span className="cl-prog cl-col-prog">
              <div className="p">{plan?.name || 'No program'}</div>
              <div className="w">{c.goal || c.level}</div>
            </span>
            <span className="cl-adh cl-col-adh">
              {adh == null ? <span className="cl-last">No data</span> : (
                <>
                  <span className="cl-bar"><div style={{ width: adh + '%', background: barColor(adh) }} /></span>
                  <span className="pct">{adh}%</span>
                </>
              )}
            </span>
            <span className="cl-last cl-col-last">{lastLabel(last)}</span>
            <span className={'sc ' + status.cls}><span className="sc-dot" />{status.label}</span>
            <span className="cl-chev"><Icon name="chevronRight" size={18} /></span>
          </button>
        ))}

        {!filtered.length && (
          <div className="empty" style={{ padding: 40 }}>
            <div className="big"><Icon name="search" size={40} /></div>
            {db.clients.length ? 'No clients match your filters.' : 'No clients yet — add your first client.'}
          </div>
        )}

        {filtered.length > 0 && (
          <div className="cl-foot">Showing {filtered.length} of {db.clients.length}</div>
        )}
      </div>
    </>
  )
}
