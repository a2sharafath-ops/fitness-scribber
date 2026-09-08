// React may evaluate an updater more than once. Never mutate the prior blocks
// or parser output while merging untrusted imported exercises.
export function mergeParsedBlocks(current, parsed) {
 const merged=structuredClone(current)
 for(const incoming of structuredClone(parsed)) {
  const host=merged.find(block=>block.blockType===incoming.blockType)
  if(host)host.exercises=[...host.exercises,...incoming.exercises].map((exercise,index)=>({...exercise,order:index+1}))
  else merged.push(incoming)
 }
 return merged.map((block,index)=>({...block,order:index+1}))
}
