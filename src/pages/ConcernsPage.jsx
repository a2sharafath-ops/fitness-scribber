import Button from '../components/atoms/Button'
import ConcernCard from '../components/molecules/ConcernCard'
import ConcernForm from '../components/organisms/forms/ConcernForm'
import { useData } from '../store/DataContext'
import { useModal } from '../store/ModalContext'

export default function ConcernsPage() {
  const { db, commit } = useData()
  const { openModal } = useModal()
  const open = db.concerns.filter((x) => x.status === 'Open')
  const resolved = db.concerns.filter((x) => x.status === 'Resolved')
  const high = open.filter((x) => x.severity === 'High').length
  const clientName = (cid) => db.clients.find((c) => c.id === cid)?.name

  const resolve = (id) => { const note = prompt('Resolution note (optional):', ''); if (note === null) return; commit((d) => { const x = d.concerns.find((q) => q.id === id); x.status = 'Resolved'; x.resolution = note.trim() }) }
  const reopen = (id) => commit((d) => { const x = d.concerns.find((q) => q.id === id); x.status = 'Open'; x.resolution = '' })
  const del = (id) => { if (confirm('Delete this concern?')) commit((d) => { d.concerns = d.concerns.filter((q) => q.id !== id) }) }

  const render = (list) => list
    .sort((a, b) => (b.status === 'Open') - (a.status === 'Open') || b.date.localeCompare(a.date))
    .map((x) => (
      <ConcernCard key={x.id} concern={x} clientName={clientName(x.clientId)} session={x.sessionId ? db.sessions.find((s) => s.id === x.sessionId) : null}
        onResolve={() => resolve(x.id)} onReopen={() => reopen(x.id)} onEdit={() => openModal(<ConcernForm concern={x} />)} onDelete={() => del(x.id)} />
    ))

  return (
    <>
      <div className="topbar">
        <div><h1>Concerns</h1><div className="sub">{open.length} open · {high} high severity · {resolved.length} resolved</div></div>
        <Button onClick={() => openModal(<ConcernForm />)}>＋ Flag a concern</Button>
      </div>
      <div className="section-title" style={{ marginTop: 0 }}>Open</div>
      {open.length ? render(open) : <div className="empty" style={{ padding: 24 }}><div className="big">✅</div>No open concerns.</div>}
      <div className="section-title">Resolved</div>
      {resolved.length ? render(resolved) : <div className="muted" style={{ fontSize: 13 }}>Nothing resolved yet.</div>}
    </>
  )
}
