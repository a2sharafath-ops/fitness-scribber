import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
const vite = await createServer({server:{middlewareMode:true,hmr:false},appType:'custom',logLevel:'error'})
after(()=>vite.close())
const load = p=>vite.ssrLoadModule('/src/'+p)
const { bookingConflicts, bookingPlan, scheduleRequest, applyScheduleRequest, freeScheduleSlots, calendarLanes, calendarTimeRange, sessionPath, scheduleClock }=await load('lib/schedule.js')
const { saveScheduleRemote }=await load('api/sync.js')
const { seedBuilderQA }=await load('lib/builderQA.js')
const clock={today:'2026-10-11',time:'12:00'}
const fixture=()=>{
  const db=seedBuilderQA(clock.today)
  db.sessions=[{id:'s',clientId:'local-builder-100',date:'2026-10-12',time:'09:00',dur:60,type:'1-on-1 Training',status:'Confirmed'}]
  db.prescriptions=[{id:'p',clientId:'local-builder-100',date:'2026-10-12',name:'Upper',blocks:[{exercises:[{exerciseId:'x',sets:[{prescribedReps:5,prescribedIntensityValue:80,prescribedRir:2}]}]}],items:[],notes:'Keep tempo'}]
  db.programAssignments=[{id:'a',clientId:'local-builder-100',data:{start:'2026-10-12',weeks:1,schedule:[{prescriptionId:'p',date:'2026-10-12',week:1,sourceWeek:1}]}}]
  db.workouts=[]
  return db
}
const candidate=db=>({...db.sessions[0],date:'2026-10-15'})

test('coach dates and schedule clocks use UTC when unset, independent of device timezone', async t => {
  const { todayISO, coachTimeZone } = await load('lib/dates.js')
  const { DataProvider, useData } = await load('store/DataContext.jsx')
  const originalZone = process.env.TZ
  const instant = new Date('2026-10-11T22:30:00Z')
  t.mock.timers.enable({ apis: ['Date'], now: instant.getTime() })
  let contextZone
  function ReadZone() { contextZone = useData().tz; return null }
  try {
    for (const deviceZone of ['America/Los_Angeles', 'Asia/Dubai']) {
      process.env.TZ = deviceZone
      for (const configured of [undefined, null, '', 'UTC', 'Asia/Dubai']) {
        const db = fixture(); db.settings.tz = configured
        renderToStaticMarkup(React.createElement(DataProvider, { initialDb: db, backend: false }, React.createElement(ReadZone)))
        const expected = configured === 'Asia/Dubai'
          ? { today: '2026-10-12', time: '02:30' }
          : { today: '2026-10-11', time: '22:30' }
        assert.equal(contextZone, coachTimeZone(configured))
        assert.deepEqual(scheduleClock(instant, configured), expected)
        assert.equal(todayISO(configured), expected.today)
        const booking = { ...db.sessions[0], date: '2026-10-12', time: '10:00', dur: 60 }
        assert.equal(bookingConflicts(db, db.sessions[0], booking, scheduleClock(instant, configured)).length, 0)
        assert.equal(booking.time, '10:00')
      }
    }
    // Explicit coach zones also honor daylight-saving changes.
    assert.equal(scheduleClock(new Date('2026-11-01T05:30:00Z'), 'America/New_York').time, '01:30')
    assert.equal(scheduleClock(new Date('2026-11-01T06:30:00Z'), 'America/New_York').time, '01:30')
  } finally {
    if (originalZone === undefined) delete process.env.TZ
    else process.env.TZ = originalZone
  }
})

