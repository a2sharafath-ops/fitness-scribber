import {useEffect,useState} from 'react'
import {useAuth} from '../store/AuthContext'
import {poolingConfig} from '../lib/pooling/config'
import {hasBackend} from '../lib/supabase'
import {readClientRuntime} from '../api/pooling'
import {resolvedRuntime} from '../lib/pooling/runtime'

export default function usePoolingRuntime(clientId){
 const {user}=useAuth(),actor=user?.id
 const browser=poolingConfig(),key=`${actor || 'local'}:${clientId || ''}`
 const {r1,r2,r3}=browser
 const [value,setValue]=useState(null)
 useEffect(()=>{
  let active=true
  if(!r1||!clientId)return
  const flags={r1,r2,r3}
  const load=async()=>{
   try{const server=hasBackend?await readClientRuntime(clientId):{r1:true,r2,r3,governed:true};if(active)setValue({key,...resolvedRuntime(flags,server)})}
   catch(error){if(active)setValue({key,r1:false,r2:false,r3:false,governed:true,status:'unavailable',error:error.message})}
  }
  load()
  // Expiry is also enforced on every server mutation; refresh visible controls.
  const timer=setInterval(load,30000)
  return()=>{active=false;clearInterval(timer)}
 },[clientId,actor,r1,r2,r3,key])
 if(!browser.r1)return resolvedRuntime(browser,null)
 return value?.key===key?value:{r1:false,r2:false,r3:false,governed:true,status:'loading'}
}
