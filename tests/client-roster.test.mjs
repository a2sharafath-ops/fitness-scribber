import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'

const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' })
after(() => vite.close())
const load = path => vite.ssrLoadModule(`/src/${path}`)
const { clientRoster, rosterPrograms, rosterResults } = await load('lib/clientRoster.js')
const { clientReviewItems } = await load('lib/dashboard.js')
const { seedBuilderQA } = await load('lib/builderQA.js')
const { default: ClientsPage } = await load('pages/ClientsPage.jsx')
const { DataProvider } = await load('store/DataContext.jsx')
const { ModalProvider } = await load('store/ModalContext.jsx')
const { todayISO } = await load('lib/dates.js')
const today = '2026-10-11'
const fixture = () => {
  const db = seedBuilderQA(today)
  for (const key of ['sessions','wellness','srpe','concerns','screenings','assessments','maxes','prescriptions','programAssignments','workouts','logs','resistance','cardio','wearable']) db[key] = []
  db.plans = []
  return db
}
const assignment = (clientId,id,start,weeks,dates) => ({ id,clientId,name:id,data:{start,weeks,schedule:dates.map(date=>({date}))} })

test('current programs outrank upcoming copies and remain current through end-of-week rest days', () => {
  const db=fixture(), client=db.clients[0]
  db.programAssignments=[assignment(client.id,'next','2026-10-19',2,['2026-10-19']),assignment(client.id,'current','2026-09-28',2,['2026-10-09']),assignment(client.id,'expired','2026-09-14',2,['2026-09-26']),assignment(db.clients[1].id,'other','2026-10-05',2,['2026-10-12'])]
  const programs=rosterPrograms(db,client,today)
  assert.deepEqual(programs.map(p=>p.id),['current','next'])
  assert.equal(programs[0].note,'Week 2 of 2')
  assert.equal(programs[0].path,`/workouts?assignment=current&clientId=${client.id}`)
  assert.equal(programs[0].end,today)
  assert.ok(programs[1].upcoming)
  assert.deepEqual(rosterPrograms(db,client,'2026-10-12').map(p=>p.id),['next'])
})

test('legacy plans keep a client Training destination while missing or dangling plans stay unassigned', () => {
  const db=fixture(),client=db.clients[0]
  client.planId='legacy';db.plans=[{id:'legacy',name:'Individual plan'}]
  assert.equal(rosterPrograms(db,client,today)[0].path,`/clients/${client.id}/training`)
  client.planId='deleted'
  assert.equal(rosterPrograms(db,client,today).length,0)
})

test('latest activity includes completed workout evidence and excludes future plans, pending bookings and running workouts', () => {
  const db=fixture(),id=db.clients[0].id
  db.workouts=[{id:'completed',clientId:id,date:'2026-10-10',status:'completed'},{id:'running',clientId:id,date:today,status:'in_progress'},{id:'future',clientId:id,date:'2026-10-12',status:'completed'},{id:'other',clientId:db.clients[1].id,date:today,status:'completed'}]
  db.wellness=[{clientId:id,date:'2026-10-09'}]
  db.assessments=[{id:'derived',clientId:id,type:'fitness',date:'2026-10-10',createdAt:'2026-10-10T23:00:00Z',data:{sourceWorkoutId:'completed'}}]
  db.prescriptions=[{clientId:id,date:'2026-11-02'}]
  db.sessions=[{clientId:id,date:today,status:'Pending'}]
  const row=clientRoster(db,today)[0]
  assert.equal(row.latest.source,'Workout log')
  assert.equal(row.latest.date,'2026-10-10')
  assert.equal(row.latest.path,`/clients/${id}/training?date=2026-10-10&workout=completed`)
})

test('latest assessment paths preserve profile ownership and exact record; legacy evidence does not misdirect another client', () => {
  const db=fixture(),id=db.clients[0].id
  db.assessments=[{id:'goal-1',clientId:id,date:today,type:'goals',data:{}}]
  let row=clientRoster(db,today)[0]
  assert.equal(row.latest.path,`/clients/${id}/profile/goals?record=goal-1#assessment-record-goal-1`)
  db.assessments=[];db.logs=[{clientId:id,date:'2026-10-10',weightKg:80}]
  row=clientRoster(db,today)[0]
  assert.equal(row.latest.source,'Legacy progress record');assert.equal(row.latest.path,null)
})