test('valid move changes only booking, prescription date and matching assignment date',()=>{
  const db=fixture(), before=structuredClone(db), s=db.sessions[0], n=candidate(db)
  applyScheduleRequest(db,scheduleRequest(db,s,n),clock)
  assert.equal(db.sessions[0].date,n.date)
  assert.deepEqual({...db.prescriptions[0],date:before.prescriptions[0].date},before.prescriptions[0])
  assert.deepEqual({...db.programAssignments[0].data.schedule[0],date:before.prescriptions[0].date},before.programAssignments[0].data.schedule[0])
  for(const key of ['clients','programs','templates','workouts','exercises']) assert.deepEqual(db[key],before[key])
})
test('resize leaves complete prescription and program data unchanged',()=>{
  const db=fixture(), before=structuredClone(db), s=db.sessions[0]
  applyScheduleRequest(db,scheduleRequest(db,s,{...s,dur:30}),clock)
  assert.equal(db.sessions[0].dur,30);assert.deepEqual(db.prescriptions,before.prescriptions);assert.deepEqual(db.programAssignments,before.programAssignments)
})
test('prescription-only day blocks move and retains all rows; no overwrite',()=>{
  const db=fixture();db.prescriptions.push({...db.prescriptions[0],id:'occupied',date:'2026-10-15'})
  const before=structuredClone(db)
  assert.throws(()=>applyScheduleRequest(db,scheduleRequest(db,db.sessions[0],candidate(db)),clock),/Day already prescribed/)
  assert.deepEqual(db,before)
})
test('assignment-only dates and recorded-workout destinations are also protected',()=>{
  const db=fixture();db.programAssignments[0].data.schedule.push({prescriptionId:'removed',date:'2026-10-15'})
  assert.ok(bookingConflicts(db,db.sessions[0],candidate(db),clock).some(i=>i.title==='Day already prescribed'))
  db.programAssignments=[];db.workouts=[{clientId:'local-builder-100',date:'2026-10-15',status:'completed'}]
  assert.ok(bookingConflicts(db,db.sessions[0],candidate(db),clock).some(i=>i.title==='Workout already recorded'))
})
test('coach overlaps include other clients; touching times and cancelled bookings are available',()=>{
  const db=fixture();db.sessions.push({...db.sessions[0],id:'other',clientId:'local-builder-200',date:'2026-10-15',time:'09:30',dur:30})
  assert.ok(bookingConflicts(db,db.sessions[0],candidate(db),clock).some(i=>i.title==='Coach time already occupied'))
  assert.equal(bookingConflicts(db,db.sessions[0],{...candidate(db),time:'10:00'},clock).length,0)
  db.sessions[1].status='Cancelled';assert.equal(bookingConflicts(db,db.sessions[0],candidate(db),clock).length,0)
})
test('completed, past and started workout sources cannot be moved or deleted; status update remains available',()=>{
  for(const mode of ['complete','past','workout']){
    const db=fixture(),s=db.sessions[0]
    if(mode==='complete')s.status='Completed'
    if(mode==='past')s.date='2026-10-10'
    if(mode==='workout')db.workouts=[{clientId:s.clientId,date:s.date,status:'in_progress'}]
    assert.ok(bookingConflicts(db,s,candidate(db),clock).some(i=>i.title==='Session protected'))
    assert.ok(bookingConflicts(db,s,null,clock).some(i=>i.title==='Session protected'))
    assert.equal(bookingConflicts(db,s,{...s,status:'Completed'},clock).length,0)
  }
})
test('ambiguous legacy links and client reassignment are blocked',()=>{
  const db=fixture();db.sessions.push({...db.sessions[0],id:'duplicate',time:'13:00'})
  assert.equal(bookingPlan(db,db.sessions[0]),null)
  assert.ok(bookingConflicts(db,db.sessions[0],candidate(db),clock).some(i=>i.title==='Workout link is ambiguous'))
  assert.ok(bookingConflicts(db,db.sessions[0],{...candidate(db),clientId:'local-builder-200'},clock).some(i=>i.title==='Client cannot change'))
})
test('stale booking, prescription and assignment fail before any mutation',()=>{
  for(const key of ['sessions','prescriptions','programAssignments']){
    const db=fixture(),request=scheduleRequest(db,db.sessions[0],candidate(db))
    db[key][0].name='Changed elsewhere';const before=structuredClone(db)
    assert.throws(()=>applyScheduleRequest(db,request,clock),/changed/)
    assert.deepEqual(db,before)
  }
})
test('booking an existing prescription attaches by day without rewriting it; deleting only removes booking',()=>{
  const db=fixture(),plan=structuredClone(db.prescriptions[0]),newBooking={...db.sessions[0],id:'new'}
  db.sessions=[];applyScheduleRequest(db,scheduleRequest(db,null,newBooking),clock)
  assert.equal(bookingPlan(db,newBooking).id,'p')
  applyScheduleRequest(db,scheduleRequest(db,newBooking,null),clock)
  assert.deepEqual(db.prescriptions[0],plan);assert.equal(db.sessions.length,0)
})
test('non-training appointments never carry the client workout to another day',()=>{
  const db=fixture();db.sessions[0].type='Consultation';const plan=structuredClone(db.prescriptions)
  applyScheduleRequest(db,scheduleRequest(db,db.sessions[0],candidate(db)),clock)
  assert.deepEqual(db.prescriptions,plan)
})
test('invalid times, duration, dates and midnight crossing fail; exactly midnight is valid',()=>{
  const db=fixture(),s=db.sessions[0]
  for(const patch of [{time:'25:00'},{dur:0},{dur:30.5},{date:'2026-02-30'},{time:'23:30',dur:45}]) assert.ok(bookingConflicts(db,s,{...s,...patch},clock).length)
  assert.equal(bookingConflicts(db,s,{...s,time:'23:00',dur:60},clock).length,0)
})
test('alternatives honor prescription conflicts and all client bookings',()=>{
  const db=fixture();db.prescriptions.push({...db.prescriptions[0],id:'p2',date:'2026-10-15'})
  const options=freeScheduleSlots(db,db.sessions[0],candidate(db),clock)
  assert.equal(options.length,3);assert.ok(options.every(s=>s.date!=='2026-10-15' && bookingConflicts(db,db.sessions[0],s,clock).length===0))
})
test('lane layout separates chained overlaps and reuses lane after a group ends',()=>{
  const rows=[{id:'a',time:'09:00',dur:60},{id:'b',time:'09:30',dur:60},{id:'c',time:'10:00',dur:60},{id:'d',time:'11:00',dur:30}]
  const layout=calendarLanes(rows)
  assert.deepEqual(layout.map(r=>[r.session.id,r.lane,r.lanes]),[['a',0,2],['b',1,2],['c',0,2],['d',0,1]])
})
test('routes select the actual client/date and appointment purpose',()=>{
  const s=fixture().sessions[0];assert.equal(sessionPath(s),'/clients/local-builder-100/training?date=2026-10-12')
  assert.ok(sessionPath({...s,type:'Assessment'}).endsWith('/assessments'))
  assert.ok(sessionPath({...s,type:'Check-in'}).endsWith('/check-ins?view=wellness'))
  assert.equal(scheduleClock(new Date('2026-10-11T22:00Z'),'Asia/Dubai').today,'2026-10-12')
})
test('backend save is a single atomic RPC; missing migration reports a clear error without fallback writes',async()=>{
  const request=scheduleRequest(fixture(),null,{id:'new'});let calls=0
  await saveScheduleRemote(request,{rpc:async(name,payload)=>{calls++;assert.equal(name,'save_schedule_booking');assert.deepEqual(payload,{p_request:request});return{error:null}}})
  assert.equal(calls,1)
  await assert.rejects(saveScheduleRemote(request,{rpc:async()=>({error:{code:'PGRST202'}})}),/not installed/)
})
test('schedule renders calendar views, stable panels and real client names',async()=>{
  const {default:Page}=await load('pages/SchedulePage.jsx'),{DataProvider}=await load('store/DataContext.jsx'),{ModalProvider}=await load('store/ModalContext.jsx')
  const html=renderToStaticMarkup(React.createElement(DataProvider,{initialDb:fixture(),backend:false},React.createElement(ModalProvider,null,React.createElement(MemoryRouter,null,React.createElement(Page)))))
  for(const s of ['Schedule','Week','Month','Agenda','Status updates','schedule-day-panel','Pull the bottom edge'])assert.ok(html.includes(s))
})

