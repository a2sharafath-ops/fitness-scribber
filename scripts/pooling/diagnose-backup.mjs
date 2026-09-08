// Read-only, exact-target diagnostic. Reuses one temporary connection identity;
// never rotates it while the export is running. All raw diagnostics stay private.
import {spawn} from 'node:child_process'
import {mkdirSync,mkdtempSync,openSync,closeSync,statSync,writeFileSync} from 'node:fs'
import {resolve,join} from 'node:path'
import {connection,query} from './hosted-backup.mjs'
process.umask(0o077)
const bin=resolve(process.env.FITNESS_HOSTED_PG_BIN||'')
if(bin!==resolve('.local-test-runtime/pg17.YbRhJl/mounted/Postgres.app/Contents/Versions/17/bin'))throw Error('exact_binary_required')
const env=connection(),parent=resolve('.recovery/hosted-test')
mkdirSync(parent,{recursive:true,mode:0o700})
const dir=mkdtempSync(join(parent,'diagnostic-')),dump=join(dir,'database-full.dump'),log=openSync(join(dir,'pg-dump.private.log'),'wx',0o600)
const start=Date.now()
const child=spawn(join(bin,'pg_dump'),['--verbose','--role=postgres','--format=custom','--lock-wait-timeout=10000','--file',dump],{env,stdio:['ignore','ignore',log]})
console.log(JSON.stringify({stage:'read_only_diagnostic',directory:dir}))
const probe=setTimeout(()=>{
 try {const result=query(bin,env,"select coalesce(jsonb_agg(jsonb_build_object('application',application_name,'state',state,'waitType',wait_event_type,'waitEvent',wait_event,'elapsedSeconds',extract(epoch from clock_timestamp()-query_start))),'[]') from pg_stat_activity where datname=current_database() and application_name='pg_dump'");writeFileSync(join(dir,'activity.private.json'),result,{mode:0o600,flag:'wx'});console.log(result)}
 catch(e){console.log(JSON.stringify({probeError:e.message}))}
},12000)
const timer=setTimeout(()=>child.kill('SIGTERM'),60000)
child.on('error',e=>console.log(JSON.stringify({systemError:e.code})))
child.on('close',(code,signal)=>{clearTimeout(probe);clearTimeout(timer);closeSync(log);console.log(JSON.stringify({code,signal,elapsedMs:Date.now()-start,dumpBytes:statSync(dump).size,directory:dir}));process.exitCode=code===0?0:1})
