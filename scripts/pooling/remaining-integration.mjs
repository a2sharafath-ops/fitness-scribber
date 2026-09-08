// Actual UI -> production API -> Supabase HTTP client -> real restored SQL/RLS.
// Authentication here is an explicitly synthetic adapter, NOT hosted JWT proof.
import {createServer} from 'vite'
import react from '@vitejs/plugin-react'
import {resolve,dirname} from 'node:path'
import {readFileSync,writeFileSync} from 'node:fs'
import assert from 'node:assert/strict'
const rt=JSON.parse(readFileSync('.recovery/remaining-verification/native-runtime.json','utf8'));assert(rt.passed)
process.env.FITNESS_POOLING_RESTORED_RUNTIME=rt.runtimeFile;process.env.FITNESS_POOLING_PG_DATABASE=rt.database
const {inventoryFixture:f}=await import('../../tests/pooling/native-inventory-progression.mjs')
const {sql,jsonSQL,literal,asActor,coach}=await import('../../tests/pooling/native-connection.mjs')
const recipient='context-test-'+crypto.randomUUID(),date=f.proposal.date
sql(`insert into public.clients(id,"coachId",name) values(${literal(recipient)},${literal(coach)},'Fictional recipient');insert into public.pooling_contexts(client_id,held) values(${literal(recipient)},false)`)
const exercise={id:'fixture-legacy-'+crypto.randomUUID(),name:'FICTIONAL IMPORT — DO NOT PERFORM'}
const blocks=[{blockId:'fixture-block',blockType:'Main Lifts',order:1,exercises:[{exerciseId:'fixture-occurrence',exerciseDbRef:exercise.id,exerciseName:exercise.name,order:1,intensityType:'Load',sets:[{setId:'fixture-set',setNumber:1,prescribedReps:1,prescribedLoadKg:0,prescribedRestSeconds:0,completedReps:9,completedLoadKg:9,status:'Completed'}]}]}]
// Saved source rows live in the local DB. UI receives them from /__fixture;
// fixture metadata is never imported by production components.
const priorDate=new Date(Date.parse(date)-86400000).toISOString().slice(0,10)
sql(`insert into public.prescriptions(id,"clientId","coachId",date,blocks,items,notes) values(${literal('fixture-'+crypto.randomUUID())},${literal(f.client)},${literal(coach)},${literal(priorDate)},${literal(blocks)},'[]','PRIVATE FICTIONAL NOTE');insert into public.templates(id,"coachId",name,blocks,items) values(${literal('fixture-'+crypto.randomUUID())},${literal(coach)},'Fictional saved template',${literal(blocks)},'[]')`)
const fixture={clients:[{id:f.client,name:'Fictional source'},{id:recipient,name:'Fictional recipient'}],exercises:[exercise],plans:[],synonyms:[],maxes:[],settings:{tz:'UTC',units:'kg'},prescriptions:jsonSQL(`select jsonb_agg(to_jsonb(t)) from public.prescriptions t where "clientId"=${literal(f.client)}`),templates:jsonSQL(`select jsonb_agg(to_jsonb(t)) from public.templates t where "coachId"=${literal(coach)}`),fixture:{client:f.client,recipient,date,generation:f.generation,request:f.request,numerical:{id:f.numerical.receipt.id,result:f.numerical.result}}}
const clients=new Set([f.client,recipient]),events=[]
fixture.fixture.release={id:f.manifest.id,document:jsonSQL(`select document from public.pooling_manifests where id=${literal(f.manifest.id)}`)}
let mode='normal',requests=0
const allowedRPC=new Set(['pooling_client_runtime','pooling_save_draft','pooling_review_extension'])
const aliases=new Map([['src/lib/supabase', 'tests/pooling/remaining-browser-backend.js'],['src/store/DataContext','tests/pooling/remaining-browser-providers.jsx'],['src/store/AuthContext','tests/pooling/remaining-browser-providers.jsx']].map(([a,b])=>[resolve(a),resolve(b)]))
const server=await createServer({configFile:false,envDir:false,define:{'import.meta.env.VITE_POOLING_R1':'"true"','import.meta.env.VITE_POOLING_R2':'"true"','import.meta.env.VITE_POOLING_R3':'"true"'},plugins:[react(),{name:'local-sql-only',enforce:'pre',resolveId(source,importer){if(importer&&source.startsWith('.'))return aliases.get(resolve(dirname(importer),source))},configureServer(vite){vite.middlewares.use(async(req,res,next)=>{
 const path=new URL(req.url,'http://127.0.0.1:5188')
 if(path.pathname==='/__fixture'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(fixture));return}
 if(path.pathname==='/__control'){mode=path.searchParams.get('mode')||'normal';res.end('ok');return}
 if(!path.pathname.startsWith('/rest/v1/'))return next()
 try{
  assert(++requests<=150);assert.equal(req.headers.authorization,'Bearer fictional-'+coach)
  let body='';for await(const chunk of req){body+=chunk;assert(body.length<256*1024)}
  const input=body?JSON.parse(body):{},name=path.pathname.split('/').at(-1)
  let data
  if(path.pathname.startsWith('/rest/v1/rpc/')){
   assert(allowedRPC.has(name));assert(clients.has(input.target_client));assert(Object.keys(input).every(k=>/^[a-z_]+$/.test(k)))
   data=jsonSQL(asActor(`select public.${name}(${Object.entries(input).map(([k,v])=>`${k}=>${literal(v)}`).join(',')})`))
  }else{
   assert(req.method==='GET');assert(['pooling_contexts','pooling_reports','pooling_drafts'].includes(name))
   const client=path.searchParams.get('client_id')?.replace(/^eq\./,'');assert(clients.has(client))
   data=jsonSQL(asActor(`select coalesce(jsonb_agg(to_jsonb(t)${name==='pooling_drafts'?' order by id desc':''}),'[]') from public.${name} t where client_id=${literal(client)}`))
   if(req.headers.accept?.includes('vnd.pgrst.object'))data=data[0]??null
  }
  events.push({name,key:input.operation_key,status:200})
  if(mode==='drop_review'&&name==='pooling_review_extension'){mode='normal';events.at(-1).droppedAfterCommit=true;req.socket.destroy();return}
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data))
 }catch(error){const message=error.stderr?.toString().match(/ERROR:  ([^\n]+)/)?.[1]||error.message;events.push({failure:message});res.statusCode=400;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({message,code:'P0001'}))}
})}}],server:{host:'127.0.0.1',port:5188,strictPort:true,fs:{deny:['.env','.env.*','**/.recovery/**','**/.local-test-runtime/**','**/.git/**']},watch:{ignored:['**/.recovery/**','**/.local-test-runtime/**']}},logLevel:'error'})
const {chromium}=await import(process.env.FITNESS_PLAYWRIGHT_MODULE)
let browser;const results=[],check=(name,passed)=>{results.push({name,passed});assert(passed,name)}
try{
 await server.listen();browser=await chromium.launch({headless:true});const context=await browser.newContext(),page=await context.newPage()
 await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort())
 await page.goto('http://127.0.0.1:5188/tests/pooling/remaining-integration.html')
 await page.locator('summary').filter({hasText:'no automatic assignment'}).click()
 await page.getByLabel('Review reason',{exact:true}).fill('Fictional exact kg proposal accepted as draft only')
 await fetch('http://127.0.0.1:5188/__control?mode=drop_review')
 await page.getByRole('button',{name:'Accept as draft',exact:true}).click()
 await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='Reconcile original review'&&!b.disabled)||JSON.parse(localStorage.getItem('fitscribe_pooling_operations_v1')).operations.some(r=>r.kind==='extension_review'&&r.receipt))
 const reconcile=page.getByRole('button',{name:'Reconcile original review',exact:true})
 if(await reconcile.count())await reconcile.click()
 await page.waitForFunction(()=>{const db=JSON.parse(localStorage.getItem('fitscribe_pooling_operations_v1'));return db.operations.some(r=>r.kind==='extension_review'&&r.receipt)})
 const reviews=jsonSQL(`select jsonb_agg(to_jsonb(r)) from public.pooling_extension_reviews r where client_id=${literal(f.client)} and request_id=${f.request.id}`)
 check('Extension-review dropped response reconciles one real SQL acceptance',reviews.length===1&&events.some(e=>e.name==='pooling_review_extension'&&e.droppedAfterCommit))
 check('Accepted exact kg child remains unassigned',Number(sql(`select count(*) from public.pooling_assignments where draft_id=${reviews[0].draft_id}`))===0)
 await page.getByRole('button',{name:'Open review builder'}).click()
 await page.getByText('Draft status: ready',{exact:true}).waitFor()
 await page.keyboard.press('Tab')
 check('Keyboard focus stays inside the review dialog',await page.evaluate(()=>!!document.activeElement.closest('[role="dialog"]')))
 await page.getByRole('button',{name:'↩ Copy last session',exact:true}).click()
 let releaseSave,committedSave
 const saveCommitted=new Promise(resolve=>{committedSave=resolve})
 const delayedSave=async route=>{const response=await route.fetch();committedSave();await new Promise(resolve=>{releaseSave=resolve});await route.fulfill({response})}
 await page.route('**/rest/v1/rpc/pooling_save_draft',delayedSave)
 await page.getByRole('button',{name:'Save Review Draft',exact:true}).click()
 await saveCommitted
 await page.keyboard.press('Escape')
 check('Escape cannot dismiss an in-flight builder save',await page.getByRole('dialog').isVisible())
 await page.locator('.overlay').click({position:{x:1,y:1}})
 check('Backdrop cannot dismiss an in-flight builder save',await page.getByRole('dialog').isVisible())
 releaseSave()
 await page.getByText('Draft status: saved',{exact:true}).waitFor()
 await page.unroute('**/rest/v1/rpc/pooling_save_draft',delayedSave)
 check('Copy-last UI persists an unassigned SQL draft',jsonSQL(`select count(*) from public.pooling_drafts where client_id=${literal(f.client)} and proposal->>'source'='manual_or_imported_builder'`)>0)
 await page.getByRole('button',{name:'Import saved template',exact:true}).click()
 await page.getByLabel('Saved template',{exact:true}).selectOption({label:'Fictional saved template'})
 await page.getByRole('button',{name:'Import into review editor',exact:true}).click()
 await page.getByRole('button',{name:'Save Review Draft',exact:true}).click()
 await page.getByText('Draft status: saved',{exact:true}).waitFor()
 await page.getByRole('button',{name:'👥 Copy to clients…',exact:true}).click()
 await page.getByRole('checkbox').check()
 await page.getByRole('button',{name:'Copy to 1 client',exact:true}).click()
 await page.getByText('Draft status: saved',{exact:true}).waitFor()
 const rows=jsonSQL(`select jsonb_agg(to_jsonb(d)) from public.pooling_drafts d where client_id in (${literal(f.client)},${literal(recipient)}) and proposal->>'source'='manual_or_imported_builder'`)
 check('Template and cross-client UI save three distinct drafts',rows.length===3&&rows.some(r=>r.client_id===recipient))
 check('Imported actuals, private notes and authority are stripped',rows.filter(r=>r.client_id===recipient).every(r=>r.proposal.notes===''&&r.proposal.requiresIdentityAndDoseReview===true&&r.proposal.blocks.every(b=>b.exercises.every(e=>e.sets.every(s=>s.completedReps===null&&s.completedLoadKg===null)))))
 check('No imported draft is assigned',Number(sql(`select count(*) from public.pooling_assignments where draft_id in (${rows.map(r=>r.id).join(',')})`))===0)
 await page.getByRole('button',{name:'Close',exact:true}).click()
 check('Closing builder restores keyboard focus to its trigger',await page.getByRole('button',{name:'Open review builder'}).evaluate(el=>el===document.activeElement))
 let releaseRace,committedRace
 const raceCommitted=new Promise(resolve=>{committedRace=resolve})
 const delayedRace=async route=>{const response=await route.fetch();committedRace();await new Promise(resolve=>{releaseRace=resolve});await route.fulfill({response})}
 await page.route('**/rest/v1/rpc/pooling_save_draft',delayedRace)
 await page.getByRole('button',{name:'Begin deferred hook save'}).click();await raceCommitted
 await page.getByRole('button',{name:'Change hook client'}).click()
 await page.waitForFunction(client=>{const value=JSON.parse(document.querySelector('[aria-label="Hook scope"]').textContent);return value.client===client&&value.status==='ready'},recipient)
 releaseRace();await page.unroute('**/rest/v1/rpc/pooling_save_draft',delayedRace)
 // Let the exact old HTTP response and React update queue finish.
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('fitscribe_pooling_operations_v1')).operations.every(r=>r.receipt||r.rejection))
 check('Late save cannot update the newly selected client scope',await page.getByRole('status',{name:'Hook scope'}).evaluate(el=>{const value=JSON.parse(el.textContent);return value.status==='ready'&&value.outcomes===0}))
 await page.getByText('Canonical exercise and dose editor',{exact:true}).click()
 await page.getByLabel('Published release',{exact:true}).selectOption(f.manifest.id)
 await page.getByLabel('Session date',{exact:true}).fill('2026-09-08')
 await page.getByLabel('Session instant with UTC offset',{exact:true}).fill('2026-09-08T23:30:00Z')
 await page.getByLabel('Session timezone',{exact:true}).fill('Asia/Tokyo')
 await page.getByLabel('Confirmed setting for this proposal',{exact:true}).selectOption('travel')
 await page.getByLabel('Reviewed training level',{exact:true}).selectOption('beginner')
 await page.getByLabel('Time budget (minutes)',{exact:true}).fill('1')
 await page.getByLabel('Planning note or travel reason (optional)',{exact:true}).fill('FICTIONAL travel schedule; no catch-up session requested')
 await page.getByRole('button',{name:'Save canonical draft or session inputs',exact:true}).click()
 await page.getByText('Session time and date must agree in the selected timezone.',{exact:true}).waitFor()
 check('Canonical travel UI refuses timezone/date mismatch',true)
 await page.getByLabel('Session date',{exact:true}).fill('2026-09-09')
 await page.getByRole('button',{name:'Save canonical draft or session inputs',exact:true}).click()
 await page.getByText('Canonical draft: saved. Saving never assigns.',{exact:true}).waitFor()
 const travelBefore=jsonSQL(`select jsonb_agg(to_jsonb(d)) from public.pooling_drafts d where client_id=${literal(f.client)} and proposal->>'notes' like 'FICTIONAL travel%'`)
 await page.getByLabel('Session timezone',{exact:true}).fill('America/Los_Angeles')
 await page.getByLabel('Session date',{exact:true}).fill('2026-09-08')
 await page.getByRole('button',{name:'Save canonical draft or session inputs',exact:true}).click()
 await page.getByText('Canonical draft: saved. Saving never assigns.',{exact:true}).waitFor()
 const travelAfter=jsonSQL(`select jsonb_agg(to_jsonb(d) order by id) from public.pooling_drafts d where client_id=${literal(f.client)} and proposal->>'notes' like 'FICTIONAL travel%'`)
 check('Travel history preserves original zone, instant and explicit reason',travelAfter.length===2&&JSON.stringify(travelAfter[0])===JSON.stringify(travelBefore[0])&&travelAfter[0].proposal.session.sessionAt===travelAfter[1].proposal.session.sessionAt&&travelAfter[0].proposal.date!==travelAfter[1].proposal.date)
 check('Travel edit never invents catch-up assignments',Number(sql(`select count(*) from public.pooling_assignments where draft_id in (${travelAfter.map(d=>d.id).join(',')})`))===0)
 const summary=page.locator('summary').filter({hasText:'no automatic assignment'})
 if(!await summary.evaluate(el=>el.parentElement.open))await summary.click()
 for(const width of [390,768,1280]){await page.setViewportSize({width,height:1000});check('Review reflow '+width,await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth))}
 await page.screenshot({path:'.recovery/remaining-verification/integration.png',fullPage:true})
 console.log(JSON.stringify({passed:true,results,requests,scope:'Local restored SQL, real production UI/API, synthetic authentication; not hosted JWT or human UAT'}))
}finally{
 if(browser)await browser.close();await server.close()
 sql('update public.pooling_runtime set r1=false,r2=false,r3=false where singleton')
 writeFileSync('.recovery/remaining-verification/integration.json',JSON.stringify({at:new Date().toISOString(),results,events,database:rt.database},null,2)+'\n',{mode:0o600,flush:true})
}
