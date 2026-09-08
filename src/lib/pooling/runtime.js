export function resolvedRuntime(browser,server){
 if(!browser.r1)return {r1:false,r2:false,r3:false,governed:false,testOnly:false,status:'ready'}
 if(!server || typeof server.r1!=='boolean' || typeof server.governed!=='boolean')throw Error('runtime_unavailable')
 return {...server,r1:server.r1,r2:server.r1&&browser.r2&&server.r2,r3:server.r1&&browser.r3&&server.r3,status:'ready'}
}
