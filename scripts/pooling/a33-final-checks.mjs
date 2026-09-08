// Run after the loopback server stops: the private ledger has one writer.
import assert from 'node:assert/strict'
import {readFileSync,writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {a33Harness} from './a33-runtime.mjs'
const h=a33Harness(),{ledger,admin,check}=h,kg=ledger.state.kg
assert(ledger.browserVerifiedAt&&ledger.expiredJwtVerifiedAt)
const ui=JSON.parse(readFileSync(join(h.directory,'ui-observations.json'),'utf8'))
assert(ui.checks.length>=13&&ui.checks.every(c=>c.passed))
const rows=async query=>{const r=await query;assert.ifError(r.error);return r.data}
const clientIds=ledger.workspaces.map(w=>w.clientId)
const drafts=await rows(admin.from('pooling_drafts').select('*').in('client_id',clientIds))
const assignments=await rows(admin.from('pooling_assignments').select('*').in('client_id',clientIds))
const reviews=await rows(admin.from('pooling_extension_reviews').select('*').eq('request_id',kg.request.id))
assert.equal(reviews.length,1);assert.equal(reviews[0].action,'accept')
assert(!assignments.some(a=>a.draft_id===reviews[0].draft_id))
assert.deepEqual(drafts.find(d=>d.id===kg.base.id).proposal,kg.proposal)
assert.equal(kg.absent.result.state,'dose_review_required');assert.equal(kg.absent.result.suggestedDraft,null)
assert.equal(kg.numerical.result.prescriptionChanges[0].from.loadKg,2)
assert.equal(kg.numerical.result.prescriptionChanges[0].to.loadKg,4)
const execution=await rows(admin.from('pooling_execution_events').select('kind,payload').eq('assignment_id',kg.assignment.assignmentId))
assert.equal(execution.filter(e=>e.kind==='actual').length,1)
assert(execution.some(e=>e.kind==='actual'&&e.payload.actual===1&&e.payload.loadKg===2))
assert(execution.some(e=>e.kind==='complete'))
check('A33 original 2kg history retained; exact inventory-gated 4kg acceptance has one unassigned child',true,{base:kg.base.id,child:reviews[0].draft_id})
const copies=drafts.filter(d=>d.proposal.blocks?.some(b=>b.exercises?.some(e=>e.exerciseDbRef===kg.imports.exerciseId)))
assert.equal(copies.length,3)
assert(copies.every(d=>d.proposal.blocks.every(b=>b.exercises.every(e=>e.sets.every(s=>s.completedReps===null&&s.completedLoadKg===null)))))
const a2=ledger.workspaces.find(w=>w.label==='a33-a'&&w.slot===2)
assert.equal(copies.filter(d=>d.client_id===a2.clientId).length,1)
assert.equal(copies.find(d=>d.client_id===a2.clientId).proposal.notes,'')
const travel=drafts.filter(d=>d.proposal.notes==='FICTIONAL A33 travel schedule; no catch-up requested')
assert.equal(travel.length,3);assert.equal(new Set(travel.map(d=>d.operation_key)).size,3)
const tokyo=travel.filter(d=>d.proposal.session.timeZone==='Asia/Tokyo'),la=travel.filter(d=>d.proposal.session.timeZone==='America/Los_Angeles')
assert.equal(tokyo.length,2);assert.equal(la.length,1)
assert(tokyo.every(d=>d.proposal.date==='2026-09-09'));assert.equal(la[0].proposal.date,'2026-09-08')
assert(travel.every(d=>Date.parse(d.proposal.session.sessionAt)===Date.parse('2026-09-08T23:30:00Z')))
assert.deepEqual(tokyo[0].proposal,tokyo[1].proposal)
check('A33 all three import and three travel drafts retain separate keys and no assignments',![...copies,...travel].some(d=>assignments.some(a=>a.draft_id===d.id)))
const pending=[]
for(const [actorId,request]of Object.entries(ledger.state.pendingFixtures)){
 const found=drafts.filter(d=>d.operation_key===request.operationKey)
 assert.equal(found.length,1);assert.equal(found[0].actor_id,actorId);assert.equal(found[0].client_id,request.clientId)
 assert.deepEqual(found[0].proposal,request.proposal);assert(!assignments.some(a=>a.draft_id===found[0].id))
 pending.push(found[0].id)
}
check('A33 account-switch and genuinely expired-session requests each reconcile one original unassigned row',pending.length===2,{draftIds:pending})
const events=ledger.browserEvents,b=ledger.users.find(u=>u.label==='a33-b')
assert(events.some(e=>e.path==='/auth/v1/token'&&e.authGrant==='refresh_token'&&e.status===200&&e.afterActualJwtExpiry&&e.retainedSessionActor===b.id&&e.refreshedActor===b.id))
assert(events.some(e=>e.path?.endsWith('/pooling_save_draft')&&e.status===401&&e.key===ledger.state.pendingFixtures[b.id].operationKey))
assert(events.some(e=>e.path?.endsWith('/pooling_save_draft')&&e.fault==='response_held_after_commit'))
assert(events.some(e=>e.path?.endsWith('/pooling_review_extension')&&e.fault==='response_dropped_after_commit'))
check('A33 genuine provider expiry, actual SDK refresh and UI account-bound recovery verified',true,{uiChecks:ui.checks.length})
// One normal refresh + local-session sign-out. Does not sign out another user.
const actor=await h.signIn('a33-b'),refreshed=await actor.auth.refreshSession();assert.ifError(refreshed.error)
const refreshToken=refreshed.data.session.refresh_token
assert.ifError((await actor.auth.signOut({scope:'local'})).error)
const denied=await h.client().auth.refreshSession({refresh_token:refreshToken})
check('A33 explicitly signed-out provider refresh token cannot resume',!!denied.error)
for(const user of ledger.users){const own=await h.signIn(user.label);for(const w of ledger.workspaces.filter(w=>w.coachId===user.id)){const history=await h.rpc(own,'pooling_read_assignments',{target_client:w.clientId},0);assert(!history.some(a=>['start','pause','resume'].includes(a.status)))}}
check('A33 all fictional execution sessions are closed before retirement',true)
const oldFailure='Hosted travel history retains explicit dates, same instant and both zones'
const skewProbe=c=>c.name==='Actually expired provider-issued JWT is rejected by hosted REST'&&c.status===200&&Date.parse(c.at)>b.expirySession.expires_at*1000&&Date.parse(c.at)<=b.expirySession.expires_at*1000+30000
assert(ledger.checks.filter(c=>!c.passed).every(c=>c.name===oldFailure||skewProbe(c)))
const times=events.filter(e=>e.status===200&&e.path.startsWith('/rest/v1/rpc/pooling_')&&Number.isFinite(e.ms)).map(e=>e.ms).sort((a,b)=>a-b)
ledger.finalChecks={passed:true,at:new Date().toISOString(),uiChecks:ui.checks.length,copyDrafts:copies.map(d=>d.id),travelDrafts:travel.map(d=>d.id),pendingDrafts:pending,acceptedChild:reviews[0].draft_id,applicationCommit:'6ca02cb64322d44c868f7801d2206f3396df98f6',historicalHarnessCorrection:'Original travel assertion expected two explicit submissions; three distinct keys were actually submitted. All retained; exact three-row assertion passed. The original failed assertion is preserved.',rpcLatency:{samples:times.length,medianMs:times[Math.floor(times.length*.5)],p95Ms:times[Math.min(times.length-1,Math.floor(times.length*.95))],scope:'Sequential mixed sample with loopback proxy overhead, not load/SLA acceptance'}}
// Reserve the second and final approved branch build before publication. A
// reserved build is not described as Ready until GitHub/Vercel confirm it.
if(!ledger.finalPreviewReservedAt){assert.equal(ledger.previewBuilds,1);ledger.previewBuilds++;ledger.finalPreviewReservedAt=new Date().toISOString()}
ledger.finalChecks.expiryHarnessCorrection='Initial probe at exp+23 seconds fell within documented PostgREST 30-second clock skew and returned 200. After exp+55 seconds it returned 401; the real expired draft and SDK refresh were tested after that rejection. Future harness guards wait 35 seconds. Initial probe evidence is retained.'
h.save();writeFileSync(join(h.directory,'final-checks.json'),JSON.stringify(ledger.finalChecks,null,2)+'\n',{mode:0o600});console.log(JSON.stringify(ledger.finalChecks))
