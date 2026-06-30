import { useEffect, useState, useCallback } from 'react'
import Card from '../components/atoms/Card'
import Button from '../components/atoms/Button'
import RangeSlider from '../components/atoms/RangeSlider'
import Field from '../components/atoms/Field'
import ReadinessTag from '../components/molecules/ReadinessTag'
import Avatar from '../components/atoms/Avatar'
import { useAuth } from '../store/AuthContext'
import { supabase } from '../lib/supabase'
import { callFunction } from '../api/functions'
import { uid } from '../lib/format'
import { todayISO, fmtDate, fmtDay } from '../lib/dates'
import { calcWellness, calcSRPETL, readinessFor } from '../lib/calc'

export default function AthletePortal() {
  const { user, signOut } = useAuth()
  const [state, setState] = useState(null)
  const [busy, setBusy] = useState(false)
  const today = todayISO()

  const load = useCallback(async () => {
    if (!user) return
    const { data: clients } = await supabase.from('clients').select('*').eq('userId', user.id)
    const client = clients?.[0]
    if (!client) { setState({ client: null }); return }
    const out = {}
    for (const t of ['wellness', 'srpe', 'sessions', 'prescriptions', 'wearable', 'wearable_tokens']) {
      const { data } = await supabase.from(t).select('*').eq('clientId', client.id)
      out[t] = data || []
    }
    setState({ client, ...out })
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
  const todaysPlan = state.prescriptions.filter((p) => p.date === today)
  const recent = [...state.wellness].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7)

  const insert = async (table, row) => {
    setBusy(true)
    const { error } = await supabase.from(table).insert({ id: uid(), clientId: client.id, coachId: client.coachId, ...row })
    setBusy(false)
    if (error) { alert(error.message); return false }
    await load()
    return true
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

        <CheckInCard checkedIn={checkedIn} busy={busy} onSubmit={(v) => insert('wellness', v)} today={today} />
        <RPECard busy={busy} onSubmit={(v) => insert('srpe', v)} today={today} />
        <WearableSection
          clientId={client.id}
          tokens={state.wearable_tokens || []}
          latest={[...state.wearable].sort((a, b) => b.date.localeCompare(a.date))[0]}
          onChange={load}
        />

        <Card style={{ marginTop: 16 }}>
          <div className="section-title" style={{ margin: '0 0 10px' }}>Today's session</div>
          {todaysPlan.length ? todaysPlan.flatMap((p) => p.items).map((it, i) => (
            <div className="ex-item" key={i}><div style={{ flex: 1 }}><strong>{it.exercise}</strong>
              <div className="muted" style={{ fontSize: 12 }}>{it.sets} × {it.reps} @ {it.intensity}{it.intensityType === '%1RM' ? '% 1RM' : ' RPE'}{it.tempo ? ` · tempo ${it.tempo}` : ''}{it.group ? ` · superset ${it.group}` : ''}</div></div></div>
          )) : <div className="muted">Nothing prescribed for today — enjoy the recovery.</div>}
        </Card>

        <Card style={{ marginTop: 16 }}>
          <div className="section-title" style={{ margin: '0 0 10px' }}>Recent check-ins</div>
          {recent.length ? recent.map((w) => (
            <div key={w.id} className="flex between" style={{ padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
              <span>{fmtDate(w.date)}</span><span className="muted" style={{ fontSize: 12 }}>Wellness {w.score}/28</span>
            </div>
          )) : <div className="muted">No check-ins yet.</div>}
        </Card>
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

function CheckInCard({ checkedIn, busy, onSubmit, today }) {
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ sleep: 5, stress: 3, fatigue: 3, soreness: 3 })
  const score = calcWellness(f.sleep, f.stress, f.fatigue, f.soreness)
  const submit = async () => {
    const ok = await onSubmit({ date: today, ...f, score })
    if (ok) setOpen(false)
  }
  return (
    <Card style={{ marginTop: 16 }}>
      <div className="flex between"><div className="section-title" style={{ margin: 0 }}>Morning check-in (Hooper)</div>
        {checkedIn && <span className="tag green">✓ Done today</span>}</div>
      {!open ? (
        <Button style={{ marginTop: 12 }} onClick={() => setOpen(true)}>{checkedIn ? 'Update check-in' : 'Start check-in'}</Button>
      ) : (
        <div style={{ marginTop: 12 }}>
          <RangeSlider label="Sleep Quality" value={f.sleep} min={1} max={7} lo="Terrible" hi="Excellent" onChange={(v) => setF({ ...f, sleep: v })} />
          <RangeSlider label="Stress" value={f.stress} min={1} max={7} lo="None" hi="Extreme" onChange={(v) => setF({ ...f, stress: v })} />
          <RangeSlider label="Fatigue" value={f.fatigue} min={1} max={7} lo="Fresh" hi="Exhausted" onChange={(v) => setF({ ...f, fatigue: v })} />
          <RangeSlider label="Muscle Soreness" value={f.soreness} min={1} max={7} lo="None" hi="Severe" onChange={(v) => setF({ ...f, soreness: v })} />
          <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>Wellness score: <strong>{score}/28</strong></div>
          <div className="flex gap"><Button disabled={busy} onClick={submit}>{busy ? 'Saving…' : 'Submit'}</Button><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button></div>
        </div>
      )}
    </Card>
  )
}

function RPECard({ busy, onSubmit, today }) {
  const [open, setOpen] = useState(false)
  const [rpe, setRpe] = useState(6)
  const [duration, setDuration] = useState(60)
  const submit = async () => {
    const ok = await onSubmit({ date: today, rpe, duration, sessionId: null, tl: calcSRPETL(rpe, duration) })
    if (ok) setOpen(false)
  }
  return (
    <Card style={{ marginTop: 16 }}>
      <div className="section-title" style={{ margin: 0 }}>Log session RPE</div>
      {!open ? (
        <Button style={{ marginTop: 12 }} onClick={() => setOpen(true)}>Log a session</Button>
      ) : (
        <div style={{ marginTop: 12 }}>
          <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>Best logged 15–30 min after your session.</p>
          <RangeSlider label="Session RPE (Borg CR10)" value={rpe} min={1} max={10} lo="Rest" hi="Max effort" onChange={setRpe} />
          <Field label="Duration (minutes)"><input type="number" value={duration} onChange={(e) => setDuration(+e.target.value)} /></Field>
          <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>Training load: <strong>{calcSRPETL(rpe, duration)} AU</strong></div>
          <div className="flex gap"><Button disabled={busy} onClick={submit}>{busy ? 'Saving…' : 'Submit'}</Button><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button></div>
        </div>
      )}
    </Card>
  )
}
