import HelperTip from '../../atoms/HelperTip'
import Select from '../../molecules/Select'
import { useState } from 'react'
import ModalShell from '../../molecules/ModalShell'
import Button from '../../atoms/Button'
import Field from '../../atoms/Field'
import { useData } from '../../../store/DataContext'
import { useModal } from '../../../store/ModalContext'
import { uid } from '../../../lib/format'
import { toast, confirmDialog } from '../../../lib/toast'
import { MUSCLES, exerciseKey, muscleTargets } from '../../../lib/muscleVolume'

const GROUPS = ['Unspecified', 'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Hamstrings', 'Glutes', 'Full Body']
const EQUIPS = ['Barbell', 'Dumbbell', 'Machine', 'Cable', 'Bodyweight', 'Kettlebell', 'Bands']
const LEVELS = ['Beginner', 'Intermediate', 'Advanced']

export function ExerciseForm({ exercise, initialName = '' }) {
  const { db, commit } = useData()
  const { closeModal } = useModal()
  const [f, setF] = useState(exercise || { name: initialName, muscle: 'Unspecified', equip: 'Barbell', difficulty: 'Beginner', video: '', thumb: '' })
  const targets = muscleTargets(f)
  const equipmentOptions = [...new Set([...EQUIPS, ...db.exercises.map(item => item.equip), f.equip].filter(Boolean))].sort((a, b) => a.localeCompare(b))
  const setRole = (muscle, role) => setF((current) => {
    const previous = muscleTargets(current)
    return { ...current, muscleTargets: {
      direct: [...previous.direct.filter((m) => m !== muscle), ...(role === 'direct' ? [muscle] : [])],
      indirect: [...previous.indirect.filter((m) => m !== muscle), ...(role === 'indirect' ? [muscle] : [])],
      source: 'coach',
    } }
  })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const save = () => {
    if (!f.name.trim()) return toast('Enter an exercise name.', 'error')
    if (db.exercises.some((e) => e.id !== exercise?.id && exerciseKey(e.name) === exerciseKey(f.name))) return toast('This exercise name already exists. Edit the existing exercise or use a different name.', 'error')
    commit((db) => {
      if (exercise) Object.assign(db.exercises.find((x) => x.id === exercise.id), f)
      else db.exercises.push({ id: uid(), ...f })
    })
    closeModal()
    toast(exercise ? 'Exercise updated' : 'Exercise added')
  }
  const del = async () => {
    if (!await confirmDialog({ title: 'Delete exercise', message: 'Delete this exercise? It will be removed from all plans.', confirmLabel: 'Delete', danger: true })) return
    commit((db) => {
      db.exercises = db.exercises.filter((x) => x.id !== exercise.id)
      db.plans.forEach((p) => (p.items = p.items.filter((it) => it.exId !== exercise.id)))
    })
    closeModal()
    toast('Exercise deleted')
  }
  return (
    <ModalShell title={(exercise ? 'Edit' : 'New') + ' Exercise'} onClose={closeModal}
      footer={<>
        {exercise && <Button variant="danger" onClick={del}>Delete</Button>}
        <Button variant="ghost" onClick={closeModal}>Cancel</Button>
        {f.mode !== 'SMR' && f.mode !== 'Stretch' && <small className="muted">Changes to muscle assignments also apply to past records.</small>}
        <Button onClick={save}>Save</Button>
      </>}>
      <Field label="Name"><input value={f.name} onChange={set('name')} placeholder="e.g. Incline Dumbbell Press" /></Field>
      <div className="row2">
        <Field label="Broad category (legacy)"><Select value={f.muscle} onChange={set('muscle')}>{GROUPS.map((g) => <option key={g}>{g}</option>)}</Select></Field>
        <Field label="Equipment"><Select value={f.equip} onChange={set('equip')}>{equipmentOptions.map((q) => <option key={q}>{q}</option>)}</Select></Field>
      </div>
      <details className="progress-disclosure" open={!!initialName}>
        <summary>Muscle assignments · {targets.direct.length} direct / {targets.indirect.length} indirect</summary>
        {f.mode === 'SMR' || f.mode === 'Stretch' ? <HelperTip label="Mobility exercise mapping" text="Mobility exercises list targeted tissues separately and do not count toward resistance working-set volume." /> : <>
          <HelperTip label="Muscle assignments" text="Direct muscles are the main movers. Indirect muscles assist. These categories describe muscle roles. Coach edits override the library mapping and apply to past records." />
          <div className="muscle-assignment-grid">{MUSCLES.map((muscle) => <label key={muscle}>{muscle}<Select aria-label={`${muscle} contribution`} value={targets.direct.includes(muscle) ? 'direct' : targets.indirect.includes(muscle) ? 'indirect' : ''} onChange={(e) => setRole(muscle, e.target.value)}><option value="">Not assigned</option><option value="direct">Direct</option><option value="indirect">Indirect</option></Select></label>)}</div>
        </>}
      </details>
      <div className="row2">
        <Field label="Difficulty"><Select value={f.difficulty || 'Beginner'} onChange={set('difficulty')}>{LEVELS.map((l) => <option key={l}>{l}</option>)}</Select></Field>
        <Field label="Video URL"><input value={f.video || ''} onChange={set('video')} placeholder="YouTube, Vimeo or MP4 link" /></Field>
      </div>
      <Field label="Thumbnail image URL (optional)"><input value={f.thumb || ''} onChange={set('thumb')} placeholder="Leave blank to use a placeholder" /></Field>
    </ModalShell>
  )
}

