import { useState } from 'react'
import ModalShell from '../../molecules/ModalShell'
import Button from '../../atoms/Button'
import Field from '../../atoms/Field'
import { useData } from '../../../store/DataContext'
import { useModal } from '../../../store/ModalContext'
import { uid } from '../../../lib/format'
import { todayISO, fmtDay } from '../../../lib/dates'
import { toast } from '../../../lib/toast'

const CATS = ['Pain', 'Injury', 'Equipment', 'Scheduling', 'Form/Technique', 'Other']

export default function ConcernForm({ concern, clientId }) {
  const { db, commit, tz } = useData()
  const { closeModal } = useModal()
  const [f, setF] = useState(
    concern || { clientId: clientId || db.clients[0]?.id, date: todayISO(tz), sessionId: '', category: 'Pain', severity: 'Medium', source: 'Client', text: '', status: 'Open', resolution: '' },
  )
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const sessions = db.sessions.filter((s) => s.clientId === f.clientId).sort((a, b) => b.date.localeCompare(a.date))
  const save = () => {
    if (!f.clientId) return toast('Add a client first', 'error')
    if (!f.text.trim()) return toast('Please describe the concern', 'error')
    commit((d) => {
      const val = { clientId: f.clientId, category: f.category, severity: f.severity, date: f.date, sessionId: f.sessionId || null, text: f.text.trim(), source: 'Client' }
      if (concern) Object.assign(d.concerns.find((c) => c.id === concern.id), val)
      else d.concerns.push({ id: uid(), status: 'Open', resolution: '', ...val })
    })
    closeModal()
    toast(concern ? 'Concern updated' : 'Concern flagged')
  }
  return (
    <ModalShell title={(concern ? 'Edit' : 'Flag a') + ' Concern'} onClose={closeModal}
      footer={<><Button variant="ghost" onClick={closeModal}>Cancel</Button><Button onClick={save}>Submit</Button></>}>
      <Field label="Client (reporting)">
        <select value={f.clientId} onChange={(e) => setF({ ...f, clientId: e.target.value, sessionId: '' })}>
          {db.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      <div className="row3">
        <Field label="Category"><select value={f.category} onChange={set('category')}>{CATS.map((o) => <option key={o}>{o}</option>)}</select></Field>
        <Field label="Severity"><select value={f.severity} onChange={set('severity')}>{['Low', 'Medium', 'High'].map((o) => <option key={o}>{o}</option>)}</select></Field>
        <Field label="Date"><input type="date" value={f.date} onChange={set('date')} /></Field>
      </div>
      <Field label="Related session (optional)">
        <select value={f.sessionId || ''} onChange={set('sessionId')}>
          <option value="">— Not session-specific —</option>
          {sessions.map((s) => <option key={s.id} value={s.id}>{fmtDay(s.date)} · {s.time} · {s.type}</option>)}
        </select>
      </Field>
      <Field label="What's the concern?"><textarea value={f.text} onChange={set('text')} placeholder="Describe the issue..." /></Field>
    </ModalShell>
  )
}
