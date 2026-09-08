// DEV-only component fixture: not an authentication or database integration test.
import React,{useState} from 'react'
import GovernedWorkoutPanel from '../../src/components/organisms/workout/GovernedWorkoutPanel'
import PoolingBudgetNotice from '../../src/components/molecules/PoolingBudgetNotice'
import PoolingPrescriptionDiff from '../../src/components/molecules/PoolingPrescriptionDiff'
import {evaluateDraft} from '../../src/lib/pooling/decision'
import {doseTiming} from '../../src/lib/pooling/selection'
import {selectionFixture} from './completion-fixture'
import '../../src/index.css'
export function Preview(){const [width,setWidth]=useState(390);return <main><h1>Synthetic component viewport checks</h1><p>No real data, backend connection or clinical values.</p>{[390,768,1280].map(n=><button key={n} onClick={()=>setWidth(n)}>Viewport {n}px</button>)}<iframe title="Synthetic client runner" src="/tests/pooling/ui.html?frame=1" style={{display:'block',width,height:1600,maxWidth:'100%',border:'1px solid #777'}}/></main>}
export function Fixture(){
 const fixtureWidth=Number(new URLSearchParams(location.search).get('width'))||960
 const [status,setStatus]=useState('ready'),[sessionStatus,setSessionStatus]=useState('assigned'),[actuals,setActuals]=useState([]),[stopped,setStopped]=useState([]),[pending,setPending]=useState(null),[last,setLast]=useState('None'),[fail,setFail]=useState(false)
 const assignment={id:1,date:'Fictional test date',draftId:1,contextGeneration:1,status:sessionStatus,stale:false,held:false,actuals,blocks:[{occurrenceId:'fictional-only',role:'fictional test',exerciseId:'not-an-exercise',prescription:{sets:1,workSeconds:1,restSeconds:0,sideMultiplier:2,mode:'timed',loadKg:null}}]}
 function execute(a,kind,payload){setLast(JSON.stringify({kind,payload}));if(kind==='stop'){setStopped([a.id]);setSessionStatus('stop');setStatus('ready');return}if(fail){setStatus('outcome_unknown');setPending({kind,payload});return}if(kind==='actual')setActuals(rows=>[...rows,{id:rows.length+1,...payload,recordedAt:new Date().toISOString()}]);else setSessionStatus(kind);setStatus('ready')}
 const workflow={assignments:[assignment],status,stopped,pending,error:pending?'Synthetic response-loss fixture — reconcile before continuing.':'',refresh:()=>setLast('Synthetic refresh'),execute,reportHealth:(_,value)=>{setStopped([1]);setLast('Synthetic report: '+value)},retry:()=>{setPending(null);setStatus('ready');setLast('Synthetic retry reconciled')}}
 const [zoom,setZoom]=useState(false),budget=evaluateDraft(selectionFixture())
 const from={sets:2,mode:'repetitions',reps:5,sideMultiplier:2,loadKg:null,workSeconds:20,restSeconds:30,setupSeconds:10,transitionSeconds:10}
 const to={...from,reps:4,workSeconds:16}
 from.durationSeconds=doseTiming(from).seconds;to.durationSeconds=doseTiming(to).seconds
 return <main className="pooling-workspace" style={{padding:16,maxWidth:fixtureWidth,margin:'auto',fontSize:zoom?'200%':undefined}}><h1>Synthetic runner only</h1><p>Engineering fixture — no live authority, actual workout or exercise guidance.</p><label><input type="checkbox" checked={zoom} onChange={e=>setZoom(e.target.checked)}/>200% text size fixture</label><PoolingBudgetNotice result={budget}/><PoolingPrescriptionDiff changes={[{occurrenceId:'fictional-sided-reps',from,to}]}/><label><input type="checkbox" checked={fail} onChange={e=>setFail(e.target.checked)}/>Simulate unknown save outcome</label><GovernedWorkoutPanel workflow={workflow}/><output aria-label="Synthetic last operation">{last}</output></main>
}
