import {useCallback,useEffect,useRef,useState} from 'react'
import {readAssignments,recordExecution,submitPoolingReport,readPendingOperations} from '../api/pooling'
import {hasBackend} from '../lib/supabase'
import {DEFINITIVE_CODES} from '../lib/pooling/operations'

export default function useGovernedWorkout(clientId,enabled,startAllowed=true){
 const [assignments,setAssignments]=useState([]),[status,setStatus]=useState('loading'),[error,setError]=useState(''),[stopped,setStopped]=useState([])
 const current=useRef(null)
 // Every scope has independent in-flight work. A late response from a previous
 // client must never populate this client's assignments or recovery controls.
 if(current.current?.clientId!==clientId || current.current?.enabled!==enabled)current.current={clientId,enabled,pending:null,busy:false,stopping:new Set(),revision:0}
 const scope=current.current
 const refresh=useCallback(async()=>{
   const revision=++scope.revision
   if(!enabled || !clientId || !hasBackend){setAssignments([]);setStatus('unavailable');return}
   try{
     const [rows,operations]=await Promise.all([readAssignments(clientId),readPendingOperations(clientId)])
     if(current.current!==scope || scope.revision!==revision)return
     setAssignments(rows)
     scope.pending=operations.find(row=>['execution','report'].includes(row.kind))?.request || null
     setStopped(ids=>[...new Set([...ids,...operations.filter(row=>row.kind==='execution' && row.request.kind==='stop').map(row=>row.request.assignmentId)])])
     setStatus(scope.pending?'outcome_unknown':'ready')
   }
   catch(failure){if(current.current===scope && scope.revision===revision){setStatus(scope.pending?'outcome_unknown':'unavailable');setError(failure.message)}}
 },[clientId,enabled,scope])
 useEffect(()=>{setAssignments([]);setStopped([]);setError('');setStatus('loading');refresh();return()=>{scope.revision++}},[refresh,scope])
 const fail=useCallback(failure=>{
   if(current.current!==scope)return
   const unknown=!DEFINITIVE_CODES.includes(failure.code)
   if(!unknown)scope.pending=null
   setStatus(unknown?'outcome_unknown':'failed');setError(failure.message)
 },[scope])
 const execute=useCallback(async(assignment,kind,payload={})=>{
   if(current.current!==scope || !enabled)return
   if(['start','resume'].includes(kind)&&!startAllowed){setError('New starts are unavailable. Stop and preserved history remain available.');return}
   if(kind==='stop'){
     setStopped(ids=>ids.includes(assignment.id)?ids:[...ids,assignment.id])
     if(scope.stopping.has(assignment.id))return
     scope.stopping.add(assignment.id);scope.revision++
     // Stop remains independent of an unknown actual/report. It is journaled
     // before the network request, and never grants start/resume authority.
     const request={clientId,assignmentId:assignment.id,generation:assignment.contextGeneration,operationKey:crypto.randomUUID(),kind:'stop',payload:{}}
     try{
       const existing=(await readPendingOperations(clientId)).find(row=>row.kind==='execution' && row.request.assignmentId===assignment.id && row.request.kind==='stop')
       if(current.current!==scope)return
       await recordExecution(existing?.request || request)
       if(current.current===scope)await refresh()
     }catch(failure){
       if(current.current===scope){setError(`Stop requested locally. ${failure.message}`);setStatus('outcome_unknown');await refresh()}
     }finally{scope.stopping.delete(assignment.id)}
     return
   }
   if(scope.busy)return
   if(scope.pending && (scope.pending.assignmentId!==assignment.id || scope.pending.kind!==kind)){setError('Resolve the pending server operation before submitting another. Stop exercising immediately when needed.');return}
   const request=scope.pending || {clientId,assignmentId:assignment.id,generation:assignment.contextGeneration,operationKey:crypto.randomUUID(),kind,payload}
   scope.pending=request;scope.busy=true;scope.revision++;setStatus('saving');setError('')
   try{await recordExecution(request);if(current.current===scope){scope.pending=null;await refresh()}}
   catch(failure){fail(failure)}
   finally{scope.busy=false}
 },[refresh,clientId,enabled,scope,fail,startAllowed])
 const sendReport=async request=>{
   scope.pending=request;scope.busy=true;scope.revision++;setStatus('saving');setError('')
   try{await submitPoolingReport(request);if(current.current===scope){scope.pending=null;await refresh()}}
   catch(failure){fail(failure)}finally{scope.busy=false}
 }
 const reportHealth=async(assignment,value)=>{
   if(current.current!==scope || !enabled)return
   if(['changed','declined'].includes(value))setStopped(ids=>[...new Set([...ids,assignment.id])])
   if(scope.busy || scope.pending){setError('Report not saved: resolve the pending operation, then submit this concern. Stop exercising immediately; Stop now remains available.');return}
   await sendReport({clientId,generation:assignment.contextGeneration,operationKey:crypto.randomUUID(),field:'healthChange',value,effectiveAt:new Date().toISOString()})
 }
 const retry=async()=>{
   if(current.current!==scope || !scope.pending || scope.busy || !enabled)return
   if(scope.pending.field)await sendReport(scope.pending)
   else {const assignment=assignments.find(row=>row.id===scope.pending.assignmentId);if(assignment)await execute(assignment,scope.pending.kind,scope.pending.payload)}
 }
 return {assignments,status,error,stopped,refresh,execute,reportHealth,retry,pending:scope.pending,startAllowed}
}
