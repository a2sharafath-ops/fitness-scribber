import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'

const vite = await createServer({server:{middlewareMode:true,hmr:false},appType:'custom',logLevel:'error'})
after(()=>vite.close())
const load = path => vite.ssrLoadModule(`/src/${path}`)
const { metricKey, normalizeTrackingMetrics, trackedMetrics, saveTrackedMetrics, trackingSeries, trackingComparison, trackingWindow, trackingExercises } = await load('lib/progressTracking.js')
const { default: ProgressPage } = await load('pages/ProgressPage.jsx')
const { DataProvider } = await load('store/DataContext.jsx')
const { ModalProvider } = await load('store/ModalContext.jsx')
const { seedBuilderQA } = await load('lib/builderQA.js')
const { persistDiff } = await load('api/sync.js')
const start='2026-09-01',end='2026-10-11'
const exercise={kind:'exercise',exerciseId:'bench',name:'Bench Press',measure:'load'}
const set=(load,reps,extra={})=>({done:true,purpose:'working',load,reps,effort:2,effortType:'RIR',...extra})
const workout=(id,date,sets,extra={})=>({id,clientId:'a',date,status:'completed',main:[{exId:'bench',name:'Bench Press',blockType:'Main Lifts',setRows:sets}],...extra})
const fixture=()=>({clients:[{id:'a',name:'A',trackedLifts:['Squat'],intake:{trainingSchedule:{time:'10:00'},profilePreferences:{values:{enjoys:'Lifting'}}}},{id:'b',name:'B'}],exercises:[{id:'bench',name:'Bench Press',category:'Grinding',equip:'Barbell'}],workouts:[],assessments:[],logs:[],sessions:[],maxes:[],resistance:[]})
const series=(db,m=exercise)=>trackingSeries(db,'a',m,start,end)

