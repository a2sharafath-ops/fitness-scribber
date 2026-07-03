import ModalShell from '../../molecules/ModalShell'
import ScreeningFlow from './ScreeningFlow'
import { useData } from '../../../store/DataContext'
import { useModal } from '../../../store/ModalContext'
import { uid } from '../../../lib/format'
import { todayISO } from '../../../lib/dates'
import { newScreening, finalizeScreening, screeningsFor, isExpired } from '../../../lib/screening'

// Coach-assisted screening entry: the trainer walks the client through the same
// flow in person (also the only path in local mode, which has no athlete portal).
export default function CoachScreeningModal({ client }) {
  const { db, commit, tz } = useData()
  const { closeModal } = useModal()
  const today = todayISO(tz)
  const { draft, complete: prior } = screeningsFor(db.screenings, client.id)
  const start = draft || { id: uid(), ...newScreening(client.id, today) }
  if (!draft && prior) {
    start.rescreenLog = [...(prior.rescreenLog || []),
      { date: today, reason: isExpired(prior, today) ? 'expired' : 'health_changed' }]
  }

  const upsert = (d, row) => {
    const i = d.screenings.findIndex((x) => x.id === row.id)
    if (i >= 0) d.screenings[i] = row
    else d.screenings.push(row)
  }
  const save = (f) => commit((d) => upsert(d, { ...f, updatedAt: new Date().toISOString() }))
  const complete = (f) => {
    commit((d) => upsert(d, { ...finalizeScreening(f, today), updatedAt: new Date().toISOString() }))
    closeModal()
  }

  return (
    <ModalShell title={'Health screening — ' + client.name} onClose={closeModal}>
      <ScreeningFlow screening={start} onSave={save} onComplete={complete} onCancel={closeModal} />
    </ModalShell>
  )
}
