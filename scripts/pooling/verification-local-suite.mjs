import {readFileSync,writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {spawnSync} from 'node:child_process'
import assert from 'node:assert/strict'
import {localRuntime} from './hosted-local.mjs'
const runtimeFile='.local-test-runtime/hosted-restore-Zc0Yjh/runtime.json',rt=localRuntime(runtimeFile)
const rehearsal=JSON.parse(readFileSync('.recovery/hosted-test/baseline-xWSVzw/a32-rehearsal.json','utf8'));assert(rehearsal.passed)
const database='fitness_hosted_migration_'+Date.now();rt.run('createdb',['--template',rehearsal.database,'--owner','postgres',database])
const file=join(rt.directory,'a32-suite-input.json');writeFileSync(file,JSON.stringify({passed:true,runtimeFile,database}),{mode:0o600})
const r=spawnSync(process.execPath,['scripts/pooling/hosted-local-suite.mjs',file],{stdio:'inherit',timeout:180000});process.exitCode=r.status??1
