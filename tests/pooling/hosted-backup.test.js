import {test} from 'node:test'
import assert from 'node:assert/strict'
import {parseConnectionScript} from '../../scripts/pooling/hosted-backup.mjs'
const input=`export PGHOST="aws-0-ap-southeast-2.pooler.supabase.com"
export PGPORT="5432"
export PGUSER="cli_login_postgres.haxxetirrcrwzwdzsdui"
export PGPASSWORD="fictional-test-password"
export PGDATABASE="postgres"`
test('backup parses only known environment literals without executing shell',()=>{
 assert.equal(parseConnectionScript(input+'\nexit 8').PGDATABASE,'postgres')
})
test('backup rejects wrong project, command substitution, missing and duplicate fields',()=>{
 for(const s of [input.replace('haxxetirrcrwzwdzsdui','wrongproject'),input.replace('fictional-test-password','$(whoami)'),input.replace('export PGPORT="5432"',''),input+'\nexport PGPORT="5432"'])assert.throws(()=>parseConnectionScript(s))
})
