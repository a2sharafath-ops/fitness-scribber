import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'

const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' })
after(() => vite.close())
const load = path => vite.ssrLoadModule(`/src/${path}`)
const { dashboardClock, dashboardData, dashboardActivity, dashboardClientPath } = await load('lib/dashboard.js')
const { seedBuilderQA } = await load('lib/builderQA.js')
const { default: DashboardPage } = await load('pages/DashboardPage.jsx')
const { DataProvider } = await load('store/DataContext.jsx')
const { ModalProvider } = await load('store/ModalContext.jsx')
const today = '2026-10-11', clock = { today, time: '12:00' }
const fixture = () => {
  const db = seedBuilderQA(today)
  for (const key of ['sessions', 'wellness', 'srpe', 'concerns', 'screenings', 'assessments', 'maxes', 'prescriptions', 'programAssignments', 'workouts']) db[key] = []
  return db
}
const booking = (db, id, date, time, status = 'Pending', clientId = db.clients[0].id) => ({ id, clientId, date, time, status, type: '1-on-1 Training', dur: 60 })

test('Dashboard civil date and up-next clock use the coach timezone on either side of midnight', () => {
  assert.deepEqual(dashboardClock(new Date('2026-10-10T22:05:00Z'), 'Asia/Dubai'), { today, time: '02:05' })
  assert.deepEqual(dashboardClock(new Date('2026-10-11T02:05:00Z'), 'America/New_York'), { today: '2026-10-10', time: '22:05' })
})

test('today bookings sort chronologically, exclude cancelled/orphan records and highlight one upcoming booking', () => {
  const db = fixture()
  db.sessions = [booking(db,'later',today,'15:00'), booking(db,'cancelled',today,'12:30','Cancelled'), booking(db,'done',today,'12:01','Completed'), booking(db,'earlier',today,'09:00'), booking(db,'next',today,'13:00'), booking(db,'orphan',today,'12:05','Pending','deleted')]
  const d = dashboardData(db, clock)
  assert.deepEqual(d.bookings.map(s => s.id), ['earlier','done','next','later'])
  assert.equal(d.next.id, 'next')
})

test('coverage deduplicates clients and excludes inactive, future and orphan check-ins; missing input is neutral', () => {
  const db = fixture(), id = db.clients[0].id
  db.clients.push({ id:'inactive', name:'Inactive', status:'Inactive' })
  db.wellness = [{ clientId:id, date:today },{ clientId:id, date:today },{ clientId:db.clients[1].id, date:'2026-10-12' },{ clientId:'inactive', date:today },{ clientId:'deleted', date:today }]
  const d = dashboardData(db, clock)
  assert.equal(d.recorded.length, 1); assert.equal(d.missing.length, 1)
  assert.ok(!d.reviews.some(r => /risk|Lower app score/.test(r.reason)))
})

test('review queue preserves all clients, routes concerns first and only flags today’s lower recorded score', () => {
  const db = fixture(), id = db.clients[0].id
  db.concerns = [{ clientId:id,status:'Open',date:today },{ clientId:id,status:'Resolved',date:today }]
  db.wellness = [{ clientId:id, date:today, score:4 },{ clientId:db.clients[1].id,date:'2026-10-10',score:4 }]
  for (let i=0;i<15;i++) { const c = { id:`extra-${i}`, name:`Extra ${i}`,status:'Active' }; db.clients.push(c); db.concerns.push({clientId:c.id,status:'Open',date:today}) }
  const d = dashboardData(db, clock)
  assert.equal(d.reviews.filter(r => /open concern/.test(r.reason)).length, 16)
  assert.equal(d.reviews[0].path.endsWith('/check-ins?view=concerns'), true)
  assert.deepEqual(d.reviews.filter(r => r.reason === 'Lower app score today').map(r => r.client.id), [id])
})

test('follow-ups use formal assessment dates, configured interval and exclude future records', () => {
  const db = fixture(), id = db.clients[0].id
  db.settings.reassessIntervalDays = 30
  db.assessments = [{ clientId:id,type:'fitness',date:'2026-09-01',data:{} }, {clientId:id,type:'fitness',date:'2026-10-11',phase:'progress',data:{} }, {clientId:id,type:'movement',date:'2026-10-12',data:{} }]
  db.wellness = [{clientId:id,date:'2026-10-01'}]
  const rows = dashboardData(db,clock).reviews.filter(r => r.client.id === id)
  assert.ok(rows.some(r => r.reason === 'Fitness review due'))
  assert.ok(rows.some(r => r.reason === '2 baselines to record'))
  assert.ok(rows.some(r => r.reason === 'Check-in follow-up'))
})