test('review filtering counts clients once, keeps every reason, and shares Dashboard priorities', () => {
  const db=fixture(),id=db.clients[0].id
  db.concerns=[{clientId:id,status:'Open',date:today}]
  db.wellness=[{clientId:id,date:today,score:4}]
  db.clients[1].status='Paused'
  const rows=clientRoster(db,today), result=rosterResults(rows,{filter:'review'})
  assert.equal(result.counts.review,1)
  assert.equal(rows[0].reviews.length,3)
  assert.deepEqual(rows[0].reviews.map(r=>r.key),clientReviewItems(db,today).map(r=>r.key))
  assert.equal(rows[1].reviews.length,0)
  assert.ok(result.visible[0].reviews[0].path.endsWith('view=concerns'))
  assert.ok(!rows[0].reviews.some(r=>/risk/i.test(r.reason)))
})

test('booked completion covers 30 elapsed days and does not turn unresolved or future bookings into risk flags', () => {
  const db=fixture(),id=db.clients[0].id
  db.sessions=['2026-09-11','2026-10-10',today,'2026-10-12','2026-09-10'].map((date,i)=>({id:String(i),clientId:id,date,status:i===1?'Pending':'Completed'}))
  db.sessions.push({clientId:id,date:'2026-10-09',status:'Cancelled'})
  const row=clientRoster(db,today)[0]
  assert.deepEqual(row.completion,{completed:1,total:2,missed:0,pending:1})
  assert.ok(row.reviews.every(r=>r.reason==='3 baselines to record'))
})

test('search, status and no-program filters compose; sorting and pagination retain all clients and clamp stale pages', () => {
  const db=fixture()
  for(let i=0;i<19;i++)db.clients.push({id:`client-${i}`,name:`Coach Test ${String(i).padStart(2,'0')}`,email:`test-${i}@example.test`,goal:'Build stamina',status:'Active'})
  db.clients[1].status='Inactive'
  db.programAssignments=[assignment(db.clients[0].id,'Strength block','2026-10-19',2,['2026-10-19'])]
  const rows=clientRoster(db,today)
  assert.equal(rosterResults(rows).filtered.length,20)
  const page2=rosterResults(rows,{page:2}),page3=rosterResults(rows,{page:3})
  assert.equal(page2.visible.length,8);assert.equal(page3.visible.length,4)
  assert.equal(new Set([...rosterResults(rows).visible,...page2.visible,...page3.visible].map(r=>r.client.id)).size,20)
  assert.equal(rosterResults(rows,{query:'strength block'}).visible[0].client.id,db.clients[0].id)
  assert.equal(rosterResults(rows,{query:'test-18@',unassigned:true,page:3}).page,1)
  assert.equal(rosterResults(rows,{filter:'inactive'}).visible.length,1)
  assert.equal(rosterResults(rows,{query:'stamina',unassigned:true}).filtered.length,19)
  db.wellness=[{clientId:'client-18',date:today}]
  assert.equal(rosterResults(clientRoster(db,today),{sort:'recent'}).visible[0].client.id,'client-18')
})

test('Clients renders semantic client-scoped links, extra review reasons, and neutral first-client states', () => {
  const db=fixture(),date=todayISO('Asia/Dubai'),id=db.clients[0].id
  db.concerns=[{clientId:id,status:'Open',date}]
  db.programAssignments=[assignment(id,'owned-copy',date,2,[date])]
  const render=()=>renderToStaticMarkup(React.createElement(DataProvider,{initialDb:db,backend:false},React.createElement(ModalProvider,null,React.createElement(MemoryRouter,null,React.createElement(ClientsPage)))))
  const html=render()
  assert.ok(html.includes(`href="/clients/${id}"`))
  assert.ok(html.includes('assignment=owned-copy'))
  assert.ok(html.includes('cr-other-reviews'))
  assert.ok(html.includes('view=concerns'))
  assert.ok(!html.includes('At risk'))
  assert.ok(!html.includes('<button class="cl-row"'))
  db.clients.forEach(c=>{c.status='Paused'})
  const inactive=render()
  assert.ok(inactive.includes('Builder Test · TM 100'))
  assert.ok(inactive.includes('Paused'))
  db.clients=[]
  assert.ok(render().includes('Meet your first client'))
})
