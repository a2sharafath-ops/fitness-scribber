// Full-history detail for one tracked lift: headline stats, a 1RM progression
// chart, a quick manual-record field, and the entry log with per-entry delete.
// Opened from the Current Lifts Performance row. Page-tier data access (reads
// db.maxes, writes via commit) — the row stays lean.
import { useState } from 'react'
import { Line } from 'react-chartjs-2'
import ModalShell from '../../molecules/ModalShell'
import Button from '../../atoms/Button'
import Icon from '../../atoms/Icon'
import { useData } from '../../../store/DataContext'
import { useModal } from '../../../store/ModalContext'
import { useFormat } from '../../../hooks/useFormat'
import { todayISO, fmtDate } from '../../../lib/dates'
import { absolute1RM, trainingMaxKg, recordLiftMax, deleteLiftMax } from '../../../lib/program'
import { baseOptions, COLORS, shortLabel } from '../../../lib/chartSetup'
import { confirmDialog } from '../../../lib/toast'

export default function LiftDetailModal({ client, lift }) {
  const { db, commit, tz } = useData()
  const { closeModal } = useModal()
  const { toDisp, dispToKg, unitName } = useFormat()
  const [val, setVal] = useState('')
  const today = todayISO(tz)

  const events = db.maxes
    .filter((m) => m.clientId === client.id && m.kind === 'e1rm' && m.exercise.toLowerCase() === lift.toLowerCase())
  const chron = [...events].sort((a, b) => a.date.localeCompare(b.date))       // oldest→newest for the chart
  const log = [...events].sort((a, b) => b.date.localeCompare(a.date))         // newest first for the list
  const abs = absolute1RM(db.maxes, client.id, lift, today)
  const tm = trainingMaxKg(db.maxes, client.id, lift, today)

  const record = () => {
    const kg = dispToKg(val)
    if (!kg || kg <= 0) return
    commit((d) => recordLiftMax(d, client.id, lift, kg, today, 'manual'))
    setVal('')
  }
  const removeEntry = async (m) => {
    if (!await confirmDialog({
      title: 'Delete 1RM entry',
      message: `Delete the ${toDisp(m.valueKg)} ${unitName()} ${lift} 1RM from ${fmtDate(m.date)}? It will no longer feed this client's Training Max or assessment. This can't be undone.`,
      confirmLabel: 'Delete', danger: true,
    })) return
    commit((d) => deleteLiftMax(d, m.id))
  }

  const data = {
    labels: chron.map((m) => shortLabel(m.date)),
    datasets: [{
      label: `Estimated 1RM (${unitName()})`,
      data: chron.map((m) => toDisp(m.valueKg)),
      borderColor: COLORS.green,
      backgroundColor: 'rgba(52,199,89,.12)',
      fill: true, tension: 0.3, pointRadius: 4, pointHoverRadius: 6,
      // Auto (Epley) peaks and manual entries get distinct point colours.
      pointBackgroundColor: chron.map((m) => (m.source === 'auto' ? COLORS.blue : COLORS.amber)),
      pointBorderColor: chron.map((m) => (m.source === 'auto' ? COLORS.blue : COLORS.amber)),
    }],
  }

  return (
    <ModalShell title={<><Icon name="dumbbell" size={16} /> {lift}</>} onClose={closeModal}
      footer={<Button variant="ghost" onClick={closeModal}>Close</Button>}>
      <div className="lift-stats">
        <div><span>Absolute 1RM · 30d</span><b>{abs != null ? `${toDisp(abs)} ${unitName()}` : '—'}</b></div>
        <div><span>Training Max</span><b>{tm != null ? `${toDisp(tm)} ${unitName()}` : '—'}</b></div>
        <div><span>Entries</span><b>{events.length}</b></div>
      </div>

      {chron.length ? (
        <div className="lift-chart"><Line data={data} options={baseOptions()} /></div>
      ) : (
        <div className="empty" style={{ padding: '28px 0' }}><div className="big"><Icon name="chart" size={38} /></div>No 1RM history yet.</div>
      )}
      {chron.length > 0 && (
        <div className="lift-legend">
          <span><i style={{ background: COLORS.blue }} /> auto (Epley) — from completed sets</span>
          <span><i style={{ background: COLORS.amber }} /> manual — trainer-recorded</span>
        </div>
      )}

      <div className="lift-record">
        <input type="number" placeholder={`Record a 1RM (${unitName()})`} value={val} aria-label={`Record 1RM for ${lift}`}
          onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') record() }} />
        <Button size="sm" onClick={record} disabled={!val}>＋ Add entry</Button>
      </div>

      <div className="lift-log-title">Entry log</div>
      {log.length ? log.map((m) => (
        <div className="clp-hrow" key={m.id}>
          <span className="clp-hval">{toDisp(m.valueKg)} {unitName()}</span>
          <span className="muted">{fmtDate(m.date)}</span>
          <span className={'clp-htag ' + (m.source === 'auto' ? 'auto' : 'manual')}>{m.source === 'auto' ? 'auto (Epley)' : 'manual'}</span>
          <button className="clp-hdel" aria-label={`Delete this ${lift} 1RM entry`} onClick={() => removeEntry(m)}>Delete</button>
        </div>
      )) : <div className="muted" style={{ fontSize: 12, padding: '4px 0' }}>No entries recorded.</div>}
    </ModalShell>
  )
}
