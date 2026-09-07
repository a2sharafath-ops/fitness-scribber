import {canonical} from './context.js'
export const OPERATION_KEY='fitscribe_pooling_operations_v1'
const read=storage=>{
 const raw=storage.getItem(OPERATION_KEY)
 if(raw===null)return {schemaVersion:1,operations:[]}
 let db
 try{db=JSON.parse(raw)}catch{throw new Error('operation_journal_corrupt')}
 if(db?.schemaVersion!==1 || !Array.isArray(db.operations) || db.operations.some(row=>!row || typeof row.scope!=='string' || !row.scope || typeof row.kind!=='string' || !row.kind || typeof row.request?.operationKey!=='string' || !row.request.operationKey || (row.receipt && !['saved','committed'].includes(row.receipt.status)) || (row.receipt && row.rejection)))throw new Error('operation_journal_unsupported')
 if(new Set(db.operations.map(row=>JSON.stringify([row.scope,row.request.operationKey]))).size!==db.operations.length)throw new Error('operation_journal_corrupt')
 return db
}
const write=(storage,db)=>{const raw=JSON.stringify(db);storage.setItem(OPERATION_KEY,raw);if(storage.getItem(OPERATION_KEY)!==raw)throw new Error('journal_write_unconfirmed')}
export function pendingOperations(storage,scope){return structuredClone(read(storage).operations.filter(row=>row.scope===scope && !row.receipt && !row.rejection))}
export function prepareOperation(storage,{scope,kind,request}) {
 if(!scope || !kind || !request?.operationKey)throw new Error('invalid_operation')
 const db=read(storage),prior=db.operations.find(row=>row.scope===scope && row.request.operationKey===request.operationKey)
 if(prior){if(prior.kind!==kind || canonical(prior.request)!==canonical(request))throw new Error('idempotency_conflict');if(prior.rejection)throw new Error(prior.rejection);return structuredClone(prior)}
 const row={scope,kind,request:structuredClone(request),receipt:null};db.operations.push(row);write(storage,db);return structuredClone(row)
}
export function settleOperation(storage,scope,key,receipt){
 if(!receipt || !['saved','committed'].includes(receipt.status))throw new Error('invalid_receipt')
 const db=read(storage),row=db.operations.find(row=>row.scope===scope && row.request.operationKey===key)
 if(!row)throw new Error('operation_not_found')
 if(row.receipt && canonical(row.receipt)!==canonical(receipt))throw new Error('receipt_conflict')
 row.receipt=structuredClone(receipt);write(storage,db)
}
export function rejectOperation(storage,scope,key,code){
 if(!['draft_conflict','stale_context','idempotency_conflict','protected_field','invalid_proposal','invalid_parent','invalid_operation_key','forbidden','feature_disabled','source_changed','invalid_confirmation','context_held','stale_draft','decision_unavailable','content_revoked','required_gap','invalid_event','invalid_actual','invalid_transition','health_check_required','invalid_report','invalid_field','invalid_health_change','invalid_wellness','invalid_budget','invalid_equipment'].includes(code))throw new Error('not_definitive_rejection')
 const db=read(storage),row=db.operations.find(row=>row.scope===scope && row.request.operationKey===key)
 if(!row || row.receipt)throw new Error('operation_not_pending')
 row.rejection=code;write(storage,db)
}
