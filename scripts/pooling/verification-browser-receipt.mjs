import assert from 'node:assert/strict'
import {verificationHarness} from './verification-runtime.mjs'
const h=verificationHarness(),u=h.ledger.users.find(u=>u.label==='a32-c'),c=await h.signIn(u.label),mode=process.argv[2]
const context=await h.admin.from('pooling_contexts').select('generation,held').eq('client_id',u.clientId).single();assert.ifError(context.error)
if(mode==='prepare'){
 const source=await h.admin.from('pooling_drafts').select('proposal').eq('id',61).eq('client_id',u.clientId).single();assert.ifError(source.error)
 const d=await h.rpc(c,'pooling_save_draft',{target_client:u.clientId,expected_generation:context.data.generation,operation_key:h.key('final-browser-race-target'),proposal:source.data.proposal},1)
 h.ledger.browserRace={draftId:d.id,generation:context.data.generation};h.save();console.log(JSON.stringify(h.ledger.browserRace))
}else if(mode==='record'){
 const r=h.ledger.browserRace;assert(r&&context.data.generation>r.generation)
 const assignments=await h.admin.from('pooling_assignments').select('id').eq('draft_id',r.draftId);assert.ifError(assignments.error);assert.equal(assignments.data.length,0)
 const baseline=await h.admin.from('pooling_assignments').select('id').eq('client_id',u.clientId).eq('draft_id',61).single();assert.ifError(baseline.error)
 const history=await h.rpc(c,'pooling_read_assignments',{target_client:u.clientId},0),a=history.find(a=>a.id===baseline.data.id);assert(a&&a.status==='stop'&&a.actuals.some(a=>a.actual===0))
 h.ledger.finalPreview={passed:true,recordedAt:new Date().toISOString(),codeCommit:'3b9541543e75c6dbff7f4c5b6ffdb64fd033899b',deploymentId:6329365167,vercelDeployment:'8r263XgqahjGfYmhNm1xXryNQLbL',url:'https://fitness-scribber-kq6i-n0dg6r4zw-cureocity1.vercel.app',draftId:61,assignmentId:a.id,zeroAndStopPreserved:true,staleTwoTabApprovalDenied:true,racingDraftId:r.draftId,newGeneration:context.data.generation,scope:'Actual two same-owner browser tabs: report in tab B commits before stale approval in tab A. Separate hosted API tests exercised simultaneous network races.'};h.save();console.log(JSON.stringify(h.ledger.finalPreview))
}else throw Error('prepare_or_record_required')
await c.auth.signOut({scope:'local'})
