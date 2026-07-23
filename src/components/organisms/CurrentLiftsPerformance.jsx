// Current Lifts Performance — the trainer chooses which main lifts to track
// for this client. Each tracked lift shows the live rolling 30-day Absolute
// 1RM (auto-calculated via Epley when the client completes main-lift sets)
// and the Training Max that baselines %1RM prescription targets. New peaks
// on tracked lifts auto-push a fitness-assessment record; the trainer can
// also record a 1RM manually (e.g. a tested baseline at intake).
import { useState } from 'react'
import Button from '../atoms/Button'
import Icon from '../atoms/Icon'
import LiftDetailModal from './program/LiftDetailModal'
import { useData } from '../../store/DataContext'
import { useModal } from '../../store/ModalContext'
import { useFormat } from '../../hooks/useFormat'
import { todayISO, fmtDate } from '../../lib/dates'
import { absolute1RM, trainingMaxKg, recordLiftMax } from '../../lib/program'
import { confirmDialog } from '../../lib/toast'

export default function CurrentLiftsPerformance({ client }) {
  const { db, commit, tz } = useData()
  const { openModal } = useModal()
  const { toDisp, dispToKg, unitName } = useFormat()
  const [pick, setPick] = useState('')
  const [entry, setEntry] = useState({})
  const today = todayISO(tz)
  const tracked = client.trackedLifts || []

  // Latest e1RM event for the row's "last update" cell; the full history + chart
  // + per-entry delete live in the detail modal.
  const lastEvent = (lift) => db.maxes
    .filter((m) => m.clientId === client.id && m.kind === 'e1rm' && m.exercise.toLowerCase() === lift.toLowerCase())
    .sort((a, b) => b.date.localeCompare(a.date))[0]
  const openDetail = (lift) => openModal(<LiftDetailModal client={client} lift={lift} />, true)

  const addLift = () => {
    const name = pick.trim()
    if (!name || tracked.some((l) => l.toLowerCase() === name.toLowerCase())) return
    commit((d) => { const c = d.clients.find((x) => x.id === client.id); c.trackedLifts = [...(c.trackedLifts || []), name] })
    setPick('')
  }
  const removeLift = async (lift) => {
    if (!await confirmDialog({
      title: 'Stop tracking lift',
      message: `Stop tracking ${lift}? It will be removed from this list. Recorded 1RM history is kept — re-add the lift to see it again.`,
      confirmLabel: 'Stop tracking', danger: true,
    })) return
    commit((d) => { const c = d.clients.find((x) => x.id === client.id); c.trackedLifts = (c.trackedLifts || []).filter((l) => l !== lift) })
  }
  const record = (lift) => {
    const kg = dispToKg(entry[lift])
    if (!kg || kg <= 0) return
    commit((d) => recordLiftMax(d, client.id, lift, kg, today, 'manual'))
    setEntry((e) => ({ ...e, [lift]: '' }))
  }
  const onEntryKey = (lift) => (e) => { if (e.key === 'Enter') record(lift) }

  return (
    <div className="card">
      <div className="flex between" style={{ flexWrap: 'wrap', gap: 8 }}>
        <div className="section-title" style={{ margin: 0 }}><Icon name="dumbbell" size={16} /> Current lifts performance</div>
        <span className="muted" style={{ fontSize: 11 }}>
          1RM auto-updates from completed main-lift sets · baselines %1RM prescription targets
        </span>
      </div>

      {tracked.length ? (
        <>
          <div className="clp-row clp-head">
            <span>Lift</span><span>Absolute 1RM (30d)</span><span>Training Max</span><span>Last update</span><span>Details</span><span>Record 1RM</span><span />
          </div>
          {tracked.map((lift) => {
            const abs = absolute1RM(db.maxes, client.id, lift, today)
            const tm = trainingMaxKg(db.maxes, client.id, lift, today)
            const ev = lastEvent(lift)
            return (
              <div className="clp-row" key={lift}>
                <span style={{ fontWeight: 600 }}>{lift}</span>
                <span className="clp-val">{abs != null ? `${toDisp(abs)} ${unitName()}` : '—'}</span>
                <span>{tm != null ? `${toDisp(tm)} ${unitName()}` : '—'}</span>
                <span className="muted" style={{ fontSize: 11 }}>
                  {ev ? `${fmtDate(ev.date)} · ${ev.source === 'auto' ? 'auto (Epley)' : 'manual'}` : 'no data yet'}
                </span>
                <button className="clp-detail" onClick={() => openDetail(lift)} aria-label={`View ${lift} history and chart`}>
                  <Icon name="chart" size={13} /> View
                </button>
                <span className="clp-entry">
                  <input type="number" placeholder={unitName()} aria-label={`Record 1RM for ${lift}`}
                    value={entry[lift] ?? ''} onChange={(e) => setEntry((x) => ({ ...x, [lift]: e.target.value }))}
                    onKeyDown={onEntryKey(lift)} />
                  <Button size="sm" variant="ghost" onClick={() => record(lift)} disabled={!entry[lift]}>Set</Button>
                </span>
                <button className="x" aria-label={`Stop tracking ${lift}`} onClick={() => removeLift(lift)}>×</button>
              </div>
            )
          })}
        </>
      ) : (
        <div className="muted" style={{ fontSize: 12, margin: '10px 0' }}>
          No lifts tracked yet — choose the main lifts whose 1RM should feed this client's assessment and prescription intensities.
        </div>
      )}

      <div className="flex gap" style={{ marginTop: 10 }}>
        <input list="clpExList" value={pick} placeholder="Add a lift to track…" aria-label="Lift to track"
          style={{ maxWidth: 260 }} onChange={(e) => setPick(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addLift() }} />
        <datalist id="clpExList">
          {db.exercises.filter((e) => !tracked.some((l) => l.toLowerCase() === e.name.toLowerCase())).map((e) => <option key={e.id} value={e.name} />)}
        </datalist>
        <Button size="sm" onClick={addLift} disabled={!pick.trim()}>＋ Track lift</Button>
      </div>
    </div>
  )
}
