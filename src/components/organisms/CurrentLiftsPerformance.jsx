// Current Lifts Performance — the trainer chooses which main lifts to track
// for this client. Each tracked lift shows the live rolling 30-day Absolute
// 1RM (auto-calculated via Epley when the client completes main-lift sets)
// and the Training Max that baselines %1RM prescription targets. New peaks
// on tracked lifts auto-push a fitness-assessment record; the trainer can
// also record a 1RM manually (e.g. a tested baseline at intake).
import { useState } from 'react'
import Button from '../atoms/Button'
import Icon from '../atoms/Icon'
import { useData } from '../../store/DataContext'
import { useFormat } from '../../hooks/useFormat'
import { todayISO, fmtDate } from '../../lib/dates'
import { absolute1RM, trainingMaxKg, recordLiftMax, deleteLiftMax } from '../../lib/program'
import { confirmDialog } from '../../lib/toast'

export default function CurrentLiftsPerformance({ client }) {
  const { db, commit, tz } = useData()
  const { toDisp, dispToKg, unitName } = useFormat()
  const [pick, setPick] = useState('')
  const [entry, setEntry] = useState({})
  const [openLift, setOpenLift] = useState(null)   // lift whose history is expanded
  const today = todayISO(tz)
  const tracked = client.trackedLifts || []

  // Every e1RM ledger event for a lift, newest first — the expandable history.
  const historyFor = (lift) => db.maxes
    .filter((m) => m.clientId === client.id && m.kind === 'e1rm' && m.exercise.toLowerCase() === lift.toLowerCase())
    .sort((a, b) => b.date.localeCompare(a.date))

  // Remove one recorded 1RM (and any auto-assessment it created). This is how a
  // wrong reading — e.g. a peak from a session that never really happened — is
  // corrected, since it can outlive the plan it came from.
  const removeEntry = async (m) => {
    if (!await confirmDialog({
      title: 'Delete 1RM entry',
      message: `Delete the ${toDisp(m.valueKg)} ${unitName()} ${m.exercise} 1RM from ${fmtDate(m.date)}? It will no longer feed this client's Training Max or assessment. This can't be undone.`,
      confirmLabel: 'Delete', danger: true,
    })) return
    commit((d) => deleteLiftMax(d, m.id))
  }

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
            <span>Lift</span><span>Absolute 1RM (30d)</span><span>Training Max</span><span>Last update</span><span>Record 1RM</span><span />
          </div>
          {tracked.map((lift) => {
            const abs = absolute1RM(db.maxes, client.id, lift, today)
            const tm = trainingMaxKg(db.maxes, client.id, lift, today)
            const hist = historyFor(lift)
            const ev = hist[0]
            const isOpen = openLift === lift
            return (
              <div key={lift}>
                <div className="clp-row">
                  <span style={{ fontWeight: 600 }}>{lift}</span>
                  <span className="clp-val">{abs != null ? `${toDisp(abs)} ${unitName()}` : '—'}</span>
                  <span>{tm != null ? `${toDisp(tm)} ${unitName()}` : '—'}</span>
                  <button className="clp-histbtn" aria-expanded={isOpen}
                    disabled={!hist.length} onClick={() => setOpenLift(isOpen ? null : lift)}
                    title={hist.length ? 'Show recorded 1RM history' : 'No entries yet'}>
                    {ev ? <>{fmtDate(ev.date)} · {ev.source === 'auto' ? 'auto (Epley)' : 'manual'}</> : 'no data yet'}
                    {hist.length > 1 && <span className="clp-count">{hist.length}</span>}
                    {hist.length ? <span className="clp-caret" aria-hidden="true">{isOpen ? '▾' : '▸'}</span> : null}
                  </button>
                  <span className="clp-entry">
                    <input type="number" placeholder={unitName()} aria-label={`Record 1RM for ${lift}`}
                      value={entry[lift] ?? ''} onChange={(e) => setEntry((x) => ({ ...x, [lift]: e.target.value }))}
                      onKeyDown={onEntryKey(lift)} />
                    <Button size="sm" variant="ghost" onClick={() => record(lift)} disabled={!entry[lift]}>Set</Button>
                  </span>
                  <button className="x" aria-label={`Stop tracking ${lift}`} onClick={() => removeLift(lift)}>×</button>
                </div>
                {isOpen && (
                  <div className="clp-history">
                    {hist.map((m) => (
                      <div className="clp-hrow" key={m.id}>
                        <span className="clp-hval">{toDisp(m.valueKg)} {unitName()}</span>
                        <span className="muted">{fmtDate(m.date)}</span>
                        <span className={'clp-htag ' + (m.source === 'auto' ? 'auto' : 'manual')}>
                          {m.source === 'auto' ? 'auto (Epley)' : 'manual'}
                        </span>
                        <button className="clp-hdel" aria-label={`Delete this ${m.exercise} 1RM entry`} onClick={() => removeEntry(m)}>
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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
