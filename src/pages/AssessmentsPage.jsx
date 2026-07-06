import { useParams, useNavigate } from 'react-router-dom'
import Button from '../components/atoms/Button'
import { useData } from '../store/DataContext'
import { useModal } from '../store/ModalContext'
import { NewAssessmentMenu, assessmentForm } from '../components/organisms/forms/AssessmentForms'
import AssessmentChecklist from '../components/organisms/AssessmentChecklist'
import AssessmentTrends from '../components/organisms/AssessmentTrends'
import CurrentLiftsPerformance from '../components/organisms/CurrentLiftsPerformance'
import ClientSubnav from '../components/templates/ClientSubnav'
import Icon from '../components/atoms/Icon'
import { TYPES, ACTIVE_TYPES, REASSESS_TYPES, DEFAULT_REASSESS_DAYS, forClient, latest, baseline, summarize, compare, dueStatus } from '../lib/assessment'
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
  const addType = (type) => openModal(assessmentForm(type, id))
  const del = async (aid) => {
    if (!await confirmDialog({ title: 'Delete assessment', message: 'Delete this assessment record?', confirmLabel: 'Delete', danger: true })) return
    commit((d) => { d.assessments = d.assessments.filter((a) => a.id !== aid) })
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
              <div className="flex between">
                <div className="section-title" style={{ margin: 0 }}><Icon name={t.icon} size={16} /> {t.label}</div>
                <span className="flex gap" style={{ alignItems: 'center' }}>
                  {due.has && due.overdue ? <span className="ac-due overdue">Reassess due</span> : null}
                  {recs.length ? <span className="muted" style={{ fontSize: 11 }}>{recs.length} record{recs.length === 1 ? '' : 's'}</span> : null}
                </span>
              </div>

              {!recs.length ? (
                <div className="empty" style={{ padding: 20 }}>
                  <div className="big"><Icon name={t.icon} size={40} /></div>No {t.label.toLowerCase()} recorded.
                  {ACTIVE_TYPES.includes(t.key) && <div style={{ marginTop: 8 }}><Button size="sm" variant="ghost" onClick={newAssessment}>Add baseline</Button></div>}
                </div>
              ) : (
                <>
                  {rows.length ? (
                    <div className="cmp">
                      <div className="cmp-head"><span>Metric</span><span>{fmtDate(b.date)}</span><span /><span>{fmtDate(l.date)}</span><span>Δ</span></div>
                      {rows.map((r, i) => <DeltaRow r={r} key={i} />)}
                    </div>
                  ) : (
                    <div className="muted" style={{ fontSize: 12, margin: '8px 0' }}>{summarize(recs[0])}</div>
                  )}
                  <div className="asr-hist">
                    {recs.map((a) => (
                      <div className="asr-hist-row" key={a.id}>
                        <span className="tag-sm">{a.phase === 'baseline' ? 'Baseline' : 'Re-assess'}</span>
                        {a.data?.self ? <span className="tag-sm" style={{ color: 'var(--blue)' }}>self</span> : null}
                        <span className="ahr-date">{fmtDate(a.date)}</span>
                        <span className="ahr-sum">{summarize(a)}{a.notes ? ` — ${a.notes}` : ''}</span>
                        <button className="x" aria-label="Delete record" onClick={() => del(a.id)}>×</button>
                      </div>
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
