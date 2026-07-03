import { useState } from 'react'
import Avatar from '../atoms/Avatar'
import Button from '../atoms/Button'
import Field from '../atoms/Field'
import AnthroCell from '../molecules/AnthroCell'
import ReadinessTag from '../molecules/ReadinessTag'
import ModalShell from '../molecules/ModalShell'
import { useData } from '../../store/DataContext'
import { useModal } from '../../store/ModalContext'
import { useFormat } from '../../hooks/useFormat'
import { fmtDate } from '../../lib/dates'
import { readinessFor } from '../../lib/calc'
import { resolveAnthro } from '../../lib/assessment'

export function EditProfileForm({ client }) {
  const { db, commit } = useData()
  const { closeModal } = useModal()
  // Prefilled with screening/assessment fallbacks; saving persists them.
  const [a, setA] = useState(() => resolveAnthro(db, client))
  const [ik, setIk] = useState(client.intake || {})
  const numOrNull = (v) => (v === '' ? null : +v)
  const save = () => {
    commit((db) => {
      const c = db.clients.find((x) => x.id === client.id)
      c.anthro = { age: numOrNull(a.age), heightCm: numOrNull(a.heightCm), massKg: numOrNull(a.massKg), bodyFatPct: numOrNull(a.bodyFatPct), leanMassKg: numOrNull(a.leanMassKg) }
      c.intake = { questionnaire: ik.questionnaire || '', medical: ik.medical || '', injury: ik.injury || '', diet: ik.diet || '' }
    })
    closeModal()
  }
  const an = (k) => (e) => setA({ ...a, [k]: e.target.value })
  const it = (k) => (e) => setIk({ ...ik, [k]: e.target.value })
  return (
    <ModalShell title="Edit Profile Details" onClose={closeModal}
      footer={<><Button variant="ghost" onClick={closeModal}>Cancel</Button><Button onClick={save}>Save</Button></>}>
      <div className="section-title" style={{ margin: '0 0 8px' }}>Anthropometrics</div>
      <div className="row3">
        <Field label="Age"><input type="number" value={a.age ?? ''} onChange={an('age')} /></Field>
        <Field label="Height (cm)"><input type="number" value={a.heightCm ?? ''} onChange={an('heightCm')} /></Field>
        <Field label="Body mass (kg)"><input type="number" step="0.1" value={a.massKg ?? ''} onChange={an('massKg')} /></Field>
      </div>
      <div className="row2">
        <Field label="Body fat %"><input type="number" step="0.1" value={a.bodyFatPct ?? ''} onChange={an('bodyFatPct')} /></Field>
        <Field label="Lean mass (kg)"><input type="number" step="0.1" value={a.leanMassKg ?? ''} onChange={an('leanMassKg')} /></Field>
      </div>
      <div className="section-title" style={{ margin: '6px 0 8px' }}>Intake & History</div>
      <Field label="Initial questionnaire"><textarea value={ik.questionnaire || ''} onChange={it('questionnaire')} /></Field>
      <Field label="Medical history"><textarea value={ik.medical || ''} onChange={it('medical')} /></Field>
      <Field label="Injury history"><textarea value={ik.injury || ''} onChange={it('injury')} /></Field>
      <Field label="Dietary notes"><textarea value={ik.diet || ''} onChange={it('diet')} /></Field>
    </ModalShell>
  )
}

export default function ProfilePanel({ client, open, onClose }) {
  const { db } = useData()
  const { openModal } = useModal()
  const { fmtWt } = useFormat()
  const a = resolveAnthro(db, client)
  const ik = client.intake || {}
  const bmi = a.heightCm && a.massKg ? (a.massKg / (a.heightCm / 100) ** 2).toFixed(1) : '—'

  return (
    <>
      <div className={'cc-panel-overlay' + (open ? ' open' : '')} onClick={onClose} />
      <div className={'cc-panel' + (open ? ' open' : '')} aria-hidden={!open}>
        <div className="flex between">
          <div className="flex gap">
            <Avatar name={client.name} size={46} />
            <div>
              <h2>{client.name}</h2>
              <div className="muted" style={{ fontSize: 13 }}>{client.level} · {client.plan} plan · since {fmtDate(client.joined)}</div>
            </div>
          </div>
          <button className="x" onClick={onClose} aria-label="Close profile">×</button>
        </div>
        <div className="flex" style={{ marginTop: 10 }}><ReadinessTag readiness={readinessFor(db, client.id)} /></div>
        <div className="section-title" style={{ margin: '18px 0 0' }}>Anthropometrics</div>
        <div className="anthro-grid">
          <AnthroCell label="Age" value={a.age} unit=" yr" />
          <AnthroCell label="Height" value={a.heightCm} unit=" cm" />
          <AnthroCell label="Body Mass" value={a.massKg != null ? fmtWt(a.massKg) : null} />
          <AnthroCell label="Body Fat" value={a.bodyFatPct} unit="%" />
          <AnthroCell label="Lean Mass" value={a.leanMassKg != null ? fmtWt(a.leanMassKg) : null} />
          <AnthroCell label="BMI" value={bmi} />
        </div>
        <div className="section-title" style={{ margin: '6px 0 10px' }}>Intake & History Snapshot</div>
        {[['📋', 'Initial questionnaire', ik.questionnaire], ['🩺', 'Medical history', ik.medical], ['🩹', 'Injury history', ik.injury], ['🥗', 'Dietary notes', ik.diet]].map(([icn, h, v]) => (
          <div className="intake-block" key={h}>
            <div className="i-h">{icn} {h}</div>
            <div className="i-b">{v || '—'}</div>
          </div>
        ))}
        <div className="modal-foot" style={{ marginTop: 8 }}>
          <Button variant="ghost" onClick={() => openModal(<EditProfileForm client={client} />, true)}>Edit details</Button>
          <Button onClick={onClose}>Back to Dashboard</Button>
        </div>
      </div>
    </>
  )
}
