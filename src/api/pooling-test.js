import {readTestScenario,readReviewWorkspace,readAssignments,readPooling,confirmPoolingSource,savePoolingDraft,reviewContext} from './pooling'
import {prepareFictionalScenario} from '../lib/pooling/test-preparation'

// Real API writes to an enrolled, explicitly fictional record. No automatic
// approval, assignment, actual completion, or real-client consent is made here.
export async function prepareTestDrafts(clientId,count=1){
 if(!navigator.locks)throw Error('This browser cannot safely coordinate preparation. Use a current browser with Web Locks support.')
 return navigator.locks.request(`fitscribe-fictional-prepare:${clientId}`,async()=>{
  const scenario=await readTestScenario(clientId),workspace=await readReviewWorkspace(clientId)
  const manifest=workspace.manifests.find(row=>row.id===scenario.proposal.manifestId)
  const goals=manifest?.document.extensionPolicies?.find(policy=>policy.kind==='weekly')?.goals
  if(!Array.isArray(goals)||!goals.length)throw Error('The backend fictional goal policy is unavailable.')
  scenario.proposal.session.request.goalPriority=[...goals]
  // A later fictional session must retain the reviewed occurrence identities
  // when it is intended for comparable-baseline progression. This copies a
  // proposal only; new sources, decisions and coach approval are still required.
  const completed=(await readAssignments(clientId)).find(row=>row.status==='complete')
  if(completed){
   const prior=(await readPooling(clientId)).drafts.find(row=>row.id===completed.draftId)
   if(prior?.proposal.manifestId===scenario.proposal.manifestId)scenario.proposal.selection=structuredClone(prior.proposal.selection)
  }
  return prepareFictionalScenario({clientId,count,scenario,storage:localStorage,uuid:()=>crypto.randomUUID(),
   api:{read:()=>readPooling(clientId),confirm:confirmPoolingSource,draft:savePoolingDraft,review:reviewContext},
  })
 })
}
