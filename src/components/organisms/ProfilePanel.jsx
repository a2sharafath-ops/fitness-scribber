import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Avatar from '../atoms/Avatar'
import Button from '../atoms/Button'
import Field from '../atoms/Field'
import Tag from '../atoms/Tag'
import ReadinessTag from '../molecules/ReadinessTag'
import ModalShell from '../molecules/ModalShell'
import { useData } from '../../store/DataContext'
import { useModal } from '../../store/ModalContext'
import { fmtDate } from '../../lib/dates'
import { readinessFor } from '../../lib/calc'
import { resolveAnthro } from '../../lib/assessment'

const LEVEL_COLOR = { Beginner: 'blue', Intermediate: 'purple', Advanced: 'orange' }

export function EditProfileForm({ client }) {
  const { db, commit } = useData()
  const { closeModal } = useModal()
  // Prefilled with screening/assessment fallbacks; saving persists them.
  const [a, setA] = useState(() => resolveAnthro(db, client))
  const numOrNull = (v) => (v === '' ? null : +v)
  const save = () => {
    commit((db) => {
      const c = db.clients.find((x) => x.id === client.id)
      c.anthro = { age: numOrNull(a.age), heightCm: numOrNull(a.heightCm), massKg: numOrNull(a.massKg), bodyFatPct: numOrNull(a.bodyFatPct), leanMassKg: numOrNull(a.leanMassKg) }
    })
    closeModal()
  }
  const an = (k) => (e) => setA({ ...a, [k]: e.target.value })
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
      <p className="muted" style={{ fontSize: 12, margin: '4px 0 0' }}>
        Medical, injury &amp; lifestyle history live in the health screening (HHQ / PAR-Q) — see the client's profile.
      </p>
    </ModalShell>
  )
}

export default function ProfilePanel({ client, open, onClose }) {
  const { db } = useData()
  const nav = useNavigate()
  const viewFull = () => { onClose(); nav('/clients/' + client.id + '/profile') }

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

        <div className="section-title" style={{ margin: '18px 0 4px' }}>Profile</div>
        <div className="field"><label>Goal</label><div>{client.goal || '—'}</div></div>
        <div className="field"><label>Level</label><div><Tag color={LEVEL_COLOR[client.level]}>{client.level}</Tag></div></div>
        <div className="field"><label>Status</label><div><Tag color={client.status === 'Active' ? 'green' : 'gray'}>{client.status}</Tag></div></div>
        <div className="field"><label>Plan tier</label><div><Tag color={client.plan === 'Premium' ? 'purple' : 'gray'}>{client.plan}</Tag></div></div>
        <div className="field"><label>Member since</label><div>{fmtDate(client.joined)}</div></div>
        <div className="field" style={{ margin: 0 }}><label>Notes</label><div className="muted">{client.notes || '—'}</div></div>

        <div className="modal-foot" style={{ marginTop: 14 }}>
          <Button onClick={viewFull}>View full profile →</Button>
        </div>
      </div>
    </>
  )
}
