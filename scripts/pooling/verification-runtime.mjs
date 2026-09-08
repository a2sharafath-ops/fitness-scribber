// A32 private run state. Credentials stay in ignored owner-readable files.
import {readFileSync,writeFileSync,existsSync} from 'node:fs'
import {resolve} from 'node:path'
import {harness} from './hosted-test-runtime.mjs'
const marker=resolve('.recovery/hosted-test/a32-current.json')
export function verificationHarness(create=false){
 if(!existsSync(marker)){
  if(!create)throw Error('a32_setup_required')
  const h=harness();h.ledger.approval='A32';h.ledger.limits={users:3,rows:1000,previewBuilds:4,storageBytes:0};h.ledger.previewBuilds=0;h.save()
  writeFileSync(marker,JSON.stringify({file:h.file})+'\n',{mode:0o600,flag:'wx'})
 }
 const h=harness(JSON.parse(readFileSync(marker,'utf8')).file)
 if(h.ledger.approval!=='A32')throw Error('wrong_approval')
 return h
}
