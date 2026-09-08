// Read-only management metadata for A30's exact organization/project.
// Uses the same macOS keyring entry as the official Supabase CLI. Never logs,
// persists, rotates or forwards the token to any other destination.
import {spawnSync} from 'node:child_process'
import {resolve} from 'node:path'
import {pathToFileURL} from 'node:url'
const organization='orjfpgzbtcxfxdqdadss',project='haxxetirrcrwzwdzsdui'
const allowed=new Set([`/v1/organizations/${organization}`,`/v1/organizations/${organization}/entitlements`,`/v1/projects/${project}/billing/addons`,`/v1/projects/${project}/config/auth`,`/v1/projects/${project}/ssl-enforcement`])
export async function managementRead(path){
 if(!allowed.has(path))throw Error('management_target_not_allowed')
 const r=spawnSync('security',['find-generic-password','-s','Supabase CLI','-a','supabase','-w'],{encoding:'utf8',timeout:15000,stdio:['ignore','pipe','pipe']})
 if(r.status!==0)throw Error('existing_cli_credential_unavailable')
 let token=r.stdout.trim()
 if(token.startsWith('go-keyring-base64:'))token=Buffer.from(token.slice('go-keyring-base64:'.length),'base64').toString('utf8')
 if(!/^sbp_(oauth_|v0_)?[a-f0-9]{40}$/.test(token))throw Error('unexpected_credential_format')
 const res=await fetch('https://api.supabase.com'+path,{headers:{Authorization:'Bearer '+token},redirect:'error',signal:AbortSignal.timeout(25000)})
 token=''
 if(!res.ok)throw Error('management_http_'+res.status)
 return res.json()
}
async function main(){
 const org=await managementRead(`/v1/organizations/${organization}`)
 console.log(JSON.stringify({organization,fields:Object.keys(org),plan:org.plan??org.billing_plan??org.subscription_tier??null}))
 const entitlements=await managementRead(`/v1/organizations/${organization}/entitlements`)
 console.log(JSON.stringify({organization,entitlements:entitlements.entitlements?.filter(x=>/^(function\.|backup\.|storage.max_file_size$|branching_limit$)/.test(x.feature?.key))}))
 const addons=await managementRead(`/v1/projects/${project}/billing/addons`)
 console.log(JSON.stringify({project,selectedAddons:addons.selected_addons}))
}
if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(e=>{console.error(JSON.stringify({failed:true,reason:e.message}));process.exitCode=1})
