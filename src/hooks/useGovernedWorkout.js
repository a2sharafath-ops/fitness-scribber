import {useCallback,useEffect,useRef,useState} from 'react'
import {readAssignments,recordExecution,submitPoolingReport,readPendingOperations} from '../api/pooling'
import {hasBackend} from '../lib/supabase'

export default function useGovernedWorkout(clientId,enabled){
 const [assignments,setAssignments]=useState([]),[status,setStatus]=useState('loading'),[error,setError]=useState(''),[stopped,setStopped]=useState([])
 const pending=useRef(null),busy=useRef(false)
 const refresh=useCallback(async()=>{
   if(!enabled || !clientId || !hasBackend){setAssignments([]);setStatus('unavailable');return}
   try{
     const [rows,operations]=await Promise.all([readAssignments(clientId),readPendingOperations(clientId)])
     setAssignments(rows)
     pending.current=operations.find(row=>['execution','report'].includes(row.kind))?.request || null
     setStatus(pending.current?'outcome_unknown':'ready')
   }
   catch(failure){setStatus('unavailable');setError(failure.message)}
 },[clientId,enabled])
 useEffect(()=>{refresh()},[refresh])
 const execute=useCallback(async(assignment,kind,payload={})=>{
   if(kind==='stop')setStopped(ids=>ids.includes(assignment.id)?ids:[...ids,assignment.id])
   if(busy.current)return
   if(pending.current && (pending.current.assignmentId!==assignment.id || pending.current.kind!==kind)){setError('Resolve the pending server operation before submitting another. Stop exercising immediately when needed.');return}
   const request=pending.current || {clientId,assignmentId:assignment.id,generation:assignment.contextGeneration,operationKey:crypto.randomUUID(),kind,payload}
   pending.current=request;busy.current=true;setStatus('saving');setError('')
   try{await recordExecution(request);pending.current=null;await refresh()}
   catch(failure){setStatus(failure.code==='outcome_unknown'?'outcome_unknown':'failed');setError(failure.message);if(failure.code!=='outcome_unknown')pending.current=null}
   finally{busy.current=false}
 },[refresh,clientId])
 const reportHealth=async(assignment,value)=>{
   if(busy.current || pending.current){setError('Resolve the pending operation first. Do not start or continue while reporting a change.');return}
   busy.current=true;setStatus('saving')
   const request={clientId,generation:assignment.contextGeneration,operationKey:crypto.randomUUID(),field:'healthChange',value,effectiveAt:new Date().toISOString()}
   pending.current=request
   try{await submitPoolingReport(request);pending.current=null;await refresh()}
   catch(failure){setStatus('failed');setError(failure.message)}finally{busy.current=false}
 }
 const retry=async()=>{
   if(!pending.current || busy.current)return
   if(pending.current.field){try{await submitPoolingReport(pending.current);pending.current=null;await refresh()}catch(failure){setError(failure.message)}}
   else {const assignment=assignments.find(row=>row.id===pending.current.assignmentId);if(assignment)await execute(assignment,pending.current.kind,pending.current.payload)}
 }
 return {assignments,status,error,stopped,refresh,execute,reportHealth,retry,pending:pending.current}
}
