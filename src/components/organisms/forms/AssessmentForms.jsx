import { useState } from 'react'
import ModalShell from '../../molecules/ModalShell'
import Button from '../../atoms/Button'
import Field from '../../atoms/Field'
import RangeSlider from '../../atoms/RangeSlider'
import { useData } from '../../../store/DataContext'
import { useModal } from '../../../store/ModalContext'
import { uid } from '../../../lib/format'
import { todayISO } from '../../../lib/dates'
import { MOVEMENT_PATTERNS, ACTIVE_TYPES, ACTIVITY_LEVELS, typeMeta, estOneRepMax } from '../../../lib/assessment'
import Icon from '../../atoms/Icon'
import Autocomplete from '../../molecules/Autocomplete'

const numOrNull = (v) => (v === '' || v == null || Number.isNaN(+v) ? null : +v)

// Shared date + phase header for every assessment form.
function MetaRow({ f, setF }) {
  return (
    <div className="row2">
      <Field label="Date"><input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
      <Field label="Phase">
        <select value={f.phase} onChange={(e) => setF({ ...f, phase: e.target.value })}>
          <option value="baseline">Baseline (onboarding)</option>
          <option value="reassessment">Reassessment</option>
        </select>
      </Field>
    </div>
  )
}

function useSave(clientId, type, buildData, extra) {
  const { commit } = useData()
  const { closeModal } = useModal()
  return (f) => {
    commit((d) => {
      d.assessments.push({ id: uid(), clientId, type, date: f.date, phase: f.phase, notes: (f.notes || '').trim(), data: buildData() })
      extra?.(d)
    })
    closeModal()
  }
}

