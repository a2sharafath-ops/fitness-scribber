// Isolated local database only. Never used to impersonate an account on hosted Auth.
import {readFileSync,writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
import assert from 'node:assert/strict'
import {clientPreparation,preparationDefaults} from '../../src/lib/pooling/client-preparation.js'
import {createContextReviewService} from '../../supabase/functions/_shared/pooling-context-review.js'
import {createSuggestionService} from '../../supabase/functions/_shared/pooling-suggestion.js'
import {createDecisionService} from '../../supabase/functions/_shared/pooling-decision.js'
import {createNumericalService} from '../../supabase/functions/_shared/pooling-numerical.js'
import {createWeeklyService} from '../../supabase/functions/_shared/pooling-weekly.js'
const reportFile=resolve(process.argv[2]||'');assert(reportFile.includes('/.recovery/hosted-test/baseline-')&&reportFile.endsWith('/a35-local-migration.json'))
const report=JSON.parse(readFileSync(reportFile));assert(report.passed&&report.mode==='rehearse')
process.env.FITNESS_POOLING_RESTORED_RUNTIME=report.runtimeFile;process.env.FITNESS_POOLING_PG_DATABASE=report.database
const {sql,jsonSQL,literal:q,asActor}=await import('./native-connection.mjs')
const {nativeGateway}=await import('./native-gateway.mjs')
const [owner,other]=report.coaches,client='a35-normal-'+crypto.randomUUID(),clientB=client+'-other',checks=[]
const run=(command,actor=owner)=>jsonSQL(asActor(command,actor)),key=()=>crypto.randomUUID()
sql(`insert into public.clients(id,"coachId",name,level) values(${q(client)},${q(owner)},'A35 ordinary client','beginner'),(${q(clientB)},${q(other)},'A35 other owner client','intermediate')`)
assert(run(`select public.pooling_client_runtime(${q(client)})`).developmentEnabled)
assert(run(`select public.pooling_client_runtime(${q(clientB)})`,other).developmentEnabled)
assert.throws(()=>run(`select public.pooling_development_context(${q(clientB)})`),/forbidden/)
assert.throws(()=>run(`select public.pooling_set_development(${q(clientB)},false,${q(key())})`),/forbidden/)
assert.equal(sql("select count(*) from public.pooling_runtime where r1 or r2 or r3"),'0')
checks.push('ordinary new clients enabled; original two coach scopes remain isolated; global flags off')
const now=JSON.parse(sql('select to_json(clock_timestamp())')),at=new Date(Date.parse(now)+60000).toISOString(),later=new Date(Date.parse(now)+172800000).toISOString()
sql(`insert into public.wellness(id,"coachId","clientId",date,sleep,stress,fatigue,soreness,score) values(${q(key())},${q(owner)},${q(client)},${q(now.slice(0,10))},5,6,3,2,4)`)
let context=run(`select public.pooling_development_context(${q(client)})`)
const form={...preparationDefaults(context),adult:true,health:'no_change',sourcesReviewed:true,equipmentReviewed:true,equipment:['mat','stable_chair','fixed_support','clear_wall'],prerequisites:context.release.modulePolicy.requirements.map(r=>r.key)}
const payload=clientPreparation(context,form,at,'UTC'),laterPayload=clientPreparation(context,form,later,'UTC')
payload.observations.push(...laterPayload.observations.filter(o=>['health','equipment'].includes(o.key)))
const operation=key(),prepareSQL=`select public.pooling_prepare_client(${q(client)},${context.generation},${q(operation)},${q(payload.proposal)},${q(payload.observations)})`
const prepared=run(prepareSQL);assert.deepEqual(run(prepareSQL),prepared)
const reviewed=await createContextReviewService(nativeGateway(owner))({clientId:client,draftId:prepared.id,expectedGeneration:prepared.generation,operationKey:key(),reference:'A35 local explicit ordinary-client source review'})
const gen=reviewed.receipt.generation
const generated=await createSuggestionService(nativeGateway(owner))({clientId:client,draftId:reviewed.receipt.draftId,expectedGeneration:gen,operationKey:key(),mode:'generate'})
assert.equal(generated.result.completeness,'ready_for_coach_review',JSON.stringify(generated.result.gaps))
const targetId=generated.receipt.draftId,proposal=jsonSQL(`select proposal from public.pooling_drafts where id=${targetId}`)
assert.equal(sql(`select count(*) from public.pooling_assignments where client_id=${q(client)}`),'0')
checks.push('atomic source preparation and exact retry; normal-client generation creates no assignment')
const decision=await createDecisionService(nativeGateway(owner))({clientId:client,draftId:targetId,expectedGeneration:gen})
const approvalSQL=`select public.pooling_approve(${q(client)},${targetId},${decision.receipt.decisionId},${gen},${q(key())})`
const assignment=run(approvalSQL);assert.deepEqual(run(approvalSQL),assignment)
const frozen=jsonSQL(`select to_jsonb(s) from public.pooling_source_snapshots s where draft_id=${targetId}`)
await assert.rejects(()=>createDecisionService(nativeGateway(owner))({clientId:client,draftId:targetId,expectedGeneration:gen}),/assigned_snapshot_immutable/)
assert.deepEqual(jsonSQL(`select to_jsonb(s) from public.pooling_source_snapshots s where draft_id=${targetId}`),frozen)
const copy=run(`select public.pooling_save_draft(${q(client)},${gen},${q(key())},${q(proposal)})`)
const request=kind=>run(`select public.pooling_request_extension(${q(client)},${gen},${q(key())},${q({kind,date:proposal.date,requestedChange:'A35 bounded '+kind+' review',blocks:[],authority:'none',state:'review_requested'})})`)
const daily=request('daily')
const adjusted=await createNumericalService(nativeGateway(owner))({clientId:client,draftId:copy.id,expectedGeneration:gen,requestId:daily.id,baselineAssignmentId:assignment.assignmentId,policyId:'DEV-daily'})
assert.equal(adjusted.result.state,'proposal',JSON.stringify(adjusted.result))
assert(adjusted.result.effects.every(e=>e.from===30&&e.to===20))
checks.push('explicit approval exact retry; assigned snapshot immutable; daily proposal bounded and separate')
const event=(kind,payload={})=>run(`select public.pooling_execution(${assignment.assignmentId},${gen},${q(key())},${q(kind)},${q(payload)})`)
event('start',{healthChange:'no_change'})
let first
for(const block of decision.result.blocks)for(let i=1;i<=block.dose.prescription.sets;i++){
 const receipt=event('actual',{occurrenceId:block.occurrenceId,setIndex:i,actual:30,unit:'seconds',effort:0,effortMethod:'rpe_0_10'})
 first??=receipt
}
event('complete')
const current=run(`select public.pooling_read_assignments(${q(client)})`).find(r=>r.id===assignment.assignmentId)
assert.equal(current.status,'complete');assert(current.blocks.every(b=>b.exerciseName&&b.exerciseName!==b.exerciseId));assert(current.actuals.length>=3)
const future=run(`select public.pooling_save_draft(${q(client)},${gen},${q(key())},${q({...laterPayload.proposal,selection:proposal.selection})})`)
const progressRequest=run(`select public.pooling_request_extension(${q(client)},${gen},${q(key())},${q({kind:'progression',date:laterPayload.proposal.date,requestedChange:'A35 later comparable session',blocks:[],authority:'none',state:'review_requested'})})`)
const progression=await createNumericalService(nativeGateway(owner))({clientId:client,draftId:future.id,expectedGeneration:gen,requestId:progressRequest.id,baselineAssignmentId:assignment.assignmentId,policyId:'DEV-progression'})
assert.equal(progression.result.state,'proposal',JSON.stringify(progression.result))
assert(progression.result.effects.every(e=>e.to===40))
checks.push('start, recorded sets, completion, named projection and later comparable progression')
const slots=[]
for(const p of [proposal,{...laterPayload.proposal,selection:proposal.selection}]){
 const draft=run(`select public.pooling_save_draft(${q(client)},${gen},${q(key())},${q(p)})`)
 slots.push({id:'slot-'+draft.id,draftId:draft.id,budgetSeconds:1800,support:'none'})
}
const weeklyRequest={clientId:client,expectedGeneration:gen,operationKey:key(),week:{manifestId:proposal.manifestId,policyId:'DEV-weekly',constraints:{startDate:proposal.date,timeZone:'UTC',split:'full_body',goalPriority:['general_fitness'],slots}}}
const week=await createWeeklyService(nativeGateway(owner))(weeklyRequest)
assert.equal(week.result.state,'ready_for_coach_review',JSON.stringify(week.result.gaps))
const weekApproval=run(`select public.pooling_approve_week(${q(client)},${week.receipt.id},${gen},${q(key())})`);assert.equal(weekApproval.assignments.length,2)
checks.push('source-bound multi-date weekly review and atomic explicit approval')
const before=run(`select public.pooling_read_assignments(${q(client)})`)
run(`select public.pooling_set_development(${q(client)},false,${q(key())})`)
const runtime=run(`select public.pooling_client_runtime(${q(client)})`);assert(!runtime.r1&&!runtime.governed&&runtime.development)
assert.throws(()=>run(`select public.pooling_execution(${weekApproval.assignments[0].assignmentId},${gen},${q(key())},'start','{"healthChange":"no_change"}')`),/feature_disabled/)
assert.deepEqual(run(`select public.pooling_read_assignments(${q(client)})`),before)
assert(run(`select public.pooling_client_runtime(${q(clientB)})`,other).r1)
run(`select public.pooling_set_development(${q(client)},true,${q(key())})`)
assert(run(`select public.pooling_client_runtime(${q(client)})`).r1)
assert(!run('select public.pooling_coach_sessions()',other).some(r=>r.clientId===client))
checks.push('Classic off/on switch retains every result; blocks new starts; other coach unaffected')
// A changed ordinary assessment invalidates the earlier generation.
sql(`update public.clients set goal='Changed test goal' where id=${q(client)}`)
assert(run(`select public.pooling_read_assignments(${q(client)})`).every(r=>r.stale))
checks.push('ordinary source edits invalidate prior generation without deleting history')
report.nativePassed=true;report.nativeChecks=checks;report.nativeClient=client
writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n',{mode:0o600})
console.log(JSON.stringify({passed:true,checks,reportFile}))
