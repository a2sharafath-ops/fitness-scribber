import Select from '../components/molecules/Select'
import { useState } from 'react'
import Button from '../components/atoms/Button'
import AppearanceControls from '../components/molecules/AppearanceControls'
import Field from '../components/atoms/Field'
import ExportMenu from '../components/organisms/forms/ExportMenu'
import ChangePasswordCard from '../components/organisms/forms/ChangePasswordCard'
import CommsSettingsCard from '../components/organisms/forms/CommsSettingsCard'
import { useData } from '../store/DataContext'
import { useModal } from '../store/ModalContext'
import { useAuth } from '../store/AuthContext'
import { hasBackend } from '../lib/supabase'
import { seedRemote } from '../api/sync'
import { todayISO, fmtDate } from '../lib/dates'
import { toast, confirmDialog } from '../lib/toast'

const TZS = ['', 'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London', 'Europe/Berlin', 'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Australia/Sydney']

export default function SettingsPage({ appearance }) {
  const { db, commit, refresh } = useData()
  const { openModal } = useModal()
  const { user, signOut } = useAuth()
  const s = db.settings
  const loadDemo = async () => {
    if (!await confirmDialog({ title: 'Load demo data', message: 'Add demo athletes and 28 days of sample data to this account?', confirmLabel: 'Load' })) return
    try { await seedRemote(); await refresh(); toast('Demo data loaded') } catch (e) { toast('Couldn’t load demo data.' + (e.message ? ' ' + e.message : ''), 'error') }
  }
  const [f, setF] = useState({ trainerName: s.trainerName || '', businessName: s.businessName || '', units: s.units, tz: s.tz })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const save = () => { commit((d) => { Object.assign(d.settings, { trainerName: f.trainerName.trim(), businessName: f.businessName.trim(), units: f.units, tz: f.tz }) }); toast('Settings saved') }

  return (
    <>
      <div className="topbar"><div><h1>Settings</h1><div className="sub">Appearance settings are saved in this browser.</div></div></div>
      <div className="orbit-settings-grid">
      <section className="card orbit-appearance-panel">
        <h2>Appearance</h2>
        <AppearanceControls prefix="settings" appearance={appearance} />
      </section>
      <div className="card">
        <div className="section-title" style={{ margin: '0 0 12px' }}>Coach &amp; business</div>
        <div className="row2">
          <Field label="Coach name"><input value={f.trainerName} onChange={set('trainerName')} /></Field>
          <Field label="Business name"><input value={f.businessName} onChange={set('businessName')} /></Field>
        </div>
        <div className="section-title" style={{ margin: '14px 0 12px' }}>Units &amp; time</div>
        <div className="row2">
          <Field label="Weight units">
            <Select value={f.units} onChange={set('units')}><option value="kg">Metric (kg)</option><option value="lb">Imperial (lb)</option></Select>
          </Field>
          <Field label="Coach timezone">
            <Select value={f.tz || ''} onChange={set('tz')}>{TZS.map((t) => <option key={t} value={t}>{t || 'UTC (default)'}</option>)}</Select>
          </Field>
        </div>
        <div className="muted" style={{ fontSize: 12 }}>Date in this time zone: <strong>{fmtDate(todayISO(f.tz))}</strong></div>
        <div className="modal-foot"><Button onClick={save}>Save settings</Button></div>
      </div>

      <CommsSettingsCard />
      <div className="card">
        <div className="section-title" style={{ margin: '0 0 8px' }}>Data</div>
        <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
          {hasBackend ? 'Data is synced to your account.' : 'Data is stored in this browser.'}
        </p>
        <Button variant="ghost" onClick={() => openModal(<ExportMenu />)}>Export data (CSV)</Button>
      </div>
      {hasBackend && (
        <div className="card">
          <div className="section-title" style={{ margin: '0 0 8px' }}>Account</div>
          <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>Signed in as <strong>{user?.email}</strong></p>
          <div className="flex gap">
            <Button variant="ghost" onClick={loadDemo}>Load demo data</Button>
            <Button variant="danger" onClick={signOut}>Sign out</Button>
          </div>
        </div>
      )}
      {hasBackend && <ChangePasswordCard />}
      </div>
    </>
  )
}
