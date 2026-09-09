import {createServer} from 'vite'
import react from '@vitejs/plugin-react'
import assert from 'node:assert/strict'
const server=await createServer({configFile:false,envDir:false,cacheDir:'node_modules/.vite-a34-components',define:{'import.meta.env.VITE_SUPABASE_URL':'""','import.meta.env.VITE_SUPABASE_ANON_KEY':'""'},plugins:[react()],server:{middlewareMode:true,ws:false,watch:{ignored:['**/.recovery/**','**/.local-test-runtime/**']}},logLevel:'error'})
try{
  const {renderReadinessCases}=await server.ssrLoadModule('/tests/pooling/readiness-components.jsx'),cases=renderReadinessCases()
  assert.match(cases.emptyApproval,/Exact-revision review and assignment/)
  assert.match(cases.emptyApproval,/Workspace data could not be verified/)
  assert.match(cases.currentApproval,/<details open="">/)
  assert.match(cases.currentApproval,/Validate exact draft 7/)
  assert.match(cases.currentApproval,/Click Validate exact draft first/)
  assert.match(cases.assignedApproval,/Copy draft 7 for separate review/)
  assert.match(cases.assignedApproval,/instead of refreshing its approved source snapshot/)
  assert(!cases.assignedSuggestions.includes('value="7"'))
  assert.match(cases.missingPolicy,/No numerical policy is currently available/)
  assert.match(cases.missingPolicy,/No review request has been saved yet/)
  assert.match(cases.admittedPolicy,/software-policy-only/)
  assert.match(cases.admittedPolicy,/Progression review/)
  assert.match(cases.weekly,/Choose their published release and weekly policy/)
  assert.match(cases.weekly,/No saved weekly review yet/)
  assert.match(cases.suggestions,/Wait for the connected workspace/)
  assert.match(cases.suggestions,/Propose reviewed swap/)
  assert.match(cases.emptySessions,/No approved pooling sessions are available yet/)
  for(const html of Object.values(cases))assert(!html.includes('undefined'))
  for(const html of [cases.emptyApproval,cases.currentApproval,cases.missingPolicy,cases.weekly,cases.suggestions])assert.match(html,/aria-describedby=/)
  console.log(JSON.stringify({passed:true,productionComponentCases:Object.keys(cases),scope:'SSR rendering with fictional props only; no hosted requests or sign-in evidence'}))
}finally{await server.close()}
