import { useState } from 'react'
import Button from '../components/atoms/Button'
import Field from '../components/atoms/Field'
import ExportMenu from '../components/organisms/forms/ExportMenu'
import ChangePasswordCard from '../components/organisms/forms/ChangePasswordCard'
import CommsSettingsCard from '../components/organisms/forms/CommsSettingsCard'
import PoolingModeSwitch from '../components/organisms/program/PoolingModeSwitch'
import { useData } from '../store/DataContext'
import { useModal } from '../store/ModalContext'
import { useAuth } from '../store/AuthContext'
import { hasBackend } from '../lib/supabase'
import { seedRemote } from '../api/sync'
import { todayISO, fmtDate } from '../lib/dates'
import { toast, confirmDialog } from '../lib/toast'
import usePoolingRuntime from '../hooks/usePoolingRuntime'

const TZS = ['', 'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London', 'Europe/Berlin', 'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Australia/Sydney']

export default function SettingsPage() {
  const { db, commit, refresh } = useData()
  const { openModal } = useModal()
  const { user, signOut } = useAuth()
  const s = db.settings
  const workflowClient = db.clients.find((client) => !client.intake?.testOnly && !client.id.startsWith('fs_pool_coachtest_')) || db.clients[0]
  const workflowRuntime = usePoolingRuntime(workflowClient?.id || '')
  const loadDemo = async () => {
    if (!await confirmDialog({ title: 'Load demo data', message: 'Load demo athletes & 28 days of sample data into your account?', confirmLabel: 'Load' })) return
    try { await seedRemote(); await refresh(); toast('Demo data loaded') } catch (e) { toast('Seed failed: ' + e.message, 'error') }
  }
  const [f, setF] = useState({ trainerName: s.trainerName || '', businessName: s.businessName || '', units: s.units, tz: s.tz })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const save = () => { commit((d) => { Object.assign(d.settings, { trainerName: f.trainerName.trim(), businessName: f.businessName.trim(), units: f.units, tz: f.tz }) }); toast('Settings saved') }

  return (
    <>
      <div className="topbar"><div><h1>Settings</h1><div className="sub">Account, workflow and app preferences</div></div></div>
      <div className="card" style={{ maxWidth: 560 }}>
        <div className="section-title" style={{ margin: '0 0 12px' }}>Coach &amp; business</div>
        <div className="row2">
          <Field label="Coach name"><input value={f.trainerName} onChange={set('trainerName')} /></Field>
          <Field label="Business name"><input value={f.businessName} onChange={set('businessName')} /></Field>
        </div>
        <div className="section-title" style={{ margin: '14px 0 12px' }}>Units &amp; time</div>
        <div className="row2">
          <Field label="Weight units">
            <select value={f.units} onChange={set('units')}><option value="kg">Metric (kg)</option><option value="lb">Imperial (lb)</option></select>
          </Field>
          <Field label="Timezone (day boundary for check-ins)">
            <select value={f.tz} onChange={set('tz')}>{TZS.map((t) => <option key={t} value={t}>{t || 'Device default'}</option>)}</select>
          </Field>
        </div>
        <div className="muted" style={{ fontSize: 12 }}>Today resolves to: <strong>{fmtDate(todayISO(f.tz))}</strong></div>
        <div className="modal-foot"><Button onClick={save}>Save settings</Button></div>
      </div>

      {hasBackend && workflowClient && workflowRuntime.status === 'loading' && <div className="card settings-workflow-card" role="status"><div className="section-title" style={{margin:'0 0 8px'}}>Workout workflow</div><p className="muted">Checking the current workflow…</p></div>}
      {hasBackend && workflowClient && workflowRuntime.status === 'unavailable' && <div className="card settings-workflow-card" role="alert"><div className="section-title" style={{margin:'0 0 8px'}}>Workout workflow</div><p className="muted" style={{fontSize:13}}>The current workflow could not be checked. Nothing was changed. Check your connection and reload Settings.</p></div>}
      {hasBackend && workflowClient && !['loading','unavailable'].includes(workflowRuntime.status) && <PoolingModeSwitch clientId={workflowClient.id} runtime={workflowRuntime} />}
      {hasBackend && !workflowClient && <div className="card settings-workflow-card"><div className="section-title" style={{margin:'0 0 8px'}}>Workout workflow</div><p className="muted" style={{fontSize:13}}>Add a test client before choosing a workout workflow. No data has been changed.</p></div>}

      <CommsSettingsCard />
      <div className="card" style={{ maxWidth: 560, marginTop: 16 }}>
        <div className="section-title" style={{ margin: '0 0 8px' }}>Data</div>
        <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
          {hasBackend ? 'Your data is stored in your Supabase account.' : 'All data is stored locally in this browser.'} Export it for backup or to share.
        </p>
        <Button variant="ghost" onClick={() => openModal(<ExportMenu />)}>⬇ Export data (CSV)</Button>
      </div>
      {hasBackend && (
        <div className="card" style={{ maxWidth: 560, marginTop: 16 }}>
          <div className="section-title" style={{ margin: '0 0 8px' }}>Account</div>
          <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>Signed in as <strong>{user?.email}</strong></p>
          <div className="flex gap">
            <Button variant="ghost" onClick={loadDemo}>✨ Load demo data</Button>
            <Button variant="danger" onClick={signOut}>Sign out</Button>
          </div>
        </div>
      )}
      {hasBackend && <ChangePasswordCard style={{ maxWidth: 560, marginTop: 16 }} />}
    </>
  )
}
