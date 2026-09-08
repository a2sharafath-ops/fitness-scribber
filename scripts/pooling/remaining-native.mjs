// Reuse only the retained task-owned Unix-socket cluster; clone the verified
// baseline into a fresh database. No hosted connection, original DB writes or drops.
import {readFileSync,writeFileSync,mkdirSync,statfsSync} from 'node:fs'
import {resolve,join} from 'node:path'
import {spawnSync} from 'node:child_process'
import assert from 'node:assert/strict'
import {localRuntime} from './hosted-local.mjs'
process.umask(0o077)
assert(statfsSync('.').bavail*statfsSync('.').bsize>1.5*1024**3)
const runtimeFile='.local-test-runtime/hosted-restore-Zc0Yjh/runtime.json',rt=localRuntime(runtimeFile)
const status=spawnSync(join(rt.bin,'pg_ctl'),['-D',rt.data,'status'],{encoding:'utf8'})
const started=status.status!==0
if(started)rt.run('pg_ctl',['-D',rt.data,'-l',join(rt.directory,'server.log'),'-o',`-c listen_addresses='' -c unix_socket_directories='${rt.socket}' -c unix_socket_permissions=0700 -p 55440`,'start','-w','-t','15'])
const baseline=JSON.parse(readFileSync('.recovery/hosted-test/baseline-xWSVzw/a32-rehearsal.json','utf8'));assert(baseline.passed)
const database='fitness_hosted_migration_'+Date.now()
rt.run('createdb',['--template',baseline.database,'--owner','postgres',database])
const input=join(rt.directory,'remaining-suite-'+database+'.json')
writeFileSync(input,JSON.stringify({passed:true,runtimeFile,database}),{mode:0o600,flag:'wx'})
const result=spawnSync(process.execPath,['scripts/pooling/hosted-local-suite.mjs',input],{encoding:'utf8',timeout:180000,maxBuffer:8*1024*1024})
if(result.status!==0){writeFileSync(join(rt.directory,'remaining-suite-error.private.txt'),result.stderr,{mode:0o600});throw Error('Native suite failed; private diagnostics retained')}
console.log(result.stdout)
mkdirSync(resolve('.recovery/remaining-verification'),{recursive:true,mode:0o700})
writeFileSync('.recovery/remaining-verification/native-runtime.json',JSON.stringify({passed:true,runtimeFile,database,started},null,2)+'\n',{mode:0o600,flush:true})
console.log(JSON.stringify({passed:true,database,unixSocketOnly:true,clusterLeftForBrowserFixture:true}))
