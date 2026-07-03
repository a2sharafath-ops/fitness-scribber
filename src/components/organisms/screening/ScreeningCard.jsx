import { useState } from 'react'
import Card from '../../atoms/Card'
import Button from '../../atoms/Button'
import ScreeningFlow from './ScreeningFlow'
import ScreeningProfile from './ScreeningProfile'
import { uid } from '../../../lib/format'
import { fmtDate, todayISO } from '../../../lib/dates'
import { newScreening, isExpired } from '../../../lib/screening'

// Athlete-facing screening entry point. Deliberately NEUTRAL: shows completion
// state and dates only — never an outcome, risk flag, or clearance message.
// The trainer reviews results and communicates any next steps personally.
export default function ScreeningCard({ clientId, complete, draft, busy, onSave, onComplete }) {
  // The active record is created once on open (stable id) so step saves upsert
  // the same row instead of inserting duplicates.
  const [active, setActive] = useState(null)
  const [justDone, setJustDone] = useState(false)
  const [showAnswers, setShowAnswers] = useState(false)
  const today = todayISO()
  const expired = complete && isExpired(complete, today)
  const setOpen = (v) => {
    if (!v) return setActive(null)
    if (draft) return setActive(draft)
    const fresh = { id: uid(), ...newScreening(clientId, today) }
    // Re-screen trigger log: record WHY a new screening started (12-month expiry
    // or a "my health changed" event) for the trainer's audit trail.
    if (complete) fresh.rescreenLog = [...(complete.rescreenLog || []), { date: today, reason: expired ? 'expired' : 'health_changed' }]
    setActive(fresh)
  }

  if (active) {
    const submit = async (f) => {
      const ok = await onComplete(f)
      if (ok) { setActive(null); setJustDone(true) }
    }
    return (
      <Card style={{ marginTop: 16 }}>
        <div className="section-title" style={{ margin: '0 0 4px' }}>Health screening</div>
        <ScreeningFlow screening={active} busy={busy} onSave={onSave} onComplete={submit} onCancel={() => setActive(null)} />
      </Card>
    )
  }

  return (
    <Card style={{ marginTop: 16 }}>
      <div className="flex between">
        <div className="section-title" style={{ margin: 0 }}>Health screening</div>
        {complete && !expired && <span className="tag green">✓ Complete</span>}
      </div>
      {justDone ? (
        <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>
          Thanks — your screening has been sent to your trainer, who will use it to build the right plan for you.
        </p>
      ) : draft ? (
        <>
          <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>You have a screening in progress — pick up where you left off.</p>
          <Button style={{ marginTop: 10 }} onClick={() => setOpen(true)}>Resume screening</Button>
        </>
      ) : complete && !expired ? (
        <>
          <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>
            Completed {fmtDate(complete.completedOn)} · next one due {fmtDate(complete.validUntil)}.
            If your health changes before then, please update it.
          </p>
          <div className="flex gap" style={{ marginTop: 10, flexWrap: 'wrap' }}>
            <Button variant="ghost" onClick={() => setShowAnswers(!showAnswers)}>{showAnswers ? 'Hide my answers' : 'View my answers'}</Button>
            <Button variant="ghost" onClick={() => setOpen(true)}>My health has changed — update screening</Button>
          </div>
          {/* Client view of their OWN inputs — outcome/risk/clearance stay hidden. */}
          {showAnswers && <div style={{ marginTop: 12 }}><ScreeningProfile screening={complete} trainerView={false} /></div>}
        </>
      ) : (
        <>
          <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>
            {expired ? 'Your last screening has expired — please complete a new one so your trainer can keep your plan safe and current.'
              : 'A few questions about your health, history, and goals (about 5–10 minutes) so your trainer can build the right plan for you. You can save and finish later.'}
          </p>
          <Button style={{ marginTop: 10 }} onClick={() => setOpen(true)}>{expired ? 'Start new screening' : 'Start screening'}</Button>
        </>
      )}
    </Card>
  )
}
