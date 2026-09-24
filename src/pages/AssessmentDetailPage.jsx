import { useState } from 'react'
import { Link, Navigate, useLocation, useParams } from 'react-router-dom'
import Button from '../components/atoms/Button'
import Icon from '../components/atoms/Icon'
import Menu from '../components/molecules/Menu'
import { assessmentForm } from '../components/organisms/forms/AssessmentForms'
import WorkoutBuilderModal from '../components/organisms/program/WorkoutBuilderModal'
import { useData } from '../store/DataContext'
import { useModal } from '../store/ModalContext'
import { ACTIVE_TYPES, forClient, formalAssessments, isTrainingDerivedAssessment, latest, baseline, summarize, describe, compare, movementDiff, typeMeta } from '../lib/assessment'
import { correctivePlan } from '../lib/program'
import { fmtDate, fmtDateTime, todayISO } from '../lib/dates'
import { toast, confirmDialog } from '../lib/toast'
import { assessmentCanonicalPath } from '../lib/clientRoutes'

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
      <div className="ad-entry-head">
        <button type="button" className="ad-entry-toggle" aria-expanded={open} onClick={toggle}>
          <span className="asr-caret" aria-hidden="true">{open ? '▾' : '▸'}</span>
          <span className="tag-sm">{rec.phase === 'baseline' ? 'Baseline' : 'Reassessment'}</span>
          <span className="ad-entry-when">Assessed {fmtDate(rec.date)}</span>
          <span className="ahr-sum">{summarize(rec)}</span>
        </button>
        <span>
          <Menu label="Record actions" items={[
            { label: 'Edit', icon: 'settings', onClick: onEdit },
            { label: 'Delete', icon: 'alert', danger: true, onClick: onDelete },
          ]} />
        </span>
      </div>
      {open && (
        <div className="asr-detail">
          <div className="asr-kv"><span className="asr-k">Source</span><span className="asr-v">{rec.data?.self ? 'Athlete self-report' : rec.data?.source || 'Source not recorded'}</span></div>
          <div className="asr-kv"><span className="asr-k">Recorded in app</span><span className="asr-v">{fmtDateTime(rec.createdAt) || 'Not recorded'}</span></div>
          {detail.length ? detail.map((r, i) => (
            <div className="asr-kv" key={i}><span className="asr-k">{r.label}</span><span className="asr-v">{r.value}</span></div>
          )) : <div className="muted" style={{ fontSize: 12 }}>No details recorded.</div>}
          {rec.notes && <div className="asr-kv"><span className="asr-k">Notes</span><span className="asr-v">{rec.notes}</span></div>}
        </div>
      )}
    </div>
  )
}

function MovementChanges({ changes, previous, current }) {
  const groups = [
    ['Resolved', changes.resolved, 'resolved', (x) => x.was],
    ['Persisting', changes.persisting, 'persisting', (x) => x.was === x.now ? x.now : `${x.was} → ${x.now}`],
    ['New', changes.added, 'added', (x) => x.now],
  ]
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="section-title" style={{ margin: '0 0 3px' }}>Reassessment findings</div>
      <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
        Compensation-level change from {fmtDateTime(previous.createdAt) || fmtDate(previous.date)} to {fmtDateTime(current.createdAt) || fmtDate(current.date)} (the two latest NASM screens).
      </div>
      <div className="mv-diff-grid">
        {groups.map(([label, items, tone, side]) => (
          <div className={'mv-diff ' + tone} key={label}>
            <div className="mv-diff-head"><span>{label}</span><b>{items.length}</b></div>
            {items.length ? items.map((x) => (
              <div className="mv-diff-item" key={x.id}>
                <span>{x.label}</span>
                <small>{x.view} · {side(x)}</small>
              </div>
            )) : <div className="muted" style={{ fontSize: 11 }}>None</div>}
          </div>
        ))}
      </div>
    </div>
  )
}

