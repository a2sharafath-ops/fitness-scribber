import {execFileSync,spawn} from 'node:child_process'
import {resolve,join} from 'node:path'
const root=resolve('.local-test-runtime')
const bin=resolve(process.env.FITNESS_POOLING_PG_BIN || '')
const socket=process.env.FITNESS_POOLING_PG_SOCKET
const database=process.env.FITNESS_POOLING_PG_DATABASE || 'fitness_pooling_20260907'
if(!bin.startsWith(root+'/') || !/^\/private\/tmp\/fitness-pg-socket\.[a-zA-Z0-9]+$/.test(socket || '') || !/^fitness_pooling_[a-z0-9_]+$/.test(database)) throw new Error('Exact task-owned binary/socket/database required')
const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('PG')))
const args=['-X','-q','-A','-t','-h',socket,'-p','55439','-d',database,'-v','ON_ERROR_STOP=1']
export const runtime={bin,socket,database,env}
export const literal=value=>value===null?'NULL':typeof value==='number'?String(value):`'${String(typeof value==='object'?JSON.stringify(value):value).replaceAll("'","''")}'`
export function sql(query) { return execFileSync(join(bin,'psql'),[...args,'-c',query],{encoding:'utf8',env,timeout:15000,stdio:['ignore','pipe','pipe']}).trim() }
export function jsonSQL(query){return JSON.parse(sql(query))}
export function sqlProcess(query){return spawn(join(bin,'psql'),[...args,'-c',query],{env,stdio:['ignore','pipe','pipe']})}
export const coach='00000000-0000-4000-8000-000000000001'
export const athlete='00000000-0000-4000-8000-000000000003'
export function asActor(query,actor=coach){return `begin;set local role authenticated;set local request.jwt.claim.sub=${literal(actor)};${query};commit;`}
export function serviceRPC(name,payload) {
 const allowed=['pooling_source_bundle','pooling_store_source_snapshot','pooling_decision_input','pooling_record_decision','pooling_extension_input','pooling_record_extension','pooling_record_context_review','pooling_week_input','pooling_record_week','pooling_record_suggestion','pooling_publication_input','pooling_apply_publication']
 if(!allowed.includes(name) || Object.keys(payload).some(key=>!/^[a-z_]+$/.test(key))) throw new Error('invalid_test_rpc')
 const call=`select public.${name}(${Object.entries(payload).map(([key,value])=>`${key}=>${literal(value)}`).join(',')})`
 try{const result=sql(`begin;set local role service_role;${call};commit;`);return {data:result?JSON.parse(result):null,error:null}}
 catch(error){return {data:null,error:{message:error.stderr?.toString().match(/ERROR:  ([^\n]+)/)?.[1] || 'test_rpc_failed'}}}
}
