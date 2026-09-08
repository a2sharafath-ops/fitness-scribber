import { useCallback, useEffect, useRef, useState } from 'react'
import { readBuilderDraftState, saveRecoverableBuilderDraft, readPendingBuilderOperations } from '../api/pooling'
import { builderDraft } from '../lib/pooling/drafts'

// UI save lifecycle only. Neither local nor server draft saving grants assignment.
export default function usePoolingBuilder({ enabled, clientId, date }) {
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [outcomes, setOutcomes] = useState([])
  const [initialProposal, setInitialProposal] = useState(null)
  const [canonicalParent,setCanonicalParent] = useState(false)
  const expected = useRef(new Map())
  const pending = useRef(null)
  const busy = useRef(false)
  const current = useRef(null)
  if(current.current?.clientId!==clientId || current.current?.date!==date || current.current?.enabled!==enabled){
    current.current={clientId,date,enabled}
    pending.current=null
    busy.current=false
  }
  const scope=current.current
  useEffect(() => {
    if (!enabled) return
    let active = true
    setStatus('loading')
    setError('');setOutcomes([]);setInitialProposal(null);setCanonicalParent(false)
    Promise.all([readBuilderDraftState(clientId,date),readPendingBuilderOperations(clientId)]).then(([value,operations]) => {
      if (active && current.current===scope) {
        expected.current.set(`${clientId}:${date}`,value); setInitialProposal(value.initialProposal);setCanonicalParent(value.canonicalParent)
        const recovered=operations.filter(row=>row.request.proposal.date===date)
        pending.current=recovered.length?recovered.map(row=>({clientId,date,request:row.request,code:'outcome_unknown'})):null
        setStatus(recovered.length?'outcome_unknown':'ready')
        if(recovered.length)setError('An unfinished save was recovered. Retry uses its original content and operation key.')
      }
    }).catch(failure => { if (active && current.current===scope) { setError(failure.message); setStatus('failed') } })
    return () => { active = false }
  }, [enabled,clientId,date,scope])

  const execute = useCallback(async batch => {
    if (busy.current || current.current!==scope) return false
    busy.current = true
    setError('')
    setStatus('saving')
    try {
      for (const entry of batch) {
        if(current.current!==scope)return false
        if (entry.receipt) continue
        try {
          if (!entry.request) {
            const key = `${entry.clientId}:${entry.date}`
            const version = expected.current.get(key) || await readBuilderDraftState(entry.clientId,entry.date)
            if(current.current!==scope)return false
            entry.request = { clientId: entry.clientId, operationKey: crypto.randomUUID(), proposal: builderDraft(entry), ...version }
          }
          entry.receipt = await saveRecoverableBuilderDraft(entry.request)
          expected.current.set(`${entry.clientId}:${entry.date}`, { expectedRevision: entry.receipt.revision, generation: entry.request.generation, parentId: entry.receipt.id || null })
          entry.error = null
        } catch (failure) {
          entry.error = failure.message
          entry.code = failure.code
          // Keep the exact payload/key for unknown outcomes and durable-save retries.
          if (['draft_conflict','stale_context','idempotency_conflict'].includes(failure.code)) entry.reviewRequired = true
        }
        if(current.current!==scope)return false
        setOutcomes(batch.map(item => ({ clientId: item.clientId, date: item.date, saved: !!item.receipt, error: item.error || null })))
      }
      const failures = batch.filter(entry => !entry.receipt)
      if (failures.length) {
        setError(`${failures.length} draft(s) not confirmed saved. ${failures[0].error} ${failures.some(entry => entry.reviewRequired) ? 'Reopen the builder to review the newer version; do not overwrite it.' : 'Retry preserves the original request.'}`)
        setStatus(failures.some(entry => entry.code === 'outcome_unknown') ? 'outcome_unknown' : 'failed')
        return false
      }
      pending.current = null
      setStatus('saved')
      return true
    } finally { if(current.current===scope)busy.current = false }
  }, [scope])
  const saveTargets = useCallback(async targets => {
    if (!enabled || status === 'loading' || busy.current) return false
    if (pending.current) { setError('Resolve the pending draft save first. Retry keeps its original content and operation key.'); return false }
    const batch = structuredClone(targets)
    pending.current = batch
    return execute(batch)
  }, [enabled,status,execute])
  const retry = useCallback(() => {
    if (!pending.current || pending.current.some(entry => entry.reviewRequired)) return Promise.resolve(false)
    return execute(pending.current)
  }, [execute])
  const markDirty = useCallback(() => setStatus(current => current === 'saved' ? 'unsaved' : current), [])
  return { status, error, outcomes, initialProposal, canonicalParent, saveTargets, retry, markDirty, pending: !!pending.current, hasUnknown: pending.current?.some(entry => !entry.receipt && entry.code === 'outcome_unknown') || false, busy: status === 'saving' }
}