export function PlanForm({ plan }) {
  const { db, commit } = useData()
  const { closeModal } = useModal()
  const [name, setName] = useState(plan?.name || '')
  const [desc, setDesc] = useState(plan?.desc || '')
  const [items, setItems] = useState(plan ? structuredClone(plan.items) : [])
  const [addEx, setAddEx] = useState(db.exercises[0]?.id || '')
  const exName = (id) => db.exercises.find((e) => e.id === id)?.name || '?'

  const upd = (i, k, v) => setItems(items.map((it, j) => (j === i ? { ...it, [k]: v } : it)))
  const add = () => setItems([...items, { exId: addEx, sets: 3, reps: '10', rest: '60s' }])
  const save = () => {
    if (!name.trim()) return toast('Enter a plan name.', 'error')
    commit((d) => {
      if (plan) Object.assign(d.plans.find((p) => p.id === plan.id), { name, desc, items })
      else d.plans.push({ id: uid(), name, desc, items })
    })
    closeModal()
    toast(plan ? 'Plan updated' : 'Plan created')
  }
  const del = async () => {
    if (!await confirmDialog({ title: 'Delete plan', message: 'Delete this plan? Clients using it will be unassigned.', confirmLabel: 'Delete', danger: true })) return
    commit((d) => {
      d.plans = d.plans.filter((p) => p.id !== plan.id)
      d.clients.forEach((c) => { if (c.planId === plan.id) c.planId = null })
    })
    closeModal()
    toast('Plan deleted')
  }
  return (
    <ModalShell title={(plan ? 'Edit' : 'New') + ' Workout Plan'} onClose={closeModal}
      footer={<>
        {plan && <Button variant="danger" onClick={del}>Delete</Button>}
        <Button variant="ghost" onClick={closeModal}>Cancel</Button>
        <Button onClick={save}>Save Plan</Button>
      </>}>
      <Field label="Plan name"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Hypertrophy Block — 4 Day" /></Field>
      <Field label="Description"><input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Short summary" /></Field>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Exercises</label>
      <div style={{ margin: '8px 0' }}>
        {items.length ? items.map((it, i) => (
          <div key={i} className="ex-item">
            <div style={{ flex: 1 }}><strong>{exName(it.exId)}</strong></div>
            <input style={{ width: 50 }} value={it.sets} onChange={(e) => upd(i, 'sets', e.target.value)} aria-label="sets" />
            <span className="muted">×</span>
            <input style={{ width: 64 }} value={it.reps} onChange={(e) => upd(i, 'reps', e.target.value)} aria-label="reps" />
            <input style={{ width: 64 }} value={it.rest} onChange={(e) => upd(i, 'rest', e.target.value)} aria-label="rest" />
            <button className="x" onClick={() => setItems(items.filter((_, j) => j !== i))} aria-label="Remove">×</button>
          </div>
        )) : <div className="muted" style={{ fontSize: 12, padding: '8px 0' }}>No exercises added yet.</div>}
      </div>
      <div className="flex gap" style={{ marginBottom: 6 }}>
        <Select value={addEx} onChange={(e) => setAddEx(e.target.value)} style={{ flex: 1 }}>
          {db.exercises.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </Select>
        <Button variant="ghost" size="sm" onClick={add}>＋ Add</Button>
      </div>
    </ModalShell>
  )
}
