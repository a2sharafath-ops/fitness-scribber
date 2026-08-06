import { useCallback, useEffect, useMemo, useState } from 'react'
import Brand from '../components/atoms/Brand'
import Button from '../components/atoms/Button'
import Kpi from '../components/atoms/Kpi'
import SegToggle from '../components/molecules/SegToggle'
import CoachManager from '../components/organisms/admin/CoachManager'
import AthleteManager from '../components/organisms/admin/AthleteManager'
import CoachDataPanel from '../components/organisms/admin/CoachDataPanel'
import { useAuth } from '../store/AuthContext'
import * as adminApi from '../api/admin'
import { toast } from '../lib/toast'
import './AdminPortal.css'

// Admin portal — platform oversight + user management. The only page allowed
// to import from src/api/admin.js.
export default function AdminPortal() {
  const { user, signOut } = useAuth()
  const [users, setUsers] = useState(null)
  const [clients, setClients] = useState([])
  const [counts, setCounts] = useState({})
  const [tab, setTab] = useState('overview')
  const [busy, setBusy] = useState(false)
  const [viewing, setViewing] = useState(null) // coach being inspected read-only

  // Load each source independently: a failing edge function must not blank
  // out the database-backed oversight data (and vice versa).
  const load = useCallback(async () => {
    const [u, c, n] = await Promise.allSettled([
      adminApi.listUsers(),
      adminApi.listAllClients(),
      adminApi.platformCounts(),
    ])
    if (u.status === 'fulfilled') setUsers(u.value)
    else { setUsers([]); toast(`User list failed: ${u.reason?.message || u.reason}`, 'error', 8000) }
    if (c.status === 'fulfilled') setClients(c.value)
    else toast(`Clients failed: ${c.reason?.message || c.reason}`, 'error', 8000)
    if (n.status === 'fulfilled') setCounts(n.value)
  }, [])
  useEffect(() => { load() }, [load])

  const run = async (fn, okMsg) => {
    setBusy(true)
    try { await fn(); if (okMsg) toast(okMsg); await load() }
    catch (e) { toast(e.message || 'Action failed', 'error') }
    finally { setBusy(false) }
  }

  const staff = useMemo(() => (users || []).filter((u) => u.role !== 'athlete'), [users])
  const athletes = useMemo(() => (users || []).filter((u) => u.role === 'athlete'), [users])
  const clientCounts = useMemo(() => {
    const m = new Map()
    clients.forEach((c) => m.set(c.coachId, (m.get(c.coachId) || 0) + 1))
    return m
  }, [clients])
  const coachName = (id) => {
    const u = (users || []).find((x) => x.id === id)
    return u ? (u.displayName || u.email) : 'unknown'
  }

  if (users === null) return <div className="empty" style={{ paddingTop: 120 }}><div className="big">⏳</div>Loading admin portal…</div>

  return (
    <div id="app" className="adm-portal">
      <header className="adm-bar">
        <Brand />
        <span className="tag purple">Admin</span>
        <span className="muted" style={{ marginLeft: 'auto', fontSize: 13 }}>{user?.email}</span>
        <Button size="sm" variant="ghost" onClick={signOut}>Sign out</Button>
      </header>

      <main className="adm-main">
        {viewing ? (
          <CoachDataPanel
            coach={viewing}
            clients={clients.filter((c) => c.coachId === viewing.id)}
            onBack={() => setViewing(null)}
          />
        ) : (
          <>
            <SegToggle
              ariaLabel="Admin section"
              options={[['overview', 'Overview'], ['coaches', `Coaches · ${staff.filter((u) => u.role === 'coach').length}`], ['athletes', `Athletes · ${athletes.length}`]]}
              value={tab} onChange={setTab}
            />

            {tab === 'overview' && (
              <div className="kpis adm-kpis">
                <Kpi label="Coaches" value={staff.filter((u) => u.role === 'coach').length} onClick={() => setTab('coaches')} />
                <Kpi label="Athlete logins" value={athletes.length} onClick={() => setTab('athletes')} />
                <Kpi label="Clients" value={clients.length} />
                <Kpi label="Sessions" value={counts.sessions ?? 0} />
                <Kpi label="Workouts" value={counts.workouts ?? 0} />
                <Kpi label="Check-ins" value={(counts.wellness ?? 0) + (counts.srpe ?? 0)} />
              </div>
            )}

            {(tab === 'overview' || tab === 'coaches') && (
              <CoachManager
                users={staff}
                clientCounts={clientCounts}
                currentUserId={user?.id}
                busy={busy}
                onCreate={(email, password, displayName) => run(() => adminApi.createCoach(email, password, displayName), `Coach account created for ${email}`)}
                onInvite={(email) => run(() => adminApi.inviteCoach(email), `Invite sent to ${email}`)}
                onToggleActive={(id, disabled) => run(() => (disabled ? adminApi.reactivateUser(id) : adminApi.deactivateUser(id)), disabled ? 'Reactivated' : 'Deactivated')}
                onDelete={(id) => run(() => adminApi.deleteUser(id), 'Account deleted')}
                onSetRole={(id, role) => run(() => adminApi.setUserRole(id, role), 'Role updated')}
                onReset={(email) => run(() => adminApi.sendPasswordReset(email), `Reset email sent to ${email}`)}
                onView={setViewing}
              />
            )}

            {tab === 'athletes' && (
              <AthleteManager
                athletes={athletes}
                clients={clients}
                coachName={coachName}
                onToggleActive={(id, disabled) => run(() => (disabled ? adminApi.reactivateUser(id) : adminApi.deactivateUser(id)), disabled ? 'Reactivated' : 'Deactivated')}
                onDelete={(id) => run(() => adminApi.deleteUser(id), 'Account deleted')}
                onReset={(email) => run(() => adminApi.sendPasswordReset(email), `Reset email sent to ${email}`)}
              />
            )}
          </>
        )}
      </main>
    </div>
  )
}
