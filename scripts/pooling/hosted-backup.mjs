// A30 backup utility. No hosted DDL or application mutations. Generated CLI shell
// output is parsed as data, never evaluated. Secret values stay in child env only.
import {spawnSync} from 'node:child_process'
import {readFileSync,mkdirSync,mkdtempSync,writeFileSync,chmodSync,statSync,statfsSync,existsSync} from 'node:fs'
import {resolve,join} from 'node:path'
import {pathToFileURL} from 'node:url'
import {createHash} from 'node:crypto'

export const projectRef='haxxetirrcrwzwdzsdui'
let diagnosticDirectory=null
export function parseConnectionScript(script){
 const values={}
 for(const line of script.split('\n')){
  const m=/^export (PGHOST|PGPORT|PGUSER|PGPASSWORD|PGDATABASE)=(.*)$/.exec(line.trim())
  if(!m)continue
  if(m[1] in values)throw Error('duplicate_connection_field')
  const raw=m[2]
  // Only simple quoted literals. Never interpret substitutions or shell escapes.
  if(raw.length<2 || !['"',"'"].includes(raw[0]) || raw.at(-1)!==raw[0])throw Error('unsupported_connection_format')
  const value=raw.slice(1,-1)
  if(/[\r\n\\`$]/.test(value) || value.includes(raw[0]))throw Error('unsupported_connection_format')
  values[m[1]]=value
 }
 if(Object.keys(values).length!==5)throw Error('missing_connection_fields')
 const direct=values.PGHOST===`db.${projectRef}.supabase.co`
 const pooler=/^aws-[0-9]+-ap-southeast-2\.pooler\.supabase\.com$/.test(values.PGHOST) && values.PGUSER.endsWith(`.${projectRef}`)
 if(!direct && !pooler)throw Error('unexpected_database_target')
 if(!['5432','6543'].includes(values.PGPORT) || values.PGDATABASE!=='postgres')throw Error('unexpected_database_target')
 if(!values.PGPASSWORD || !/^cli_login_postgres(?:\.haxxetirrcrwzwdzsdui)?$/.test(values.PGUSER))throw Error('unexpected_database_identity')
 return values
}
export function cli(args){
 const r=spawnSync('supabase',args,{encoding:'utf8',input:'',timeout:45000,maxBuffer:32*1024*1024})
 if(r.status!==0)throw Error(r.error?.code==='ETIMEDOUT'?'cli_timeout':'cli_failed_private_output_withheld')
 return r.stdout
}
export function connection(){
 if(readFileSync('supabase/.temp/project-ref','utf8').trim()!==projectRef)throw Error('unexpected_linked_project')
 const ca=resolve(process.env.FITNESS_HOSTED_CA_FILE||'')
 if(!ca.startsWith(resolve('.local-test-runtime')+'/') || !readFileSync(ca,'utf8').includes('-----BEGIN CERTIFICATE-----'))throw Error('explicit_project_local_database_ca_required')
 return {...process.env,...parseConnectionScript(cli(['db','dump','--linked','--dry-run'])),PGSSLMODE:'verify-full',PGSSLROOTCERT:ca,PGCONNECT_TIMEOUT:'15',PGOPTIONS:'-c default_transaction_read_only=on -c statement_timeout=30000'}
}
function run(bin,command,args,env){
 // The post-pooling schema has substantially more objects. Keep a bounded but
 // realistic export deadline; the calling task can yield while this runs.
 const r=spawnSync(join(bin,command),args,{env,encoding:'utf8',timeout:command==='pg_dump'?300000:90000,stdio:['ignore','pipe','pipe'],maxBuffer:32*1024*1024})
 if(r.status!==0){
  const err=r.stderr||''
  const code=/certificate verify failed|root certificate|SSL error/i.test(err)?'tls_verification_failed':/permission denied/i.test(err)?'database_permission_denied':/could not translate host|Network is unreachable|timeout|timed out/i.test(err)?'database_connection_failed':'database_command_failed'
  if(diagnosticDirectory){
   const path=join(diagnosticDirectory,command+'-error-'+Date.now()+'.private.txt')
   writeFileSync(path,err,{mode:0o600,flag:'wx'})
   console.error(JSON.stringify({command,exit:r.status,signal:r.signal,systemError:r.error?.code,diagnosticFile:path,errorClass:code}))
  }
  if(code==='tls_verification_failed')console.error(JSON.stringify({reason:code,details:err.split('\n').filter(s=>/certificate|SSL error|root CA/.test(s)).map(s=>s.replace(/password[^\s]*/gi,'[redacted]')).slice(0,3)}))
  throw Error(code)
 }
 return r.stdout
}
export function query(bin,env,sql){return run(bin,'psql',['-X','-q','-A','-t','-v','ON_ERROR_STOP=1','-c',"set role postgres; set timezone='UTC'; "+sql],env).trim()}
function save(dir,name,value){const file=join(dir,name);writeFileSync(file,value,{mode:0o600,flag:'wx'});return file}
export function fingerprintSQL(tables,portable=false){
 if(!tables.length)throw Error('no_fingerprint_tables')
 const ident=v=>'"'+v.replaceAll('"','""')+'"',literal=v=>"'"+v.replaceAll("'","''")+"'"
 const union=tables.map(t=>{
  if(!['public','auth','storage'].includes(t.schema) || typeof t.table!=='string')throw Error('unexpected_fingerprint_schema')
  return `select ${literal(t.schema+'.'+t.table)} as name,jsonb_build_object('count',count(*),'sha256',encode(sha256(convert_to(coalesce(jsonb_agg(to_jsonb(x) order by to_jsonb(x)::text${portable?' collate "C"':''}),'[]'::jsonb)::text,'UTF8')),'hex')) as value from ${ident(t.schema)}.${ident(t.table)} x`
 }).join(' union all ')
 return `select jsonb_object_agg(name,value) from (${union}) fingerprints`
}
export async function main(mode){
 process.umask(0o077)
 if(!['probe','export','complete'].includes(mode))throw Error('use_probe_export_or_complete')
 const bin=resolve(process.env.FITNESS_HOSTED_PG_BIN||'')
 if(!bin.startsWith(resolve('.local-test-runtime')+'/') || !run(bin,'pg_dump',['--version'],process.env).includes('(PostgreSQL) 17.'))throw Error('isolated_postgres17_required')
 let env=connection()
 const server=JSON.parse(query(bin,env,"select json_build_object('version',current_setting('server_version'),'readOnly',current_setting('transaction_read_only'),'databaseBytes',pg_database_size(current_database()))"))
 if(server.readOnly!=='on' || !server.version.startsWith('17.'))throw Error('unexpected_server_state')
 if(mode==='probe'){console.log(JSON.stringify({mode,projectRef,tls:'verify-full',server}));return}
 const fs=statfsSync(resolve('.local-test-runtime'))
 if(fs.bavail*fs.bsize<1.5*1024**3 || server.databaseBytes>200*1024**2)throw Error('backup_capacity_guard')
 const parent=resolve('.recovery/hosted-test');mkdirSync(parent,{recursive:true,mode:0o700})
 const dir=mode==='complete'?resolve(process.argv[3]||''):mkdtempSync(join(parent,'baseline-'))
 if(!dir.startsWith(parent+'/baseline-') || (statSync(dir).mode&0o077)!==0)throw Error('private_backup_directory_required')
 chmodSync(dir,0o700)
 diagnosticDirectory=dir
 console.log(JSON.stringify({stage:'export_started',projectRef,directory:dir}))
 // Keep the full archive even when a local managed-extension restore is limited.
 const dump=join(dir,'database-full.dump')
 if(mode==='export'){
 run(bin,'pg_dump',['--role=postgres','--format=custom','--lock-wait-timeout=10000','--file',dump],env);chmodSync(dump,0o600)
 save(dir,'archive.list',run(bin,'pg_restore',['--list',dump],process.env))
  const schema=run(bin,'pg_dump',['--role=postgres','--schema-only','--lock-wait-timeout=10000'],env)
  save(dir,'database-schema.sql',schema)
 }
 // CLI credentials are short-lived. Refresh only after exports have finished;
 // never rotate an identity while another dump/connection is in use.
 env=connection()
 if(!existsSync(join(dir,'roles-without-passwords.json'))){
  const roles=query(bin,env,"select coalesce(jsonb_agg(to_jsonb(r) order by rolname),'[]') from pg_roles r")
  save(dir,'roles-without-passwords.json',roles+'\n')
 }
 if(!existsSync(join(dir,'metadata.json'))){
 const metadata=query(bin,env,`select jsonb_build_object(
 'extensions',(select jsonb_agg(jsonb_build_object('name',e.extname,'version',e.extversion,'schema',n.nspname)) from pg_extension e join pg_namespace n on n.oid=e.extnamespace),
 'tables',(select jsonb_agg(jsonb_build_object('schema',n.nspname,'name',c.relname,'rls',c.relrowsecurity)) from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind='r' and n.nspname not in ('pg_catalog','information_schema') and n.nspname not like 'pg_toast%'),
 'storageObjects',(select count(*) from storage.objects),'storageBuckets',(select count(*) from storage.buckets),
 'roles',(select jsonb_agg(jsonb_build_object('member',pg_get_userbyid(member),'role',pg_get_userbyid(roleid),'admin',admin_option)) from pg_auth_members))`)
 save(dir,'metadata.json',metadata+'\n')
 }
 // A previous completed dump can be finalized after its short-lived CLI login
 // rotated. Never reuse the initial incomplete dump: schema/list/metadata required.
 for(const required of ['database-schema.sql','archive.list','metadata.json','roles-without-passwords.json'])if(!statSync(join(dir,required)).size)throw Error('incomplete_backup')
 run(bin,'pg_restore',['--list',dump],process.env)
 const tables=JSON.parse(query(bin,env,"select jsonb_agg(jsonb_build_object('schema',schemaname,'table',tablename) order by schemaname,tablename) from pg_tables where schemaname in ('public','auth','storage')"))
 const fingerprint=JSON.parse(query(bin,env,fingerprintSQL(tables,true)))
 save(dir,'row-fingerprints.json',JSON.stringify(fingerprint,null,2)+'\n')
 const manifest={projectRef,createdAt:new Date().toISOString(),server,toolVersion:run(bin,'pg_dump',['--version'],process.env).trim(),dumpBytes:statSync(dump).size,dumpSha256:createHash('sha256').update(readFileSync(dump)).digest('hex'),directory:dir,restoreVerified:false,portableFingerprints:true,storage:JSON.parse(readFileSync(join(dir,'metadata.json'),'utf8')).storageObjects,fingerprintTables:tables.length}
 save(dir,'manifest.json',JSON.stringify(manifest,null,2)+'\n')
 console.log(JSON.stringify({stage:'export_complete',...manifest}))
}
if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main(process.argv[2]).catch(e=>{console.error(JSON.stringify({failed:true,reason:e.message}));process.exitCode=1})
