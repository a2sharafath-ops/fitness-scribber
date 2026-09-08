import React,{useEffect,useState} from 'react'
import {createRoot} from 'react-dom/client'
import {FixtureProvider,useData} from './remaining-browser-providers'
import {ModalProvider,useModal} from '../../src/store/ModalContext'
import WorkoutBuilderModal from '../../src/components/organisms/program/WorkoutBuilderModal'
import PoolingExtensionReview from '../../src/components/organisms/program/PoolingExtensionReview'
import PoolingOperationRecovery from '../../src/components/organisms/program/PoolingOperationRecovery'
import {reviewExtension,readPooling} from '../../src/api/pooling'
import PoolingApprovalReview from '../../src/components/organisms/program/PoolingApprovalReview'
import usePoolingBuilder from '../../src/hooks/usePoolingBuilder'
import '../../src/index.css'
export function Fixture(){
 const {db}=useData(),{openModal}=useModal(),[refresh,setRefresh]=useState(0)
 const test=db.fixture
 const onReview=async request=>{await reviewExtension({...request,clientId:test.client,generation:test.generation});setRefresh(v=>v+1)}
 return <main className="pooling-workspace" style={{maxWidth:960,padding:20,margin:'auto'}}><h1>Fictional local SQL verification</h1><p>No hosted Auth, real person or exercise authority.</p>
 <button onClick={()=>openModal(<WorkoutBuilderModal clientId={test.client} date={test.date}/>,true)}>Open review builder</button>
 <PoolingExtensionReview key={refresh} kind="progression" policy={{parameters:[],reviewStatus:'fictional local only'}} requests={[{id:test.request.id,operationKey:'fixture-request',proposal:{date:test.date,kind:'progression',requestedChange:'Fictional 2kg to 4kg comparison'},numericalProposals:[test.numerical]}]} onRequest={()=>{throw Error('Not used')}} onReview={onReview} online context={{generation:test.generation}} clientId={test.client} workspace={{}} drafts={[]} onRefresh={()=>setRefresh(v=>v+1)}/>
 <PoolingOperationRecovery clientId={test.client} refreshKey={refresh} onReconciled={()=>setRefresh(v=>v+1)}/>
 <HookProbe/>
 <CanonicalProbe/>
 </main>
}
function CanonicalProbe(){
 const {db}=useData(),[data,setData]=useState(null),[revision,setRevision]=useState(0)
 useEffect(()=>{readPooling(db.fixture.client).then(setData)},[db.fixture.client,revision])
 return data?<PoolingApprovalReview clientId={db.fixture.client} context={data.context} drafts={data.drafts} workspace={{manifests:[db.fixture.release],assignments:[],decisions:[]}} online onRefresh={()=>setRevision(n=>n+1)}/>:null
}
function HookProbe(){
 const {db}=useData(),[client,setClient]=useState(db.fixture.client)
 const date=new Date(Date.parse(db.fixture.date)+86400000).toISOString().slice(0,10)
 const draft=usePoolingBuilder({enabled:true,clientId:client,date})
 return <section><h2>Deferred response scope fixture</h2><p role="status" aria-label="Hook scope">{JSON.stringify({client,status:draft.status,outcomes:draft.outcomes.length})}</p>
 <button disabled={draft.status!=='ready'} onClick={()=>draft.saveTargets([{clientId:client,date,blocks:db.prescriptions[0].blocks,notes:'Fictional deferred save'}])}>Begin deferred hook save</button>
 <button onClick={()=>setClient(db.fixture.recipient)}>Change hook client</button></section>
}
createRoot(document.getElementById('root')).render(<React.StrictMode><FixtureProvider><ModalProvider><Fixture/></ModalProvider></FixtureProvider></React.StrictMode>)
