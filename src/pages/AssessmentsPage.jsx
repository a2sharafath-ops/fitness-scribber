import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Button from '../components/atoms/Button'
import { useData } from '../store/DataContext'
import { useModal } from '../store/ModalContext'
import { NewAssessmentMenu, assessmentForm } from '../components/organisms/forms/AssessmentForms'
import Menu from '../components/molecules/Menu'
import AssessmentChecklist from '../components/organisms/AssessmentChecklist'
import AssessmentTrends from '../components/organisms/AssessmentTrends'
import CurrentLiftsPerformance from '../components/organisms/CurrentLiftsPerformance'
import ClientSubnav from '../components/templates/ClientSubnav'
import Icon from '../components/atoms/Icon'
import { TYPES, ACTIVE_TYPES, REASSESS_TYPES, DEFAULT_REASSESS_DAYS, forClient, latest, baseline, summarize, describe, compare, dueStatus, typeMeta } from '../lib/assessment'
import { fmtDate } from '../lib/dates'
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

// One record in a card's history — a summary line that expands to the full
// recorded data, with an Edit / Delete actions menu.
function RecordRow({ rec, onEdit, onDelete }) {
  const [open, setOpen] = useState(false)
  const detail = describe(rec)
  const toggle = () => setOpen((o) => !o)
  return (
    <div className={'asr-rec' + (open ? ' open' : '')}>
      <div className="asr-hist-row" role="button" tabIndex={0} aria-expanded={open}
        onClick={toggle} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle() } }}>
        <span className="asr-caret" aria-hidden="true">{open ? '▾' : '▸'}</span>
        <span className="tag-sm">{rec.phase === 'baseline' ? 'Baseline' : 'Re-assess'}</span>
        {rec.data?.self ? <span className="tag-sm" style={{ color: 'var(--blue)' }}>self</span> : null}
        <span className="ahr-date">{fmtDate(rec.date)}</span>
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

export default function AssessmentsPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const { db, commit } = useData()
  const { openModal } = useModal()
  const c = db.clients.find((x) => x.id === id)
  if (!c) return <Button className="back" variant="ghost" onClick={() => nav('/clients')}>← Clients</Button>

  const list = forClient(db.assessments, id)
  const interval = db.settings?.reassessIntervalDays || DEFAULT_REASSESS_DAYS
  const typesToShow = TYPES.filter((t) => ACTIVE_TYPES.includes(t.key) || list.some((a) => a.type === t.key))
  const newAssessment = () => openModal(<NewAssessmentMenu clientId={id} />)
  const addType = (type, phase) => openModal(assessmentForm(type, id, undefined, phase))
  const editRec = (rec) => openModal(assessmentForm(rec.type, id, rec))
  const del = async (rec) => {
    const fedBuilder = rec.type === 'fitness' && (rec.data?.strength?.length || 0) > 0
    if (!await confirmDialog({
      title: 'Delete assessment',
      message: `Delete this ${typeMeta(rec.type).label.toLowerCase()} record from ${fmtDate(rec.date)}? This can't be undone.${fedBuilder ? ' The 1RM values it fed into the workout builder will also be removed.' : ''}`,
      confirmLabel: 'Delete', danger: true,
    })) return
    commit((d) => { d.assessments = d.assessments.filter((a) => a.id !== rec.id) })
    toast('Assessment deleted')
  }

  return (
    <>
      <ClientSubnav client={c} />
      <div className="topbar">
        <div><h1>Assessments</h1><div className="sub">{c.name} · baselines &amp; reassessments</div></div>
        <Button onClick={newAssessment}>＋ New assessment</Button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <AssessmentChecklist list={list} intervalDays={interval} onAdd={addType} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <CurrentLiftsPerformance client={c} />
      </div>

      <div className="grid cards-2" style={{ alignItems: 'start' }}>
        {typesToShow.map((t) => {
          const recs = list.filter((a) => a.type === t.key).sort((a, b) => b.date.localeCompare(a.date))
          const b = baseline(list, t.key)
          const l = latest(list, t.key)
          const rows = b && l && b.id !== l.id ? compare(t.key, b, l) : []
          const due = REASSESS_TYPES.includes(t.key) ? dueStatus(list, t.key, interval) : { has: false }
          return (
            <div className="card" key={t.key}>
              <div className="flex between" style={{ alignItems: 'flex-start' }}>
                <div className="section-title" style={{ margin: 0 }}><Icon name={t.icon} size={16} /> {t.label}</div>
                <span className="flex gap" style={{ alignItems: 'center' }}>
                  {due.has && due.overdue ? <span className="ac-due overdue">Reassess due</span> : null}
                  {recs.length ? <span className="muted" style={{ fontSize: 11 }}>{recs.length} record{recs.length === 1 ? '' : 's'}</span> : null}
                  {recs.length && ACTIVE_TYPES.includes(t.key)
                    ? <Button size="sm" variant="ghost" onClick={() => addType(t.key, 'reassessment')}>＋ Reassess</Button> : null}
                </span>
              </div>

              {!recs.length ? (
                <div className="empty" style={{ padding: 20 }}>
                  <div className="big"><Icon name={t.icon} size={40} /></div>No {t.label.toLowerCase()} recorded.
                  {ACTIVE_TYPES.includes(t.key) && <div style={{ marginTop: 8 }}><Button size="sm" variant="ghost" onClick={() => addType(t.key, 'baseline')}>Add baseline</Button></div>}
                </div>
              ) : (
                <>
                  {rows.length ? (
                    <div className="cmp">
                      <div className="cmp-head"><span>Metric</span><span>{fmtDate(b.date)}</span><span /><span>{fmtDate(l.date)}</span><span>Δ</span></div>
                      {rows.map((r, i) => <DeltaRow r={r} key={i} />)}
                    </div>
                  ) : null}
                  <div className="asr-hist">
                    <div className="asr-hist-label muted">History — tap a record to see the full data</div>
                    {recs.map((a) => (
                      <RecordRow key={a.id} rec={a} onEdit={() => editRec(a)} onDelete={() => del(a)} />
                    ))}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>

      <AssessmentTrends list={list} />
    </>
  )
}
