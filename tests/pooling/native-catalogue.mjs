import assert from 'node:assert/strict'
import {nativeFixture as f} from './native-flow.mjs'
import {sql,jsonSQL,literal,asActor} from './native-connection.mjs'
import {validateRelease} from '../../src/lib/pooling/catalogue.js'
import {createDecisionService} from '../../supabase/functions/_shared/pooling-decision.js'
const run=crypto.randomUUID(),manifestId=`published-${run}`,acceptance=`fictional-evidence-${run}`
const document=jsonSQL(`select document from public.pooling_manifests where id=${literal(f.manifest.id)}`)
document.manifest.id=manifestId
assert.deepEqual(validateRelease(document),{valid:true,errors:[]})
const publish=`select public.pooling_publish_catalogue(${literal(manifestId)},${literal(document)},${literal(acceptance)})`
assert.throws(()=>sql(`set role service_role;${publish}`),/acceptance_required/)
sql(`insert into public.pooling_content_acceptances(id,document_digest,evidence,accepted_at,accepted_by) values(${literal(acceptance)},encode(sha256(convert_to(${literal(document)}::jsonb::text,'UTF8')),'hex'),'{"fictional":true}',now(),'fictional test reviewer only')`)
assert.throws(()=>sql(asActor(publish)),/permission denied/)
const receipt=jsonSQL(`set role service_role;${publish}`);assert.deepEqual(jsonSQL(`set role service_role;${publish}`),receipt)
assert.throws(()=>sql(`update public.pooling_manifests set document='{}' where id=${literal(manifestId)}`),/immutable_release/)
const proposal={...f.proposal,manifestId}
const draft=jsonSQL(asActor(`select public.pooling_save_draft(${literal(f.client)},${f.generation},${literal(run+'draft')},${literal(proposal)})`))
const decision=await createDecisionService(f.gateway)({clientId:f.client,draftId:draft.id,expectedGeneration:f.generation})
const assignment=jsonSQL(asActor(`select public.pooling_approve(${literal(f.client)},${draft.id},${decision.receipt.decisionId},${f.generation},${literal(run+'approve')})`))
jsonSQL(`set role service_role;select public.pooling_revoke_catalogue(${literal(manifestId)},${literal(acceptance)},'Fictional revocation test')`)
assert.throws(()=>sql(asActor(`select public.pooling_execution(${assignment.assignmentId},${f.generation},${literal(run+'start')},'start','{"healthChange":"no_change"}')`,f.athlete)),/content_revoked/)
assert.throws(()=>sql(`update public.pooling_manifests set state='published' where id=${literal(manifestId)}`),/immutable_release/)
assert.equal(Number(sql(`select count(*) from public.pooling_catalogue_events where manifest_id=${literal(manifestId)}`)),2)
console.log(JSON.stringify({test:'exact accepted-artifact hash, service-only publication, immutable versions, revocation blocks approved start',passed:true,manifestId,evidence:'Fictional only; no candidate catalogue published'}))
