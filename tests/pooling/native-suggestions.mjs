import assert from 'node:assert/strict'
import {sql,jsonSQL,literal,asActor,athlete} from './native-connection.mjs'
import {nativeGateway} from './native-gateway.mjs'
import {createSuggestionService} from '../../supabase/functions/_shared/pooling-suggestion.js'
process.env.FITNESS_POOLING_FLOW_CLIENT='context-test-'+crypto.randomUUID()
const {nativeFixture:f}=await import('./native-flow.mjs'),run=crypto.randomUUID()
const seed=jsonSQL(asActor(`select public.pooling_save_draft(${literal(f.client)},${f.generation},${literal(run+'inputs')},${literal({...f.proposal,selection:[]})})`))
const request={clientId:f.client,draftId:seed.id,expectedGeneration:f.generation,operationKey:run+'suggest',mode:'generate'}
const service=createSuggestionService(nativeGateway()),result=await service(request)
assert.equal(result.result.completeness,'ready_for_coach_review');assert(result.receipt.draftId);assert.equal(result.assignment,null)
assert.deepEqual((await service(request)).receipt,result.receipt)
assert.equal(Number(sql(`select count(*) from public.pooling_assignments where draft_id=${result.receipt.draftId}`)),0)
assert.equal(jsonSQL(`select proposal from public.pooling_drafts where id=${seed.id}`).selection.length,0)
await assert.rejects(()=>service({...request,mode:'swap',occurrenceId:'invented',exerciseId:'invented'}),/idempotency_conflict/)
assert.throws(()=>sql(asActor(`select public.pooling_read_suggestions(${literal(f.client)})`,athlete)),/forbidden/)
// A separate synthetic release adds an explicitly equivalent variant. This is
// test-fixture provisioning, not the production content-publication workflow.
const document=jsonSQL(`select document from public.pooling_manifests where id=${literal(f.manifest.id)}`)
const manifestId=run+'-swap-release'
document.manifest.id=manifestId
Object.assign(document.catalogue[0],{familyId:'fictional-family',laterality:'bilateral'})
document.catalogue.push({...structuredClone(document.catalogue[0]),id:'fictional-alternative'})
document.manifest.records.push({id:'fictional-alternative',revision:1})
sql(`insert into public.pooling_manifests(id,state,document) values(${literal(manifestId)},'published',${literal(document)})`)
const parent=jsonSQL(asActor(`select public.pooling_save_draft(${literal(f.client)},${f.generation},${literal(run+'swap-parent')},${literal({...f.proposal,manifestId})})`))
const swapRequest={...request,draftId:parent.id,operationKey:run+'swap',mode:'swap',occurrenceId:f.proposal.selection[0].occurrenceId,exerciseId:'fictional-alternative'}
const swapped=await service(swapRequest)
assert.equal(swapped.result.completeness,'ready_for_coach_review')
assert.equal(jsonSQL(`select proposal from public.pooling_drafts where id=${swapped.receipt.draftId}`).selection[0].exerciseId,'fictional-alternative')
assert.equal(jsonSQL(`select proposal from public.pooling_drafts where id=${parent.id}`).selection[0].exerciseId,'synthetic-ex')
assert.equal(Number(sql(`select count(*) from public.pooling_assignments where draft_id=${swapped.receipt.draftId}`)),0)
assert.deepEqual((await service(swapRequest)).receipt,swapped.receipt)
await assert.rejects(()=>service({...swapRequest,operationKey:run+'superseded'}),/stale_draft/)
const badSwap=await service({...swapRequest,draftId:swapped.receipt.draftId,operationKey:run+'bad-swap',exerciseId:'not-in-release'})
assert.equal(badSwap.result.completeness,'blocked');assert(!badSwap.receipt.draftId)
console.log(JSON.stringify({test:'trusted generation and compatible swap create only unassigned children; parent, retry and rejected substitution preserved',passed:true,draftId:result.receipt.draftId,swapDraftId:swapped.receipt.draftId}))
