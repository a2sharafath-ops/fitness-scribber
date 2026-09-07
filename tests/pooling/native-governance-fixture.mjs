// Explicit fictional acceptance/scope fixture. Never imported by app/server code.
import {sql,jsonSQL,literal,asActor,athlete} from './native-connection.mjs'
export function syntheticGovernance(client){
 const key=crypto.randomUUID(),documentId=`fictional-policy-${key}`
 sql(`insert into public.pooling_scope_grants(id,client_id,scope,market,reviewer_id,evidence_reference,valid_until) values(${literal('grant-'+key)},${literal(client)},'adult_general_fitness','fictional-market','fictional-reviewer','synthetic-only',now()+interval '1 day');insert into public.pooling_policy_documents(id,scope,market,title,body,state,evidence_reference) values(${literal(documentId)},'adult_general_fitness','fictional-market','Fictional test policy','Not a real consent or privacy notice. Synthetic engineering fixture only.','published','synthetic-only')`)
 jsonSQL(asActor(`select public.pooling_record_consent(${literal(client)},${literal(documentId)},'accepted',${literal(key)})`,athlete))
 return {documentId,key}
}
