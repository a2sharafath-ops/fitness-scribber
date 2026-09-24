import { useState } from 'react'
import Button from '../../atoms/Button'
import Field from '../../atoms/Field'
import ModalShell from '../../molecules/ModalShell'
import { useData } from '../../../store/DataContext'
import { useModal } from '../../../store/ModalContext'
import { PREFERENCE_FIELDS, preferenceDetails } from '../../../lib/profile'
import { todayISO, fmtDate } from '../../../lib/dates'
import { toast } from '../../../lib/toast'

export default function ProfilePreferencesForm({ client, screening }) {
  const { commit, tz } = useData()
  const { closeModal } = useModal()
  const details = preferenceDetails(client, screening)
  const [values, setValues] = useState(() => Object.fromEntries(PREFERENCE_FIELDS.map(([key]) => [key, details[key].value])))
  const [dirty, setDirty] = useState({})
  const change = (key) => (event) => {
    setValues((old) => ({ ...old, [key]: event.target.value }))
    setDirty((old) => ({ ...old, [key]: true }))
  }
  const save = () => {
    const changed = Object.keys(dirty).filter((key) => dirty[key])
    if (changed.includes('daysPerWeek') && values.daysPerWeek && (+values.daysPerWeek < 0 || !Number.isFinite(+values.daysPerWeek))) return toast('Enter a valid number of days', 'error')
    if (changed.includes('sessionMinutes') && values.sessionMinutes && (+values.sessionMinutes < 0 || !Number.isFinite(+values.sessionMinutes))) return toast('Enter a valid session length', 'error')
    if (changed.length) commit((draft) => {
      const row = draft.clients.find((item) => item.id === client.id)
      row.intake = row.intake || {}
      const saved = row.intake.profilePreferences || { values: {}, dates: {} }
      const next = { values: { ...(saved.values || {}) }, dates: { ...(saved.dates || {}) } }
      for (const key of changed) {
        const value = values[key].trim()
        if (value) { next.values[key] = value; next.dates[key] = todayISO(tz) }
        else { delete next.values[key]; delete next.dates[key] }
      }
      row.intake.profilePreferences = next
    })
    closeModal()
    if (changed.length) toast('Preferences updated')
  }
  const field = (key, label, numeric = false) => <Field key={key} label={label}>
    <input type={numeric ? 'number' : 'text'} min={numeric ? '0' : undefined} value={values[key]} onChange={change(key)} />
    <small className="profile-form-source">{details[key].source}{details[key].date ? ` · ${fmtDate(details[key].date)}` : ''}</small>
  </Field>
  return <ModalShell title="Edit preferences & availability" onClose={closeModal}
    footer={<><Button variant="ghost" onClick={closeModal}>Cancel</Button><Button onClick={save}>Save preferences</Button></>}>
    <p className="muted" style={{ fontSize: 12, margin: '0 0 12px' }}>Only changed fields are saved. Clear a field to use the latest completed screening answer. The signed screening stays unchanged.</p>
    <div className="section-title">Training preferences</div>
    <div className="row2">{field('enjoys', 'Enjoys')}{field('dislikes', 'Dislikes')}</div>
    {field('intensity', 'Intensity preference')}
    <div className="section-title">Availability</div>
    <div className="row2">{field('daysPerWeek', 'Days per week', true)}{field('sessionMinutes', 'Session length (min)', true)}</div>
    <div className="row2">{field('timeOfDay', 'Preferred times')}{field('unavailable', 'Unavailable')}</div>
    <div className="section-title">Environment</div>
    <div className="row2">{field('locations', 'Locations')}{field('equipment', 'Equipment')}</div>
    <div className="row2">{field('space', 'Space constraints')}{field('groupPref', 'Session format')}</div>
  </ModalShell>
}
