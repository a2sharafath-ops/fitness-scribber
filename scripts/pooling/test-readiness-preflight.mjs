// Read-only control-plane inventory. Never signs in as a coach or resumes a
// retired engineering run; no client/contact/health records are retrieved.
import {readFileSync,mkdirSync,writeFileSync,statfsSync} from 'node:fs'
import {parseEnv} from 'node:util'
import {resolve} from 'node:path'
import assert from 'node:assert/strict'
process.umask(0o077)
const config=parseEnv(readFileSync('.env','utf8'))
const origin='https://haxxetirrcrwzwdzsdui.supabase.co'
assert.equal(config.VITE_SUPABASE_URL,origin)
assert(config.SUPABASE_SERVICE_ROLE_KEY)
let requests=0
async function read(table,select){
  assert(++requests<=3)
  const response=await fetch(`${origin}/rest/v1/${table}?select=${encodeURIComponent(select)}`,{headers:{apikey:config.SUPABASE_SERVICE_ROLE_KEY,Authorization:`Bearer ${config.SUPABASE_SERVICE_ROLE_KEY}`},signal:AbortSignal.timeout(15000),redirect:'error'})
  assert.equal(response.status,200,`Control inventory unavailable: ${table} (${response.status})`)
  return response.json()
}
const [settings]=await read('pooling_test_config','enabled,ends_at,coach_ids')
const rows=await read('pooling_test_workspaces','client_id,coach_id,expires_at,revoked_at,writes')
const [flags]=await read('pooling_runtime','r1,r2,r3')
const storage=statfsSync('.')
const report={at:new Date().toISOString(),scope:'read-only control inventory',remoteRequests:requests,writeRequests:0,globalFlags:flags,testEnabled:settings.enabled,endsAt:settings.ends_at,lifetimeWorkspaceCount:rows.length,eligibleCoachCount:settings.coach_ids.length,eligibleWorkspaces:rows.filter(row=>settings.coach_ids.includes(row.coach_id)).map(({coach_id:_coachId,...row})=>row),historicalOtherWorkspaces:rows.filter(row=>!settings.coach_ids.includes(row.coach_id)).map(row=>({revoked:!!row.revoked_at})),freeBytes:storage.bavail*storage.bsize}
const directory=resolve('.recovery/test-readiness')
mkdirSync(directory,{recursive:true,mode:0o700})
writeFileSync(`${directory}/preflight-${Date.now()}.json`,JSON.stringify(report,null,2)+'\n',{mode:0o600,flag:'wx'})
console.log(JSON.stringify(report))
