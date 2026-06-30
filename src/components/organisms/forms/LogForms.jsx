import { useState } from 'react'
import ModalShell from '../../molecules/ModalShell'
import Button from '../../atoms/Button'
import Field from '../../atoms/Field'
import RangeSlider from '../../atoms/RangeSlider'
import { useData } from '../../../store/DataContext'
import { useModal } from '../../../store/ModalContext'
import { useFormat } from '../../../hooks/useFormat'
import { uid } from '../../../lib/format'
import { todayISO } from '../../../lib/dates'
import { calcWellness, calcSRPETL, calcVolumeLoad } from '../../../lib/calc'

const upsert = (arr, match, value) => {
  const ex = arr.find(match)
  if (ex) Object.assign(ex, value)
  else arr.push({ id: uid(), ...value })
}

export function WellnessForm({ clientId, entry }) {
  const { commit, tz } = useData()
  const { closeModal } = useModal()
  const [f, setF] = useState(entry || { date: todayISO(tz), sleep: 5, stress: 3, fatigue: 3, soreness: 3 })
  const score = calcWellness(f.sleep, f.stress, f.fatigue, f.soreness)
  const sl = (k) => (v) => setF({ ...f, [k]: v })
  const save = () => {
    commit((db) => upsert(db.wellness, (w) => w.id === entry?.id, { clientId, date: f.date, sleep: f.sleep, stress: f.stress, fatigue: f.fatigue, soreness: f.soreness, score }))
    closeModal()
  }
  return (
    <ModalShell title="Hooper Index — Morning Wellness" onClose={closeModal}
      footer={<><Button variant="ghost" onClick={closeModal}>Cancel</Button><Button onClick={save}>Save</Button></>}>
      <Field label="Date"><input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
      <RangeSlider label="Sleep Quality" value={f.sleep} min={1} max={7} lo="Terrible" hi="Excellent" onChange={sl('sleep')} />
      <RangeSlider label="Stress" value={f.stress} min={1} max={7} lo="None" hi="Extreme" onChange={sl('stress')} />
      <RangeSlider label="Fatigue" value={f.fatigue} min={1} max={7} lo="Fresh" hi="Exhausted" onChange={sl('fatigue')} />
      <RangeSlider label="Muscle Soreness (DOMS)" value={f.soreness} min={1} max={7} lo="None" hi="Severe" onChange={sl('soreness')} />
      <div className="card" style={{ textAlign: 'center' }}>
        <div className="muted" style={{ fontSize: 11 }}>AGGREGATED WELLNESS SCORE</div>
        <div style={{ fontSize: 30, fontWeight: 800 }}>{score}</div>
        <div className="muted" style={{ fontSize: 11 }}>out of 28 · higher = better</div>
      </div>
    </ModalShell>
  )
}

export function SRPEForm({ clientId, entry }) {
  const { commit, tz } = useData()
  const { closeModal } = useModal()
  const [f, setF] = useState(entry || { date: todayISO(tz), rpe: 6, duration: 60 })
  const tl = calcSRPETL(f.rpe, f.duration)
  const save = () => {
    commit((db) => upsert(db.srpe, (s) => s.id === entry?.id, { clientId, date: f.date, rpe: f.rpe, duration: f.duration, sessionId: null, tl }))
    closeModal()
  }
  return (
    <ModalShell title="Session RPE — Internal Load" onClose={closeModal}
      footer={<><Button variant="ghost" onClick={closeModal}>Cancel</Button><Button onClick={save}>Save</Button></>}>
      <p className="muted" style={{ fontSize: 12, marginBottom: 12 }}>Best captured 15–30 min post-session.</p>
      <Field label="Date"><input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
      <RangeSlider label="Session RPE (Borg CR10)" value={f.rpe} min={1} max={10} lo="Rest" hi="Max effort" onChange={(v) => setF({ ...f, rpe: v })} />
      <Field label="Session Duration (minutes)"><input type="number" value={f.duration} onChange={(e) => setF({ ...f, duration: +e.target.value })} /></Field>
      <div className="card" style={{ textAlign: 'center' }}>
        <div className="muted" style={{ fontSize: 11 }}>sRPE-TL = sRPE × DURATION</div>
        <div style={{ fontSize: 30, fontWeight: 800 }}>{tl}</div>
        <div className="muted" style={{ fontSize: 11 }}>arbitrary units (AU)</div>
      </div>
    </ModalShell>
  )
}