test('metric preferences persist independently per client and preserve unrelated profile and evidence',()=>{
  const db=fixture(),before=structuredClone(db)
  saveTrackedMetrics(db,'a',[exercise,{kind:'body',measure:'massKg'}])
  assert.equal(trackedMetrics(JSON.parse(JSON.stringify(db.clients[0]))).length,2)
  assert.deepEqual(trackedMetrics(db.clients[1]),[])
  assert.deepEqual(db.clients[0].trackedLifts,before.clients[0].trackedLifts)
  assert.deepEqual(db.clients[0].intake.trainingSchedule,before.clients[0].intake.trainingSchedule)
  assert.deepEqual(db.assessments,[])
  assert.throws(()=>saveTrackedMetrics(db,'missing',[]),/no longer/)
  saveTrackedMetrics(db,'a',[]);assert.deepEqual(trackedMetrics(db.clients[0]),[])
})
test('configuration removes invalid and duplicate metrics while retaining distinct exercise IDs',()=>{
  const m=normalizeTrackingMetrics([null,{},exercise,exercise,{...exercise,exerciseId:'other'}, {kind:'body',measure:'unknown'}])
  assert.equal(m.length,2);assert.notEqual(metricKey(m[0]),metricKey(m[1]))
  assert.equal(normalizeTrackingMetrics(Array.from({length:20},(_,i)=>({...exercise,exerciseId:String(i)}))).length,8)
})
test('saving tracking preferences writes only the owning client through the existing persistence path',async()=>{
  const before=fixture(),after=structuredClone(before),writes=[]
  saveTrackedMetrics(after,'a',[exercise])
  const mock={from:table=>({upsert:async rows=>{writes.push({table,rows});return {error:null}}})}
  assert.deepEqual(await persistDiff(before,after,mock),[])
  assert.equal(writes.length,1);assert.equal(writes[0].table,'clients');assert.equal(writes[0].rows.length,1)
  assert.equal(writes[0].rows[0].id,'a');assert.equal(writes[0].rows[0].intake.progressTracking.metrics[0].exerciseId,'bench')
})
test('completed sessions produce load and reps from the selected set, never prescriptions or another client',()=>{
  const db=fixture();db.workouts=[workout('one','2026-09-05',[set(60,10),set(80,5),set(200,3,{done:false}),set(100,10,{purpose:'warmup'})]),workout('other','2026-09-06',[set(300,5)],{clientId:'b'}),workout('plan','2026-09-06',[set(400,5)],{status:'suggested'}),workout('blank','2026-09-08',[set(null,null,{pLoadKg:500,pReps:8})])]
  const load=series(db);assert.equal(load.rows.length,1);assert.equal(load.rows[0].value,80);assert.equal(load.rows[0].reps,5);assert.equal(load.rows[0].effort,2)
  assert.equal(series(db,{...exercise,measure:'reps'}).rows[0].value,10)
  assert.equal(series(db,{...exercise,measure:'sets'}).rows[0].value,2)
  assert.equal(load.excluded,2)
})
test('session estimates show declines and singles consistently without depending on peak history',()=>{
  const db=fixture();db.workouts=[workout('one','2026-09-01',[set(100,3)]),workout('two','2026-09-08',[set(80,3)]),workout('single','2026-09-15',[set(80,1)])];db.maxes=[{clientId:'a',exercise:'Bench Press',valueKg:500,kind:'e1rm',source:'auto'}]
  const metric={...exercise,measure:'e1rm'},rows=series(db,metric).rows
  assert.deepEqual(rows.map(r=>r.value),[110,88,80]);assert.equal(trackingComparison(rows,metric).change,-30)
  db.exercises[0].category='Ballistic';assert.equal(series(db,metric).rows.length,0)
  db.exercises[0].category='Grinding';db.exercises[0].equip='Bodyweight';assert.equal(series(db,metric).rows.length,0)
})
test('zero external load is valid; timed work and unknown set purpose stay out of lifting metrics',()=>{
  const db=fixture();db.workouts=[workout('one','2026-09-01',[set(0,10),set(25,60,{pIntensityType:'Seconds'}),set(60,10,{purpose:undefined})])]
  assert.equal(series(db).rows[0].value,0);assert.equal(series(db).excluded,2)
  assert.equal(series(db,{...exercise,measure:'e1rm'}).rows.length,0)
})
test('exercise identity survives catalog renames and does not merge duplicate names or legacy targets',()=>{
  const db=fixture();db.workouts=[workout('one','2026-09-01',[set(70,5)])];db.exercises[0].name='Bench Press (Barbell)'
  assert.equal(series(db).rows.length,1)
  db.workouts[0].main[0].exId=null;assert.equal(series(db).rows.length,0)
  db.exercises[0].name='Bench Press';assert.equal(series(db).rows.length,1)
  db.exercises.push({id:'duplicate',name:'Bench Press'});assert.equal(series(db).rows.length,0)
  assert.equal(trackingExercises(db,'a').length,2)
  db.workouts[0].main[0]={exId:'bench',name:'Bench Press',done:true,weight:70,reps:5,sets:3};assert.equal(series(db).rows.length,0)
})
test('assessments retain methods and missing values, legacy zeros never become measurements',()=>{
  const db=fixture(),metric={kind:'body',measure:'massKg'}
  db.assessments=[{id:'1',clientId:'a',date:'2026-09-01',type:'body_comp',data:{massKg:80,method:'BIA'}},{id:'2',clientId:'a',date:'2026-09-08',type:'body_comp',data:{massKg:79,method:'DEXA'}},{id:'3',clientId:'a',date:'2026-09-15',type:'body_comp',data:{massKg:null,method:'BIA'}},{id:'4',clientId:'b',date:'2026-09-22',type:'body_comp',data:{massKg:200,method:'BIA'}}]
  const rows=series(db,metric).rows;assert.equal(rows.length,2);assert.equal(trackingComparison(rows,metric),null)
  rows[1].method='BIA';assert.equal(trackingComparison(rows,metric).change,-1)
  rows[1].method='Method not recorded';assert.equal(trackingComparison(rows,metric),null)
  db.logs=[{id:'l',clientId:'a',date:'2026-09-01',weightKg:0,squat:0}];assert.equal(series(db,{kind:'legacy',measure:'weightKg'}).rows.length,0)
})

