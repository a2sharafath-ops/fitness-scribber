import Field from '../../atoms/Field'
import YesNoRow from '../../molecules/YesNoRow'
import { CLIENT_RESULT_MESSAGE } from '../../../lib/parq'
import { ageFrom } from '../../../lib/screening'
import { todayISO } from '../../../lib/dates'

// HHQ §2A personal info + §2B emergency & medical contacts.
// Opens with the neutral post-PAR-Q+ message — never a clearance/risk result.
// Age is auto-computed from DOB (populate, don't ask again).
export default function HhqPersonalStep({ personal, contacts, onChange }) {
  const p = (k) => (e) => onChange('personal', { ...personal, [k]: e.target.value })
  const pn = (k) => (e) => onChange('personal', { ...personal, [k]: e.target.value === '' ? null : +e.target.value })
  const c = (k) => (e) => onChange('contacts', { ...contacts, [k]: e.target.value })
  const setDob = (e) => {
    const dob = e.target.value
    onChange('personal', { ...personal, dob, age: ageFrom(dob, todayISO()) ?? personal.age })
  }
  return (
    <>
      <div className="scr-banner">{CLIENT_RESULT_MESSAGE}</div>
      <h3 className="scr-step-title">About you</h3>
      <p className="scr-step-sub">Basics your trainer needs on file.</p>
      <div className="row3">
        <Field label="Date of birth"><input type="date" value={personal.dob || ''} onChange={setDob} /></Field>
        <Field label={'Age' + (personal.dob ? ' (from DOB)' : '')}><input type="number" value={personal.age ?? ''} onChange={pn('age')} disabled={!!personal.dob} /></Field>
        <Field label="Sex at birth">
          <select value={personal.sex || ''} onChange={p('sex')}>
            <option value="">—</option>{['Female', 'Male', 'Prefer not to say'].map((o) => <option key={o}>{o}</option>)}
          </select>
        </Field>
      </div>
      <div className="row3">
        <Field label="Gender identity (optional)"><input value={personal.gender || ''} onChange={p('gender')} /></Field>
        <Field label="Height (cm)"><input type="number" value={personal.heightCm ?? ''} onChange={pn('heightCm')} /></Field>
        <Field label="Weight (kg)"><input type="number" step="0.1" value={personal.massKg ?? ''} onChange={pn('massKg')} /></Field>
      </div>
      <div className="row2">
        <Field label="Preferred contact (email/phone)"><input value={personal.preferredContact || ''} onChange={p('preferredContact')} /></Field>
        <Field label="Preferred language"><input value={personal.language || ''} onChange={p('language')} /></Field>
      </div>
      <div className="row2">
        <Field label="Occupation"><input value={personal.occupation || ''} onChange={p('occupation')} /></Field>
        <Field label="Typical activity at work">
          <select value={personal.workActivity || ''} onChange={p('workActivity')}>
            <option value="">—</option>{['sitting', 'standing', 'manual'].map((o) => <option key={o}>{o}</option>)}
          </select>
        </Field>
      </div>
      <h3 className="scr-step-title" style={{ marginTop: 14 }}>Emergency & medical contacts</h3>
      <div className="row3">
        <Field label="Emergency contact name"><input value={contacts.emergencyName || ''} onChange={c('emergencyName')} /></Field>
        <Field label="Phone"><input value={contacts.emergencyPhone || ''} onChange={c('emergencyPhone')} /></Field>
        <Field label="Relationship"><input value={contacts.emergencyRelation || ''} onChange={c('emergencyRelation')} /></Field>
      </div>
      <div className="row2">
        <Field label="Primary physician (name & clinic, optional)"><input value={contacts.physician || ''} onChange={c('physician')} /></Field>
        <Field label="Physician phone (optional)"><input value={contacts.physicianPhone || ''} onChange={c('physicianPhone')} /></Field>
      </div>
      <YesNoRow text="Do you have medical/health insurance? (optional)" value={contacts.insurance} onChange={(v) => onChange('contacts', { ...contacts, insurance: v })} />
    </>
  )
}