const PATTERNS = ['Squat', 'Hinge', 'Push', 'Pull', 'Carry', 'Other']

export function ResistanceForm({ clientId, entry }) {
  const { commit, tz } = useData()
  const { closeModal } = useModal()
  const { toDisp, dispToKg, unitName } = useFormat()
  const [f, setF] = useState(
    entry
      ? { ...entry, weight: toDisp(entry.weight) }
      : { date: todayISO(tz), exercise: '', pattern: 'Squat', sets: 3, reps: 10, weight: toDisp(60) },
  )
  const vl = calcVolumeLoad(f.sets, f.reps, f.weight)
  const save = () => {
    const weightKg = dispToKg(f.weight) || 0
    commit((db) =>
      upsert(db.resistance, (r) => r.id === entry?.id, {
        clientId, date: f.date, exercise: f.exercise.trim() || 'Exercise', pattern: f.pattern,
        sets: +f.sets, reps: +f.reps, weight: weightKg, volumeLoad: calcVolumeLoad(f.sets, f.reps, weightKg),
      }),
    )
    closeModal()
  }
  return (
    <ModalShell title="Resistance — External Load" onClose={closeModal}
      footer={<><Button variant="ghost" onClick={closeModal}>Cancel</Button><Button onClick={save}>Save</Button></>}>
      <div className="row2">
        <Field label="Date"><input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
        <Field label="Exercise"><input value={f.exercise} onChange={(e) => setF({ ...f, exercise: e.target.value })} placeholder="e.g. Back Squat" /></Field>
      </div>
      <Field label="Movement pattern">
        <select value={f.pattern} onChange={(e) => setF({ ...f, pattern: e.target.value })}>{PATTERNS.map((p) => <option key={p}>{p}</option>)}</select>
      </Field>
      <div className="row3">
        <Field label="Sets"><input type="number" value={f.sets} onChange={(e) => setF({ ...f, sets: +e.target.value })} /></Field>
        <Field label="Reps"><input type="number" value={f.reps} onChange={(e) => setF({ ...f, reps: +e.target.value })} /></Field>
        <Field label={'Weight (' + unitName() + ')'}><input type="number" step="2.5" value={f.weight} onChange={(e) => setF({ ...f, weight: e.target.value })} /></Field>
      </div>
      <div className="card" style={{ textAlign: 'center' }}>
        <div className="muted" style={{ fontSize: 11 }}>VOLUME LOAD = SETS × REPS × WEIGHT</div>
        <div style={{ fontSize: 28, fontWeight: 800 }}>{Number(vl).toLocaleString()}</div>
        <div className="muted" style={{ fontSize: 11 }}>{unitName()}</div>
      </div>
    </ModalShell>
  )
}

export function CardioForm({ clientId, entry }) {
  const { commit, tz } = useData()
  const { closeModal } = useModal()
  const [f, setF] = useState(entry || { date: todayISO(tz), modality: 'Zone 2 Run', trimp: 80, tiz: 30, tss: 60, hsd: 1.0 })
  const set = (k, num) => (e) => setF({ ...f, [k]: num ? +e.target.value : e.target.value })
  const save = () => {
    commit((db) => upsert(db.cardio, (x) => x.id === entry?.id, { clientId, date: f.date, modality: f.modality.trim() || 'Cardio', trimp: +f.trimp, tiz: +f.tiz, tss: +f.tss, hsd: +f.hsd }))
    closeModal()
  }
  return (
    <ModalShell title="Conditioning Load" onClose={closeModal}
      footer={<><Button variant="ghost" onClick={closeModal}>Cancel</Button><Button onClick={save}>Save</Button></>}>
      <div className="row2">
        <Field label="Date"><input type="date" value={f.date} onChange={set('date')} /></Field>
        <Field label="Modality"><input value={f.modality} onChange={set('modality')} placeholder="e.g. Intervals" /></Field>
      </div>
      <div className="row2">
        <Field label="TRIMP (Training Impulse)"><input type="number" value={f.trimp} onChange={set('trimp', true)} /></Field>
        <Field label="Time in Zone (min)"><input type="number" value={f.tiz} onChange={set('tiz', true)} /></Field>
      </div>
      <div className="row2">
        <Field label="TSS (Training Stress Score)"><input type="number" value={f.tss} onChange={set('tss', true)} /></Field>
        <Field label="High-Speed Distance (km)"><input type="number" step="0.1" value={f.hsd} onChange={set('hsd', true)} /></Field>
      </div>
    </ModalShell>
  )
}

