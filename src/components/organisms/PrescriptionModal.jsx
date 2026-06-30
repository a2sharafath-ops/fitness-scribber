import { useState } from 'react'
import ModalShell from '../molecules/ModalShell'
import Button from '../atoms/Button'
import Field from '../atoms/Field'
import { useData } from '../../store/DataContext'
import { useModal } from '../../store/ModalContext'
import { useFormat } from '../../hooks/useFormat'
import { uid } from '../../lib/format'
import { fmtDay } from '../../lib/dates'
import { calcVolumeLoad } from '../../lib/calc'

const MODES = ['Straight', 'Superset', 'Drop', 'Cluster', 'AMRAP', 'Tempo', 'Rest-pause']
const GROUPS = ['', 'A', 'B', 'C', 'D']
const blank = () => ({ exercise: '', sets: 3, reps: 10, load: 0, intensity: 70, intensityType: '%1RM', group: '', mode: 'Straight', tempo: '' })

export default function PrescriptionModal({ clientId, date }) {
  const { db, commit } = useData()
  const { closeModal } = useModal()
  const { toDisp, dispToKg, fmtVL, unitName } = useFormat()
  const existing = db.prescriptions.find((p) => p.clientId === clientId && p.date === date)
  const [items, setItems] = useState(existing ? structuredClone(existing.items) : [])
  const [notes, setNotes] = useState(existing?.notes || '')
  const [tpl, setTpl] = useState('')

  const total = items.reduce((s, it) => s + calcVolumeLoad(it.sets, it.reps, it.load), 0)
  const upd = (i, k, v) => setItems(items.map((it, j) => (j === i ? { ...it, [k]: v } : it)))

  const copyLast = () => {
    const prev = db.prescriptions.filter((p) => p.clientId === clientId && p.date < date).sort((a, b) => b.date.localeCompare(a.date))[0]
    if (!prev) return alert('No earlier prescribed session to copy.')
    setItems(structuredClone(prev.items))
  }
  const applyTemplate = () => {
    const t = db.templates.find((x) => x.id === tpl)
    if (t) setItems(structuredClone(t.items))
  }
  const saveTemplate = () => {
    if (!items.length) return alert('Add exercises first.')
    const name = prompt('Template name:', '')
    if (!name) return
    commit((d) => d.templates.push({ id: uid(), name: name.trim(), items: structuredClone(items.map((it) => ({ ...it, volumeLoad: calcVolumeLoad(it.sets, it.reps, it.load) }))) }))
    alert('Template saved.')
  }
  const save = () => {
    const withVL = items.map((it) => ({ ...it, volumeLoad: calcVolumeLoad(it.sets, it.reps, it.load) }))
    commit((d) => {
      const ex = d.prescriptions.find((p) => p.clientId === clientId && p.date === date)
      if (withVL.length === 0 && ex) d.prescriptions = d.prescriptions.filter((p) => p !== ex)
      else if (ex) { ex.items = withVL; ex.notes = notes }
      else d.prescriptions.push({ id: uid(), clientId, date, notes, items: withVL })
    })
    closeModal()
  }
  const del = () => {
    commit((d) => { d.prescriptions = d.prescriptions.filter((p) => !(p.clientId === clientId && p.date === date)) })
    closeModal()
  }

  return (
    <ModalShell title={'Prescribe — ' + fmtDay(date)} onClose={closeModal}
      footer={<>
        {existing && <Button variant="danger" onClick={del}>Delete</Button>}
        <Button variant="ghost" onClick={closeModal}>Cancel</Button>
        <Button onClick={save}>Save Session</Button>
      </>}>
      <datalist id="exList">{db.exercises.map((e) => <option key={e.id} value={e.name} />)}</datalist>
      <div className="flex gap" style={{ marginBottom: 10, flexWrap: 'wrap' }}>
        <Button variant="ghost" size="sm" onClick={copyLast}>↩ Copy last session</Button>
        {db.templates.length > 0 && (
          <>
            <select value={tpl} onChange={(e) => setTpl(e.target.value)} style={{ width: 'auto' }}>
              <option value="">Template…</option>
              {db.templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <Button variant="ghost" size="sm" onClick={applyTemplate}>Apply</Button>
          </>
        )}
        <Button variant="ghost" size="sm" onClick={saveTemplate}>★ Save as template</Button>
        <span className="muted" style={{ fontSize: 11, alignSelf: 'center' }}>Same group letter = superset</span>
      </div>
      <div className="presc-row" style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.4px', fontWeight: 700 }}>
        <span>Exercise</span><span>Sets</span><span>Reps</span><span>Load·Int</span><span>Grp</span><span>Mode</span><span>Tempo</span><span>VL</span>
      </div>
      {items.length ? items.map((it, i) => (
        <div className="presc-row" key={i}>
          <input list="exList" value={it.exercise} placeholder="Exercise" aria-label="Exercise" onChange={(e) => upd(i, 'exercise', e.target.value)} />
          <input type="number" value={it.sets} aria-label="Sets" onChange={(e) => upd(i, 'sets', +e.target.value)} />
          <input type="number" value={it.reps} aria-label="Reps" onChange={(e) => upd(i, 'reps', +e.target.value)} />
          <span style={{ display: 'flex', gap: 3 }}>
            <input type="number" style={{ width: 46 }} value={toDisp(it.load)} title={'Load (' + unitName() + ')'} aria-label="Load" onChange={(e) => upd(i, 'load', dispToKg(e.target.value) || 0)} />
            <input type="number" style={{ width: 40 }} value={it.intensity} title="Intensity" aria-label="Intensity" onChange={(e) => upd(i, 'intensity', +e.target.value)} />
            <select style={{ width: 62 }} value={it.intensityType} aria-label="Intensity type" onChange={(e) => upd(i, 'intensityType', e.target.value)}>
              <option>%1RM</option><option>RPE</option>
            </select>
          </span>
          <select value={it.group} aria-label="Superset group" onChange={(e) => upd(i, 'group', e.target.value)}>
            {GROUPS.map((g) => <option key={g} value={g}>{g || '—'}</option>)}
          </select>
          <select value={it.mode} aria-label="Mode" onChange={(e) => upd(i, 'mode', e.target.value)}>{MODES.map((m) => <option key={m}>{m}</option>)}</select>
          <input value={it.tempo} placeholder="30X1" aria-label="Tempo" onChange={(e) => upd(i, 'tempo', e.target.value)} />
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span className="presc-vl">{fmtVL(calcVolumeLoad(it.sets, it.reps, it.load))}</span>
            <button className="x" aria-label="Remove exercise" onClick={() => setItems(items.filter((_, j) => j !== i))}>×</button>
          </span>
        </div>
      )) : <div className="muted" style={{ fontSize: 12, padding: '6px 0' }}>No exercises yet — add one below.</div>}
      <Button variant="ghost" size="sm" onClick={() => setItems([...items, blank()])} style={{ margin: '6px 0' }}>＋ Add exercise</Button>
      <Field label="Session notes"><input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. knee-friendly, deload" /></Field>
      <div className="card" style={{ textAlign: 'center', padding: 12 }}>
        <div className="muted" style={{ fontSize: 11 }}>SESSION VOLUME LOAD (Σ Sets×Reps×Load)</div>
        <div style={{ fontSize: 26, fontWeight: 800 }}>{fmtVL(total)}</div>
      </div>
    </ModalShell>
  )
}