test('screening queue respects clearance gates, renewals and future evidence', () => {
  const db = fixture(), id = db.clients[0].id
  const screening = { clientId:id, status:'complete', completedOn:'2026-09-01', validUntil:'2026-11-01', outcome:'C', hhq:{}, clearance:{ status:'requested' } }
  db.screenings = [screening, { ...screening, clientId:db.clients[1].id,completedOn:'2026-10-12' }]
  let rows = dashboardData(db,clock).reviews
  assert.equal(rows.filter(r=>r.reason==='Screening needs review').length,1)
  assert.equal(rows.find(r=>r.reason==='Screening needs review').path,`/clients/${id}/assessments#health-screening`)
  screening.clearance.status = 'received'
  rows = dashboardData(db,clock).reviews
  assert.ok(!rows.some(r=>r.reason==='Screening needs review'))
  assert.ok(rows.some(r=>r.client.id===id && r.reason==='Screening renewal due'))
})

test('prescription names and completion are separate; client-owned upcoming programs count as assigned', () => {
  const db = fixture(), id = db.clients[0].id
  db.prescriptions = [{ id:'p', clientId:id,date:today,name:'Upper body',notes:'Private notes',items:[{sets:3}] }]
  db.workouts = [{ clientId:id,date:today,status:'in_progress' }]
  db.programAssignments = [{clientId:id,data:{schedule:[{date:'2026-11-02'}]}}]
  let d = dashboardData(db,clock)
  assert.equal(d.plans[0].name,'Upper body'); assert.equal(d.plans[0].done,false)
  assert.ok(!d.noProgram.some(c=>c.id===id))
  db.workouts[0].status='completed'; d=dashboardData(db,clock)
  assert.equal(d.plans[0].done,true)
  assert.equal(dashboardClientPath('a/b','/training?date='+today),'/clients/a%2Fb/training?date='+today)
})

test('retrospective completion excludes today/future/cancelled/orphans; pending remains a status update', () => {
  const db=fixture()
  db.sessions=[booking(db,'done','2026-10-10','09:00','Completed'),booking(db,'missed','2026-10-09','09:00','Missed'),booking(db,'pending','2026-10-08','09:00'),booking(db,'cancel','2026-10-07','09:00','Cancelled'),booking(db,'future','2026-10-12','09:00'),booking(db,'today',today,'09:00','Completed'),booking(db,'old','2026-09-10','09:00','Completed'),booking(db,'orphan','2026-10-01','09:00','Completed','deleted')]
  assert.deepEqual(dashboardData(db,clock).completion,{total:3,completed:1,missed:1,pending:1})
})

test('activity keeps missing load as null, accepts explicitly recorded zero, deduplicates check-ins and labels partial bucket', () => {
  const db=fixture(), id=db.clients[0].id
  db.srpe=[{clientId:id,date:'2026-10-10',tl:null},{clientId:id,date:'2026-10-09',tl:''},{clientId:'deleted',date:'2026-10-08',tl:100}]
  let d=dashboardActivity(db,{today,days:28,metric:'load'})
  assert.equal(d.hasData,false); assert.ok(d.buckets.every(b=>b.value===null))
  db.srpe.push({clientId:id,date:'2026-10-10',tl:0})
  d=dashboardActivity(db,{today,days:90,metric:'load'})
  assert.equal(d.hasData,true); assert.equal(d.buckets.at(-1).value,0); assert.equal(d.buckets.at(-1).count,6)
  assert.equal(d.buckets.at(-1).through,'2026-10-10')
  db.wellness=[{clientId:id,date:'2026-10-10'},{clientId:id,date:'2026-10-10'},{clientId:id,date:today}]
  assert.equal(dashboardActivity(db,{today,days:28,metric:'checkins'}).buckets.at(-1).value,1)
})

test('Dashboard renders real destinations and empty states without duplicate shortcut strips or AI claims', () => {
  const db=fixture(), render=db=>renderToStaticMarkup(React.createElement(DataProvider,{initialDb:db,backend:false},React.createElement(ModalProvider,null,React.createElement(MemoryRouter,null,React.createElement(DashboardPage)))))
  const html=render(db)
  for(const text of ['Today’s schedule','Needs review','Today’s check-ins','Planned workouts','Roster trends','/clients/local-builder-100/check-ins?view=wellness']) assert.ok(html.includes(text))
  for(const text of ['AI Coach','At risk','rest day','Quick actions']) assert.ok(!html.includes(text))
  db.clients=[]
  assert.ok(render(db).includes('Start with your first client'))
})