export function WearableForm({ clientId, entry }) {
  const { commit, tz } = useData()
  const { closeModal } = useModal()
  const [f, setF] = useState(entry || { date: todayISO(tz), hrv: 60, rhr: 58, sleepHrs: 7.5, source: 'Manual' })
  const set = (k, num) => (e) => setF({ ...f, [k]: num ? +e.target.value : e.target.value })
  const save = () => {
    commit((db) => upsert(db.wearable, (w) => w.id === entry?.id, { clientId, date: f.date, hrv: +f.hrv, rhr: +f.rhr, sleepHrs: +f.sleepHrs, source: f.source }))
    closeModal()
  }
  return (
    <ModalShell title="Wearable Reading" onClose={closeModal}
      footer={<><Button variant="ghost" onClick={closeModal}>Cancel</Button><Button onClick={save}>Save</Button></>}>
      <Field label="Date"><input type="date" value={f.date} onChange={set('date')} /></Field>
      <div className="row3">
        <Field label="HRV / RMSSD (ms)"><input type="number" value={f.hrv} onChange={set('hrv', true)} /></Field>
        <Field label="Resting HR (bpm)"><input type="number" value={f.rhr} onChange={set('rhr', true)} /></Field>
        <Field label="Sleep (h)"><input type="number" step="0.1" value={f.sleepHrs} onChange={set('sleepHrs', true)} /></Field>
      </div>
      <Field label="Source">
        <select value={f.source} onChange={set('source')}>{['Manual', 'Oura', 'Whoop', 'Apple HealthKit', 'Google Health Connect'].map((s) => <option key={s}>{s}</option>)}</select>
      </Field>
    </ModalShell>
  )
}

export function BodyMetricForm({ clientId }) {
  const { db, commit, tz } = useData()
  const { closeModal } = useModal()
  const { dispToKg, unitName } = useFormat()
  const [f, setF] = useState({ clientId: clientId || db.clients[0]?.id, date: todayISO(tz), weight: '', squat: '' })
  const save = () => {
    if (!f.clientId) return alert('Add a client first')
    commit((d) => d.logs.push({ id: uid(), clientId: f.clientId, date: f.date, weightKg: dispToKg(f.weight) || 0, squat: dispToKg(f.squat) || 0 }))
    closeModal()
  }
  return (
    <ModalShell title="Log Body Metric" onClose={closeModal}
      footer={<><Button variant="ghost" onClick={closeModal}>Cancel</Button><Button onClick={save}>Save Entry</Button></>}>
      <Field label="Client">
        <select value={f.clientId} onChange={(e) => setF({ ...f, clientId: e.target.value })}>{db.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      </Field>
      <div className="row3">
        <Field label="Date"><input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
        <Field label={'Body weight (' + unitName() + ')'}><input type="number" step="0.1" value={f.weight} onChange={(e) => setF({ ...f, weight: e.target.value })} /></Field>
        <Field label={'Squat (' + unitName() + ')'}><input type="number" step="2.5" value={f.squat} onChange={(e) => setF({ ...f, squat: e.target.value })} /></Field>
      </div>
    </ModalShell>
  )
}

// Quick-log launcher used in the Command Center.
export function QuickLogMenu({ clientId }) {
  const { openModal, closeModal } = useModal()
  const items = [
    ['😴 Wellness (Hooper)', () => <WellnessForm clientId={clientId} />],
    ['🔥 Session RPE', () => <SRPEForm clientId={clientId} />],
    ['🏋️ Resistance set', () => <ResistanceForm clientId={clientId} />],
    ['🏃 Conditioning', () => <CardioForm clientId={clientId} />],
    ['⌚ Wearable reading', () => <WearableForm clientId={clientId} />],
    ['📈 Body metric', () => <BodyMetricForm clientId={clientId} />],
  ]
  return (
    <ModalShell title="Quick Log" onClose={closeModal}>
      <div className="grid cards-2" style={{ gap: 10 }}>
        {items.map(([label, make]) => (
          <Button key={label} variant="ghost" onClick={() => openModal(make())}>{label}</Button>
        ))}
      </div>
    </ModalShell>
  )
}