test('local schedule saves use the newest stored data and storage failure leaves the booking unchanged',async()=>{
  const {DataProvider,useData}=await load('store/DataContext.jsx'),{readStoredDB}=await load('lib/storage.js')
  const descriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage')
  let raw,fail=false,captured
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>raw,setItem:(_key,value)=>{if(fail)throw new Error('Quota exceeded');raw=value}}})
  try{
    const db=fixture();db.sessions[0].date='2099-01-05';db.prescriptions[0].date='2099-01-05';db.programAssignments[0].data.schedule[0].date='2099-01-05'
    raw=JSON.stringify(db);const normalized=readStoredDB();raw=JSON.stringify(normalized)
    function Capture(){captured=useData();return null}
    renderToStaticMarkup(React.createElement(DataProvider,{initialDb:normalized,backend:false},React.createElement(Capture)))
    const r=scheduleRequest(normalized,normalized.sessions[0],{...normalized.sessions[0],date:'2099-01-08'})
    const elsewhere=JSON.parse(raw);elsewhere.clients[1].name='New name in another tab';raw=JSON.stringify(elsewhere)
    fail=true
    await assert.rejects(captured.saveSchedule(r),/storage is unavailable/)
    assert.equal(JSON.parse(raw).sessions[0].date,'2099-01-05')
    fail=false;await captured.saveSchedule(r)
    assert.equal(JSON.parse(raw).sessions[0].date,'2099-01-08')
    assert.equal(JSON.parse(raw).clients[1].name,'New name in another tab')
  }finally{if(descriptor)Object.defineProperty(globalThis,'localStorage',descriptor);else delete globalThis.localStorage}
})
test('missing legacy duration is labelled without inventing an end time; completed destination remains protected',async()=>{
  const {sessionEnd,durationLabel}=await load('lib/schedule.js')
  assert.equal(sessionEnd({time:'09:00'}),'—');assert.equal(durationLabel({}),'Duration not recorded')
  const db=fixture();db.sessions.push({...db.sessions[0],id:'completed-consultation',date:'2026-10-15',time:'14:00',type:'Consultation',status:'Completed'})
  assert.ok(bookingConflicts(db,db.sessions[0],candidate(db),clock).some(i=>i.title==='Day already completed'))
})


