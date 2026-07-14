import { useState } from 'react'
import ModalShell from '../../molecules/ModalShell'
import Button from '../../atoms/Button'
import Field from '../../atoms/Field'
import { useData } from '../../../store/DataContext'
import { useModal } from '../../../store/ModalContext'
import { fmtDay } from '../../../lib/dates'
import { clipTargets, clipClashes, pasteClip } from '../../../lib/planner'
import { toast, confirmDialog } from '../../../lib/toast'

// Fan a copied span of planner days out to several clients at once. The clip's
// pattern is preserved: sessions land at the same relative offsets from the
// chosen start date, so a Mon/Wed/Fri block stays a Mon/Wed/Fri block.
export default function PastePlanModal({ clip }) {
  const { db, commit } = useData()
  const { closeModal } = useModal()
  const [ids, setIds] = useState(new Set())
  const [start, setStart] = useState(clip.anchor)

  const targets = clipTargets(clip, start)
  const toggle = (cid) => setIds((s) => {
    const n = new Set(s); if (n.has(cid)) n.delete(cid); else n.add(cid); return n
  })

  const apply = async () => {
    const list = [...ids]
    if (!list.length || !start) return
    const clash = list.filter((cid) => clipClashes(db, clip, cid, start).length)
    if (clash.length && !await confirmDialog({
      title: 'Overwrite sessions',
      message: `${clash.length} of the selected client${clash.length === 1 ? ' already has a session' : 's already have sessions'} on those dates — overwrite?`,
      confirmLabel: 'Overwrite',
    })) return
    commit((d) => list.forEach((cid) => pasteClip(d, clip, cid, start)))
    closeModal()
    toast(`Pasted ${clip.days.length} session${clip.days.length === 1 ? '' : 's'} to ${list.length} client${list.length === 1 ? '' : 's'}.`)
  }

  return (
    <ModalShell
      title="Paste plan to clients"
      onClose={closeModal}
      footer={<>
        <Button variant="ghost" onClick={closeModal}>Cancel</Button>
        <Button disabled={!ids.size || !start} onClick={apply}>Paste to {ids.size || ''} client{ids.size === 1 ? '' : 's'}</Button>
      </>}
    >
      <p className="muted" style={{ fontSize: 12.5, margin: '0 0 10px' }}>
        <strong>{clip.days.length}</strong> session{clip.days.length === 1 ? '' : 's'} copied from <strong>{clip.sourceClientName}</strong>.
        The pattern is preserved — sessions keep their spacing relative to the start date.
      </p>

      <Field label="Start date">
        <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
      </Field>
      {start && (
        <p className="muted" style={{ fontSize: 12, margin: '0 0 12px' }}>
          Lands on: {targets.map(fmtDay).join(' · ')}
        </p>
      )}

      <div className="flex gap" style={{ marginBottom: 8 }}>
        <button type="button" className="link-btn" onClick={() => setIds(new Set(db.clients.map((c) => c.id)))}>Select all</button>
        <button type="button" className="link-btn" onClick={() => setIds(new Set())}>Clear</button>
        <div className="nav-spacer" />
        <span className="muted" style={{ fontSize: 12 }}>{ids.size} selected</span>
      </div>

      <div className="pick-list">
        {db.clients.map((c) => {
          const clash = ids.has(c.id) ? clipClashes(db, clip, c.id, start).length : 0
          return (
            <label key={c.id} className={'pick-row' + (ids.has(c.id) ? ' on' : '')}>
              <input type="checkbox" checked={ids.has(c.id)} onChange={() => toggle(c.id)} />
              <span className="pick-name">{c.name}</span>
              <span className="muted" style={{ fontSize: 11 }}>
                {c.id === clip.sourceClientId ? 'source' : `${c.level} · ${c.status}`}
              </span>
              <div className="nav-spacer" />
              {clash > 0 && <span className="pick-warn">{clash} day{clash === 1 ? '' : 's'} will be overwritten</span>}
            </label>
          )
        })}
      </div>
    </ModalShell>
  )
}