// ---- Movement screen (squat / hinge / lunge / push / pull, 0–3 + pain) ----
export function MovementScreenForm({ clientId }) {
  const { closeModal } = useModal()
  const [f, setF] = useState({ date: todayISO(), phase: 'baseline', notes: '' })
  const [screens, setScreens] = useState(MOVEMENT_PATTERNS.map((pattern) => ({ pattern, score: 2, pain: false })))
  const upd = (i, k, v) => setScreens(screens.map((s, j) => (j === i ? { ...s, [k]: v } : s)))
  const save = useSave(clientId, 'movement', () => ({ screens }))
  return (
    <ModalShell title={<><Icon name="treadmill" size={16} /> Movement screen</>} onClose={closeModal}
      footer={<><Button variant="ghost" onClick={closeModal}>Cancel</Button><Button onClick={() => save(f)}>Save assessment</Button></>}>
      <MetaRow f={f} setF={setF} />
      <div className="asr-head"><span>Pattern</span><span>Score /3</span><span>Pain</span></div>
      {screens.map((s, i) => (
        <div className="asr-row" key={s.pattern}>
          <span className="asr-pat">{s.pattern}</span>
          <select value={s.score} onChange={(e) => upd(i, 'score', +e.target.value)} aria-label={s.pattern + ' score'}>
            {[0, 1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <label className="asr-pain"><input type="checkbox" checked={s.pain} onChange={(e) => upd(i, 'pain', e.target.checked)} /> pain</label>
        </div>
      ))}
      <Field label="Notes"><input value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Compensations, cues, limitations…" /></Field>
    </ModalShell>
  )
}

// ---- Body composition (InBody / BIA / calipers) ----
export function BodyCompForm({ clientId }) {
  const { closeModal } = useModal()
  const [f, setF] = useState({
    date: todayISO(), phase: 'baseline', notes: '', method: 'InBody',
    massKg: '', bodyFatPct: '', leanMassKg: '', skeletalMuscleKg: '', visceralFat: '', hydrationL: '',
  })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const data = () => ({
    method: f.method, massKg: numOrNull(f.massKg), bodyFatPct: numOrNull(f.bodyFatPct),
    leanMassKg: numOrNull(f.leanMassKg), skeletalMuscleKg: numOrNull(f.skeletalMuscleKg),
    visceralFat: numOrNull(f.visceralFat), hydrationL: numOrNull(f.hydrationL),
  })
  // Also refresh the client's current anthro snapshot from this reading.
  const save = useSave(clientId, 'body_comp', data, (d) => {
    const c = d.clients.find((x) => x.id === clientId)
    if (!c) return
    c.anthro = c.anthro || {}
    const v = data()
    if (v.massKg != null) c.anthro.massKg = v.massKg
    if (v.bodyFatPct != null) c.anthro.bodyFatPct = v.bodyFatPct
    if (v.leanMassKg != null) c.anthro.leanMassKg = v.leanMassKg
  })
  return (
    <ModalShell title={<><Icon name="tuning" size={16} /> Body composition</>} onClose={closeModal}
      footer={<><Button variant="ghost" onClick={closeModal}>Cancel</Button><Button onClick={() => save(f)}>Save assessment</Button></>}>
      <MetaRow f={f} setF={setF} />
      <Field label="Method">
        <select value={f.method} onChange={set('method')}><option>InBody</option><option>BIA</option><option>Calipers</option><option>DEXA</option></select>
      </Field>
      <div className="row3">
        <Field label="Body mass (kg)"><input type="number" step="0.1" value={f.massKg} onChange={set('massKg')} /></Field>
        <Field label="Body fat (%)"><input type="number" step="0.1" value={f.bodyFatPct} onChange={set('bodyFatPct')} /></Field>
        <Field label="Lean mass (kg)"><input type="number" step="0.1" value={f.leanMassKg} onChange={set('leanMassKg')} /></Field>
      </div>
      <div className="row3">
        <Field label="Skeletal muscle (kg)"><input type="number" step="0.1" value={f.skeletalMuscleKg} onChange={set('skeletalMuscleKg')} /></Field>
        <Field label="Visceral fat"><input type="number" step="1" value={f.visceralFat} onChange={set('visceralFat')} /></Field>
        <Field label="Total body water (L)"><input type="number" step="0.1" value={f.hydrationL} onChange={set('hydrationL')} /></Field>
      </div>
      <Field label="Notes"><input value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Device, hydration state, time of day…" /></Field>
    </ModalShell>
  )
}

// ---- Fitness (strength lifts + endurance + mobility + posture) ----
// The strength section is a 1RM-estimation surface: each lift takes a test
// weight × reps, from which we compute an estimated 1RM (Epley; 1 rep = a true
// 1RM). On save those estimates are written into the client's 1RM ledger tagged
// `source:'assessment'`, so the workout builder's Training Max resolves from
// them (recent training PRs still win; see resolveTrainingMax).
export function FitnessAssessmentForm({ clientId }) {
  const { db, commit } = useData()
  const { closeModal } = useModal()
  const [f, setF] = useState({ date: todayISO(), phase: 'baseline', notes: '', enduranceTest: '', enduranceResult: '', posture: '' })
  const [strength, setStrength] = useState([{ lift: '', weightKg: '', reps: '1' }])
  const [mobility, setMobility] = useState([{ joint: '', value: '', side: '' }])
  // Exercise-library names for the lift autocomplete, alphabetical.
  const liftNames = [...db.exercises.map((e) => e.name)].sort((a, b) => a.localeCompare(b))
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const updS = (i, k, v) => setStrength(strength.map((r, j) => (j === i ? { ...r, [k]: v } : r)))
  const updM = (i, k, v) => setMobility(mobility.map((r, j) => (j === i ? { ...r, [k]: v } : r)))
  // Only rows with a lift name and a valid estimated 1RM are kept.
  const strengthOut = () => strength
    .map((r) => ({ lift: r.lift.trim(), weightKg: numOrNull(r.weightKg), reps: numOrNull(r.reps) || 1, valueKg: estOneRepMax(r.weightKg, r.reps) }))
    .filter((r) => r.lift && r.valueKg != null)
  const data = () => ({
    strength: strengthOut(),
    endurance: f.enduranceTest.trim() ? { test: f.enduranceTest.trim(), result: f.enduranceResult.trim() } : null,
    mobility: mobility.filter((r) => r.joint.trim()).map((r) => ({ joint: r.joint.trim(), value: r.value.trim(), side: r.side.trim() })),
    posture: f.posture.trim(),
  })
  const save = () => {
    const lifts = strengthOut()
    commit((d) => {
      const aid = uid()
      d.assessments.push({ id: aid, clientId, type: 'fitness', date: f.date, phase: f.phase, notes: (f.notes || '').trim(), data: data() })
      // Connect into the 1RM ledger — one e1rm event per lift, linked to this
      // assessment (removed again if the assessment is deleted).
      for (const s of lifts) {
        d.maxes.push({ id: uid(), clientId, exercise: s.lift, date: f.date, kind: 'e1rm', valueKg: s.valueKg, source: 'assessment', assessmentId: aid })
      }
    })
    closeModal()
  }
  return (
    <ModalShell title={<><Icon name="dumbbellAlt" size={16} /> Fitness assessment</>} onClose={closeModal}
      footer={<><Button variant="ghost" onClick={closeModal}>Cancel</Button><Button onClick={save}>Save assessment</Button></>}>
      <MetaRow f={f} setF={setF} />

      <div className="section-title" style={{ margin: '4px 0 2px', fontSize: 13 }}>Strength — estimated 1RM</div>
      <p className="muted" style={{ fontSize: 11.5, margin: '0 0 8px' }}>Enter a test weight and reps; we estimate the 1RM (1 rep = a true 1RM). These feed the workout builder's Training Max.</p>
      <div className="asf-1rm-head"><span>Lift</span><span>Weight (kg)</span><span>Reps</span><span>Est. 1RM</span><span /></div>
      {strength.map((r, i) => {
        const est = estOneRepMax(r.weightKg, r.reps)
        return (
          <div className="asf-1rm-row" key={i}>
            <Autocomplete value={r.lift} onChange={(v) => updS(i, 'lift', v)} options={liftNames}
              placeholder="e.g. Barbell Back Squat" ariaLabel="Lift" />
            <input type="number" step="0.5" min="0" value={r.weightKg} onChange={(e) => updS(i, 'weightKg', e.target.value)} placeholder="kg" aria-label="Test weight kg" />
            <input type="number" step="1" min="1" value={r.reps} onChange={(e) => updS(i, 'reps', e.target.value)} placeholder="1" aria-label="Reps" />
            <span className="asf-1rm-est">{est != null ? `${est} kg` : '—'}</span>
            <button className="x" aria-label="Remove lift" onClick={() => setStrength(strength.filter((_, j) => j !== i))}>×</button>
          </div>
        )
      })}
      <Button variant="ghost" size="sm" onClick={() => setStrength([...strength, { lift: '', weightKg: '', reps: '1' }])}>＋ Add lift</Button>

      <div className="section-title" style={{ margin: '12px 0 6px', fontSize: 13 }}>Endurance</div>
      <div className="row2">
        <Field label="Test"><input value={f.enduranceTest} onChange={set('enduranceTest')} placeholder="e.g. 3-min step" /></Field>
        <Field label="Result"><input value={f.enduranceResult} onChange={set('enduranceResult')} placeholder="e.g. HRrec 28 bpm" /></Field>
      </div>

      <div className="section-title" style={{ margin: '12px 0 6px', fontSize: 13 }}>Mobility</div>
      {mobility.map((r, i) => (
        <div className="asf-row3" key={i}>
          <input value={r.joint} onChange={(e) => updM(i, 'joint', e.target.value)} placeholder="Joint (e.g. Ankle DF)" aria-label="Joint" />
          <input value={r.value} onChange={(e) => updM(i, 'value', e.target.value)} placeholder="ROM (e.g. 8 cm)" aria-label="ROM" />
          <input value={r.side} onChange={(e) => updM(i, 'side', e.target.value)} placeholder="Side/notes" aria-label="Side" />
          <button className="x" aria-label="Remove mobility row" onClick={() => setMobility(mobility.filter((_, j) => j !== i))}>×</button>
        </div>
      ))}
      <Button variant="ghost" size="sm" onClick={() => setMobility([...mobility, { joint: '', value: '', side: '' }])}>＋ Add joint</Button>

      <div style={{ marginTop: 12 }}>
        <Field label="Posture"><input value={f.posture} onChange={set('posture')} placeholder="e.g. Mild anterior pelvic tilt" /></Field>
      </div>
      <Field label="Notes"><input value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Overall observations…" /></Field>
    </ModalShell>
  )
}

// ---- Pain (sites: area / severity 0–10 / aggravating movement) ----
export function PainAssessmentForm({ clientId }) {
  const { closeModal } = useModal()
  const [f, setF] = useState({ date: todayISO(), phase: 'reassessment', notes: '' })
  const [sites, setSites] = useState([{ area: '', severity: 3, aggravating: '', limitation: '' }])
  const upd = (i, k, v) => setSites(sites.map((s, j) => (j === i ? { ...s, [k]: v } : s)))
  const data = () => ({ sites: sites.filter((s) => s.area.trim()).map((s) => ({ area: s.area.trim(), severity: +s.severity, aggravating: s.aggravating.trim(), limitation: s.limitation.trim() })) })
  const save = useSave(clientId, 'pain', data)
  return (
    <ModalShell title={<><Icon name="danger" size={16} /> Pain assessment</>} onClose={closeModal}
      footer={<><Button variant="ghost" onClick={closeModal}>Cancel</Button><Button onClick={() => save(f)}>Save assessment</Button></>}>
      <MetaRow f={f} setF={setF} />
      {sites.map((s, i) => (
        <div className="asp-site" key={i}>
          <div className="asf-row">
            <input value={s.area} onChange={(e) => upd(i, 'area', e.target.value)} placeholder="Area (e.g. Right knee)" aria-label="Area" />
            <input type="number" min="0" max="10" value={s.severity} onChange={(e) => upd(i, 'severity', e.target.value)} aria-label="Severity 0-10" />
            <button className="x" aria-label="Remove site" onClick={() => setSites(sites.filter((_, j) => j !== i))}>×</button>
          </div>
          <div className="row2">
            <Field label="Aggravating movement"><input value={s.aggravating} onChange={(e) => upd(i, 'aggravating', e.target.value)} placeholder="e.g. Deep squat" /></Field>
            <Field label="Limitation"><input value={s.limitation} onChange={(e) => upd(i, 'limitation', e.target.value)} placeholder="e.g. Can't load past 90°" /></Field>
          </div>
        </div>
      ))}
      <Button variant="ghost" size="sm" onClick={() => setSites([...sites, { area: '', severity: 3, aggravating: '', limitation: '' }])}>＋ Add site</Button>
      <Field label="Notes"><input value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Onset, pattern, referral…" /></Field>
    </ModalShell>
  )
}

// ---- Lifestyle (sleep / stress / hydration / activity) ----
export function LifestyleForm({ clientId }) {
  const { closeModal } = useModal()
  const [f, setF] = useState({ date: todayISO(), phase: 'baseline', notes: '', sleepHrs: '', sleepQuality: 4, stress: 4, hydrationL: '', activityLevel: 'Moderate', steps: '' })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const sl = (k) => (v) => setF({ ...f, [k]: v })
  const data = () => ({ sleepHrs: numOrNull(f.sleepHrs), sleepQuality: +f.sleepQuality, stress: +f.stress, hydrationL: numOrNull(f.hydrationL), activityLevel: f.activityLevel, steps: numOrNull(f.steps) })
  const save = useSave(clientId, 'lifestyle', data)
  return (
    <ModalShell title={<><Icon name="watch" size={16} /> Lifestyle assessment</>} onClose={closeModal}
      footer={<><Button variant="ghost" onClick={closeModal}>Cancel</Button><Button onClick={() => save(f)}>Save assessment</Button></>}>
      <MetaRow f={f} setF={setF} />
      <div className="row2">
        <Field label="Sleep (hours/night)"><input type="number" step="0.5" value={f.sleepHrs} onChange={set('sleepHrs')} /></Field>
        <Field label="Hydration (L/day)"><input type="number" step="0.1" value={f.hydrationL} onChange={set('hydrationL')} /></Field>
      </div>
      <RangeSlider label="Sleep quality" value={f.sleepQuality} min={1} max={7} lo="Poor" hi="Excellent" onChange={sl('sleepQuality')} />
      <RangeSlider label="Stress" value={f.stress} min={1} max={7} lo="None" hi="Extreme" onChange={sl('stress')} />
      <div className="row2">
        <Field label="Activity level"><select value={f.activityLevel} onChange={set('activityLevel')}>{ACTIVITY_LEVELS.map((a) => <option key={a}>{a}</option>)}</select></Field>
        <Field label="Daily steps (avg)"><input type="number" step="500" value={f.steps} onChange={set('steps')} /></Field>
      </div>
      <Field label="Notes"><input value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Occupation, routine, constraints…" /></Field>
    </ModalShell>
  )
}

// ---- Goals (short-term & long-term) ----
export function GoalForm({ clientId }) {
  const { closeModal } = useModal()
  const [f, setF] = useState({ date: todayISO(), phase: 'baseline', notes: '', why: '' })
  const [shortTerm, setShort] = useState([{ text: '', target: '', by: '' }])
  const [longTerm, setLong] = useState([{ text: '', target: '', by: '' }])
  const updList = (setter, list) => (i, k, v) => setter(list.map((r, j) => (j === i ? { ...r, [k]: v } : r)))
  const clean = (list) => list.filter((r) => r.text.trim()).map((r) => ({ text: r.text.trim(), target: r.target.trim(), by: r.by }))
  const data = () => ({ shortTerm: clean(shortTerm), longTerm: clean(longTerm), why: f.why.trim() })
  const save = useSave(clientId, 'goals', data)
  const rows = (list, setter, label) => (
    <>
      <div className="section-title" style={{ margin: '8px 0 6px', fontSize: 13 }}>{label}</div>
      {list.map((r, i) => (
        <div className="asf-row3" key={i}>
          <input value={r.text} onChange={(e) => updList(setter, list)(i, 'text', e.target.value)} placeholder="Goal" aria-label="Goal" />
          <input value={r.target} onChange={(e) => updList(setter, list)(i, 'target', e.target.value)} placeholder="Target (e.g. -5 kg)" aria-label="Target" />
          <input type="date" value={r.by} onChange={(e) => updList(setter, list)(i, 'by', e.target.value)} aria-label="By date" />
          <button className="x" aria-label="Remove goal" onClick={() => setter(list.filter((_, j) => j !== i))}>×</button>
        </div>
      ))}
      <Button variant="ghost" size="sm" onClick={() => setter([...list, { text: '', target: '', by: '' }])}>＋ Add goal</Button>
    </>
  )
  return (
    <ModalShell title={<><Icon name="like" size={16} /> Goal setting</>} onClose={closeModal}
      footer={<><Button variant="ghost" onClick={closeModal}>Cancel</Button><Button onClick={() => save(f)}>Save assessment</Button></>}>
      <MetaRow f={f} setF={setF} />
      {rows(shortTerm, setShort, 'Short-term goals')}
      {rows(longTerm, setLong, 'Long-term goals')}
      <div style={{ marginTop: 10 }}><Field label="Why it matters"><input value={f.why} onChange={(e) => setF({ ...f, why: e.target.value })} placeholder="The deeper motivation…" /></Field></div>
    </ModalShell>
  )
}

const FORMS = {
  fitness: (clientId) => <FitnessAssessmentForm clientId={clientId} />,
  movement: (clientId) => <MovementScreenForm clientId={clientId} />,
  body_comp: (clientId) => <BodyCompForm clientId={clientId} />,
  pain: (clientId) => <PainAssessmentForm clientId={clientId} />,
  lifestyle: (clientId) => <LifestyleForm clientId={clientId} />,
  goals: (clientId) => <GoalForm clientId={clientId} />,
}

// Element factory for a single assessment type (used by the onboarding checklist).
// eslint-disable-next-line react/only-export-components
export const assessmentForm = (type, clientId) => FORMS[type]?.(clientId) || null

// Launcher: pick which assessment to record.
export function NewAssessmentMenu({ clientId }) {
  const { openModal, closeModal } = useModal()
  return (
    <ModalShell title="New assessment" onClose={closeModal}>
      <div className="grid cards-2" style={{ gap: 10 }}>
        {ACTIVE_TYPES.map((t) => {
          const m = typeMeta(t)
          return <Button key={t} variant="ghost" onClick={() => openModal(FORMS[t](clientId))}><Icon name={m.icon} size={14} /> {m.label}</Button>
        })}
      </div>
      <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>Pain, lifestyle and goals can also be self-reported by the athlete in their portal.</p>
    </ModalShell>
  )
}
