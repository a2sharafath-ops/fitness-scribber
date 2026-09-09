import {test} from 'node:test'
import assert from 'node:assert/strict'
import {approvalBlock,sessionStartBlock,workspaceCreateBlock} from '../../src/lib/pooling/action-readiness.js'

const approval=()=>({row:{id:12,proposal:{selection:[{occurrenceId:'fictional'}]}},context:{generation:2,held:false},decision:{generation:2,manifestState:'published',validUntil:'2026-09-10T12:00:00Z',result:{completeness:'ready_for_coach_review',sessionState:'eligible_for_coach_review'}},drafts:[],assignments:[],online:true,now:Date.parse('2026-09-09T12:00:00Z')})
test('approval explanation permits only the same complete current decision boundary',()=>{
  assert.equal(approvalBlock(approval()),'')
  const cases=[['online',false,/load/],['context',null,/unavailable/],['context',{generation:2,held:true},/hold/],['decision',null,/Validate exact draft/],['row',{id:12,proposal:{}},/Generate/],['drafts',[{parent_id:12}],/newer revision/],['assignments',[{draftId:12}],/already assigned/]]
  for(const [key,value,message]of cases)assert.match(approvalBlock({...approval(),[key]:value}),message)
})
test('expired, wrong-generation, unpublished and incomplete decisions explain their locks',()=>{
  const input=approval()
  for(const [patch,message]of [[{validUntil:'invalid'},/expired/],[{validUntil:'2026-09-08T00:00:00Z'},/expired/],[{generation:1},/Sources changed/],[{manifestState:'revoked'},/published release/],[{result:{completeness:'incomplete'}},/unresolved gaps/]])assert.match(approvalBlock({...input,decision:{...input.decision,...patch}}),message)
})
test('session-start explanations preserve pending, expiry, hold, stale and explicit-health safeguards',()=>{
  const input={assignment:{held:false,stale:false},workflow:{status:'ready',startAllowed:true},health:'no_change',localStop:false}
  assert.equal(sessionStartBlock(input),'')
  assert.match(sessionStartBlock({...input,health:''}),/explicit current health/)
  assert.match(sessionStartBlock({...input,health:'changed'}),/Save this report/)
  assert.match(sessionStartBlock({...input,health:'declined'}),/Save this report/)
  assert.match(sessionStartBlock({...input,localStop:true}),/Stop was requested/)
  assert.match(sessionStartBlock({...input,assignment:{held:true}}),/review hold/)
  assert.match(sessionStartBlock({...input,assignment:{stale:true}}),/stale/)
  assert.match(sessionStartBlock({...input,workflow:{...input.workflow,pending:{}}}),/pending operation/)
  assert.match(sessionStartBlock({...input,workflow:{...input.workflow,startAllowed:false}}),/unavailable/)
  assert.match(sessionStartBlock({...input,workflow:{status:'unavailable'}}),/current session checks/)
})
test('workspace creation remains locked until eligibility and explicit acknowledgement are known',()=>{
  assert.match(workspaceCreateBlock({}),/Checking/)
  assert.match(workspaceCreateBlock({error:'failed'}),/could not be confirmed/)
  assert.match(workspaceCreateBlock({state:{available:false}}),/not currently eligible/)
  assert.match(workspaceCreateBlock({state:{available:true}}),/tick/)
  assert.match(workspaceCreateBlock({state:{available:true},acknowledged:true,busy:true}),/Saving/)
  assert.equal(workspaceCreateBlock({state:{available:true},acknowledged:true}),'')
})
