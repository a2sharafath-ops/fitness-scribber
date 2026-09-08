// A30 reversible containment. No fixture, user or historical row is deleted.
import assert from 'node:assert/strict'
import {harness} from './hosted-test-runtime.mjs'
const h=harness(process.argv[2]),{ledger,admin,check}=h,cid=ledger.clientIds.a,mode=process.argv[3]
if(!ledger.state.hostedGovernancePassed||!['off','disable-users'].includes(mode))throw Error('completed_governance_and_explicit_phase_required')
if(mode==='off'){
 if(ledger.state.containmentOff)throw Error('already_contained')
 const coach=await h.signIn('coach-a'),athlete=await h.signIn('client-a'),assignment=ledger.state.containmentAssignment
 const args={assignment_id:assignment.id,expected_generation:assignment.context_generation}
 const actual=await h.rpc(athlete,'pooling_execution',{...args,operation_key:h.key('off-before-actual'),event_kind:'actual',event_payload:{occurrenceId:'fictional-occ1',setIndex:1,actual:0,unit:'seconds'}},1)
 const old=await admin.from('pooling_execution_events').select('payload,recorded_at').eq('id',actual.eventId).single();assert.ifError(old.error)
 const before=await admin.from('pooling_execution_events').select('id,payload,recorded_at').eq('assignment_id',assignment.id);assert.ifError(before.error)
 const flags=await admin.from('pooling_runtime').update({r1:false,r2:false,r3:false}).eq('singleton',true).select().single();assert.ifError(flags.error);ledger.state.flags=flags.data;h.save()
 const denied=await h.edge(coach,'pooling-decision',{clientId:cid,draftId:ledger.state.ui.weeklyDraft1,expectedGeneration:assignment.context_generation});check('Server-off blocks hosted decision even with browser flags on',denied.status===409&&denied.data.error==='feature_disabled')
 const pendingAssignment=await admin.from('pooling_assignments').select('id').eq('draft_id',ledger.state.ui.weeklyDraft1).single();assert.ifError(pendingAssignment.error)
 const start=await athlete.rpc('pooling_execution',{...args,assignment_id:pendingAssignment.data.id,operation_key:h.key('off-denied-start'),event_kind:'start',event_payload:{healthChange:'no_change'}});check('Feature-off blocks new start',start.error?.message==='feature_disabled',{error:start.error?.message})
 const stopped=await h.rpc(athlete,'pooling_execution',{...args,operation_key:h.key('off-stop'),event_kind:'stop',event_payload:{}},1);check('Stop remains saveable after hold and server containment',stopped.status==='committed')
 const correction={...old.data.payload,performedAt:old.data.recorded_at,supersedes:actual.eventId,correctionReason:'Fictional late correction during containment',actual:1,loadKg:0}
 await h.rpc(athlete,'pooling_execution',{...args,operation_key:h.key('off-correction'),event_kind:'actual',event_payload:correction},1)
 const after=await admin.from('pooling_execution_events').select('id,payload,recorded_at').eq('assignment_id',assignment.id);assert.ifError(after.error)
 check('Containment retains every earlier target/result event',before.data.every(row=>after.data.some(next=>JSON.stringify(next)===JSON.stringify(row))))
 const projection=await h.rpc(athlete,'pooling_read_assignments',{target_client:cid});check('Read history and append-only correction survive feature-off',projection.some(row=>row.id===assignment.id&&row.actuals.some(a=>a.supersedes===actual.eventId&&a.loadKg===0)))
 // Test one ordinary Classic write in the existing backend, never an old row.
 const workoutId=ledger.runId+'_classic_workout'
 h.reserve(2);const classic=ledger.state.classicWorkoutId===workoutId
  ?await coach.from('workouts').select().eq('id',workoutId).eq('clientId',cid).single()
  :await coach.from('workouts').insert({id:workoutId,coachId:ledger.users.find(u=>u.label==='coach-a').id,clientId:cid,date:'2026-09-08',status:'in_progress',main:[{actual:0,privateNote:'Fictional fixture private note'}]}).select().single();assert.ifError(classic.error)
 ledger.state.classicWorkoutId=workoutId;h.save()
 const legacy=await h.rpc(athlete,'pooling_stop_legacy',{target_client:cid,target_workout:workoutId});check('Classic stop accepts only the linked fictional workout',legacy.status==='committed')
 const retained=await admin.from('workouts').select('main,status').eq('id',workoutId).single();assert.ifError(retained.error);assert.deepEqual(retained.data.main,classic.data.main);check('Classic stop preserves legacy performed data',retained.data.status==='stopped')
 const home=await athlete.rpc('pooling_client_home',{target_client:cid});check('Feature-off explicitly disables the pooling home RPC',home.error?.message==='feature_disabled')
 const now=new Date().toISOString()
 for(const [table,column,value] of [['pooling_scope_grants','id',ledger.runId+'_scope'],['pooling_reviewer_authorizations','id',ledger.runId+'_reviewer'],['pooling_release_operators','actor_id',ledger.users.find(u=>u.label==='coach-a').id]]){const r=await admin.from(table).update({revoked_at:now}).eq(column,value).select();assert.ifError(r.error);assert.equal(r.data.length,1)}
 const manifest=await admin.from('pooling_manifests').update({state:'revoked'}).eq('id',ledger.state.r1.manifestId).select();assert.ifError(manifest.error);assert.equal(manifest.data.length,1)
 const notice=await admin.from('pooling_policy_documents').update({state:'withdrawn'}).eq('id',ledger.runId+'_notice').select();assert.ifError(notice.error);assert.equal(notice.data.length,1)
 check('Exact fictional grants, release and notice revoked without deletion',true)
 ledger.state.containmentOff={at:now,usersDisabled:false};h.save()
}else{
 if(!ledger.state.containmentOff||ledger.state.testUsersDisabled)throw Error('containment_off_before_user_disable')
 for(const user of ledger.users){
  const c=await h.signIn(user.label),{data:{session}}=await c.auth.getSession()
  const logout=await admin.auth.admin.signOut(session.access_token,'global');assert.ifError(logout.error)
  const banned=await admin.auth.admin.updateUserById(user.id,{ban_duration:'876000h'});assert.ifError(banned.error)
  const retry=await h.client().auth.signInWithPassword({email:user.email,password:user.password});check('Fictional '+user.label+' cannot sign in after containment',!!retry.error&&retry.error.code==='user_banned',{error:retry.error?.code})
  user.disabledAt=new Date().toISOString();h.save()
 }
 ledger.state.testUsersDisabled=true;ledger.state.containmentOff.usersDisabled=true;ledger.state.completedAt=new Date().toISOString();h.save()
}
console.log(JSON.stringify({phase:mode,complete:true,rowsReserved:ledger.rowsReserved,checks:ledger.checks.length}))
