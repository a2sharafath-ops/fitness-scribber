import { useState } from 'react'
import ModalShell from '../../molecules/ModalShell'
import Button from '../../atoms/Button'
import Field from '../../atoms/Field'
import { useData } from '../../../store/DataContext'
import { useModal } from '../../../store/ModalContext'
import { uid } from '../../../lib/format'
import { toast, confirmDialog } from '../../../lib/toast'

const GROUPS = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Hamstrings', 'Glutes', 'Full Body']
const EQUIPS = ['Barbell', 'Dumbbell', 'Machine', 'Cable', 'Bodyweight', 'Kettlebell', 'Bands']
const LEVELS = ['Beginner', 'Intermediate', 'Advanced']

export function ExerciseForm({ exercise }) {
  const { commit } = useData()
  const { closeModal } = useModal()
  const [f, setF] = useState(exercise || { name: '', muscle: 'Chest', equip: 'Barbell', difficulty: 'Beginner', video: '', thumb: '' })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const save = () => {
    if (!f.name.trim()) return toast('Exercise name is required', 'error')
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
        <Button onClick={save}>Save</Button>
      </>}>
      <Field label="Name"><input value={f.name} onChange={set('name')} placeholder="e.g. Incline Dumbbell Press" /></Field>
      <div className="row2">
        <Field label="Muscle group"><select value={f.muscle} onChange={set('muscle')}>{GROUPS.map((g) => <option key={g}>{g}</option>)}</select></Field>
        <Field label="Equipment"><select value={f.equip} onChange={set('equip')}>{EQUIPS.map((q) => <option key={q}>{q}</option>)}</select></Field>
      </div>
      <div className="row2">
        <Field label="Difficulty"><select value={f.difficulty || 'Beginner'} onChange={set('difficulty')}>{LEVELS.map((l) => <option key={l}>{l}</option>)}</select></Field>
        <Field label="Video URL"><input value={f.video || ''} onChange={set('video')} placeholder="YouTube/Vimeo/MP4 link" /></Field>
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
    if (!name.trim()) return toast('Plan name is required', 'error')
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
        <select value={addEx} onChange={(e) => setAddEx(e.target.value)} style={{ flex: 1 }}>
          {db.exercises.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <Button variant="ghost" size="sm" onClick={add}>＋ Add</Button>
      </div>
    </ModalShell>
  )
}
