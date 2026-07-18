import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Button from '../components/atoms/Button'
import Icon from '../components/atoms/Icon'
import Menu from '../components/molecules/Menu'
import ClientSubnav from '../components/templates/ClientSubnav'
import { assessmentForm } from '../components/organisms/forms/AssessmentForms'
import { useData } from '../store/DataContext'
import { useModal } from '../store/ModalContext'
import { ACTIVE_TYPES, forClient, latest, baseline, summarize, describe, compare, typeMeta } from '../lib/assessment'
import { fmtDate, fmtDateTime } from '../lib/dates'
import { toast, confirmDialog } from '../lib/toast'

function DeltaRow({ r }) {
  const arrow = r.delta == null || r.delta === 0 ? '' : r.delta > 0 ? '▲' : '▼'
  const color = r.better == null ? 'var(--muted)' : r.better ? 'var(--green)' : 'var(--accent)'
  const cell = (v) => (v == null ? '—' : `${v}${r.unit || ''}`)
  return (
    <div className="cmp-row">
      <span className="cmp-label">{r.label}</span>
      <span>{cell(r.from)}</span>
      <span className="cmp-arrow">→</span>
      <span>{cell(r.to)}</span>
      <span className="cmp-delta" style={{ color }}>{r.delta != null && r.delta !== 0 ? `${arrow} ${Math.abs(r.delta)}${r.unit || ''}` : '—'}</span>
    </div>
  )
}

// One entry: date + time header that expands to the full recorded data.
function EntryRow({ rec, onEdit, onDelete }) {
  const [open, setOpen] = useState(false)
  const detail = describe(rec)
  const toggle = () => setOpen((o) => !o)
  return (
    <div className={'ad-entry' + (open ? ' open' : '')}>
      <div className="ad-entry-head" role="button" tabIndex={0} aria-expanded={open}
        onClick={toggle} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle() } }}>
        <span className="asr-caret" aria-hidden="true">{open ? '▾' : '▸'}</span>
        <span className="tag-sm">{rec.phase === 'baseline' ? 'Baseline' : 'Re-assess'}</span>
        {rec.data?.self ? <span className="tag-sm" style={{ color: 'var(--blue)' }}>self</span> : null}
        <span className="ad-entry-when">{fmtDateTime(rec.createdAt) || fmtDate(rec.date)}</span>
        <span className="ahr-sum">{summarize(rec)}</span>
        <span onClick={(e) => e.stopPropagation()}>
          <Menu label="Record actions" items={[
            { label: 'Edit', icon: 'settings', onClick: onEdit },
            { label: 'Delete', icon: 'alert', danger: true, onClick: onDelete },
          ]} />
        </span>
      </div>
      {open && (
        <div className="asr-detail">
          {detail.length ? detail.map((r, i) => (
            <div className="asr-kv" key={i}><span className="asr-k">{r.label}</span><span className="asr-v">{r.value}</span></div>
          )) : <div className="muted" style={{ fontSize: 12 }}>No details recorded.</div>}
          {rec.notes && <div className="asr-kv"><span className="asr-k">Notes</span><span className="asr-v">{rec.notes}</span></div>}
        </div>
      )}
    </div>
  )
}

export default function AssessmentDetailPage() {
  const { id, type } = useParams()
  const nav = useNavigate()
  const { db, commit } = useData()
  const { openModal } = useModal()
  const c = db.clients.find((x) => x.id === id)
  const meta = typeMeta(type)
  if (!c) return <Button className="back" variant="ghost" onClick={() => nav('/clients')}>← Clients</Button>

  const list = forClient(db.assessments, id)
  const recs = list.filter((a) => a.type === type).sort((a, b) => (b.createdAt || b.date).localeCompare(a.createdAt || a.date))
  const b = baseline(list, type)
  const l = latest(list, type)
  const rows = b && l && b.id !== l.id ? compare(type, b, l) : []
  const canAdd = ACTIVE_TYPES.includes(type)
  const add = (phase) => openModal(assessmentForm(type, id, undefined, phase))
  const editRec = (rec) => openModal(assessmentForm(rec.type, id, rec))
  const del = async (rec) => {
    const fedBuilder = rec.type === 'fitness' && (rec.data?.strength?.length || 0) > 0
    if (!await confirmDialog({
      title: 'Delete assessment',
      message: `Delete this ${meta.label.toLowerCase()} record from ${fmtDate(rec.date)}? This can't be undone.${fedBuilder ? ' The 1RM values it fed into the workout builder will also be removed.' : ''}`,
      confirmLabel: 'Delete', danger: true,
    })) return
    commit((d) => { d.assessments = d.assessments.filter((a) => a.id !== rec.id) })
    toast('Assessment deleted')
  }

  return (
    <>
      <ClientSubnav client={c} />
      <button className="back" style={{ margin: '0 0 6px' }} onClick={() => nav(`/clients/${id}/assessments`)}>← All assessments</button>
      <div className="topbar">
        <div>
          <h1 className="flex gap" style={{ alignItems: 'center' }}><Icon name={meta.icon} size={22} /> {meta.label}</h1>
          <div className="sub">{c.name} · {recs.length} entr{recs.length === 1 ? 'y' : 'ies'}</div>
        </div>
        {canAdd && (
          <div className="flex gap">
            {recs.length ? <Button variant="ghost" onClick={() => add('reassessment')}>＋ Reassessment</Button> : null}
            <Button onClick={() => add(recs.length ? 'reassessment' : 'baseline')}>＋ {recs.length ? 'Reassessment' : 'Baseline'}</Button>
          </div>
        )}
      </div>

      {rows.length ? (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="section-title" style={{ margin: '0 0 10px' }}>Baseline → latest</div>
          <div className="cmp">
            <div className="cmp-head"><span>Metric</span><span>{fmtDate(b.date)}</span><span /><span>{fmtDate(l.date)}</span><span>Δ</span></div>
            {rows.map((r, i) => <DeltaRow r={r} key={i} />)}
          </div>
        </div>
      ) : null}

      <div className="card">
        <div className="section-title" style={{ margin: '0 0 6px' }}>Entries</div>
        {recs.length ? (
          <>
            <div className="muted" style={{ fontSize: 11, marginBottom: 6 }}>Newest first · tap an entry to expand its full data</div>
            {recs.map((a) => <EntryRow key={a.id} rec={a} onEdit={() => editRec(a)} onDelete={() => del(a)} />)}
          </>
        ) : (
          <div className="empty" style={{ padding: 24 }}>
            <div className="big"><Icon name={meta.icon} size={40} /></div>
            No {meta.label.toLowerCase()} recorded yet.
            {canAdd && <div style={{ marginTop: 8 }}><Button size="sm" onClick={() => add('baseline')}>Add baseline</Button></div>}
          </div>
        )}
      </div>
    </>
  )
}
