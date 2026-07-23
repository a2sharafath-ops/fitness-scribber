import { useEffect, useState, useCallback } from 'react'
import Card from '../components/atoms/Card'
import Button from '../components/atoms/Button'
import ReadinessTag from '../components/molecules/ReadinessTag'
import Avatar from '../components/atoms/Avatar'
import ChangePasswordCard from '../components/organisms/forms/ChangePasswordCard'
import ChatThread from '../components/organisms/ChatThread'
import SelfAssessment from '../components/organisms/SelfAssessment'
import ScreeningCard from '../components/organisms/screening/ScreeningCard'
import TodayWorkout from '../components/organisms/workout/TodayWorkout'
import CheckInModal from '../components/organisms/workout/CheckInModal'
import RPEModal from '../components/organisms/workout/RPEModal'
import { useAuth } from '../store/AuthContext'
import { supabase } from '../lib/supabase'
import { callFunction } from '../api/functions'
import { uid } from '../lib/format'
import { todayISO, fmtDate, fmtDay, lastNDates } from '../lib/dates'
import { calcSRPETL, readinessFor, readinessScore, dailySum, acwrSeries, latestOf } from '../lib/calc'
import { screeningsFor, finalizeScreening } from '../lib/screening'
import { workoutPeaks } from '../lib/program'