test('calendar defaults to 5 AM–10 PM and expands for complete booking durations',()=>{
  const normal={start:300,end:1320}
  assert.deepEqual(calendarTimeRange([]),normal)
  assert.deepEqual(calendarTimeRange([{time:'05:00',dur:60},{time:'21:00',dur:60}]),normal)
  assert.deepEqual(calendarTimeRange([{time:'04:30',dur:60}]),{start:240,end:1320})
  assert.deepEqual(calendarTimeRange([{time:'21:45',dur:60}]),{start:300,end:1380})
  assert.deepEqual(calendarTimeRange([{time:'04:30',dur:60},{time:'23:30',dur:30}]),{start:240,end:1440})
  assert.deepEqual(calendarTimeRange([{time:'invalid',dur:60},{time:'03:00'}]),normal)
  assert.deepEqual(calendarTimeRange([{time:'12:00',dur:30}]),normal)
})


test('local timed program save is atomic, rechecks other-tab bookings, and preserves unrelated edits',async()=>{
  const {DataProvider,useData}=await load('store/DataContext.jsx'),{readStoredDB}=await load('lib/storage.js')
  const {prepareAssignment}=await load('lib/programLibrary.js'),{programStarters}=await load('lib/programStarters.js')
  const descriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage')
  let raw,fail=false,captured
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>raw,setItem:(_key,value)=>{if(fail)throw new Error('Quota exceeded');raw=value}}})
  try{
    const db=fixture();db.clients[0].intake={trainingSchedule:{time:'17:30',duration:60}}
    raw=JSON.stringify(db);const normalized=readStoredDB();raw=JSON.stringify(normalized)
    function Capture(){captured=useData();return null}
    renderToStaticMarkup(React.createElement(DataProvider,{initialDb:normalized,backend:false},React.createElement(Capture)))
    const prepared=prepareAssignment(normalized,programStarters()[0],{clientId:db.clients[0].id,start:'2099-02-02',from:1,through:1},'2026-10-11')
    const elsewhere=JSON.parse(raw);elsewhere.clients[1].name='Other tab edit';raw=JSON.stringify(elsewhere)
    const baseline=raw
    fail=true;await assert.rejects(captured.saveProgramAssignment(prepared),/storage is unavailable/);assert.equal(raw,baseline)
    fail=false
    const raced=JSON.parse(raw);raced.sessions.push({...prepared.assignment.data.initialBookings[0],id:'race',clientId:db.clients[1].id});raw=JSON.stringify(raced)
    const blocked=raw;await assert.rejects(captured.saveProgramAssignment(prepared),/Coach time already occupied/);assert.equal(raw,blocked)
    raw=baseline;await captured.saveProgramAssignment(prepared)
    const saved=JSON.parse(raw)
    assert.equal(saved.clients[1].name,'Other tab edit')
    assert.ok(saved.programAssignments.some(a=>a.id===prepared.assignment.id))
    assert.ok(prepared.assignment.data.initialBookings.every(b=>saved.sessions.some(s=>s.id===b.id)))
    assert.ok(prepared.prescriptions.every(p=>saved.prescriptions.some(s=>s.id===p.id)))
  }finally{if(descriptor)Object.defineProperty(globalThis,'localStorage',descriptor);else delete globalThis.localStorage}
})


