// Bounded pre-push scan. Prints paths/classifications, never matching secrets.
import {execFileSync} from 'node:child_process'
import {readFileSync} from 'node:fs'
import {parseEnv} from 'node:util'
const git=args=>execFileSync('git',args,{encoding:'utf8',maxBuffer:32*1024*1024})
const env=parseEnv(readFileSync('.env','utf8'))
const secrets=Object.entries(env).filter(([k,v])=>!k.startsWith('VITE_')&&v.length>16).map(([,v])=>v)
const patterns=[/sbp_[A-Za-z0-9]{30,}/,/sb_secret_[A-Za-z0-9_-]{20,}/,/gh[pousr]_[A-Za-z0-9]{30,}/,/github_pat_[A-Za-z0-9_]{50,}/,/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/]
const findings=[]
function scan(label,data){if(secrets.some(s=>data.includes(s))||patterns.some(p=>p.test(data)))findings.push(label)}
const paths=git(['ls-files','--cached','--others','--exclude-standard','-z']).split('\0').filter(Boolean)
for(const path of paths){if(/^(\.env(\.|$)|\.recovery\/|\.local-test-runtime\/)/.test(path)&&path!=='.env.example')throw Error('private_path_in_publication');scan(path,readFileSync(path).toString())}
const blobs=git(['rev-list','--objects','origin/main..HEAD']).trim().split('\n').map(line=>line.split(' ')[0]).filter(Boolean)
let scannedBlobs=0
for(const oid of blobs){if(git(['cat-file','-t',oid]).trim()!=='blob')continue;scan('history-blob:'+oid,git(['cat-file','blob',oid]));scannedBlobs++}
console.log(JSON.stringify({passed:findings.length===0,workingFiles:paths.length,outgoingBlobs:scannedBlobs,findings,limits:'Exact configured server secrets and high-confidence token/private-key patterns; not a comprehensive security audit'}))
if(findings.length)process.exitCode=1