function CorrectivePlan({ plan, assessment, onReview }) {
  if (!plan.findings.length) return null
  const pain = plan.findings.filter((f) => f.pain).length
  const modes = ['SMR', 'Stretch', 'Activation']
  return (
    <div className="card mv-corrective" style={{ marginBottom: 16 }}>
      <div className="flex between gap" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <div className="section-title" style={{ margin: '0 0 3px' }}>Corrective starting point</div>
          <div className="muted" style={{ fontSize: 12 }}>Generated from the latest movement screen ({fmtDate(assessment.date)}); review before prescribing.</div>
        </div>
        {plan.block && <Button size="sm" onClick={onReview}>Review in workout builder →</Button>}
      </div>
      {pain > 0 && (
        <div className="mv-pain"><Icon name="alert" size={14} /> {pain} pain flag{pain === 1 ? '' : 's'} recorded — assess scope and refer when appropriate before loading.</div>
      )}
      {plan.suggestions.length ? (
        <div className="mv-corrective-grid">
          {modes.map((mode) => {
            const items = plan.suggestions.filter((x) => x.mode === mode)
            return (
              <div key={mode}>
                <div className="mv-mode">{mode}</div>
                {items.map((x) => (
                  <div className="mv-exercise" key={x.name}>
                    <span>{x.name}</span>
                    <small>{x.matchedTargets.join(' · ')}</small>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      ) : <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>No library exercises matched these findings.</div>}
    </div>
  )
}

export default function AssessmentDetailPage() {
  const { id, type } = useParams()
  const location = useLocation()
  const { db, commit, tz } = useData()
  const { openModal } = useModal()
  const isProfileType = type === 'goals' || type === 'lifestyle'
  const canonicalPath = assessmentCanonicalPath(id, type, location.pathname, location.search, location.hash)
  if (canonicalPath) return <Navigate to={canonicalPath} replace />
  const c = db.clients.find((x) => x.id === id)
  const meta = typeMeta(type)
  if (!c) return <Link className="btn ghost back" to="/clients">← Clients</Link>

  const list = forClient(db.assessments, id)
  const recs = formalAssessments(list).filter((a) => a.type === type).sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || ''))
  const derived = type === 'fitness' ? list.filter(isTrainingDerivedAssessment).sort((a, b) => (b.date || '').localeCompare(a.date || '')) : []
  const b = baseline(recs, type)
  const l = latest(recs, type)
  const rows = b && l && b.id !== l.id ? compare(type, b, l) : []
  const nasmRecs = type === 'movement'
    ? recs.filter((r) => r.data?.protocol === 'nasm').sort((a, z) => (a.createdAt || a.date).localeCompare(z.createdAt || z.date))
    : []
  const currentMovement = nasmRecs.at(-1)
  const previousMovement = nasmRecs.at(-2)
  const movementChanges = previousMovement && currentMovement
    ? movementDiff(previousMovement.data, currentMovement.data) : null
  const corrective = type === 'movement' && l?.data?.protocol === 'nasm'
    ? correctivePlan(l.data, db.exercises) : null
  const canAdd = ACTIVE_TYPES.includes(type)
  const add = (phase) => openModal(assessmentForm(type, id, undefined, phase))
  const editRec = (rec) => openModal(assessmentForm(rec.type, id, rec))
  const reviewCorrective = () => {
    if (!corrective?.block || !l) return
    const block = { ...corrective.block, correctiveAssessmentId: l.id }
    openModal(
      <WorkoutBuilderModal clientId={id} date={todayISO(tz)} seedBlocks={[block]}
        seedNotes={`Corrective warm-up from movement screen ${fmtDate(l.date)}`} />,
      'xl',
    )
  }
  const del = async (rec) => {
    const fedBuilder = rec.type === 'fitness' && (rec.data?.strength?.length || 0) > 0
    if (!await confirmDialog({
      title: 'Delete assessment',
      message: `Delete this ${meta.label.toLowerCase()} record from ${fmtDate(rec.date)}? This can't be undone.${fedBuilder ? ' The 1RM values it fed into the workout builder will also be removed.' : ''}`,
      confirmLabel: 'Delete', danger: true,
    })) return
    commit((d) => {
      d.assessments = d.assessments.filter((a) => a.id !== rec.id)
      if (rec.type === 'body_comp') {
        const client = d.clients.find((item) => item.id === id)
        for (const field of ['massKg', 'bodyFatPct', 'leanMassKg']) {
          if (client?.anthro?._sources?.[field]?.recordId === rec.id) {
            client.anthro[field] = null
            delete client.anthro._sources[field]
          }
        }
      }
    })
    toast('Assessment deleted')
  }

  return (
    <>
      <Link className="back" style={{ margin: '0 0 6px' }} to={isProfileType ? `/clients/${id}/profile` : `/clients/${id}/assessments`}>← {isProfileType ? 'Profile' : 'All assessments'}</Link>
      <div className="topbar">
        <div>
          <h1 className="flex gap" style={{ alignItems: 'center' }}><Icon name={meta.icon} size={22} /> {meta.label}</h1>
          <div className="sub">{c.name} · {recs.length} entr{recs.length === 1 ? 'y' : 'ies'}</div>
        </div>
        {canAdd && (
          <Button onClick={() => add(recs.length ? 'reassessment' : 'baseline')}>＋ {recs.length ? 'Reassessment' : 'Baseline'}</Button>
        )}
      </div>

      {type === 'fitness' && <p className="assess-progress-link">Strength outcomes and tracked lift estimates are in <Link to={`/clients/${id}/progress`}>Progress →</Link></p>}
      {rows.length && type !== 'fitness' ? (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="section-title" style={{ margin: '0 0 10px' }}>Baseline → latest <Link className="assess-inline-link" to={`/clients/${id}/progress`}>View in Progress →</Link></div>
          <div className="cmp">
            <div className="cmp-head"><span>Metric</span><span>{fmtDate(b.date)}</span><span /><span>{fmtDate(l.date)}</span><span>Δ</span></div>
            {rows.map((r, i) => <DeltaRow r={r} key={i} />)}
          </div>
        </div>
      ) : null}

      {movementChanges && <MovementChanges changes={movementChanges} previous={previousMovement} current={currentMovement} />}
      {corrective && <CorrectivePlan plan={corrective} assessment={l} onReview={reviewCorrective} />}

      <div className="card">
        <div className="section-title" style={{ margin: '0 0 6px' }}>Entries</div>
        {recs.length ? (
          <>
            <div className="muted" style={{ fontSize: 11, marginBottom: 6 }}>Newest assessment date first · select an entry to see its recorded data</div>
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
      {derived.length > 0 && <details className="assess-disclosure"><summary>{derived.length} training-derived lift entr{derived.length === 1 ? 'y' : 'ies'} · tracked in Progress</summary>
        <div className="card">{derived.map((rec) => <div className="assess-derived-row" key={rec.id}><span>{fmtDate(rec.date)} · {summarize(rec)}</span><span>{rec.data?.sourceWorkoutId || rec.notes?.startsWith('Auto-update:') ? 'Completed workout estimate' : 'Tracked lift entry'}</span></div>)}
          <Link className="assess-inline-link" to={`/clients/${id}/progress`}>View strength progress →</Link></div>
      </details>}
    </>
  )
}
