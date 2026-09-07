// Bounded request parsing is shared by both local-only Edge entrypoints.
export async function readPoolingRequest(req: Request) {
 if(!req.body)throw new Error('invalid_request')
 const reader=req.body.getReader(),chunks:Uint8Array[]=[]
 let size=0
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>16384){await reader.cancel();throw new Error('invalid_request')}chunks.push(value)}}finally{reader.releaseLock()}
 const bytes=new Uint8Array(size);let offset=0
 for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}
 try{return JSON.parse(new TextDecoder().decode(bytes))}catch{throw new Error('invalid_request')}
}
