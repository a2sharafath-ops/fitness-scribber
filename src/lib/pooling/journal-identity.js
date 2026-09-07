// This cache scopes only the local recovery journal, NEVER server authority.
// A verified identity is retained in this page so an offline stop can be queued.
// Account changes/sign-out erase it; a fresh page must verify again online.
export function createJournalIdentity(auth){
 let verified=null,epoch=0
 auth.onAuthStateChange((_event,session)=>{if(!session?.user?.id || session.user.id!==verified){verified=null;epoch++}})
 return async()=>{
  if(verified)return verified
  const before=epoch,{data,error}=await auth.getUser()
  if(error || !data?.user?.id || before!==epoch)throw Error('forbidden')
  verified=data.user.id
  return verified
 }
}
