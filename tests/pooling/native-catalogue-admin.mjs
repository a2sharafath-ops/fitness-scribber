import assert from 'node:assert/strict'
import {sql,jsonSQL,literal,asActor,athlete} from './native-connection.mjs'
import {nativeGateway} from './native-gateway.mjs'
import {createPublicationService} from '../../supabase/functions/_shared/pooling-publication.js'
const {nativeFixture:f}=await import('./native-flow.mjs'),run=crypto.randomUUID(),actor=crypto.randomUUID(),client='catalogue-test-'+run
sql(`insert into auth.users(id) values(${literal(actor)});insert into public.clients(id,"coachId",name) values(${literal(client)},${literal(actor)},'Fictional content author')`)
const doc=jsonSQL(`select document from public.pooling_manifests where id=${literal(f.manifest.id)}`);doc.manifest.id='admin-test-'+run
const submit=`select public.pooling_submit_catalogue(${literal(client)},${literal(run+'submit')},${literal(doc)},'Fictional exact release submission')`
assert.throws(()=>sql(asActor(submit,athlete)),/forbidden/)
const submission=jsonSQL(asActor(submit,actor));assert.equal(submission.published,false);assert.deepEqual(jsonSQL(asActor(submit,actor)),submission)
assert.equal(Number(sql(`select count(*) from public.pooling_manifests where id=${literal(doc.manifest.id)}`)),0)
const request={clientId:client,submissionId:submission.id,action:'publish',acceptanceId:run,reason:'Fictional publication acceptance'},service=createPublicationService(nativeGateway(actor))
await assert.rejects(()=>service(request),/forbidden/)
sql(`insert into public.pooling_release_operators(actor_id,evidence_reference,valid_until) values(${literal(actor)},'Fictional operator only',now()+interval '1 hour')`)
await assert.rejects(()=>service(request),/acceptance_required/)
sql(`insert into public.pooling_content_acceptances(id,document_digest,evidence,accepted_at,accepted_by) values(${literal(run)},${literal(submission.digest)},'{"fictional":true}',now(),'fictional only')`)
assert.equal((await service(request)).receipt.status,'committed')
assert.throws(()=>sql(`update public.pooling_content_acceptances set document_digest='changed' where id=${literal(run)}`),/immutable_evidence/)
sql(`update public.pooling_content_acceptances set revoked_at=now() where id=${literal(run)}`)
assert.equal(sql(`select state from public.pooling_manifests where id=${literal(doc.manifest.id)}`),'revoked')
console.log(JSON.stringify({test:'catalogue submission has no authority; release requires operator, validated document and exact independent hash; withdrawn evidence revokes future reliance',passed:true,submissionId:submission.id}))
