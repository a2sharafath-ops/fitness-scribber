import assert from 'node:assert/strict'
import {sql,jsonSQL,literal,asActor,coach,athlete} from './native-connection.mjs'
import {nativeGateway} from './native-gateway.mjs'
import {createWeeklyService} from '../../supabase/functions/_shared/pooling-weekly.js'
process.env.FITNESS_POOLING_FLOW_CLIENT='context-test-'+crypto.randomUUID()
const {nativeFixture:f}=await import('./native-flow.mjs'),run=crypto.randomUUID()
const doc=jsonSQL(`select document from public.pooling_manifests where id=${literal(f.manifest.id)}`)
doc.manifest.id='weekly-'+run
doc.modulePolicy.requirements.push({key:'support',required:true,source:'clients',unit:'support',protocol:'explicit-v1',maxAgeSeconds:60})
doc.catalogue[0].pattern='fictional-pattern'
const policy={...doc.modulePolicy,id:'fictional-weekly',kind:'weekly',supportKey:'support',splits:['fictional'],goals:['fictional'],minSessions:2,maxSessions:2,maxWeeklySeconds:100,patternRules:[{pattern:'fictional-pattern',minSessions:2,maxSessions:2,recoverySeconds:1}]}
doc.extensionPolicies=[policy];doc.manifest.records.push({id:policy.id,revision:1})
sql(`update public.pooling_runtime set r3=true where singleton;insert into public.pooling_manifests(id,state,document) values(${literal(doc.manifest.id)},'published',${literal(doc)})`)
const source=jsonSQL(`select public.pooling_source_inventory(${literal(coach)},${literal(f.client)})`).find(r=>r.source==='clients')
const generation=()=>Number(sql(`select generation from public.pooling_contexts where client_id=${literal(f.client)}`))
const at=f.proposal.session.sessionAt,later=new Date(Date.parse(at)+3000).toISOString()
for(const [key,value,sessionAt] of [['support','none',at],['health','no_change',later],['equipment',[],later]]){
 jsonSQL(asActor(`select public.pooling_confirm_source(${literal(f.client)},${generation()},${literal(run+key)},${literal({key,value,source:'clients',sourceId:f.client,sourceToken:source.token,state:'reported',unit:key==='support'?'support':'boolean',protocol:'explicit-v1',side:'not_applicable',effectiveAt:at,sessionAt,evidenceReference:'Fictional weekly engineering fixture'})})`))
}
const gen=generation(),slots=[]
for(const instant of [at,later]){
 const proposal={...f.proposal,manifestId:doc.manifest.id,session:{...f.proposal.session,sessionAt:instant,request:{...f.proposal.session.request,goalPriority:['fictional']}}}
 const draft=jsonSQL(asActor(`select public.pooling_save_draft(${literal(f.client)},${gen},${literal(run+instant)},${literal(proposal)})`))
 slots.push({id:`slot-${draft.id}`,draftId:draft.id,budgetSeconds:10,support:'none'})
}
const request={clientId:f.client,expectedGeneration:gen,operationKey:run+'week',week:{manifestId:doc.manifest.id,policyId:policy.id,constraints:{startDate:at.slice(0,10),timeZone:'UTC',split:'fictional',goalPriority:['fictional'],slots}}}
const service=createWeeklyService(nativeGateway()),result=await service(request)
assert.equal(result.result.state,'ready_for_coach_review');assert.equal(result.assignment,null)
assert.deepEqual((await service(request)).receipt,result.receipt)
assert.equal(Number(sql(`select count(*) from public.pooling_assignments where draft_id in (${slots.map(s=>s.draftId).join(',')})`)),0)
const approve=`select public.pooling_approve_week(${literal(f.client)},${result.receipt.id},${gen},${literal(run+'approve')})`
assert.throws(()=>sql(asActor(approve,athlete)),/forbidden/)
const receipt=jsonSQL(asActor(approve));assert.equal(receipt.assignments.length,2);assert.deepEqual(jsonSQL(asActor(approve)),receipt)
assert.throws(()=>sql(asActor(`select public.pooling_read_weeks(${literal(f.client)})`,athlete)),/forbidden/)
// A newly reviewed constraint version cannot silently retain the old authority.
const revised=structuredClone(request);revised.operationKey=run+'revised';revised.week.constraints.slots[0].support='unconfirmed'
const replacement=await service(revised);assert.equal(replacement.result.state,'blocked')
assert.throws(()=>sql(asActor(`select public.pooling_execution(${receipt.assignments[0].assignmentId},${gen},${literal(run+'stale-start')},'start','{"healthChange":"no_change"}')`,athlete)),/stale_draft|source_changed/)
const currentDecision=jsonSQL(`select selection from public.pooling_week_reviews where id=${replacement.receipt.id}`)[0]
assert.throws(()=>sql(`select public.pooling_assert_decision_current(${literal(coach)},${literal(f.client)},${currentDecision.draftId},${currentDecision.decisionId})`),/stale_draft/)
console.log(JSON.stringify({test:'source-backed weekly constraints, atomic coach-only approval, exact retry and superseded-week start rejection',passed:true,weekId:result.receipt.id,client:f.client}))
