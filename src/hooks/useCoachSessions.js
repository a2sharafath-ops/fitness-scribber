import {useEffect,useState,useCallback} from 'react'
import {useAuth} from '../store/AuthContext'
import {hasBackend} from '../lib/supabase'
import {poolingConfig} from '../lib/pooling/config'
import {readCoachSessions} from '../api/pooling'
export default function useCoachSessions() {
 const {user}=useAuth(),actor=user?.id
 const [value,setValue]=useState(null),[revision,setRevision]=useState(0)
 const refresh=useCallback(()=>setRevision(n=>n+1),[])
 const enabled=hasBackend&&poolingConfig().r1&&!!actor
 useEffect(()=>{let active=true;if(enabled)readCoachSessions().then(rows=>{if(active)setValue({actor,rows,error:''})}).catch(e=>{if(active)setValue({actor,rows:[],error:e.message})});return()=>{active=false}},[actor,enabled,revision])
 return {rows:enabled&&value?.actor===actor?value.rows:[],error:enabled&&value?.actor===actor?value.error:'',loading:enabled&&value?.actor!==actor,refresh}
}
