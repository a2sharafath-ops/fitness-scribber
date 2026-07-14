import { useState } from 'react'
import ModalShell from '../../molecules/ModalShell'
import Button from '../../atoms/Button'
import Field from '../../atoms/Field'
import { useData } from '../../../store/DataContext'
import { useModal } from '../../../store/ModalContext'
import { uid } from '../../../lib/format'
import { todayISO } from '../../../lib/dates'
import { screeningsFor, programStatus } from '../../../lib/screening'
import { toast, confirmDialog } from '../../../lib/toast'

const LEVELS = ['Beginner', 'Intermediate', 'Advanced']

export function ClientForm({ client }) {
  const { commit, tz } = useData()
  const { closeModal } = useModal()
  const [f, setF] = useState(
    client || { name: '', email: '', phone: '', goal: '', level: 'Beginner', status: 'Active', plan: 'Standard', notes: '' },
  )
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const save = () => {
    if (!f.name.trim()) return toast('Name is required', 'error')
    commit((db) => {
      if (client) Object.assign(db.clients.find((c) => c.id === client.id), f)
      else
        db.clients.push({
          id: uid(), joined: todayISO(tz), planId: null, monitorOptIn: false,
          anthro: { age: null, heightCm: null, massKg: null, bodyFatPct: null, leanMassKg: null }, ...f,
        })
    })
    closeModal()
    toast(client ? 'Client updated' : 'Client added')
  }
  const del = async () => {
    if (!await confirmDialog({ title: 'Delete client', message: 'Delete this client and all their data? This cannot be undone.', confirmLabel: 'Delete', danger: true })) return
    commit((db) => {
      db.clients = db.clients.filter((c) => c.id !== client.id)
      ;['sessions', 'logs', 'wellness', 'srpe', 'resistance', 'cardio', 'wearable', 'concerns', 'prescriptions'].forEach(
        (k) => (db[k] = db[k].filter((x) => x.clientId !== client.id)),
      )
    })
    closeModal()
    toast('Client deleted')
  }

  return (
    <ModalShell
      title={(client ? 'Edit' : 'Add') + ' Client'}
      onClose={closeModal}
      footer={
        <>
          {client && <Button variant="danger" onClick={del}>Delete</Button>}
          <Button variant="ghost" onClick={closeModal}>Cancel</Button>
          <Button onClick={save}>Save</Button>
        </>
      }
    >
      <Field label="Full name">
        <input value={f.name} onChange={set('name')} placeholder="e.g. Sarah Mitchell" />
      </Field>
      <div className="row2">
        <Field label="Email"><input value={f.email} onChange={set('email')} /></Field>
        <Field label="Phone"><input value={f.phone} onChange={set('phone')} /></Field>
      </div>
      <Field label="Goal"><input value={f.goal} onChange={set('goal')} placeholder="e.g. Lose 8kg & tone" /></Field>
      <div className="row3">
        <Field label="Level">
          <select value={f.level} onChange={set('level')}>{LEVELS.map((o) => <option key={o}>{o}</option>)}</select>
        </Field>
        <Field label="Status">
          <select value={f.status} onChange={set('status')}>{['Active', 'Paused'].map((o) => <option key={o}>{o}</option>)}</select>
        </Field>
        <Field label="Plan tier">
          <select value={f.plan} onChange={set('plan')}>{['Standard', 'Premium'].map((o) => <option key={o}>{o}</option>)}</select>
        </Field>
      </div>
      <Field label="Notes"><textarea value={f.notes} onChange={set('notes')} placeholder="Injuries, preferences, etc." /></Field>
    </ModalShell>
  )
}

