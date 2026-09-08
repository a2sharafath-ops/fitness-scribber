// Fresh isolated PostgreSQL 17 cluster for A30 recovery. No existing data is reset.
import {spawnSync} from 'node:child_process'
import {readFileSync,writeFileSync,mkdtempSync,statfsSync,chmodSync} from 'node:fs'
import {resolve,join} from 'node:path'
import {randomBytes,createHash} from 'node:crypto'
const bin=resolve(process.env.FITNESS_HOSTED_PG_BIN||'')
const expected=resolve('.local-test-runtime/pg17.YbRhJl/mounted/Postgres.app/Contents/Versions/17/bin')
if(bin!==expected)throw Error('exact_verified_runtime_required')
const digest=createHash('sha256').update(readFileSync('.local-test-runtime/pg17.YbRhJl/Postgres-2.9.6-17.dmg')).digest('hex')
if(digest!=='b38bb00b8c8702a568270aab85995c550f7f93d1503b818efdc5ff9a519b7168')throw Error('runtime_integrity_mismatch')
const fs=statfsSync(resolve('.local-test-runtime'))
if(fs.bavail*fs.bsize<1.5*1024**3)throw Error('recovery_capacity_guard')
const dir=mkdtempSync(resolve('.local-test-runtime/hosted-restore-'))
const socket=mkdtempSync('/private/tmp/fitness-hosted-pg-')
for(const path of [dir,socket])chmodSync(path,0o700)
const password=randomBytes(32).toString('base64url'),user='fitness_recovery_admin',data=join(dir,'data')
const passfile=join(dir,'password.local')
writeFileSync(passfile,password+'\n',{mode:0o600,flag:'wx'})
const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('PG')))
function run(cmd,args){
 const r=spawnSync(join(bin,cmd),args,{env,encoding:'utf8',timeout:30000,stdio:['ignore','pipe','pipe']})
 if(r.status!==0)throw Error(cmd+'_failed_private_output_withheld')
 return r.stdout.trim()
}
run('initdb',['-D',data,'-U',user,'--auth-local=scram-sha-256','--auth-host=scram-sha-256','--pwfile',passfile,'--encoding=UTF8','--no-locale'])
run('pg_ctl',['-D',data,'-l',join(dir,'server.log'),'-o',`-c listen_addresses='' -c unix_socket_directories='${socket}' -c unix_socket_permissions=0700 -p 55440`,'start','-w','-t','15'])
const manifest={purpose:'A30 private baseline restore only',directory:dir,bin,socket,port:55440,user,data,passfile,version:run('postgres',['--version']),createdAt:new Date().toISOString()}
writeFileSync(join(dir,'runtime.json'),JSON.stringify(manifest,null,2)+'\n',{mode:0o600,flag:'wx'})
console.log(JSON.stringify({...manifest,network:'Unix socket only; no TCP listener',password:'not printed'}))
