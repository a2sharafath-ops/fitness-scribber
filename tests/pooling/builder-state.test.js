import test from 'node:test'
import assert from 'node:assert/strict'
import {builderDraftState} from '../../src/lib/pooling/drafts.js'
test('canonical draft reopening never supplies undefined legacy blocks',()=>{
 const data={date:'2026-09-08',context:{generation:5},drafts:[{id:1,revision:1,proposal:{date:'2026-09-08',blocks:[]}},{id:2,revision:2,proposal:{date:'2026-09-08',selection:[{exerciseId:'fictional'}]}}]}
 assert.deepEqual(builderDraftState(data),{expectedRevision:2,generation:5,parentId:2,initialProposal:null,canonicalParent:true})
 assert.equal(data.drafts[0].id,1)
})
test('manual draft reopening returns a copy and never selects another date',()=>{
 const proposal={date:'2026-09-08',blocks:[],notes:'fictional'}
 const r=builderDraftState({date:proposal.date,drafts:[{id:1,revision:1,proposal},{id:2,revision:9,proposal:{date:'2026-09-09',blocks:[]}}]})
 assert.equal(r.parentId,1);assert.equal(r.canonicalParent,false);r.initialProposal.notes='changed';assert.equal(proposal.notes,'fictional')
})