export function InviteAthleteForm({ client }) {
  const { commit } = useData()
  const { closeModal } = useModal()
  const [code, setCode] = useState(client.inviteCode || '')
  const gen = () => {
    const c = (Math.random().toString(36).slice(2, 6) + Math.random().toString(36).slice(2, 4))
      .toUpperCase().replace(/(.{4})(.{2})/, '$1-$2')
    setCode(c)
    commit((db) => { db.clients.find((x) => x.id === client.id).inviteCode = c })
  }
  if (client.userId) {
    return (
      <ModalShell title="Athlete access" onClose={closeModal} footer={<Button onClick={closeModal}>Close</Button>}>
        <p>✓ {client.name} has linked their athlete account and can submit their own check-ins.</p>
      </ModalShell>
    )
  }
  return (
    <ModalShell title={'Invite ' + client.name} onClose={closeModal} footer={<Button onClick={closeModal}>Done</Button>}>
      <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
        Share this code with your athlete. They sign up, choose “I have an invite code”, and enter it to link their account — then they can submit their own morning check-ins and session RPE.
      </p>
      {code && (
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="muted" style={{ fontSize: 11 }}>INVITE CODE</div>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: 2 }}>{code}</div>
        </div>
      )}
      <Button style={{ marginTop: 12 }} onClick={gen}>{code ? 'Regenerate code' : 'Generate invite code'}</Button>
    </ModalShell>
  )
}

// Package tiers a trainer can put a client on. Static reference config (like
// LEVELS) — the client's chosen tier lives on the client record.
const PACKAGE_TIERS = [
  { id: 'Standard', blurb: 'Core programming, weekly check-ins & progress tracking.' },
  { id: 'Premium', blurb: 'Everything in Standard plus priority messaging, adaptive AI coaching & detailed reports.' },
]

export function UpgradePackageForm({ client }) {
  const { commit } = useData()
  const { closeModal } = useModal()
  const [plan, setPlan] = useState(client.plan || 'Standard')
  const save = () => {
    commit((db) => { db.clients.find((c) => c.id === client.id).plan = plan })
    closeModal()
    toast(plan === client.plan ? 'Package unchanged' : `Package changed to ${plan}`)
  }
  return (
    <ModalShell
      title={'Package — ' + client.name}
      onClose={closeModal}
      footer={<><Button variant="ghost" onClick={closeModal}>Cancel</Button><Button disabled={plan === client.plan} onClick={save}>Save package</Button></>}
    >
      <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
        Current package: <strong>{client.plan}</strong>. Choose {client.name}'s package tier.
      </p>
      <div className="pkg-tiers">
        {PACKAGE_TIERS.map((t) => (
          <button type="button" key={t.id} className={'pkg-tier' + (plan === t.id ? ' on' : '')}
            aria-pressed={plan === t.id} onClick={() => setPlan(t.id)}>
            <div className="pkg-tier-h">
              <span className="pkg-tier-name">{t.id}</span>
              {t.id === client.plan && <span className="pkg-tier-cur">Current</span>}
            </div>
            <div className="pkg-tier-b muted">{t.blurb}</div>
          </button>
        ))}
      </div>
    </ModalShell>
  )
}

export function AssignPlanForm({ client }) {
  const { db, commit } = useData()
  const { closeModal } = useModal()
  const [planId, setPlanId] = useState(client.planId || '')
  // Safety gate: a screening with outcome C (or a major red flag) blocks starting
  // an active program until the trainer records clearance as Received.
  const { complete } = screeningsFor(db.screenings, client.id)
  const gated = !!complete && programStatus(complete) === 'gated'
  const blocked = gated && !!planId
  const save = () => {
    if (blocked) return
    commit((d) => { d.clients.find((c) => c.id === client.id).planId = planId || null })
    closeModal()
  }
  return (
    <ModalShell
      title={'Assign Plan to ' + client.name}
      onClose={closeModal}
      footer={<><Button variant="ghost" onClick={closeModal}>Cancel</Button><Button disabled={blocked} onClick={save}>Save</Button></>}
    >
      <Field label="Workout plan">
        <select value={planId} onChange={(e) => setPlanId(e.target.value)}>
          <option value="">— None —</option>
          {db.plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      {gated && (
        <p className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>
          ⚠ {client.name}'s health screening needs review before an active program starts.
          Record physician/ePARmed-X+ clearance as <strong>Received</strong> in their profile
          (Health screening card) to unlock plan assignment.
        </p>
      )}
    </ModalShell>
  )
}
