// Actual production components with explicit software-only props. This checks
// rendering/lock discoverability, not authentication or backend behavior.
import {renderToStaticMarkup} from 'react-dom/server'
import PoolingApprovalReview from '../../src/components/organisms/program/PoolingApprovalReview'
import PoolingExtensionReview from '../../src/components/organisms/program/PoolingExtensionReview'
import PoolingWeeklyReview from '../../src/components/organisms/program/PoolingWeeklyReview'
import PoolingSuggestions from '../../src/components/organisms/program/PoolingSuggestions'
import GovernedWorkoutPanel from '../../src/components/organisms/workout/GovernedWorkoutPanel'

export function renderReadinessCases(){
  const noop=()=>{},context={generation:1,held:false},workspace={manifests:[],decisions:[],assignments:[]}
  const draft={id:7,revision:1,proposal:{date:'2026-09-09',selection:[{occurrenceId:'software-placeholder'}],session:{}}}
  const props={clientId:'fictional-component-only',context,workspace,drafts:[],online:false,onRefresh:noop}
  return {
    emptyApproval:renderToStaticMarkup(<PoolingApprovalReview {...props} blockedReason="Workspace data could not be verified. Retry loading."/>),
    currentApproval:renderToStaticMarkup(<PoolingApprovalReview {...props} drafts={[draft]} online/>),
    assignedApproval:renderToStaticMarkup(<PoolingApprovalReview {...props} drafts={[draft]} online workspace={{...workspace,assignments:[{id:1,draftId:7}]}}/>),
    missingPolicy:renderToStaticMarkup(<PoolingExtensionReview {...props} kind="daily" requests={[]} onRequest={noop} onReview={noop}/>),
    admittedPolicy:renderToStaticMarkup(<PoolingExtensionReview {...props} kind="progression" requests={[]} online workspace={{...workspace,manifests:[{document:{extensionPolicies:[{kind:'progression',id:'software-policy-only',revision:1}]}}]}} onRequest={noop} onReview={noop}/>),
    weekly:renderToStaticMarkup(<PoolingWeeklyReview {...props}/>),
    suggestions:renderToStaticMarkup(<PoolingSuggestions {...props}/>),
    assignedSuggestions:renderToStaticMarkup(<PoolingSuggestions {...props} drafts={[{...draft,proposal:{...draft.proposal,manifestId:'software-only'}}]} online workspace={{...workspace,assignments:[{id:1,draftId:7}]}}/>),
    emptySessions:renderToStaticMarkup(<GovernedWorkoutPanel workflow={{assignments:[],status:'ready',stopped:[],refresh:noop}}/>),
  }
}
