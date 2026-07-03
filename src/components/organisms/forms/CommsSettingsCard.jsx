import { useState } from 'react'
import Button from '../../atoms/Button'
import { useData } from '../../../store/DataContext'
import { hasBackend } from '../../../lib/supabase'

const def = (v, d) => (v === undefined || v === null ? d : v)

// Per-coach reminder/nudge preferences. Persists onto db.settings, which the
// comms-cron Edge Function reads (backend) or the local generator reads
// (local mode). See src/lib/nudges.js for the rules these toggles drive.
export default function CommsSettingsCard() {
  const { db, commit } = useData()
  const s = db.settings
  const [f, setF] = useState({
    remindersEnabled: def(s.remindersEnabled, true),
    reminderLeadHours: def(s.reminderLeadHours, 24),
    nudgeMissed: def(s.nudgeMissed, true),
    nudgeLowActivity: def(s.nudgeLowActivity, true),
    lowActivityDays: def(s.lowActivityDays, 4),
    nudgeIncomplete: def(s.nudgeIncomplete, true),
    nudgeReassess: def(s.nudgeReassess, true),
    reassessIntervalDays: def(s.reassessIntervalDays, 84),
  })
  const [saved, setSaved] = useState(false)
  const setBool = (k) => (e) => setF({ ...f, [k]: e.target.checked })
  const setNum = (k) => (e) => setF({ ...f, [k]: Math.max(1, +e.target.value || 1) })
  const save = () => { commit((d) => Object.assign(d.settings, f)); setSaved(true); setTimeout(() => setSaved(false), 1500) }

  return (
    <div className="card" style={{ maxWidth: 560, marginTop: 16 }}>
      <div className="section-title" style={{ margin: '0 0 6px' }}>Client communication</div>
      <p className="muted" style={{ fontSize: 12, marginTop: 0 }}>
        Automated reminders and follow-up nudges posted to each athlete's chat.
      </p>

      <label className="cs-row">
        <input type="checkbox" checked={f.remindersEnabled} onChange={setBool('remindersEnabled')} />
        <span>Session reminders</span>
        <span className="cs-inline">lead
          <input type="number" min="1" value={f.reminderLeadHours} onChange={setNum('reminderLeadHours')} disabled={!f.remindersEnabled} /> h
        </span>
      </label>

      <label className="cs-row">
        <input type="checkbox" checked={f.nudgeMissed} onChange={setBool('nudgeMissed')} />
        <span>Missed-session nudge</span>
      </label>

      <label className="cs-row">
        <input type="checkbox" checked={f.nudgeLowActivity} onChange={setBool('nudgeLowActivity')} />
        <span>Low-activity nudge</span>
        <span className="cs-inline">after
          <input type="number" min="1" value={f.lowActivityDays} onChange={setNum('lowActivityDays')} disabled={!f.nudgeLowActivity} /> days
        </span>
      </label>

      <label className="cs-row">
        <input type="checkbox" checked={f.nudgeIncomplete} onChange={setBool('nudgeIncomplete')} />
        <span>Incomplete-workout nudge</span>
      </label>

      <label className="cs-row">
        <input type="checkbox" checked={f.nudgeReassess} onChange={setBool('nudgeReassess')} />
        <span>Reassessment reminder</span>
        <span className="cs-inline">every
          <input type="number" min="7" value={f.reassessIntervalDays} onChange={setNum('reassessIntervalDays')} disabled={!f.nudgeReassess} /> days
        </span>
      </label>

      <div className="modal-foot" style={{ alignItems: 'center', gap: 10 }}>
        {hasBackend ? <span className="muted" style={{ fontSize: 11 }}>Requires schema_comms.sql + the comms-cron function.</span> : null}
        <Button onClick={save}>{saved ? 'Saved ✓' : 'Save'}</Button>
      </div>
    </div>
  )
}
