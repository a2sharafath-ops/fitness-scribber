// Only aliased by remaining-integration.mjs. Real production API + Supabase HTTP
// client against a local SQL fixture; this stub is NOT hosted Auth evidence.
import {createClient} from '@supabase/supabase-js'
export let actor='00000000-0000-4000-8000-000000000001'
const listeners=[]
export const supabase=createClient(location.origin,'local-fictional-anon',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
supabase.auth.getUser=async()=>actor?{data:{user:{id:actor}}}:{data:{user:null},error:{message:'Signed out'}}
supabase.auth.getSession=async()=>({data:{session:actor?{user:{id:actor},access_token:'fictional-'+actor}:null}})
supabase.auth.onAuthStateChange=fn=>{listeners.push(fn);return {data:{subscription:{unsubscribe:()=>{const i=listeners.indexOf(fn);if(i>=0)listeners.splice(i,1)}}}}}
export function switchActor(id){actor=id;for(const listener of listeners)listener(id?'SIGNED_IN':'SIGNED_OUT',id?{user:{id}}:null)}
export const hasBackend=true