test('custom name tracking survives an unambiguous addition to the exercise catalog',()=>{
  const db=fixture(),metric={...exercise,exerciseId:null}
  db.workouts=[workout('one','2026-09-01',[set(70,5)])]
  assert.equal(series(db,metric).rows.length,1)
  db.workouts[0].main[0].exId=null;assert.equal(series(db,metric).rows.length,1)
  db.exercises.push({id:'another-bench',name:'Bench Press'});assert.equal(series(db,metric).rows.length,0)
})
test('workout and booking consistency stay separate with no artificial empty-week rate',()=>{
  const db=fixture();db.workouts=[workout('w','2026-10-06',[set(50,5)])]
  db.sessions=[{id:'s',clientId:'a',date:'2026-10-06',status:'Completed'},{id:'s2',clientId:'a',date:'2026-10-07',status:'Confirmed'},{id:'s3',clientId:'a',date:'2026-10-08',status:'Cancelled'},{id:'today',clientId:'a',date:end,status:'Completed'},{id:'other',clientId:'b',date:'2026-10-08',status:'Completed'}]
  assert.equal(series(db,{kind:'consistency',measure:'workouts'}).rows.at(-1).value,1)
  const rates=series(db,{kind:'consistency',measure:'bookings'}).rows
  assert.equal(rates.at(-1).value,50);assert.equal(rates[0].value,null);assert.equal(rates.at(-1).partial,true)
})
test('periods and comparisons exclude future and same-date-only observations',()=>{
  const db=fixture();db.workouts=[workout('future','2027-01-01',[set(100,5)])]
  assert.equal(series(db).rows.length,0);assert.deepEqual(trackingWindow(db,'a','28',end),{start:'2026-09-14',end})
  assert.equal(trackingWindow(db,'a','all',end).start,'2026-08-17')
  assert.equal(trackingComparison([{date:start,value:1},{date:start,value:2}],exercise),null)
})
test('planned custom exercises can be chosen without plotting their prescription',()=>{
  const db=fixture();db.prescriptions=[{clientId:'a',date:'2027-01-01',blocks:[{exercises:[{exerciseName:'Custom press'}]}]},{clientId:'b',blocks:[{exercises:[{exerciseName:'Other client only'}]}]}]
  assert.ok(trackingExercises(db,'a').some(e=>e.name==='Custom press'))
  assert.ok(!trackingExercises(db,'a').some(e=>e.name==='Other client only'))
  assert.equal(series(db,{kind:'exercise',name:'Custom press',measure:'load'}).rows.length,0)
})
test('page renders saved client metrics, useful empty states and existing manual history',()=>{
  const db=seedBuilderQA(end);db.clients[0].intake={progressTracking:{version:1,metrics:[{kind:'body',measure:'massKg'}]}}
  const render=d=>renderToStaticMarkup(React.createElement(MemoryRouter,null,React.createElement(DataProvider,{initialDb:d,backend:false},React.createElement(ModalProvider,null,React.createElement(ProgressPage)))))
  const html=render(db);assert.match(html,/Manage tracked metrics/);assert.match(html,/Body mass/);assert.match(html,/Supporting records/);assert.doesNotMatch(html,/Squat 1RM est\./)
  db.settings.units='lb';db.assessments.push({id:'measured',clientId:db.clients[0].id,date:'2026-10-01',type:'body_comp',data:{massKg:100,method:'BIA'}})
  assert.match(render(db),/220\.5/);assert.match(render(db),/record=measured/)
  db.clients[0].intake={};assert.match(render(db),/Choose metrics/)
  db.clients=[];assert.match(render(db),/Add a client to start tracking/)
})
