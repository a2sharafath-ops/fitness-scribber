import { useState, useEffect } from 'react'
import ModalShell from '../molecules/ModalShell'
import Button from '../atoms/Button'
import { useData } from '../../store/DataContext'
import { useModal } from '../../store/ModalContext'
import { BODY_MEASURES, EXERCISE_MEASURES, metricKey, metricMeta, saveTrackedMetrics, trackedMetrics, trackingExercises } from '../../lib/progressTracking'

export default function TrackedMetricsForm({ client }) {
  const { db, commit } = useData()
  const { closeModal, setCloseGuard } = useModal()
  const [metrics, setMetrics] = useState(() => trackedMetrics(client))
  const [kind, setKind] = useState('exercise'), [query, setQuery] = useState(''), [exercise, setExercise] = useState('')
  const [measure, setMeasure] = useState('load'), [error, setError] = useState(''), [busy, setBusy] = useState(false)
  useEffect(() => setCloseGuard(() => !busy), [busy, setCloseGuard])
  const exercises = trackingExercises(db, client.id)
  const keyOf = e => e.exerciseId || `name:${e.name}`
  const available = exercises.filter(e => e.name.toLowerCase().includes(query.toLowerCase()))
  const choices = kind === 'exercise' ? EXERCISE_MEASURES : kind === 'body' ? BODY_MEASURES : kind === 'legacy' ? [{ id: 'weightKg', label: 'Manual body weight' }, { id: 'squat', label: 'Manual squat value' }] : [{ id: 'workouts', label: 'Completed workouts' }, { id: 'bookings', label: 'Booking completion' }]
  const selectedExercise = available.find(e => keyOf(e) === exercise)
  const candidate = { kind, measure, ...(kind === 'exercise' ? selectedExercise : {}) }
  const duplicate = metrics.some(m => metricKey(m) === metricKey(candidate))
  const add = () => {
    if (metrics.length >= 8 || duplicate || kind === 'exercise' && !selectedExercise) return
    setMetrics([...metrics, candidate]); setError('')
  }
  const save = async () => {
    setBusy(true); setError('')
    try {
      const result = await commit(draft => saveTrackedMetrics(draft, client.id, metrics))
      if (!result?.saved) throw new Error('Metrics could not be saved. Review the data warning and retry before leaving.')
      closeModal({ force: true })
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  return <ModalShell title="Manage tracked metrics" onClose={busy ? () => {} : closeModal} footer={<><Button variant="ghost" disabled={busy} onClick={closeModal}>Cancel</Button><Button disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save metrics'}</Button></>}>
    <div className="pt-manager"><p>{client.name} · {metrics.length}/8 metrics</p>
      <ol className="pt-chosen">{metrics.map((m,i) => <li key={metricKey(m)}><div><strong>{metricMeta(m).title}</strong><small>{metricMeta(m).subtitle}</small></div><button type="button" disabled={busy || i === 0} aria-label={`Move ${metricMeta(m).title} ${metricMeta(m).subtitle} up`} onClick={() => { const next=[...metrics]; [next[i-1],next[i]]=[next[i],next[i-1]];setMetrics(next) }}>↑</button><button type="button" disabled={busy} aria-label={`Remove ${metricMeta(m).title} ${metricMeta(m).subtitle}`} onClick={() => setMetrics(metrics.filter((_,j)=>j!==i))}>×</button></li>)}</ol>
      {!metrics.length && <p className="muted">Choose the measurements that matter for this client.</p>}
      <fieldset disabled={busy}><legend>Add a metric</legend>
        <label>Category<select value={kind} onChange={e=>{setKind(e.target.value);setMeasure(e.target.value==='exercise'?'load':e.target.value==='body'?'massKg':e.target.value==='legacy'?'weightKg':'workouts')}}><option value="exercise">Exercise performance</option><option value="body">Body measurements</option><option value="consistency">Training consistency</option>{db.logs?.some(r=>r.clientId===client.id) && <option value="legacy">Previous manual entries</option>}</select></label>
        {kind === 'exercise' && <><label>Find exercise<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search exercise library…" /></label><label>Exercise<select value={selectedExercise ? exercise : ''} onChange={e=>setExercise(e.target.value)}><option value="">Choose exercise</option>{available.map(e=><option key={keyOf(e)} value={keyOf(e)}>{e.name}{exercises.filter(x=>x.name===e.name).length>1?` · ${e.exerciseId}`:''}</option>)}</select></label></>}
        <label>Measurement<select value={measure} onChange={e=>setMeasure(e.target.value)}>{choices.map(m=><option key={m.id} value={m.id}>{m.label}</option>)}</select></label>
        {kind==='exercise' && <p className="pt-form-note">Completed workouts only. {measure==='e1rm' ? 'Loaded main lifts only; timed, ballistic and bodyweight exercises are excluded.' : 'Warm-ups and unclassified sets are excluded.'}</p>}
        <Button variant="ghost" disabled={metrics.length>=8 || duplicate || kind==='exercise'&&!selectedExercise} onClick={add}>{duplicate?'Already selected':metrics.length>=8?'8 metrics selected':'＋ Add metric'}</Button>
      </fieldset>{error && <p className="pt-error" role="alert">{error}</p>}
    </div>
  </ModalShell>
}
