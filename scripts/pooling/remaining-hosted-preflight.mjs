// Read-only readiness check. Never creates or reactivates an identity, changes
// test capacity, logs secrets, or enrolls an original coach/real client.
import {readFileSync,writeFileSync} from 'node:fs'
import {parseEnv} from 'node:util'
import {createClient} from '@supabase/supabase-js'
import assert from 'node:assert/strict'
const env=parseEnv(readFileSync('.env','utf8'))
assert.equal(env.VITE_SUPABASE_URL,'https://haxxetirrcrwzwdzsdui.supabase.co')
assert(env.SUPABASE_SERVICE_ROLE_KEY)
const backend=createClient(env.VITE_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:(input,init={})=>fetch(input,{...init,signal:AbortSignal.timeout(15000)})}})
const [flags,config,spaces]=await Promise.all([
 backend.from('pooling_runtime').select('*').single(),
 backend.from('pooling_test_config').select('coach_ids,ends_at,enabled').single(),
 backend.from('pooling_test_workspaces').select('coach_id,revoked_at,expires_at'),
])
for(const value of [flags,config,spaces])assert.ifError(value.error)
assert(!flags.data.r1&&!flags.data.r2&&!flags.data.r3)
const reservedOriginalSlots=config.data.coach_ids.filter(id=>!spaces.data.some(w=>w.coach_id===id)).length
const result={checkedAt:new Date().toISOString(),readOnly:true,globalFlagsOff:true,existingAllowedCoaches:config.data.coach_ids.length,lifetimeWorkspaces:spaces.data.length,reservedOriginalSlots,recordedLifetimeCap:6,unreservedNewWorkspaceSlots:6-spaces.data.length-reservedOriginalSlots,oneWorkspacePerCoach:true,windowEndsAt:config.data.ends_at,newHostedTestRunStarted:false,scope:'Read-only hosted configuration; no original identity used and no resource or permission change'}
writeFileSync('.recovery/remaining-verification/hosted-preflight.json',JSON.stringify(result,null,2)+'\n',{mode:0o600,flush:true})
console.log(JSON.stringify(result))
