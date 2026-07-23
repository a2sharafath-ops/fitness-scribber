import ModalShell from '../../molecules/ModalShell'
import ScreeningFlow from './ScreeningFlow'
import { useData } from '../../../store/DataContext'
import { useModal } from '../../../store/ModalContext'
import { uid } from '../../../lib/format'
import { todayISO } from '../../../lib/dates'
import { newScreening, finalizeScreening, screeningsFor, isExpired, goalHeadline } from '../../../lib/screening'

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
  // Keep the client's headline goal in step with the screening: whenever the
  // goals are saved, mirror them into `client.goal` (shown across the app). Only
  // overwrite when a headline can be derived, so a blank goals step never wipes
  // an existing goal.
  const syncGoal = (d, row) => {
    const headline = goalHeadline(row)
    if (!headline) return
    const c = d.clients.find((x) => x.id === row.clientId)
    if (c) c.goal = headline
  }
  const save = (f) => commit((d) => { const row = { ...f, updatedAt: new Date().toISOString() }; upsert(d, row); syncGoal(d, row) })
  const complete = (f) => {
    commit((d) => { const row = { ...finalizeScreening(f, today), updatedAt: new Date().toISOString() }; upsert(d, row); syncGoal(d, row) })
    closeModal()
  }

  return (
    <ModalShell title={'Health screening — ' + client.name} onClose={closeModal}>
      <ScreeningFlow screening={start} onSave={save} onComplete={complete} onCancel={closeModal} />
    </ModalShell>
  )
}
