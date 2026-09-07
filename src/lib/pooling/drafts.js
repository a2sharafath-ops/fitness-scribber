import { canonical } from './context.js'

export const LOCAL_DRAFT_KEY = 'fitscribe_pooling_drafts_v1'
const fields = (object, keys) => Object.fromEntries(keys.filter(key => object[key] !== undefined).map(key => [key, structuredClone(object[key])]))

export function builderDraft({ date, blocks, notes = '', crossClient = false }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0,10) !== date) throw new Error('invalid_date')
  if (!Array.isArray(blocks)) throw new Error('invalid_blocks')
  return { date, notes: crossClient ? '' : notes, source: 'manual_or_imported_builder', requiresIdentityAndDoseReview: true,
    blocks: blocks.map(block => ({ ...fields(block, ['blockId','blockType','order']), exercises: (block.exercises || []).map(exercise => ({
      ...fields(exercise, ['exerciseId','exerciseDbRef','exerciseName','order','supersetLinkId','intensityType','unmapped','side','range','assistance']),
      sets: (exercise.sets || []).map(set => ({ ...fields(set, ['setId','setNumber','prescribedReps','prescribedIntensityValue','prescribedLoadKg','prescribedTempo','prescribedRestSeconds']),
        completedReps: null, completedLoadKg: null, status: 'Pending' })),
    })) })) }
}

export function readLocalDrafts(storage) {
  const raw = storage.getItem(LOCAL_DRAFT_KEY)
  if (raw === null) return { schemaVersion: 1, records: [] }
  let data
  try { data = JSON.parse(raw) } catch { throw new Error('local_drafts_corrupt') }
  if (data.schemaVersion !== 1 || !Array.isArray(data.records) || data.records.some(row =>
    !row || typeof row.clientId !== 'string' || !Number.isInteger(row.revision) || row.revision < 1 || !row.proposal || typeof row.proposal.date !== 'string' || typeof row.operationKey !== 'string' || row.state !== 'local_draft' || row.authority !== 'none')) throw new Error('local_drafts_unsupported')
  return data
}

// Caller holds a browser Web Lock when available. Local storage is never authority.
export function saveLocalDraft(storage, { clientId, operationKey, expectedRevision, proposal, recordedAt }) {
  if (!clientId || !operationKey || !Number.isFinite(Date.parse(recordedAt)) || !proposal || typeof proposal !== 'object') throw new Error('invalid_draft')
  const db = readLocalDrafts(storage)
  const previousOperation = db.records.find(row => row.clientId === clientId && row.operationKey === operationKey)
  if (previousOperation) {
    if (canonical(previousOperation.proposal) !== canonical(proposal)) throw new Error('idempotency_conflict')
    return structuredClone(previousOperation)
  }
  const currentRevision = Math.max(0, ...db.records.filter(row => row.clientId === clientId && row.proposal.date === proposal.date).map(row => row.revision))
  if (currentRevision !== expectedRevision) throw new Error('draft_conflict')
  const record = { clientId, operationKey, revision: currentRevision + 1, proposal: structuredClone(proposal), recordedAt, state: 'local_draft', authority: 'none' }
  db.records.push(record)
  const encoded = JSON.stringify(db)
  storage.setItem(LOCAL_DRAFT_KEY, encoded)
  if (storage.getItem(LOCAL_DRAFT_KEY) !== encoded) throw new Error('outcome_unknown')
  return structuredClone(record)
}
