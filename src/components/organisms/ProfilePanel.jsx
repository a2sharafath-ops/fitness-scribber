import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Avatar from '../atoms/Avatar'
import Button from '../atoms/Button'
import Field from '../atoms/Field'
import Tag from '../atoms/Tag'
import ModalShell from '../molecules/ModalShell'
import { useData } from '../../store/DataContext'
import { useModal } from '../../store/ModalContext'
import { fmtDate, todayISO } from '../../lib/dates'
import { resolveAnthroDetails } from '../../lib/assessment'
import { toast } from '../../lib/toast'

export function EditProfileForm({ client }) {
  const { db, commit, tz } = useData()
  const { closeModal } = useModal()
  const details = resolveAnthroDetails(db, client)
  // Only edited fields become profile entries. Fallbacks stay at their source.
  const [a, setA] = useState(() => ({ ...(client.anthro || {}) }))
  const [dirty, setDirty] = useState({})
  const save = () => {
    const changed = Object.keys(dirty).filter((field) => dirty[field])
    if (changed.some((field) => a[field] !== '' && a[field] != null && (!Number.isFinite(+a[field]) || +a[field] < 0))) {
      toast('Enter a valid non-negative measurement', 'error')
      return
    }
    if (changed.length) commit((db) => {
      const c = db.clients.find((x) => x.id === client.id)
      c.anthro = c.anthro || {}
      c.anthro._sources = c.anthro._sources || {}
      for (const field of changed) {
        if (a[field] === '' || a[field] == null) {
          c.anthro[field] = null
          delete c.anthro._sources[field]
        } else {
          c.anthro[field] = +a[field]
          c.anthro._sources[field] = { kind: 'profile', date: todayISO(tz) }
        }
      }
    })
    closeModal()
    if (changed.length) toast('Profile measurements updated')
  }
  const an = (k) => (e) => { setA({ ...a, [k]: e.target.value }); setDirty({ ...dirty, [k]: true }) }
  const input = (field, label, step = '1') => <Field label={label}>
    <input type="number" min="0" step={step} value={a[field] ?? ''} onChange={an(field)} placeholder={details[field].value ?? ''} />
    <small className="profile-form-source">{details[field].label}{details[field].date ? ` · ${fmtDate(details[field].date)}` : ''}</small>
  </Field>
  return (
    <ModalShell title="Edit profile measurements" onClose={closeModal}
      footer={<><Button variant="ghost" onClick={closeModal}>Cancel</Button><Button onClick={save}>Save</Button></>}>
      <p className="muted" style={{ fontSize: 12, margin: '0 0 12px' }}>Only changed fields are saved as profile entries. Clear a field to use the latest assessment or screening value again.</p>
      <div className="row3">
        {input('age', 'Age', '1')}
        {input('heightCm', 'Height (cm)', '0.1')}
        {input('massKg', 'Body mass (kg)', '0.1')}
      </div>
      <div className="row2">
        {input('bodyFatPct', 'Body fat %', '0.1')}
        {input('leanMassKg', 'Lean mass (kg)', '0.1')}
      </div>
      <p className="muted" style={{ fontSize: 12, margin: '4px 0 0' }}>
        Medical and injury history remain in Assessments → Health screening.
      </p>
    </ModalShell>
  )
}

export default function ProfilePanel({ client, open, onClose }) {
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
        <div className="section-title" style={{ margin: '18px 0 4px' }}>At a glance</div>
        <div className="field"><label>Goal</label><div>{client.goal || '—'}</div></div>
        <div className="field"><label>Status</label><div><Tag color={client.status === 'Active' ? 'green' : 'gray'}>{client.status}</Tag></div></div>
        <div className="field"><label>Plan tier</label><div><Tag color={client.plan === 'Premium' ? 'purple' : 'gray'}>{client.plan}</Tag></div></div>

        <div className="modal-foot" style={{ marginTop: 14 }}>
          <Button onClick={viewFull}>Open profile →</Button>
        </div>
      </div>
    </>
  )
}
