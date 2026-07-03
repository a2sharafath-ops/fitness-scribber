import Tag from '../../atoms/Tag'
import Button from '../../atoms/Button'
import Field from '../../atoms/Field'
import { RISK_ICON } from '../../../lib/format'
import { fmtDate, todayISO } from '../../../lib/dates'
import { questionText, generalYesIds, followupYesIds, DELAY_FLAGS, TRAINER_ADVICE_CLEARED, TRAINER_ADVICE_REVIEW } from '../../../lib/parq'
import { OUTCOME_META, CLEARANCE_STATUSES, redFlags, cvdRiskFactors, programStatus, isExpired } from '../../../lib/screening'
import './ScreeningFlow.css'

// TRAINER-ONLY view of a completed screening: outcome, triggering answers, red
// flags, risk factors, and the clearance workflow. None of this is ever shown to
// the client — the trainer reviews here and communicates clearance personally.
export default function ScreeningReview({ screening, draft, onClearance, onStart }) {
  const today = todayISO()
  if (!screening) {
    return (
      <div className="card">
        <div className="section-title" style={{ margin: '0 0 8px' }}>Health screening <Tag color="gray">Trainer-only</Tag></div>
        <p className="muted" style={{ fontSize: 13 }}>
          {draft ? 'Screening in progress — the client has a saved draft.' : 'No pre-participation screening on file yet.'}
        </p>
        {onStart && <Button style={{ marginTop: 10 }} onClick={onStart}>{draft ? 'Continue screening with client' : 'Record screening with client'}</Button>}
      </div>
    )
  }

  const s = screening
  const meta = OUTCOME_META[s.outcome] || { label: '—', color: 'gray', desc: '' }
  const gated = programStatus(s) === 'gated'
  const expired = isExpired(s, today)
  const flags = redFlags(s)
  const risks = cvdRiskFactors(s)
  const gYes = generalYesIds(s.parq?.general)
  const fYes = followupYesIds(s.parq?.followup)
  const delays = DELAY_FLAGS.filter((d) => s.parq?.delay?.[d.id])
  const cl = s.clearance || { action: 'none', status: 'not_started', notes: '', dateCleared: '' }
  const setCl = (patch) => onClearance({ ...cl, ...patch })

  return (
    <div className="card">
      <div className="flex between" style={{ alignItems: 'flex-start' }}>
        <div className="section-title" style={{ margin: 0 }}>Health screening <Tag color="gray">Trainer-only</Tag></div>
        <div className="flex gap" style={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Tag color={meta.color}>{RISK_ICON[meta.color]} PAR-Q+ {s.outcome}: {meta.label}</Tag>
          <Tag color={gated ? 'red' : 'green'}>{gated ? RISK_ICON.red + ' Program gated' : RISK_ICON.green + ' Program ready'}</Tag>
          {expired && <Tag color="yellow">{RISK_ICON.yellow} Expired — re-screen</Tag>}
        </div>
      </div>
      <p className="muted" style={{ fontSize: 12, margin: '6px 0 10px' }}>
        Completed {fmtDate(s.completedOn)} · valid until {fmtDate(s.validUntil)} (invalid earlier if their health changes).
        Signed: {s.parq?.declaration?.signature || '—'}{s.parq?.declaration?.witness ? ` · witness ${s.parq.declaration.witness}` : ''}
      </p>

      {(gYes.length > 0 || delays.length > 0) && (
        <div className="intake-block">
          <div className="i-h">📋 PAR-Q+ answers that triggered review</div>
          <div className="i-b">
            {gYes.map((id) => <div key={id}>YES — {id}: {questionText(id)}</div>)}
            {fYes.map((id) => <div key={id}>YES — {id}: {questionText(id)}</div>)}
            {delays.map((d) => <div key={d.id}>{RISK_ICON.yellow} Delay flag: {d.text}</div>)}
            {s.parq?.conditionsAndMeds && <div style={{ marginTop: 4 }}>Listed: {s.parq.conditionsAndMeds}</div>}
          </div>
        </div>
      )}

      {(flags.major.length > 0 || flags.minor.length > 0) && (
        <div className="intake-block">
          <div className="i-h">🚩 Red-flag rollup (HHQ)</div>
          <div className="i-b">
            {flags.major.map((x) => <div key={x}>{RISK_ICON.red} <strong>{x}</strong> — recommend medical clearance before starting</div>)}
            {flags.minor.map((x) => <div key={x}>{RISK_ICON.yellow} {x}</div>)}
          </div>
        </div>
      )}

      {risks.length > 0 && (
        <div className="intake-block">
          <div className="i-h">❤️ CVD/metabolic risk factors ({risks.length})</div>
          <div className="i-b">{risks.join(' · ')}</div>
        </div>
      )}

      <div className="intake-block">
        <div className="i-h">🩺 Recommendation</div>
        <div className="i-b">{s.outcome === 'C' || flags.major.length > 0 ? TRAINER_ADVICE_REVIEW : TRAINER_ADVICE_CLEARED}</div>
      </div>

      {(s.outcome === 'C' || flags.major.length > 0) && (
        <div className="intake-block">
          <div className="i-h">✅ Clearance workflow — you decide and communicate this to the client</div>
          <div className="row3" style={{ marginTop: 8 }}>
            <Field label="Action">
              <select value={cl.action} onChange={(e) => setCl({ action: e.target.value })}>
                <option value="eparmedx_or_physician">ePARmed-X+ / physician clearance</option>
                <option value="physician_clearance">Physician clearance letter</option>
                <option value="none">No action needed</option>
              </select>
            </Field>
            <Field label="Status">
              <select value={cl.status} onChange={(e) => setCl({ status: e.target.value, dateCleared: e.target.value === 'received' ? (cl.dateCleared || today) : cl.dateCleared })}>
                {CLEARANCE_STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <Field label="Date cleared"><input type="date" value={cl.dateCleared || ''} onChange={(e) => setCl({ dateCleared: e.target.value })} /></Field>
          </div>
          <div className="row2">
            <Field label="Notes"><input value={cl.notes || ''} onChange={(e) => setCl({ notes: e.target.value })} placeholder="e.g. GP letter received, moderate intensity approved" /></Field>
            <Field label="Clearance letter (link/URL)"><input value={cl.attachmentUrl || ''} onChange={(e) => setCl({ attachmentUrl: e.target.value })} placeholder="Paste a link to the scanned letter" /></Field>
          </div>
          <p className="muted" style={{ fontSize: 11.5, margin: 0 }}>
            Program start stays gated until clearance is marked <strong>Received</strong>. The PAR-Q+ screens risk — it is not a diagnosis or a substitute for medical clearance.
          </p>
        </div>
      )}
      {(expired || onStart) && (
        <div className="flex gap" style={{ marginTop: 10 }}>
          {onStart && <Button variant="ghost" onClick={onStart}>Re-screen{draft ? ' (draft in progress)' : ''}</Button>}
        </div>
      )}
    </div>
  )
}
