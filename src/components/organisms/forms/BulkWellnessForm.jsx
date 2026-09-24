import { useState } from 'react'
import ModalShell from '../../molecules/ModalShell'
import Button from '../../atoms/Button'
import Field from '../../atoms/Field'
import { useData } from '../../../store/DataContext'
import { useModal } from '../../../store/ModalContext'
import { uid } from '../../../lib/format'
import { todayISO } from '../../../lib/dates'
import { calcWellness } from '../../../lib/calc'

export default function BulkWellnessForm() {
  const { db, commit, tz } = useData()
  const { closeModal } = useModal()
  const actives = db.clients.filter((c) => c.status === 'Active')
  const [date, setDate] = useState(todayISO(tz))
  const [rows, setRows] = useState(actives.map(() => ({ sl: '', st: '', fa: '', so: '' })))
  const upd = (i, k, v) => setRows(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)))
  const hasEntry = rows.some((row) => [row.sl, row.st, row.fa, row.so].some((value) => value !== ''))
  const incomplete = rows.some((row) => {
    const values = [row.sl, row.st, row.fa, row.so]
    return values.some((value) => value !== '') && values.some((value) => value === '' || Number(value) < 1 || Number(value) > 7)
  })

  const save = () => {
    if (!date || !hasEntry || incomplete) return
    commit((d) => {
      actives.forEach((c, i) => {
        const r = rows[i]
        if (!r.sl && !r.st && !r.fa && !r.so) return
        const sleep = +r.sl, stress = +r.st, fatigue = +r.fa, soreness = +r.so
        const val = { clientId: c.id, date, sleep, stress, fatigue, soreness, score: calcWellness(sleep, stress, fatigue, soreness), source: 'Coach bulk entry' }
        const ex = d.wellness.find((w) => w.clientId === c.id && w.date === date)
        if (ex) Object.assign(ex, val)
        else d.wellness.push({ id: uid(), ...val })
      })
    })
    closeModal()
  }
  return (
    <ModalShell title="Bulk Morning Check-in" onClose={closeModal}
      footer={<><Button variant="ghost" onClick={closeModal}>Cancel</Button><Button onClick={save} disabled={!date || !hasEntry || incomplete}>Save check-ins</Button></>}>
      <p className="muted" style={{ fontSize: 12, marginBottom: 12 }}>Complete all four ratings for each client you include. Empty rows are skipped.</p>
      <Field label="Date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      <div className="bulk-grid" style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 700 }}>
        <span>Athlete</span><span>Sleep</span><span>Stress</span><span>Fatigue</span><span>Soreness</span>
      </div>
      {actives.map((c, i) => (
        <div className="bulk-grid" key={c.id}>
          <span style={{ fontSize: 12 }}><strong>{c.name.split(' ')[0]}</strong></span>
          {['sl', 'st', 'fa', 'so'].map((k) => (
            <input key={k} type="number" min="1" max="7" placeholder="–" value={rows[i][k]} onChange={(e) => upd(i, k, e.target.value)} aria-label={`${c.name} ${k}`} />
          ))}
        </div>
      ))}
      <p className="muted" style={{ fontSize: 11, marginTop: 10 }}>
        Sleep 1–7 (7 = best). Stress / Fatigue / Soreness 1–7 (1 = best). Leave a row blank to skip.
      </p>
    </ModalShell>
  )
}
