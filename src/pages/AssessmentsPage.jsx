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
import { TYPES, ACTIVE_TYPES, REASSESS_TYPES, DEFAULT_REASSESS_DAYS, forClient, latest, describe, dueStatus } from '../lib/assessment'
import { fmtDate } from '../lib/dates'

// Each assessment type shows one card summarising its LATEST entry; clicking the
// card opens the type's detail page with the full entry history.
export default function AssessmentsPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const { db } = useData()
  const { openModal } = useModal()
  const c = db.clients.find((x) => x.id === id)
  if (!c) return <Button className="back" variant="ghost" onClick={() => nav('/clients')}>← Clients</Button>

  const list = forClient(db.assessments, id)
  const interval = db.settings?.reassessIntervalDays || DEFAULT_REASSESS_DAYS
  const typesToShow = TYPES.filter((t) => ACTIVE_TYPES.includes(t.key) || list.some((a) => a.type === t.key))
  const newAssessment = () => openModal(<NewAssessmentMenu clientId={id} />)
  const addType = (type, phase) => openModal(assessmentForm(type, id, undefined, phase))
  const goDetail = (type) => nav(`/clients/${id}/assessments/${type}`)
  const onEnter = (fn) => (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn() } }

  return (
    <>
      <ClientSubnav client={c} />
      <div className="topbar">
        <div><h1>Assessments</h1><div className="sub">{c.name} · baselines &amp; reassessments</div></div>
        <Button onClick={newAssessment}>＋ New assessment</Button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <AssessmentChecklist list={list} intervalDays={interval} onAdd={(type) => addType(type, 'baseline')} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <CurrentLiftsPerformance client={c} />
      </div>

      <div className="grid cards-2" style={{ alignItems: 'start' }}>
        {typesToShow.map((t) => {
          const recs = list.filter((a) => a.type === t.key)
          const l = latest(list, t.key)
          const due = REASSESS_TYPES.includes(t.key) ? dueStatus(list, t.key, interval) : { has: false }
          const detail = l ? describe(l) : []
          return (
            <div className="card assess-card" key={t.key} role="button" tabIndex={0}
              aria-label={`${t.label} — open details`} onClick={() => goDetail(t.key)} onKeyDown={onEnter(() => goDetail(t.key))}>
              <div className="flex between" style={{ alignItems: 'flex-start' }}>
                <div className="section-title" style={{ margin: 0 }}><Icon name={t.icon} size={16} /> {t.label}</div>
                <span className="flex gap" style={{ alignItems: 'center' }}>
                  {due.has && due.overdue ? <span className="ac-due overdue">Reassess due</span> : null}
                  {recs.length ? <span className="muted" style={{ fontSize: 11 }}>{recs.length} record{recs.length === 1 ? '' : 's'}</span> : null}
                  <Icon name="chevron-right" size={16} style={{ color: 'var(--muted)' }} />
                </span>
              </div>

              {l ? (
                <div className="assess-ov">
                  <div className="assess-ov-head">
                    <span className="tag-sm">{l.phase === 'baseline' ? 'Baseline' : 'Re-assess'}</span>
                    <span className="muted">Latest · {fmtDate(l.date)}</span>
                  </div>
                  <div className="assess-ov-kv">
                    {detail.slice(0, 5).map((r, i) => (
                      <div className="asr-kv" key={i}><span className="asr-k">{r.label}</span><span className="asr-v">{r.value}</span></div>
                    ))}
                    {!detail.length && <div className="muted" style={{ fontSize: 12 }}>No details recorded.</div>}
                  </div>
                  <div className="assess-ov-foot">
                    {detail.length > 5 ? `+${detail.length - 5} more · ` : ''}View all {recs.length} entr{recs.length === 1 ? 'y' : 'ies'} →
                  </div>
                </div>
              ) : (
                <div className="assess-ov empty-ov">
                  <span className="muted">No {t.label.toLowerCase()} recorded yet.</span>
                  {ACTIVE_TYPES.includes(t.key) && (
                    <button className="link-btn" onClick={(e) => { e.stopPropagation(); addType(t.key, 'baseline') }}>Add baseline</button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <AssessmentTrends list={list} />
    </>
  )
}
