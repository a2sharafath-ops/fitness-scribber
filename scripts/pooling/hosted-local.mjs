// Restricted adapter for the private restored hosted database, never a remote DB.
import {readFileSync,writeFileSync} from 'node:fs'
import {spawnSync} from 'node:child_process'
import {resolve,join} from 'node:path'
export function localRuntime(path){
 const file=resolve(path)
 if(!file.startsWith(resolve('.local-test-runtime/hosted-restore-')))throw Error('task_runtime_required')
 const rt=JSON.parse(readFileSync(file,'utf8'))
 if(rt.port!==55440 || rt.user!=='fitness_recovery_admin' || !/^\/private\/tmp\/fitness-hosted-pg-[A-Za-z0-9]+$/.test(rt.socket) || !rt.bin.startsWith(resolve('.local-test-runtime/pg17.') ) || rt.passfile!==join(rt.directory,'password.local'))throw Error('unexpected_local_runtime')
 const env={...Object.fromEntries(Object.entries(process.env).filter(([k])=>!k.startsWith('PG'))),PGHOST:rt.socket,PGPORT:String(rt.port),PGUSER:rt.user,PGPASSWORD:readFileSync(rt.passfile,'utf8').trim()}
 function run(cmd,args){const r=spawnSync(join(rt.bin,cmd),args,{env,encoding:'utf8',timeout:45000,maxBuffer:32*1024*1024});if(r.status!==0){const diagnostic=join(rt.directory,`${cmd}-error-${Date.now()}.private.txt`);writeFileSync(diagnostic,r.stderr||'',{mode:0o600,flag:'wx'});throw Error('local_command_failed: '+diagnostic)}return r.stdout.trim()}
 function sql(db,query){if(!/^fitness_hosted_(restore|migration)_\d+$/.test(db)&&db!=='postgres')throw Error('task_database_required');return run('psql',['-X','-q','-A','-t','-d',db,'-v','ON_ERROR_STOP=1','-c',"set timezone='UTC'; "+query])}
 return {...rt,env,run,sql}
}