test('Profile backfill and individual builder save persist bookings atomically and preserve overrides',async()=>{
  const {DataProvider,useData}=await load('store/DataContext.jsx'),{readStoredDB}=await load('lib/storage.js')
  const {writePrescription}=await load('lib/planner.js'),{programStarters}=await load('lib/programStarters.js')
  const descriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage')
  let raw,fail=false,captured
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>raw,setItem:(_key,value)=>{if(fail)throw new Error('Quota exceeded');raw=value}}})
  try{
    const db=fixture(),clientId=db.clients[0].id,blocks=programStarters()[0].data.weeks[0][0].blocks
    db.prescriptions=[];db.programAssignments=[];db.sessions=[]
    writePrescription(db,clientId,'2099-01-05',structuredClone(blocks),'','Existing program day')
    raw=JSON.stringify(db);const normalized=readStoredDB();raw=JSON.stringify(normalized)
    function Capture(){captured=useData();return null}
    renderToStaticMarkup(React.createElement(DataProvider,{initialDb:normalized,backend:false},React.createElement(Capture)))
    const update=d=>{d.clients[0].intake||={};d.clients[0].intake.trainingSchedule={time:'10:00',duration:60}}
    const baseline=raw;fail=true
    await assert.rejects(captured.saveTrainingPlans(update,[clientId]),/storage is unavailable/);assert.equal(raw,baseline)
    fail=false;await captured.saveTrainingPlans(update,[clientId])
    assert.equal(JSON.parse(raw).sessions[0].time,'10:00')
    const adjusted=JSON.parse(raw);adjusted.sessions[0].time='14:00';raw=JSON.stringify(adjusted)
    await captured.saveTrainingPlans(update,[clientId]);assert.equal(JSON.parse(raw).sessions[0].time,'14:00')
    await captured.saveTrainingPlans(d=>writePrescription(d,clientId,'2099-01-06',structuredClone(blocks),'','Builder day'))
    assert.equal(JSON.parse(raw).sessions.find(s=>s.date==='2099-01-06').time,'10:00')
    assert.equal(JSON.parse(raw).sessions.length,2)
  }finally{if(descriptor)Object.defineProperty(globalThis,'localStorage',descriptor);else delete globalThis.localStorage}
})
