import { useState } from 'react'
import ModalShell from '../../molecules/ModalShell'
import ScreeningFlow from './ScreeningFlow'
import { useData } from '../../../store/DataContext'
import { useModal } from '../../../store/ModalContext'
import { uid } from '../../../lib/format'
import { todayISO } from '../../../lib/dates'
import { newScreening, finalizeScreening, screeningsFor, isExpired } from '../../../lib/screening'

// Coach-assisted entry uses the same screening flow as the athlete portal.
export default function CoachScreeningModal({ client }) {
  const { db, saveScreening, tz } = useData()
  const { closeModal } = useModal()
  const today = todayISO(tz)
  const [start] = useState(() => {
    const { draft, complete: prior } = screeningsFor(db.screenings, client.id)
    if (draft) return draft
    const fresh = { id: uid(), ...newScreening(client.id, today) }
    if (prior) {
      fresh.rescreenLog = [...(prior.rescreenLog || []),
        { date: today, reason: isExpired(prior, today) ? 'expired' : 'health_changed' }]
    }
    return fresh
  })

  const save = row => saveScreening(row, row.updatedAt)
  const complete = async row => {
    const confirmed = await save({ ...finalizeScreening(row, today), step: 'final' })
    closeModal()
    return confirmed
  }

  return (
    <ModalShell title={'Health screening — ' + client.name} onClose={closeModal}>
      <ScreeningFlow screening={start} onSave={save} onComplete={complete} onCancel={closeModal} />
    </ModalShell>
  )
}
