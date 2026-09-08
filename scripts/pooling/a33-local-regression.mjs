// Clone the fully rehearsed A33 schema; never write into the restore baseline.
import {readFileSync,writeFileSync} from 'node:fs'
import {join,resolve} from 'node:path'
import {spawnSync} from 'node:child_process'
import assert from 'node:assert/strict'
import {localRuntime} from './hosted-local.mjs'
const input=resolve(process.argv[2]||'')
assert(input.startsWith(resolve('.recovery/hosted-test/baseline-')))
const receipt=JSON.parse(readFileSync(input,'utf8'));assert(receipt.passed)
const restore=JSON.parse(readFileSync(receipt.restoreFile,'utf8'));assert(restore.passed)
const rt=localRuntime(restore.runtimeFile),source=receipt.database
assert(/^fitness_hosted_migration_\d+$/.test(source))
const database='fitness_hosted_migration_'+Date.now()
rt.run('createdb',['-T',source,database])
const report=join(rt.directory,'a33-regression-'+database+'.json')
writeFileSync(report,JSON.stringify({passed:true,runtimeFile:restore.runtimeFile,database,source})+'\n',{mode:0o600,flag:'wx'})
const result=spawnSync(process.execPath,['scripts/pooling/hosted-local-suite.mjs',report],{stdio:'inherit',timeout:180000})
assert.equal(result.status,0)