export default function AthletePortal() {
  const { user, signOut } = useAuth()
  const [state, setState] = useState(null)
  const [busy, setBusy] = useState(false)
  const [checkinW, setCheckinW] = useState(null) // workout waiting to start until the check-in popup resolves
  const [rpeW, setRpeW] = useState(null)         // completed workout waiting for the RPE popup
  const today = todayISO()

  const load = useCallback(async () => {
    if (!user) return
    const { data: clients } = await supabase.from('clients').select('*').eq('userId', user.id)
    const client = clients?.[0]
    if (!client) { setState({ client: null }); return }
    const out = {}
    for (const t of ['wellness', 'srpe', 'sessions', 'prescriptions', 'wearable', 'wearable_tokens', 'workouts', 'assessments', 'screenings', 'maxes']) {
      const { data } = await supabase.from(t).select('*').eq('clientId', client.id)
      out[t] = data || []
    }
    // Coach-owned library (RLS lets the linked athlete read it); not clientId-scoped.
    const [{ data: plans }, { data: exercises }] = await Promise.all([
      supabase.from('plans').select('*'),
      supabase.from('exercises').select('*'),
    ])
    setState({ client, plans: plans || [], exercises: exercises || [], ...out })
  }, [user])
  useEffect(() => { load() }, [load])

  // Returning from a wearable OAuth consent screen.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    if (p.get('wearable') === 'connected') {
      window.history.replaceState({}, '', window.location.pathname)
      alert('Wearable connected — tap “Sync now” to pull your latest reading.')
    } else if (p.get('wearable') === 'error') {
      window.history.replaceState({}, '', window.location.pathname)
      alert('Wearable connection failed: ' + (p.get('msg') || 'unknown error'))
    }
  }, [])

  if (!state) return <div className="empty" style={{ paddingTop: 120 }}><div className="big">⏳</div>Loading…</div>
  if (!state.client) {
    return (
      <div id="app" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Card style={{ maxWidth: 420, textAlign: 'center' }}>
          <div className="big" style={{ fontSize: 40 }}>🔌</div>
          <h2 style={{ fontSize: 18, margin: '8px 0' }}>Account not linked</h2>
          <p className="muted" style={{ fontSize: 13 }}>Ask your coach for an invite code, then re-enter it.</p>
          <Button variant="ghost" style={{ marginTop: 12 }} onClick={signOut}>Sign out</Button>
        </Card>
      </div>
    )
  }

  const { client } = state
  const readiness = readinessFor({ wellness: state.wellness, wearable: state.wearable }, client.id)
  const checkedIn = state.wellness.some((w) => w.date === today)
  const recent = [...state.wellness].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7)

  const insert = async (table, row) => {
    setBusy(true)
    const { error } = await supabase.from(table).insert({ id: uid(), clientId: client.id, coachId: client.coachId, ...row })
    setBusy(false)
    if (error) { alert(error.message); return false }
    await load()
    return true
  }

  // Athlete self-report (pain / lifestyle / goals) → assessments.
  const submitAssessment = (type, data) => {
    const phase = (state.assessments || []).some((a) => a.type === type) ? 'reassessment' : 'baseline'
    return insert('assessments', { type, date: today, phase, data, notes: '' })
  }

  // Pre-participation screening: step saves upsert the draft; submit finalizes
  // (outcome computed silently — never shown here) and reloads.
  const scr = screeningsFor(state.screenings || [], client.id)
  const saveScreening = async (row) => {
    const { error } = await supabase.from('screenings')
      .upsert({ ...row, clientId: client.id, coachId: client.coachId, updatedAt: new Date().toISOString() })
    if (error) { alert(error.message); return false }
    return true
  }
  const completeScreening = async (row) => {
    setBusy(true)
    const ok = await saveScreening(finalizeScreening(row, today))
    setBusy(false)
    if (ok) await load()
    return ok
  }

  // Today's Workout — the session in progress (workouts) plus whatever the
  // coach prescribed for today in the planner (prescriptions), if anything.
  const todayW = (state.workouts || []).find((w) => w.date === today) || null
  const todayP = (state.prescriptions || []).find((p) => p.date === today) || null
  const rScore = readinessScore({ wellness: state.wellness, wearable: state.wearable }, client.id, today)
  const acwr = acwrSeries(dailySum(state.srpe, client.id, 'tl'), lastNDates(28)).filter((v) => v != null).slice(-1)[0]
  const restingHr = latestOf(state.wearable, client.id)?.rhr ?? null
  const saveWorkout = async (w) => {
    const { error } = await supabase.from('workouts').upsert({ ...w, clientId: client.id, coachId: client.coachId })
    if (error) { alert(error.message); return }
    await load()
  }
  const clearWorkout = async () => {
    if (!todayW) return
    await supabase.from('workouts').delete().eq('id', todayW.id)
    await load()
  }

  // Start flow: pressing ▶ Start first pops the morning check-in (skipped if
  // already done today), then the session actually starts.
  const startWorkout = (w) => {
    if (checkedIn) { saveWorkout(w); return }
    setCheckinW(w)
  }
  const submitCheckin = async (v) => {
    const ok = await insert('wellness', v)
    if (!ok) return
    const w = checkinW
    setCheckinW(null)
    if (w) await saveWorkout(w)
  }
  const skipCheckin = async () => {
    const w = checkinW
    setCheckinW(null)
    if (w) await saveWorkout(w)
  }

  // Complete flow: pressing ✓ Complete pops the session-RPE form (RPE + an
  // editable duration); the workout and its sRPE row are saved together on
  // submit. The edited duration is written back onto the workout itself.
  const requestComplete = (w) => setRpeW(w)
  const finishWorkout = async (w, rpe, minutes) => {
    setBusy(true)
    const durationSec = minutes != null ? Math.max(60, Math.round(minutes * 60)) : w.durationSec
    const wc = { ...w, durationSec, status: 'completed', clientId: client.id, coachId: client.coachId }
    const { error } = await supabase.from('workouts').upsert(wc)
    if (error) { setBusy(false); alert(error.message); return }
    if (rpe != null) {
      const mins = Math.max(1, Math.round(durationSec ? durationSec / 60 : 30))
      const { error: e2 } = await supabase.from('srpe').insert({
        id: uid(), clientId: client.id, coachId: client.coachId,
        date: w.date, sessionId: null, rpe, duration: mins, tl: calcSRPETL(rpe, mins),
      })
      if (e2) alert(e2.message)
    }
    // Automatic strength tracking: log any new estimated-1RM peaks from the
    // performed sets so the coach's workout builder picks up the new baselines.
    const peaks = workoutPeaks(state.maxes, wc)
    if (peaks.length) {
      const { error: e3 } = await supabase.from('maxes').insert(peaks.map((p) => ({
        id: uid(), clientId: client.id, coachId: client.coachId,
        exercise: p.exercise, date: w.date, kind: 'e1rm', valueKg: p.valueKg, source: 'auto',
        sourceWorkoutId: w.id,
      })))
      if (e3) console.error('maxes', e3.message)
    }
    setBusy(false)
    setRpeW(null)
    await load()
  }

  return (
    <div id="app">
      <main id="main" role="main" style={{ marginLeft: 0, maxWidth: 760, margin: '0 auto' }}>
        <div className="topbar">
          <div className="flex gap">
            <Avatar name={client.name} size={44} />
            <div><h1 style={{ fontSize: 20 }}>Hi {client.name.split(' ')[0]} 👋</h1>
              <div className="sub">{fmtDay(today)} · <ReadinessTag readiness={readiness} short /></div></div>
          </div>
          <Button variant="ghost" onClick={signOut}>Sign out</Button>
        </div>

        <ScreeningCard clientId={client.id} complete={scr.complete} draft={scr.draft} busy={busy}
          onSave={saveScreening} onComplete={completeScreening} />
        <WearableSection
          clientId={client.id}
          tokens={state.wearable_tokens || []}
          latest={[...state.wearable].sort((a, b) => b.date.localeCompare(a.date))[0]}
          onChange={load}
        />

        <div style={{ marginTop: 16 }}>
          <TodayWorkout client={client} today={today} workout={todayW} prescription={todayP} plans={state.plans} exercises={state.exercises}
            units="kg" context={{ readiness: rScore, acwr }} restingHr={restingHr} age={client.anthro?.age ?? null} bodyMassKg={client.anthro?.massKg ?? null}
            athlete onStart={startWorkout} onSave={saveWorkout} onComplete={requestComplete} onClear={clearWorkout} />
        </div>

        {checkinW && (
          <CheckInModal busy={busy} today={today}
            onSubmit={submitCheckin} onSkip={skipCheckin} onClose={() => setCheckinW(null)} />
        )}
        {rpeW && (
          <RPEModal busy={busy} workout={rpeW} age={client.anthro?.age ?? null}
            onSubmit={(rpe, minutes) => finishWorkout(rpeW, rpe, minutes)}
            onSkip={(minutes) => finishWorkout(rpeW, null, minutes)} onClose={() => setRpeW(null)} />
        )}

        <Card style={{ marginTop: 16, padding: 0, overflow: 'hidden' }} className="msg-thread-card">
          <ChatThread clientId={client.id} viewerRole="athlete" headerName="Your coach" subtitle="Questions, form checks, updates" />
        </Card>

        <SelfAssessment onSubmit={submitAssessment} busy={busy} />

        <Card style={{ marginTop: 16 }}>
          <div className="section-title" style={{ margin: '0 0 10px' }}>Recent check-ins</div>
          {recent.length ? recent.map((w) => (
            <div key={w.id} className="flex between" style={{ padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
              <span>{fmtDate(w.date)}</span><span className="muted" style={{ fontSize: 12 }}>Wellness {w.score}/28</span>
            </div>
          )) : <div className="muted">No check-ins yet.</div>}
        </Card>

        <ChangePasswordCard style={{ marginTop: 16 }} />
      </main>
    </div>
  )
}

const WEARABLES = [['oura', 'Oura'], ['whoop', 'Whoop'], ['fitbit', 'Fitbit']]

function WearableSection({ clientId, tokens, latest, onChange }) {
  const [busy, setBusy] = useState(false)
  const connected = tokens.map((t) => t.provider)

  const connect = async (provider) => {
    setBusy(true)
    try { const { url } = await callFunction('wearable-connect', { provider, clientId }); if (url) window.location.href = url }
    catch (e) { alert('Connect failed: ' + (e.message || 'wearable functions not deployed yet')) } finally { setBusy(false) }
  }
  const disconnect = async (provider) => {
    if (!confirm('Disconnect ' + provider + '?')) return
    setBusy(true)
    const { error } = await supabase.from('wearable_tokens').delete().eq('clientId', clientId).eq('provider', provider)
    setBusy(false)
    if (error) alert(error.message); else onChange()
  }
  const sync = async () => {
    setBusy(true)
    try { const r = await callFunction('wearable-sync', { clientId }); alert('Synced ' + (r.synced ?? 0) + ' device(s).'); onChange() }
    catch (e) { alert('Sync failed: ' + (e.message || 'wearable functions not deployed yet')) } finally { setBusy(false) }
  }

  return (
    <Card style={{ marginTop: 16 }}>
      <div className="section-title" style={{ margin: '0 0 4px' }}>My wearable</div>
      <p className="muted" style={{ fontSize: 12, marginBottom: 12 }}>
        Connect a device to automatically share your morning HRV, resting HR &amp; sleep with your coach.
      </p>
      {latest && (
        <div className="muted" style={{ fontSize: 12, marginBottom: 12 }}>
          Latest: HRV {latest.hrv ?? '—'} ms · RHR {latest.rhr ?? '—'} bpm · Sleep {latest.sleepHrs ?? '—'} h
          <span style={{ marginLeft: 6 }}>({latest.source})</span>
        </div>
      )}
      <div className="flex gap" style={{ flexWrap: 'wrap' }}>
        {WEARABLES.map(([id, label]) =>
          connected.includes(id) ? (
            <Button key={id} variant="ghost" size="sm" disabled={busy} onClick={() => disconnect(id)}>✓ {label} · Disconnect</Button>
          ) : (
            <Button key={id} variant="ghost" size="sm" disabled={busy} onClick={() => connect(id)}>Connect {label}</Button>
          ),
        )}
        {connected.length > 0 && <Button size="sm" disabled={busy} onClick={sync}>⟳ Sync now</Button>}
      </div>
      <p className="muted" style={{ fontSize: 11, marginTop: 10 }}>Apple Health isn't available on the web — log manually or ask your coach.</p>
    </Card>
  )
}

