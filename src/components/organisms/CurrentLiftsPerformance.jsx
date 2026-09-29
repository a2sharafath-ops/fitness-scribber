// 1RM ledger. Previously entered records remain accessible even when their
// lift has no completed workout or resistance log for the performed selector.
import { useState } from 'react'
import Button from '../atoms/Button'
import Icon from '../atoms/Icon'
import LiftDetailModal from './program/LiftDetailModal'
import { useData } from '../../store/DataContext'
import { useModal } from '../../store/ModalContext'
import { useFormat } from '../../hooks/useFormat'
import { todayISO, fmtDate } from '../../lib/dates'
import { absolute1RM, trainingMaxKg, recordLiftMax } from '../../lib/program'
import { performedLiftOptions } from '../../lib/performedLifts'

export default function CurrentLiftsPerformance({ client }) {
  const { db, commit, tz } = useData()
  const { openModal } = useModal()
  const { toDisp, dispToKg, unitName } = useFormat()
  const [entry, setEntry] = useState({})
  const today = todayISO(tz)
  const performed = performedLiftOptions(db, client.id).map((item) => item.name)
  const lifts = [...performed, ...[...new Set((db.maxes || []).filter((row) => row.clientId === client.id && row.exercise).map((row) => row.exercise))]
    .filter((name) => !performed.some((lift) => lift.toLowerCase() === name.toLowerCase()))]

  // Latest e1RM event for the row's "last update" cell; the full history + chart
  // + per-entry delete live in the detail modal.
  const lastEvent = (lift) => db.maxes
    .filter((m) => m.clientId === client.id && m.kind === 'e1rm' && m.exercise.toLowerCase() === lift.toLowerCase())
    .sort((a, b) => b.date.localeCompare(a.date))[0]
  const openDetail = (lift) => openModal(<LiftDetailModal client={client} lift={lift} />, true)

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
        <div className="section-title" style={{ margin: 0 }}><Icon name="dumbbell" size={16} /> 1RM records</div>
        <span className="muted" style={{ fontSize: 11 }}>
          Historical 1RM-only lifts stay here for review, but appear in the selector only after completed work is logged.
        </span>
      </div>

      {lifts.length ? (
        <>
          <div className="clp-row clp-head">
            <span>Lift</span><span>Highest 1RM (30d)</span><span>Training Max</span><span>Last update</span><span>Details</span><span>Coach-entered 1RM</span>
          </div>
          {lifts.map((lift) => {
            const abs = absolute1RM(db.maxes, client.id, lift, today)
            const tm = trainingMaxKg(db.maxes, client.id, lift, today)
            const ev = lastEvent(lift)
            return (
              <div className="clp-row" key={lift}>
                <span style={{ fontWeight: 600 }}>{lift}{!performed.some((name) => name.toLowerCase() === lift.toLowerCase()) && <small className="clp-record-only">1RM record only</small>}</span>
                <span className="clp-val"><small className="clp-mobile-label">Highest 1RM (30d)</small>{abs != null ? `${toDisp(abs)} ${unitName()}` : '—'}</span>
                <span><small className="clp-mobile-label">Training max</small>{tm != null ? `${toDisp(tm)} ${unitName()}` : '—'}</span>
                <span className="muted" style={{ fontSize: 11 }}>
                  {ev ? `${fmtDate(ev.date)} · ${ev.source === 'auto' ? 'auto (Epley)' : 'manual'}` : 'no data yet'}
                </span>
                <button className="clp-detail" onClick={() => openDetail(lift)} aria-label={`View ${lift} history and chart`}>
                  <Icon name="chart" size={13} /> View
                </button>
                <span className="clp-entry">
                  <small className="clp-mobile-label">Coach-entered 1RM</small>
                  <input type="number" placeholder={unitName()} aria-label={`Record coach-entered 1RM for ${lift}`}
                    value={entry[lift] ?? ''} onChange={(e) => setEntry((x) => ({ ...x, [lift]: e.target.value }))}
                    onKeyDown={onEntryKey(lift)} />
                  <Button size="sm" variant="ghost" onClick={() => record(lift)} disabled={!entry[lift]}>Set</Button>
                </span>
              </div>
            )
          })}
        </>
      ) : (
        <div className="muted" style={{ fontSize: 12, margin: '10px 0' }}>
          No performed lifts recorded yet. Complete a workout set or log resistance first.
        </div>
      )}
    </div>
  )
}
