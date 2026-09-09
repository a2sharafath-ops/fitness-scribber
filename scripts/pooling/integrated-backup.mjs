// Consistent read-only snapshot for both pg_dump and verification fingerprints.
import {spawn,spawnSync} from 'node:child_process'
import {readFileSync,writeFileSync,mkdtempSync,statSync} from 'node:fs'
import {resolve,join} from 'node:path'
import {createHash} from 'node:crypto'
import assert from 'node:assert/strict'
import {connection,query,fingerprintSQL,projectRef} from './hosted-backup.mjs'
process.umask(0o077)
const bin=resolve(process.env.FITNESS_HOSTED_PG_BIN||'')
assert.equal(bin,resolve('.local-test-runtime/pg17.YbRhJl/mounted/Postgres.app/Contents/Versions/17/bin'))
const env=connection(),directory=mkdtempSync(resolve('.recovery/hosted-test/baseline-'))
const save=(name,data)=>writeFileSync(join(directory,name),typeof data==='string'?data:JSON.stringify(data,null,2)+'\n',{mode:0o600,flag:'wx'})
const run=(command,args)=>{
 const result=spawnSync(join(bin,command),args,{env,encoding:'utf8',timeout:300000,maxBuffer:32*1024*1024})
 if(result.status!==0){save(command+'-error.private.txt',result.stderr||'');throw Error('backup_command_failed_private_diagnostic')}
 return result.stdout
}
const holder=spawn(join(bin,'psql'),['-X','-q','-A','-t','-v','ON_ERROR_STOP=1'],{env,stdio:['pipe','pipe','pipe']})
let stderr='';holder.stderr.on('data',data=>{stderr+=data})
try {
 const snapshot=await new Promise((done,fail)=>{
  const timeout=setTimeout(()=>fail(Error('snapshot_timeout')),20000)
  holder.once('exit',()=>{clearTimeout(timeout);fail(Error('snapshot_connection_failed'))})
  holder.stdout.on('data',data=>{const match=String(data).match(/[0-9A-F]{8}-[0-9A-F]{8}-\d+/);if(match){clearTimeout(timeout);done(match[0])}})
  holder.stdin.write("set role postgres;begin isolation level repeatable read read only;select pg_export_snapshot();\n")
 })
 const snapshotQuery=sql=>query(bin,env,`begin isolation level repeatable read read only;set transaction snapshot '${snapshot}';${sql};commit;`)
 console.log(JSON.stringify({stage:'consistent_export_started',directory}))
 const server=JSON.parse(snapshotQuery("select json_build_object('version',current_setting('server_version'),'readOnly',current_setting('transaction_read_only'),'databaseBytes',pg_database_size(current_database()))"))
 const tables=JSON.parse(snapshotQuery("select jsonb_agg(jsonb_build_object('schema',schemaname,'table',tablename) order by schemaname,tablename) from pg_tables where schemaname in ('public','auth','storage')"))
 const fingerprints=JSON.parse(snapshotQuery(fingerprintSQL(tables,true)))
 const roles=JSON.parse(snapshotQuery("select coalesce(jsonb_agg(to_jsonb(r) order by rolname),'[]') from pg_roles r"))
 const metadata=JSON.parse(snapshotQuery("select jsonb_build_object('storageObjects',(select count(*) from storage.objects),'storageBuckets',(select count(*) from storage.buckets),'roles',(select jsonb_agg(jsonb_build_object('member',pg_get_userbyid(member),'role',pg_get_userbyid(roleid),'admin',admin_option)) from pg_auth_members))"))
 save('roles-without-passwords.json',roles)
 save('metadata.json',metadata)
 save('row-fingerprints.json',fingerprints)
 const dump=join(directory,'database-full.dump')
 run('pg_dump',['--role=postgres','--format=custom','--snapshot',snapshot,'--lock-wait-timeout=10000','--file',dump])
 save('archive.list',run('pg_restore',['--list',dump]))
 save('database-schema.sql',run('pg_restore',['--schema-only','--file','-',dump]))
 const manifest={projectRef,createdAt:new Date().toISOString(),server,directory,consistentSnapshot:true,portableFingerprints:true,restoreVerified:false,storage:metadata.storageObjects,fingerprintTables:tables.length,
  dumpBytes:statSync(dump).size,dumpSha256:createHash('sha256').update(readFileSync(dump)).digest('hex')}
 save('manifest.json',manifest)
 console.log(JSON.stringify({stage:'consistent_export_complete',...manifest}))
} finally {
 holder.stdin.end('rollback;\n\\q\n')
 if(stderr)save('snapshot-holder.private.log',stderr)
}
