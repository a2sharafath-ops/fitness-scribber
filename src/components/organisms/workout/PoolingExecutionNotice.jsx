import { useState } from 'react'
import Button from '../../atoms/Button'
import WorkoutSummary from './WorkoutSummary'
import { stoppedSnapshot } from '../../../lib/pooling/execution'

export default function PoolingExecutionNotice({ workout, units, exercises, onSave, onAddSession }) {
  const [message,setMessage]=useState('')
  const [busy,setBusy]=useState(false)
  async function stop() {
    setBusy(true)
    setMessage('Stopping does not depend on a successful network save.')
    try { await onSave(stoppedSnapshot(workout)); setMessage('Stop requested. Check save status; existing targets and actuals were retained in the request.') }
    catch { setMessage('Stop save failed. Stop remains your choice; existing recorded work has not been cleared.') }
    finally { setBusy(false) }
  }
  return <section aria-label="Pooling execution availability">
    <p role="status">This legacy planner creates review drafts only. Use Exercise Pool for exact coach approval and the coach-approved sessions panel for permitted starts and resumes.</p>
    <p>Drafts and copied sessions are not approvals. Optional wellness answers cannot authorize a start.</p>
    {onAddSession && <Button onClick={onAddSession}>Create review draft</Button>}
    {workout?.status==='in_progress' && <Button variant="danger" disabled={busy} onClick={stop}>Stop and preserve recorded work</Button>}
    {message && <p role="status">{message}</p>}
    {workout?.status==='completed' && <WorkoutSummary workout={workout} units={units} exercises={exercises} locked />}
    {workout && workout.status!=='completed' && <p>Existing session: {workout.title || 'Workout'} · {workout.status}. No targets or recorded actuals are changed by this preview.</p>}
  </section>
}
