import { useState } from 'react'
import ModalShell from '../../molecules/ModalShell'
import Button from '../../atoms/Button'
import Field from '../../atoms/Field'
import { useData } from '../../../store/DataContext'
import { useModal } from '../../../store/ModalContext'
import { uid } from '../../../lib/format'
import { todayISO } from '../../../lib/dates'

const TYPES = ['1-on-1 Training', 'Assessment', 'Consultation', 'Group Session', 'Check-in']
const STATUSES = ['Pending', 'Confirmed', 'Completed', 'Cancelled']

export default function SessionForm({ session, date }) {
  const { db, commit, tz } = useData()
  const { closeModal } = useModal()
  const [f, setF] = useState(
    session || { clientId: db.clients[0]?.id, date: date || todayISO(tz), time: '09:00', type: '1-on-1 Training', dur: 60, status: 'Pending' },
  )
  const set = (k, num) => (e) => setF({ ...f, [k]: num ? +e.target.value : e.target.value })
  const save = () => {
    if (!f.clientId) return alert('Add a client first')
    commit((d) => {
      if (session) Object.assign(d.sessions.find((s) => s.id === session.id), f)
      else d.sessions.push({ id: uid(), ...f })
    })
    closeModal()
  }
  const del = () => {
    commit((d) => { d.sessions = d.sessions.filter((s) => s.id !== session.id) })
    closeModal()
  }
  return (
    <ModalShell title={(session ? 'Edit' : 'Book') + ' Session'} onClose={closeModal}
      footer={<>
        {session && <Button variant="danger" onClick={del}>Delete</Button>}
        <Button variant="ghost" onClick={closeModal}>Cancel</Button>
        <Button onClick={save}>Save</Button>
      </>}>
      <Field label="Client">
        <select value={f.clientId} onChange={set('clientId')}>{db.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      </Field>
      <div className="row2">
        <Field label="Date"><input type="date" value={f.date} onChange={set('date')} /></Field>
        <Field label="Time"><input type="time" value={f.time} onChange={set('time')} /></Field>
      </div>
      <div className="row3">
        <Field label="Type"><select value={f.type} onChange={set('type')}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
        <Field label="Duration (min)"><input type="number" value={f.dur} onChange={set('dur', true)} /></Field>
        <Field label="Status"><select value={f.status} onChange={set('status')}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></Field>
      </div>
    </ModalShell>
  )
}
